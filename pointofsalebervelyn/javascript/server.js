require('dotenv').config();

const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { z } = require('zod');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;
const businessApprovalCode = process.env.BUSINESS_APPROVAL_CODE;
const resendApiKey = process.env.RESEND_API_KEY;
const reportFromEmail = process.env.REPORT_FROM_EMAIL;

if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

app.use(helmet());
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

const signupSchema = z.object({
    accessCode: z.string().min(1).max(100),
    companyName: z.string().trim().min(2).max(120),
    businessType: z.enum([
        'Hardware shop', 'Provision shop', 'Grocery store', 'Clothing and fashion', 'Pharmacy',
        'Electronics shop', 'Restaurant or food business', 'Beauty and personal care',
        'Automotive shop', 'Agricultural supplies', 'Other'
    ]),
    country: z.string().trim().length(2).default('GH'),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128)
});
const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(128)
});

function createAccessToken(user) {
    return jwt.sign({ sub: user.id, tenantId: user.tenant_id, role: user.role }, jwtSecret, { expiresIn: '15m' });
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId) {
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    await pool.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval \'30 days\')',
        [userId, hashToken(refreshToken)]
    );
    return refreshToken;
}

async function authResponse(user) {
    return {
        accessToken: createAccessToken(user),
        refreshToken: await issueRefreshToken(user.id),
        user
    };
}

async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    try {
        const claims = jwt.verify(token, jwtSecret);
        const result = await pool.query(
            'SELECT id, tenant_id, name, email, role FROM users WHERE id = $1 AND tenant_id = $2 AND is_active = true',
            [claims.sub, claims.tenantId]
        );
        if (result.rowCount !== 1) return res.status(401).json({ error: 'Account is unavailable' });
        req.user = result.rows[0];
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

app.post('/api/auth/signup', async (req, res, next) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please check your signup details and try again.' });
    if (!businessApprovalCode || parsed.data.accessCode !== businessApprovalCode) {
        return res.status(403).json({ error: 'A valid approval code is required. Contact the KoraPoint user.' });
    }

    const data = parsed.data;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const passwordHash = await bcrypt.hash(data.password, 12);
        const tenant = await client.query(
            'INSERT INTO tenants (name, business_type, country) VALUES ($1, $2, $3) RETURNING id, name, business_type, country, currency',
            [data.companyName, data.businessType, data.country.toUpperCase()]
        );
        const user = await client.query(
            'INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, tenant_id, name, email, role',
            [tenant.rows[0].id, data.name, data.email.toLowerCase(), passwordHash, 'owner']
        );
        await client.query('COMMIT');
        res.status(201).json({ ...(await authResponse(user.rows[0])), company: tenant.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') return res.status(409).json({ error: 'An account with that email already exists' });
        next(error);
    } finally {
        client.release();
    }
});

app.post('/api/auth/login', async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please check your login details and try again.' });
    try {
        const result = await pool.query(
            `SELECT u.id, u.tenant_id, u.name, u.email, u.role, u.password_hash,
                    t.id AS company_id, t.name AS company_name, t.business_type, t.country, t.currency
             FROM users u JOIN tenants t ON t.id = u.tenant_id
             WHERE u.email = $1 AND u.is_active = true`,
            [parsed.data.email.toLowerCase()]
        );
        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const company = { id: user.company_id, name: user.company_name, business_type: user.business_type, country: user.country, currency: user.currency };
        delete user.password_hash;
        delete user.company_id;
        delete user.company_name;
        delete user.business_type;
        delete user.country;
        delete user.currency;
        res.json({ ...(await authResponse(user)), company });
    } catch (error) {
        next(error);
    }
});

app.post('/api/auth/refresh', async (req, res, next) => {
    const token = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
    if (!token) return res.status(400).json({ error: 'Refresh token is required' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `SELECT u.id, u.tenant_id, u.name, u.email, u.role
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now() AND u.is_active = true`,
            [hashToken(token)]
        );
        if (result.rowCount !== 1) {
            await client.query('ROLLBACK');
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
        await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1', [hashToken(token)]);
        const user = result.rows[0];
        const replacement = crypto.randomBytes(48).toString('base64url');
        await client.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval \'30 days\')',
            [user.id, hashToken(replacement)]
        );
        await client.query('COMMIT');
        res.json({ accessToken: createAccessToken(user), refreshToken: replacement, user });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    const company = await pool.query(
        'SELECT id, name, business_type, country, currency FROM tenants WHERE id = $1',
        [req.user.tenant_id]
    );
    res.json({ user: req.user, company: company.rows[0] });
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
            pool.query(`${productSelect} WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]),
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
    try { const result = await pool.query('DELETE FROM products WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]); if (!result.rowCount) return res.status(404).json({ error: 'Product not found' }); await addAudit(pool, req.user.tenant_id, req.user.id, 'Product deleted', req.params.id); res.status(204).end(); } catch (error) { next(error); }
});

app.post('/api/products/:id/stock-adjustments', requireAuth, async (req, res, next) => {
    const amount = Number(req.body?.quantity); if (!Number.isFinite(amount) || amount === 0) return res.status(400).json({ error: 'A non-zero quantity is required' });
    const client = await pool.connect();
    try { await client.query('BEGIN'); const product = await client.query('UPDATE products SET quantity=GREATEST(0, quantity + $1) WHERE id=$2 AND tenant_id=$3 RETURNING id', [amount, req.params.id, req.user.tenant_id]); if (!product.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Product not found' }); } await client.query('INSERT INTO stock_movements (tenant_id, product_id, quantity, reason) VALUES ($1,$2,$3,$4)', [req.user.tenant_id, req.params.id, amount, req.body.reason || 'Manual adjustment']); await addAudit(client, req.user.tenant_id, req.user.id, 'Stock adjusted', `${req.params.id}: ${amount}`); await client.query('COMMIT'); res.status(201).json({ ok: true }); } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
});

app.post('/api/sales', requireAuth, async (req, res, next) => {
    const sale = req.body || {}; if (!Array.isArray(sale.items) || !sale.items.length) return res.status(400).json({ error: 'Sale items are required' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const item of sale.items) {
            const stock = await client.query('UPDATE products SET quantity=quantity-$1 WHERE id=$2 AND tenant_id=$3 AND quantity >= $1 RETURNING id', [Number(item.quantity), item.productId, req.user.tenant_id]);
            if (!stock.rowCount) throw Object.assign(new Error('Insufficient stock'), { status: 409 });
            await client.query('INSERT INTO stock_movements (tenant_id, product_id, quantity, reason) VALUES ($1,$2,$3,$4)', [req.user.tenant_id, item.productId, -Number(item.quantity), 'Sale']);
        }
        const inserted = await client.query(`INSERT INTO sales (tenant_id, customer_name, customer_phone, payment_method, items, total, profit, cash_received, change_amount, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at AS date`, [req.user.tenant_id, sale.customerName || 'Walk-in Customer', sale.customerPhone || '', sale.paymentMethod || 'Cash', JSON.stringify(sale.items), Number(sale.total) || 0, Number(sale.profit) || 0, Number(sale.cashReceived) || 0, Number(sale.change) || 0, req.user.id]);
        if (sale.customerName && sale.customerName !== 'Walk-in Customer') await client.query(`INSERT INTO customers (tenant_id,name,phone,last_purchase,total_spent,purchase_count) VALUES ($1,$2,$3,now(),$4,1) ON CONFLICT (tenant_id,name) DO UPDATE SET phone=EXCLUDED.phone,last_purchase=now(),total_spent=customers.total_spent+EXCLUDED.total_spent,purchase_count=customers.purchase_count+1`, [req.user.tenant_id, sale.customerName, sale.customerPhone || '', Number(sale.total) || 0]);
        await addAudit(client, req.user.tenant_id, req.user.id, 'Sale completed', inserted.rows[0].id);
        await client.query('COMMIT'); res.status(201).json({ sale: { ...sale, id: inserted.rows[0].id, date: inserted.rows[0].date } });
    } catch (error) { await client.query('ROLLBACK'); next(error.status ? Object.assign(error, { status: error.status }) : error); } finally { client.release(); }
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
    const data = req.body || {}; const quantity = Number(data.quantity); const unitCost = Number(data.unitCost); if (!data.productId || quantity <= 0 || unitCost < 0) return res.status(400).json({ error: 'Valid product, quantity, and cost are required' });
    const client = await pool.connect();
    try { await client.query('BEGIN'); const product = await client.query('UPDATE products SET quantity=quantity+$1,buying_price=$2,supplier=COALESCE($3,supplier) WHERE id=$4 AND tenant_id=$5 RETURNING id', [quantity, unitCost, data.supplier || null, data.productId, req.user.tenant_id]); if (!product.rowCount) throw Object.assign(new Error('Product not found'), { status: 404 }); const purchase = await client.query('INSERT INTO purchases (tenant_id,product_id,supplier,quantity,unit_cost) VALUES ($1,$2,$3,$4,$5) RETURNING id,created_at AS date', [req.user.tenant_id, data.productId, data.supplier || '', quantity, unitCost]); await client.query('INSERT INTO stock_movements (tenant_id,product_id,quantity,reason) VALUES ($1,$2,$3,$4)', [req.user.tenant_id, data.productId, quantity, 'Purchase']); await addAudit(client, req.user.tenant_id, req.user.id, 'Purchase recorded', `${data.productId}: ${quantity}`); await client.query('COMMIT'); res.status(201).json({ purchase: { ...data, id: purchase.rows[0].id, date: purchase.rows[0].date } }); } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
});

app.get('/api/customers', requireAuth, async (req, res, next) => { try { const result = await pool.query(`SELECT id,name,phone,last_purchase AS "lastPurchase",total_spent AS "totalSpent",purchase_count AS "purchaseCount" FROM customers WHERE tenant_id=$1 ORDER BY name`, [req.user.tenant_id]); res.json({ customers: result.rows }); } catch (error) { next(error); } });
app.post('/api/expenses', requireAuth, async (req, res, next) => { try { const result = await pool.query(`INSERT INTO expenses (tenant_id,description,amount,category,expense_date) VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE)) RETURNING id,description,amount,category,expense_date AS date`, [req.user.tenant_id, req.body.description, Number(req.body.amount) || 0, req.body.category || '', req.body.date || null]); await addAudit(pool, req.user.tenant_id, req.user.id, 'Expense recorded', req.body.description || ''); res.status(201).json({ expense: result.rows[0] }); } catch (error) { next(error); } });
app.get('/api/suppliers', requireAuth, async (req, res, next) => { try { const result = await pool.query('SELECT id,name,contact,phone FROM suppliers WHERE tenant_id=$1 ORDER BY name', [req.user.tenant_id]); res.json({ suppliers: result.rows }); } catch (error) { next(error); } });
app.post('/api/suppliers', requireAuth, async (req, res, next) => { try { const result = await pool.query('INSERT INTO suppliers (tenant_id,name,contact,phone) VALUES ($1,$2,$3,$4) RETURNING id,name,contact,phone', [req.user.tenant_id, req.body.name, req.body.contact || '', req.body.phone || '']); res.status(201).json({ supplier: result.rows[0] }); } catch (error) { next(error); } });
app.patch('/api/suppliers/:id', requireAuth, async (req, res, next) => { try { const result = await pool.query('UPDATE suppliers SET name=COALESCE($1,name),contact=COALESCE($2,contact),phone=COALESCE($3,phone) WHERE id=$4 AND tenant_id=$5 RETURNING id,name,contact,phone', [req.body.name, req.body.contact, req.body.phone, req.params.id, req.user.tenant_id]); if (!result.rowCount) return res.status(404).json({ error: 'Supplier not found' }); res.json({ supplier: result.rows[0] }); } catch (error) { next(error); } });
app.delete('/api/suppliers/:id', requireAuth, async (req, res, next) => { try { await pool.query('DELETE FROM suppliers WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]); res.status(204).end(); } catch (error) { next(error); } });
app.get('/api/users', requireAuth, requireStaffAdmin, async (req, res, next) => { try { const result = await pool.query(`${userSelect} WHERE tenant_id=$1 AND is_active = true ORDER BY created_at`, [req.user.tenant_id]); res.json({ users: result.rows }); } catch (error) { next(error); } });
app.post('/api/users', requireAuth, requireStaffAdmin, async (req, res, next) => { try { if (!req.body.name || !req.body.email || !req.body.password) return res.status(400).json({ error: 'Name, email, and password are required' }); const passwordHash = await bcrypt.hash(req.body.password, 12); const result = await pool.query('INSERT INTO users (tenant_id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role', [req.user.tenant_id, req.body.name.trim(), req.body.email.toLowerCase(), passwordHash, ['manager', 'cashier'].includes(req.body.role) ? req.body.role : 'cashier']); res.status(201).json({ user: result.rows[0] }); } catch (error) { if (error.code === '23505') return res.status(409).json({ error: 'That email is already in use' }); next(error); } });
app.delete('/api/users/:id', requireAuth, requireStaffAdmin, async (req, res, next) => { try { if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot revoke yourself' }); const result = await pool.query('UPDATE users SET is_active=false WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]); if (!result.rowCount) return res.status(404).json({ error: 'User not found' }); res.status(204).end(); } catch (error) { next(error); } });
app.patch('/api/auth/password', requireAuth, async (req, res, next) => {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (newPassword.length < 12 || newPassword.length > 128) return res.status(400).json({ error: 'New password must be between 12 and 128 characters' });
    try {
        const result = await pool.query('SELECT password_hash FROM users WHERE id=$1 AND tenant_id=$2 AND is_active=true', [req.user.id, req.user.tenant_id]);
        if (!result.rowCount || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) return res.status(401).json({ error: 'Current password is incorrect' });
        await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2 AND tenant_id=$3', [await bcrypt.hash(newPassword, 12), req.user.id, req.user.tenant_id]);
        await addAudit(pool, req.user.tenant_id, req.user.id, 'Password changed');
        res.json({ ok: true });
    } catch (error) { next(error); }
});
app.get('/api/register', requireAuth, async (req, res, next) => { try { const result = await pool.query(`SELECT is_open AS "isOpen",opening_cash AS "openingCash",opened_at AS "openedAt",closing_cash AS "closingCash",closed_at AS "closedAt" FROM registers WHERE tenant_id=$1`, [req.user.tenant_id]); res.json({ register: result.rows[0] || { isOpen: false, openingCash: 0, openedAt: null } }); } catch (error) { next(error); } });
app.post('/api/register/open', requireAuth, async (req, res, next) => { try { const result = await pool.query(`INSERT INTO registers (tenant_id,is_open,opening_cash,opened_at) VALUES ($1,true,$2,now()) ON CONFLICT (tenant_id) DO UPDATE SET is_open=true,opening_cash=EXCLUDED.opening_cash,opened_at=EXCLUDED.opened_at,closing_cash=NULL,closed_at=NULL RETURNING is_open AS "isOpen",opening_cash AS "openingCash",opened_at AS "openedAt"`, [req.user.tenant_id, Number(req.body.openingCash) || 0]); await addAudit(pool, req.user.tenant_id, req.user.id, 'Register opened'); res.json({ register: result.rows[0] }); } catch (error) { next(error); } });
app.post('/api/register/close', requireAuth, async (req, res, next) => { try { const result = await pool.query(`UPDATE registers SET is_open=false,closing_cash=$1,closed_at=now() WHERE tenant_id=$2 RETURNING is_open AS "isOpen",opening_cash AS "openingCash",opened_at AS "openedAt",closing_cash AS "closingCash",closed_at AS "closedAt"`, [Number(req.body.closingCash) || 0, req.user.tenant_id]); await addAudit(pool, req.user.tenant_id, req.user.id, 'Register closed'); res.json({ register: result.rows[0] }); } catch (error) { next(error); } });

app.get('/api/products', requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, name, sku, selling_price, buying_price, quantity, created_at FROM products WHERE tenant_id = $1 ORDER BY created_at DESC',
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