require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { z } = require('zod');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const port = Number(process.env.PORT || 3000);
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const reportFromEmail = process.env.REPORT_FROM_EMAIL;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = new Set([
    'http://localhost:8000',
    'http://127.0.0.1:5500',
    ...(process.env.CLIENT_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean)
]);
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed'));
    }
}));
app.use(express.json({ limit: '100kb' }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again later.' }
});
const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many session refresh attempts. Please try again later.' }
});

const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(128)
});

async function supabaseRequest(path, options = {}, accessToken = '') {
    if (!supabaseUrl || !supabaseAnonKey) throw Object.assign(new Error('Supabase Auth is not configured'), { status: 503 });
    const response = await fetch(`${supabaseUrl}${path}`, {
        ...options,
        headers: {
            apikey: supabaseAnonKey,
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(options.headers || {})
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.msg || data.error_description || data.error || 'Supabase Auth request failed'), { status: response.status });
    return data;
}

async function supabaseAdminRequest(path, options = {}) {
    if (!supabaseUrl || !supabaseServiceRoleKey) throw Object.assign(new Error('Supabase service role key is not configured'), { status: 503 });
    const response = await fetch(`${supabaseUrl}${path}`, {
        ...options,
        headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.msg || data.error_description || data.error || 'Supabase Auth admin request failed'), { status: response.status });
    return data;
}

async function getAuthProfile(authUser) {
    const result = await pool.query(
        `SELECT u.id, u.tenant_id, u.name, u.email, u.role, t.id AS company_id, t.name AS company_name, t.business_type, t.country, t.currency
         FROM users u JOIN tenants t ON t.id = u.tenant_id
         WHERE u.auth_user_id = $1 AND u.is_active = true`,
        [authUser.id]
    );
    if (!result.rowCount && authUser.email) {
        const legacy = await pool.query('SELECT id FROM users WHERE email = $1 AND auth_user_id IS NULL AND is_active = true', [authUser.email.toLowerCase()]);
        if (legacy.rowCount) {
            await pool.query('UPDATE users SET auth_user_id = $1 WHERE id = $2', [authUser.id, legacy.rows[0].id]);
            return getAuthProfile(authUser);
        }
    }
    if (!result.rowCount) throw Object.assign(new Error('Your Auth account is not assigned to a business'), { status: 403 });
    const user = result.rows[0];
    return { user: { id: user.id, tenant_id: user.tenant_id, name: user.name, email: user.email, role: user.role }, company: { id: user.company_id, name: user.company_name, business_type: user.business_type, country: user.country, currency: user.currency } };
}

async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    try {
        const authUser = await supabaseRequest('/auth/v1/user', {}, token);
        const profile = await getAuthProfile(authUser);
        req.user = profile.user;
        req.company = profile.company;
        req.authToken = token;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
}

function requireStaffAdmin(req, res, next) {
    if (!['owner', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only the business owner or a manager can manage staff' });
    }
    next();
}

app.get('/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true });
    } catch {
        res.status(503).json({ ok: false, error: 'Database unavailable' });
    }
});

app.post('/api/auth/login', authLimiter, async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please check your login details and try again.' });
    try {
        const session = await supabaseRequest('/auth/v1/token?grant_type=password', {
            method: 'POST', body: JSON.stringify({ email: parsed.data.email.toLowerCase(), password: parsed.data.password })
        });
        const profile = await getAuthProfile(session.user);
        res.json({ accessToken: session.access_token, refreshToken: session.refresh_token, expiresIn: session.expires_in, ...profile });
    } catch (error) {
        if (error.status === 400) return res.status(401).json({ error: 'Invalid email or password' });
        next(error);
    }
});

app.post('/api/auth/forgot-password', authLimiter, async (req, res, next) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const genericResponse = { message: 'If an active account exists for that email, a password reset link has been sent.' };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json(genericResponse);
    try {
        const configuredOrigin = (process.env.CLIENT_ORIGIN || '').split(',')[0].trim();
        const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
        const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
        const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : '';
        const origin = requestOrigin && !/localhost|127\.0\.0\.1/.test(requestOrigin) ? requestOrigin : configuredOrigin;
        await supabaseRequest('/auth/v1/recover', { method: 'POST', body: JSON.stringify({ email, redirect_to: `${origin}/html/` }) });
        res.json(genericResponse);
    } catch (error) { next(error); }
});

app.post('/api/auth/reset-password', authLimiter, async (req, res, next) => {
    const token = typeof req.body?.accessToken === 'string' ? req.body.accessToken : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!token || password.length < 12 || password.length > 128) return res.status(400).json({ error: 'A valid recovery session and a 12-128 character password are required' });
    try {
        await supabaseRequest('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) }, token);
        res.json({ ok: true, message: 'Password reset successfully. You can now sign in.' });
    } catch (error) { next(error); }
});

app.post('/api/auth/refresh', refreshLimiter, async (req, res, next) => {
    const token = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
    if (!token) return res.status(400).json({ error: 'Refresh token is required' });
    try {
        const session = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: token }) });
        const profile = await getAuthProfile(session.user);
        res.json({ accessToken: session.access_token, refreshToken: session.refresh_token, expiresIn: session.expires_in, ...profile });
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({ user: req.user, company: req.company });
});

const productSelect = `SELECT id, name, image, category, group_id AS "groupId", product_code AS "productCode", material_type AS "materialType", supplier,
    buying_price AS "buyingPrice", selling_price AS "sellingPrice", wholesale_price AS "wholesalePrice", quantity, min_stock_level AS "minStockLevel",
    unit, description, barcode, sku, is_active AS "isActive", created_at AS "dateAdded", updated_at AS "updatedAt" FROM products`;
const userSelect = `SELECT id, name, email, role, is_active AS "isActive", created_at AS "createdAt" FROM users`;

async function addAudit(client, tenantId, userId, action, details = '') {
    await client.query('INSERT INTO audit_logs (tenant_id, user_id, action, details) VALUES ($1, $2, $3, $4)', [tenantId, userId, action, details]);
}

app.get('/api/bootstrap', requireAuth, async (req, res, next) => {
    try {
        const tenantId = req.user.tenant_id;
        const [products, sales, customers, suppliers, expenses, users, register, movements, purchases, auditLogs, groups, quickSellItems] = await Promise.all([
            pool.query(`${productSelect} WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC`, [tenantId]),
            pool.query(`SELECT id, customer_name AS "customerName", customer_phone AS "customerPhone", payment_method AS "paymentMethod", items, total, profit, cash_received AS "cashReceived", change_amount AS "change", status, refunded_at AS "refundedAt", created_at AS date FROM sales WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]),
            pool.query(`SELECT id, name, phone, last_purchase AS "lastPurchase", total_spent AS "totalSpent", purchase_count AS "purchaseCount" FROM customers WHERE tenant_id = $1`, [tenantId]),
            pool.query(`SELECT id, name, contact, phone FROM suppliers WHERE tenant_id = $1`, [tenantId]),
            pool.query(`SELECT id, description, amount, category, expense_date AS date FROM expenses WHERE tenant_id = $1 ORDER BY expense_date DESC`, [tenantId]),
            pool.query(`${userSelect} WHERE tenant_id = $1 AND is_active = true ORDER BY created_at`, [tenantId]),
            pool.query(`SELECT is_open AS "isOpen", opening_cash AS "openingCash", opened_at AS "openedAt", closing_cash AS "closingCash", closed_at AS "closedAt" FROM registers WHERE tenant_id = $1`, [tenantId]),
            pool.query(`SELECT id, product_id AS "productId", quantity, reason, created_at AS date FROM stock_movements WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]),
            pool.query(`SELECT id, product_id AS "productId", supplier, quantity, unit_cost AS "unitCost", created_at AS date FROM purchases WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]),
            pool.query(`SELECT id, action, details, user_id AS "userId", created_at AS date FROM audit_logs WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]),
            pool.query(`SELECT id,name,description,display_order AS "displayOrder",is_active AS "isActive" FROM product_groups WHERE tenant_id=$1 ORDER BY display_order,name`, [tenantId]),
            pool.query(`SELECT id,product_id AS "productId",display_order AS "displayOrder",is_active AS "isActive" FROM quick_sell_items WHERE tenant_id=$1 ORDER BY display_order`, [tenantId])
        ]);
        res.json({ products: products.rows, sales: sales.rows, customers: customers.rows, suppliers: suppliers.rows, expenses: expenses.rows,
            users: users.rows, register: register.rows[0] || { isOpen: false, openingCash: 0, openedAt: null },
            stockMovements: movements.rows, purchases: purchases.rows, auditLogs: auditLogs.rows, groups: groups.rows, quickSellItems: quickSellItems.rows });
    } catch (error) { next(error); }
});

app.post('/api/reports/email', requireAuth, async (req, res, next) => {
    const recipient = typeof req.body?.recipient === 'string' ? req.body.recipient.trim() : '';
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const report = typeof req.body?.report === 'string' ? req.body.report.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !subject || !report) {
        return res.status(400).json({ error: 'A valid email and report are required' });
    }
    if (!resendApiKey || !reportFromEmail) {
        return res.status(503).json({ error: 'Email sending is not configured yet. Add RESEND_API_KEY and REPORT_FROM_EMAIL in your deployment environment.' });
    }
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: reportFromEmail, to: [recipient], subject, text: report })
        });
        if (!response.ok) return res.status(502).json({ error: 'The email provider could not send the report' });
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

app.get('/api/groups', requireAuth, async (req,res,next)=>{try{const r=await pool.query('SELECT id,name,description,display_order AS "displayOrder",is_active AS "isActive" FROM product_groups WHERE tenant_id=$1 ORDER BY display_order,name',[req.user.tenant_id]);res.json({groups:r.rows});}catch(e){next(e);}});
app.post('/api/groups', requireAuth, async (req,res,next)=>{try{const name=String(req.body?.name||'').trim();if(!name)return res.status(400).json({error:'Group name is required'});const r=await pool.query('INSERT INTO product_groups(tenant_id,name,description,display_order) VALUES($1,$2,$3,$4) RETURNING id,name,description,display_order AS "displayOrder",is_active AS "isActive"',[req.user.tenant_id,name,String(req.body?.description||'').trim()||null,Number(req.body?.displayOrder)||0]);res.status(201).json({group:r.rows[0]});}catch(e){if(e.code==='23505')return res.status(409).json({error:'A group with that name already exists'});next(e);}});
app.patch('/api/products/:id/group', requireAuth, async (req,res,next)=>{try{const r=await pool.query('UPDATE products SET group_id=$1,updated_at=now() WHERE id=$2 AND tenant_id=$3 RETURNING id,group_id AS "groupId"',[req.body?.groupId||null,req.params.id,req.user.tenant_id]);if(!r.rowCount)return res.status(404).json({error:'Product not found'});res.json({product:r.rows[0]});}catch(e){next(e);}});
app.put('/api/quick-sell', requireAuth, async (req,res,next)=>{const ids=Array.isArray(req.body?.productIds)?req.body.productIds:[];const client=await pool.connect();try{await client.query('BEGIN');await client.query('DELETE FROM quick_sell_items WHERE tenant_id=$1',[req.user.tenant_id]);for(let i=0;i<ids.length;i++)await client.query('INSERT INTO quick_sell_items(tenant_id,product_id,display_order) SELECT $1,id,$2 FROM products WHERE id=$3 AND tenant_id=$1',[req.user.tenant_id,i,ids[i]]);await client.query('COMMIT');res.json({ok:true});}catch(e){await client.query('ROLLBACK');next(e);}finally{client.release();}});

app.post('/api/products', requireAuth, async (req, res, next) => {
    const data = req.body || {};
    if (!String(data.name || '').trim()) return res.status(400).json({ error: 'Product name is required' });
    try {
        const result = await pool.query(`INSERT INTO products (tenant_id, name, image, category, group_id, product_code, material_type, supplier, buying_price, selling_price, wholesale_price, quantity, min_stock_level, unit, description, barcode)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`, [req.user.tenant_id, data.name.trim(), data.image || '', data.category || '', data.groupId || null, data.productCode || null, data.materialType || '', data.supplier || '', Number(data.buyingPrice) || 0, Number(data.sellingPrice) || 0, data.wholesalePrice == null || data.wholesalePrice === '' ? null : Number(data.wholesalePrice), Number(data.quantity) || 0, Number(data.minStockLevel) || 0, data.unit || 'piece', data.description || '', data.barcode || null]);
        await pool.query('INSERT INTO audit_logs (tenant_id, user_id, action, details) VALUES ($1,$2,$3,$4)', [req.user.tenant_id, req.user.id, 'Product added', data.name]);
        const product = await pool.query(`${productSelect} WHERE id = $1 AND tenant_id = $2`, [result.rows[0].id, req.user.tenant_id]);
        res.status(201).json({ product: product.rows[0] });
    } catch (error) { next(error); }
});

app.patch('/api/products/:id', requireAuth, async (req, res, next) => {
    const data = req.body || {};
    try {
        const result = await pool.query(`UPDATE products SET name=COALESCE($1,name), image=COALESCE($2,image), category=COALESCE($3,category), material_type=COALESCE($4,material_type), supplier=COALESCE($5,supplier), buying_price=COALESCE($6,buying_price), selling_price=COALESCE($7,selling_price), min_stock_level=COALESCE($8,min_stock_level), unit=COALESCE($9,unit), description=COALESCE($10,description), barcode=COALESCE($11,barcode) WHERE id=$12 AND tenant_id=$13 RETURNING id`, [data.name, data.image, data.category, data.materialType, data.supplier, data.buyingPrice, data.sellingPrice, data.minStockLevel, data.unit, data.description, data.barcode, req.params.id, req.user.tenant_id]);
        if (!result.rowCount) return res.status(404).json({ error: 'Product not found' });
        await addAudit(pool, req.user.tenant_id, req.user.id, 'Product updated', req.params.id);
        const product = await pool.query(`${productSelect} WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.user.tenant_id]);
        res.json({ product: product.rows[0] });
    } catch (error) { next(error); }
});

app.delete('/api/products/:id', requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query('UPDATE products SET is_active=false, updated_at=now() WHERE id=$1 AND tenant_id=$2 AND is_active=true RETURNING id', [req.params.id, req.user.tenant_id]);
        if (!result.rowCount) return res.status(404).json({ error: 'Product not found' });
        await addAudit(pool, req.user.tenant_id, req.user.id, 'Product archived', req.params.id);
        res.status(204).end();
    } catch (error) { next(error); }
});

app.post('/api/products/:id/stock-adjustments', requireAuth, async (req, res, next) => {
    const amount = Number(req.body?.quantity);
    if (!Number.isFinite(amount) || amount === 0) return res.status(400).json({ error: 'A non-zero quantity is required' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const product = await client.query(
            'UPDATE products SET quantity=GREATEST(0, quantity + $1), updated_at=now() WHERE id=$2 AND tenant_id=$3 AND is_active=true RETURNING id, quantity, buying_price AS "buyingPrice", selling_price AS "sellingPrice", updated_at AS "updatedAt"',
            [amount, req.params.id, req.user.tenant_id]
        );
        if (!product.rowCount) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Product not found' });
        }
        const movement = await client.query(
            'INSERT INTO stock_movements (tenant_id, product_id, quantity, reason) VALUES ($1,$2,$3,$4) RETURNING id, product_id AS "productId", quantity, reason, created_at AS date',
            [req.user.tenant_id, req.params.id, amount, req.body.reason || 'Manual adjustment']
        );
        await addAudit(client, req.user.tenant_id, req.user.id, 'Stock adjusted', `${req.params.id}: ${amount}`);
        await client.query('COMMIT');
        res.status(201).json({ ok: true, product: product.rows[0], movement: movement.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally { client.release(); }
});

app.post('/api/sales', requireAuth, async (req, res, next) => {
    const sale = req.body || {};
    if (!Array.isArray(sale.items) || !sale.items.length || sale.items.some(item => !item.productId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
        return res.status(400).json({ error: 'Valid sale items are required' });
    }

    // Consolidate duplicate product lines before touching stock. This keeps stock math correct
    // and reduces the number of database round trips during checkout.
    const quantities = new Map();
    for (const item of sale.items) {
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.quantity));
    }
    const requested = [...quantities.entries()];
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // One atomic UPDATE handles all stock deductions. PostgreSQL evaluates the stock
        // condition against the current row, preventing overselling under concurrent checkouts.
        const values = [];
        const placeholders = requested.map(([productId, quantity], index) => {
            const base = index * 2;
            values.push(productId, quantity);
            return `($${base + 1}::uuid, $${base + 2}::numeric)`;
        }).join(',');
        const stock = await client.query(`
            WITH requested(product_id, quantity) AS (VALUES ${placeholders}),
            updated AS (
                UPDATE products p
                SET quantity = p.quantity - r.quantity, updated_at = now()
                FROM requested r
                WHERE p.id = r.product_id
                  AND p.tenant_id = $${values.length + 1}
                  AND p.is_active = true
                  AND p.quantity >= r.quantity
                RETURNING p.id, p.quantity
            )
            SELECT r.product_id, r.quantity AS sold_quantity, u.quantity AS remaining_quantity
            FROM requested r
            LEFT JOIN updated u ON u.id = r.product_id
        `, [...values, req.user.tenant_id]);

        if (stock.rows.length !== requested.length || stock.rows.some(row => row.remaining_quantity === null)) {
            throw Object.assign(new Error('Insufficient stock or one or more products are no longer available'), { status: 409 });
        }

        // One insert records all stock movements generated by this sale.
        // Record all stock movements in one insert to keep checkout fast.
        const movementParams = [];
        const movementRows = requested.map(([productId, quantity], index) => {
            const base = index * 3;
            movementParams.push(req.user.tenant_id, productId, quantity);
            return `($${base + 1}, $${base + 2}, -$${base + 3}::numeric, 'Sale')`;
        }).join(',');
        await client.query(
            `INSERT INTO stock_movements (tenant_id, product_id, quantity, reason) VALUES ${movementRows}`,
            movementParams
        );

        const inserted = await client.query(`INSERT INTO sales (tenant_id, customer_name, customer_phone, payment_method, items, total, profit, cash_received, change_amount, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at AS date`, [req.user.tenant_id, sale.customerName || 'Walk-in Customer', sale.customerPhone || '', sale.paymentMethod || 'Cash', JSON.stringify(sale.items), Number(sale.total) || 0, Number(sale.profit) || 0, Number(sale.cashReceived) || 0, Number(sale.change) || 0, req.user.id]);
        if (sale.customerName && sale.customerName !== 'Walk-in Customer') await client.query(`INSERT INTO customers (tenant_id,name,phone,last_purchase,total_spent,purchase_count) VALUES ($1,$2,$3,now(),$4,1) ON CONFLICT (tenant_id,name) DO UPDATE SET phone=EXCLUDED.phone,last_purchase=now(),total_spent=customers.total_spent+EXCLUDED.total_spent,purchase_count=customers.purchase_count+1`, [req.user.tenant_id, sale.customerName, sale.customerPhone || '', Number(sale.total) || 0]);
        await addAudit(client, req.user.tenant_id, req.user.id, 'Sale completed', inserted.rows[0].id);
        await client.query('COMMIT');
        res.status(201).json({
            sale: { ...sale, id: inserted.rows[0].id, date: inserted.rows[0].date },
            stock: stock.rows.map(row => ({ productId: row.product_id, quantity: row.remaining_quantity }))
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error.status ? Object.assign(error, { status: error.status }) : error);
    } finally { client.release(); }
});

app.post('/api/sales/:id/refund', requireAuth, async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); const sale = await client.query('SELECT items,status FROM sales WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, req.user.tenant_id]);
        if (!sale.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Sale not found' }); } if (sale.rows[0].status === 'refunded') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Sale already refunded' }); }
        for (const item of sale.rows[0].items) { await client.query('UPDATE products SET quantity=quantity+$1 WHERE id=$2 AND tenant_id=$3', [Number(item.quantity), item.productId, req.user.tenant_id]); await client.query('INSERT INTO stock_movements (tenant_id,product_id,quantity,reason) VALUES ($1,$2,$3,$4)', [req.user.tenant_id, item.productId, Number(item.quantity), 'Refund']); }
        await client.query('UPDATE sales SET status=\'refunded\',refunded_at=now() WHERE id=$1', [req.params.id]); await addAudit(client, req.user.tenant_id, req.user.id, 'Sale refunded', req.params.id); await client.query('COMMIT'); res.json({ ok: true });
    } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
});

app.post('/api/purchases', requireAuth, async (req, res, next) => {
    const data = req.body || {};
    const quantity = Number(data.quantity);
    const unitCost = Number(data.unitCost);
    if (!data.productId || quantity <= 0 || unitCost < 0) return res.status(400).json({ error: 'Valid product, quantity, and cost are required' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const product = await client.query(
            'UPDATE products SET quantity=quantity+$1,buying_price=$2,supplier=COALESCE($3,supplier),updated_at=now() WHERE id=$4 AND tenant_id=$5 AND is_active=true RETURNING id,quantity,buying_price AS "buyingPrice",supplier,updated_at AS "updatedAt"',
            [quantity, unitCost, data.supplier || null, data.productId, req.user.tenant_id]
        );
        if (!product.rowCount) throw Object.assign(new Error('Product not found'), { status: 404 });
        const purchase = await client.query('INSERT INTO purchases (tenant_id,product_id,supplier,quantity,unit_cost) VALUES ($1,$2,$3,$4,$5) RETURNING id,created_at AS date', [req.user.tenant_id, data.productId, data.supplier || '', quantity, unitCost]);
        const movement = await client.query('INSERT INTO stock_movements (tenant_id,product_id,quantity,reason) VALUES ($1,$2,$3,$4) RETURNING id,product_id AS "productId",quantity,reason,created_at AS date', [req.user.tenant_id, data.productId, quantity, 'Purchase']);
        await addAudit(client, req.user.tenant_id, req.user.id, 'Purchase recorded', `${data.productId}: ${quantity}`);
        await client.query('COMMIT');
        res.status(201).json({ purchase: { ...data, id: purchase.rows[0].id, date: purchase.rows[0].date }, product: product.rows[0], movement: movement.rows[0] });
    } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
});

app.get('/api/customers', requireAuth, async (req, res, next) => { try { const result = await pool.query(`SELECT id,name,phone,last_purchase AS "lastPurchase",total_spent AS "totalSpent",purchase_count AS "purchaseCount" FROM customers WHERE tenant_id=$1 ORDER BY name`, [req.user.tenant_id]); res.json({ customers: result.rows }); } catch (error) { next(error); } });
app.post('/api/expenses', requireAuth, async (req, res, next) => { try { const result = await pool.query(`INSERT INTO expenses (tenant_id,description,amount,category,expense_date) VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE)) RETURNING id,description,amount,category,expense_date AS date`, [req.user.tenant_id, req.body.description, Number(req.body.amount) || 0, req.body.category || '', req.body.date || null]); await addAudit(pool, req.user.tenant_id, req.user.id, 'Expense recorded', req.body.description || ''); res.status(201).json({ expense: result.rows[0] }); } catch (error) { next(error); } });
app.get('/api/suppliers', requireAuth, async (req, res, next) => { try { const result = await pool.query('SELECT id,name,contact,phone FROM suppliers WHERE tenant_id=$1 ORDER BY name', [req.user.tenant_id]); res.json({ suppliers: result.rows }); } catch (error) { next(error); } });
app.post('/api/suppliers', requireAuth, async (req, res, next) => { try { const result = await pool.query('INSERT INTO suppliers (tenant_id,name,contact,phone) VALUES ($1,$2,$3,$4) RETURNING id,name,contact,phone', [req.user.tenant_id, req.body.name, req.body.contact || '', req.body.phone || '']); res.status(201).json({ supplier: result.rows[0] }); } catch (error) { next(error); } });
app.patch('/api/suppliers/:id', requireAuth, async (req, res, next) => { try { const result = await pool.query('UPDATE suppliers SET name=COALESCE($1,name),contact=COALESCE($2,contact),phone=COALESCE($3,phone) WHERE id=$4 AND tenant_id=$5 RETURNING id,name,contact,phone', [req.body.name, req.body.contact, req.body.phone, req.params.id, req.user.tenant_id]); if (!result.rowCount) return res.status(404).json({ error: 'Supplier not found' }); res.json({ supplier: result.rows[0] }); } catch (error) { next(error); } });
app.delete('/api/suppliers/:id', requireAuth, async (req, res, next) => { try { await pool.query('DELETE FROM suppliers WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]); res.status(204).end(); } catch (error) { next(error); } });
app.get('/api/users', requireAuth, requireStaffAdmin, async (req, res, next) => { try { const result = await pool.query(`${userSelect} WHERE tenant_id=$1 AND is_active = true ORDER BY created_at`, [req.user.tenant_id]); res.json({ users: result.rows }); } catch (error) { next(error); } });
app.post('/api/users', requireAuth, requireStaffAdmin, async (req, res, next) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = ['manager', 'cashier'].includes(req.body?.role) ? req.body.role : 'cashier';
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) return res.status(400).json({ error: 'Name, valid email, and a 12-128 character password are required' });
    try {
        const authUser = await supabaseAdminRequest('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }) });
        try {
            const result = await pool.query('INSERT INTO users (tenant_id,auth_user_id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,name,email,role', [req.user.tenant_id, authUser.id, name, email, 'supabase-auth-managed', role]);
            res.status(201).json({ user: result.rows[0] });
        } catch (error) {
            await supabaseAdminRequest(`/auth/v1/admin/users/${authUser.id}`, { method: 'DELETE' }).catch(() => {});
            if (error.code === '23505') return res.status(409).json({ error: 'That email is already in use' });
            throw error;
        }
    } catch (error) { next(error); }
});
app.delete('/api/users/:id', requireAuth, requireStaffAdmin, async (req, res, next) => { try { if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot revoke yourself' }); const result = await pool.query('UPDATE users SET is_active=false WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]); if (!result.rowCount) return res.status(404).json({ error: 'User not found' }); res.status(204).end(); } catch (error) { next(error); } });
app.patch('/api/auth/password', requireAuth, async (req, res, next) => {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (newPassword.length < 12 || newPassword.length > 128) return res.status(400).json({ error: 'New password must be between 12 and 128 characters' });
    try {
        await supabaseRequest('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password: newPassword }) }, req.authToken);
        await addAudit(pool, req.user.tenant_id, req.user.id, 'Password changed');
        res.json({ ok: true });
    } catch (error) { next(error); }
});
app.get('/api/register', requireAuth, async (req, res, next) => { try { const result = await pool.query(`SELECT is_open AS "isOpen",opening_cash AS "openingCash",opened_at AS "openedAt",closing_cash AS "closingCash",closed_at AS "closedAt" FROM registers WHERE tenant_id=$1`, [req.user.tenant_id]); res.json({ register: result.rows[0] || { isOpen: false, openingCash: 0, openedAt: null } }); } catch (error) { next(error); } });
app.post('/api/register/open', requireAuth, async (req, res, next) => { try { const result = await pool.query(`INSERT INTO registers (tenant_id,is_open,opening_cash,opened_at) VALUES ($1,true,$2,now()) ON CONFLICT (tenant_id) DO UPDATE SET is_open=true,opening_cash=EXCLUDED.opening_cash,opened_at=EXCLUDED.opened_at,closing_cash=NULL,closed_at=NULL RETURNING is_open AS "isOpen",opening_cash AS "openingCash",opened_at AS "openedAt"`, [req.user.tenant_id, Number(req.body.openingCash) || 0]); await addAudit(pool, req.user.tenant_id, req.user.id, 'Register opened'); res.json({ register: result.rows[0] }); } catch (error) { next(error); } });
app.post('/api/register/close', requireAuth, async (req, res, next) => { try { const result = await pool.query(`UPDATE registers SET is_open=false,closing_cash=$1,closed_at=now() WHERE tenant_id=$2 RETURNING is_open AS "isOpen",opening_cash AS "openingCash",opened_at AS "openedAt",closing_cash AS "closingCash",closed_at AS "closedAt"`, [Number(req.body.closingCash) || 0, req.user.tenant_id]); await addAudit(pool, req.user.tenant_id, req.user.id, 'Register closed'); res.json({ register: result.rows[0] }); } catch (error) { next(error); } });

app.get('/api/held-sales', requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(`SELECT id, tenant_id AS "tenantId", cashier_id AS "cashierId", customer_name AS "customerName", customer_phone AS "customerPhone", items, subtotal, discount, total, status, notes, created_at AS "createdAt", updated_at AS "updatedAt", held_at AS "heldAt", resumed_at AS "resumedAt" FROM held_sales WHERE tenant_id = $1 ORDER BY updated_at DESC`, [req.user.tenant_id]);
        res.json({ heldSales: result.rows });
    } catch (error) { next(error); }
});

app.post('/api/held-sales', requireAuth, async (req, res, next) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const customerName = typeof req.body?.customerName === 'string' && req.body.customerName.trim() ? req.body.customerName.trim() : 'Walk-in Customer';
    const customerPhone = typeof req.body?.customerPhone === 'string' ? req.body.customerPhone.trim() : '';
    const subtotal = Number(req.body?.subtotal) || 0;
    const discount = Number(req.body?.discount) || 0;
    const total = Number(req.body?.total) || Math.max(0, subtotal - discount);
    try {
        const result = await pool.query(`INSERT INTO held_sales (tenant_id, cashier_id, customer_name, customer_phone, items, subtotal, discount, total, status, notes, held_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'held', $9, now(), now()) RETURNING id, tenant_id AS "tenantId", cashier_id AS "cashierId", customer_name AS "customerName", customer_phone AS "customerPhone", items, subtotal, discount, total, status, notes, created_at AS "createdAt", updated_at AS "updatedAt", held_at AS "heldAt"`, [req.user.tenant_id, req.user.id, customerName, customerPhone, JSON.stringify(items), subtotal, discount, total, String(req.body?.notes || '').trim()]);
        await addAudit(pool, req.user.tenant_id, req.user.id, 'Held sale created', result.rows[0].id);
        res.status(201).json({ heldSale: result.rows[0] });
    } catch (error) { next(error); }
});

app.patch('/api/held-sales/:id', requireAuth, async (req, res, next) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    const subtotal = req.body?.subtotal != null ? Number(req.body.subtotal) || 0 : null;
    const discount = req.body?.discount != null ? Number(req.body.discount) || 0 : null;
    const total = req.body?.total != null ? Number(req.body.total) || 0 : null;
    const status = typeof req.body?.status === 'string' ? req.body.status : null;
    try {
        const result = await pool.query(
            `UPDATE held_sales SET items = COALESCE($1::jsonb, items), subtotal = COALESCE($2, subtotal), discount = COALESCE($3, discount), total = COALESCE($4, total), status = COALESCE($5, status), updated_at = now(), resumed_at = CASE WHEN $5 = 'held' THEN now() ELSE resumed_at END WHERE id = $6 AND tenant_id = $7 RETURNING id, tenant_id AS "tenantId", cashier_id AS "cashierId", customer_name AS "customerName", customer_phone AS "customerPhone", items, subtotal, discount, total, status, notes, created_at AS "createdAt", updated_at AS "updatedAt", held_at AS "heldAt", resumed_at AS "resumedAt"`,
            [items ? JSON.stringify(items) : null, subtotal, discount, total, status, req.params.id, req.user.tenant_id]
        );
        if (!result.rowCount) return res.status(404).json({ error: 'Held sale not found' });
        await addAudit(pool, req.user.tenant_id, req.user.id, 'Held sale updated', result.rows[0].id);
        res.json({ heldSale: result.rows[0] });
    } catch (error) { next(error); }
});

app.delete('/api/held-sales/:id', requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query('UPDATE held_sales SET status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3 RETURNING id', ['cancelled', req.params.id, req.user.tenant_id]);
        if (!result.rowCount) return res.status(404).json({ error: 'Held sale not found' });
        await addAudit(pool, req.user.tenant_id, req.user.id, 'Held sale cancelled', req.params.id);
        res.json({ ok: true });
    } catch (error) { next(error); }
});

app.get('/api/products', requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, name, sku, selling_price, buying_price, quantity, created_at FROM products WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC',
            [req.user.tenant_id]
        );
        res.json({ products: result.rows });
    } catch (error) {
        next(error);
    }
});

app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to complete your request right now. Please try again.' });
});

if (require.main === module) {
    app.listen(port, () => console.log(`KoraPoint API listening on port ${port}`));
}

module.exports = app;