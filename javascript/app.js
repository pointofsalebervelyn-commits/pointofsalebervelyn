// ============================================================
//  DATA LAYER — localStorage persistence
// ============================================================
const DB = {
    get(key, fallback) {
        try {
            const raw = localStorage.getItem('nexatill_' + key);
            return raw ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    },
    set(key, val) {
        localStorage.setItem('nexatill_' + key, JSON.stringify(val));
    }
};

const API_BASE = window.NEXATILL_API_URL || 'http://localhost:3000';
const SESSION_KEY = 'nexatill_session';

async function apiRequest(path, options = {}, token = '') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs) || 15000);
    let response;
    try {
        response = await fetch(API_BASE + path, {
            ...options,
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
        });
    } catch (error) {
        if (error.name === 'AbortError') throw new Error('The server took too long to respond. Please try again.');
        throw error;
    } finally {
        clearTimeout(timeout);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: response.status });
    return data;
}

async function apiRequestWithSession(path, options = {}) {
    let session = DB.get(SESSION_KEY, null);
    if (!session?.accessToken) throw Object.assign(new Error('Please sign in again.'), { status: 401 });
    try {
        return await apiRequest(path, options, session.accessToken);
    } catch (error) {
        if (error.status !== 401 || !session.refreshToken) throw error;
        const refreshed = await apiRequest('/api/auth/refresh', {
            method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken })
        });
        DB.set(SESSION_KEY, refreshed);
        window.dispatchEvent(new CustomEvent('nexatill:session-refreshed', { detail: refreshed }));
        return apiRequest(path, options, refreshed.accessToken);
    }
}

const defaultProducts = [{
    id: 'p1',
    name: 'Portland Cement 50kg',
    image: '🧱',
    category: 'Cement',
    materialType: 'Cement',
    supplier: 'Lafarge',
    buyingPrice: 12.50,
    sellingPrice: 18.00,
    quantity: 120,
    minStockLevel: 20,
    unit: 'bag',
    description: 'High-quality Portland cement for construction.',
    barcode: 'CEM-001',
    dateAdded: new Date().toISOString()
}, {
    id: 'p2',
    name: 'Galvanized Nails 3-inch',
    image: '🔩',
    category: 'Nails',
    materialType: 'Steel',
    supplier: 'Fastener Co',
    buyingPrice: 4.20,
    sellingPrice: 6.50,
    quantity: 450,
    minStockLevel: 50,
    unit: 'box',
    description: '3-inch galvanized nails, 500 per box.',
    barcode: 'NAIL-003',
    dateAdded: new Date().toISOString()
}, {
    id: 'p3',
    name: 'White Emulsion Paint 5L',
    image: '🎨',
    category: 'Paints',
    materialType: 'Paint',
    supplier: 'Dulux',
    buyingPrice: 28.00,
    sellingPrice: 39.00,
    quantity: 65,
    minStockLevel: 10,
    unit: 'can',
    description: 'Premium white emulsion paint, 5 liters.',
    barcode: 'PNT-007',
    dateAdded: new Date().toISOString()
}, {
    id: 'p4',
    name: 'PVC Pipe 1/2 inch x 3m',
    image: '🔧',
    category: 'Pipes',
    materialType: 'Plastic',
    supplier: 'PlumbTech',
    buyingPrice: 3.80,
    sellingPrice: 5.90,
    quantity: 200,
    minStockLevel: 30,
    unit: 'piece',
    description: 'PVC pipe, 1/2 inch diameter, 3 meters length.',
    barcode: 'PIP-012',
    dateAdded: new Date().toISOString()
}, {
    id: 'p5',
    name: 'Ceramic Floor Tile 60x60',
    image: '⬛',
    category: 'Tiles',
    materialType: 'Ceramic',
    supplier: 'TileMaster',
    buyingPrice: 8.00,
    sellingPrice: 12.50,
    quantity: 340,
    minStockLevel: 40,
    unit: 'piece',
    description: 'Ceramic floor tile, 60x60 cm, matte finish.',
    barcode: 'TIL-023',
    dateAdded: new Date().toISOString()
}, {
    id: 'p6',
    name: 'Steel Rebar 12mm x 6m',
    image: '⛓️',
    category: 'Steel materials',
    materialType: 'Steel',
    supplier: 'SteelCorp',
    buyingPrice: 15.00,
    sellingPrice: 22.00,
    quantity: 85,
    minStockLevel: 15,
    unit: 'piece',
    description: '12mm steel rebar, 6 meters length.',
    barcode: 'STL-045',
    dateAdded: new Date().toISOString()
}, {
    id: 'p7',
    name: 'Safety Helmet Yellow',
    image: '⛑️',
    category: 'Safety equipment',
    materialType: 'Plastic',
    supplier: 'SafeGuard',
    buyingPrice: 6.50,
    sellingPrice: 10.00,
    quantity: 30,
    minStockLevel: 8,
    unit: 'piece',
    description: 'Yellow safety helmet, ANSI approved.',
    barcode: 'SAF-001',
    dateAdded: new Date().toISOString()
}, {
    id: 'p8',
    name: 'Wood Glue 500ml',
    image: '🧴',
    category: 'Adhesives',
    materialType: 'Adhesive',
    supplier: 'Gorilla',
    buyingPrice: 4.00,
    sellingPrice: 6.20,
    quantity: 110,
    minStockLevel: 20,
    unit: 'bottle',
    description: 'Strong wood glue, 500ml bottle.',
    barcode: 'ADH-009',
    dateAdded: new Date().toISOString()
}];

// Seed data
if (!DB.get('products', null)) DB.set('products', defaultProducts);
if (!DB.get('sales', null)) DB.set('sales', []);
if (!DB.get('customers', null)) DB.set('customers', []);
if (!DB.get('suppliers', null)) DB.set('suppliers', [
    { id: 's1', name: 'Lafarge', contact: 'info@lafarge.com', phone: '+123456789' },
    { id: 's2', name: 'Fastener Co', contact: 'sales@fastener.com', phone: '+987654321' },
    { id: 's3', name: 'Dulux', contact: 'support@dulux.com', phone: '+1122334455' },
    { id: 's4', name: 'PlumbTech', contact: 'info@plumbtech.com', phone: '+5544332211' },
]);
if (!DB.get('expenses', null)) DB.set('expenses', []);
if (!DB.get('users', null)) DB.set('users', [{ id: 'u1', name: 'Admin', role: 'admin', password: 'admin123' }]);
if (!DB.get('register', null)) DB.set('register', { isOpen: false, openingCash: 0, openedAt: null });
if (!DB.get('stockMovements', null)) DB.set('stockMovements', []);
if (!DB.get('purchases', null)) DB.set('purchases', []);
if (!DB.get('auditLogs', null)) DB.set('auditLogs', []);

// ============================================================
//  REACT APP
// ============================================================
const { useState, useEffect, useMemo, useCallback, useContext, createContext, useRef, useReducer } = React;

const formatCurrency = (amount) => new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2
}).format(Number(amount) || 0);
const isActiveSale = sale => sale.status !== 'refunded';

// ---------- Context ----------
const AppContext = createContext();

function AppProvider({ children }) {
    const [products, setProducts] = useState(() => DB.get('products', defaultProducts));
    const [groups, setGroups] = useState(() => DB.get('groups', []));
    const [quickSellItems, setQuickSellItems] = useState(() => DB.get('quickSellItems', []));
    const [sales, setSales] = useState(() => DB.get('sales', []));
    const [customers, setCustomers] = useState(() => DB.get('customers', []));
    const [suppliers, setSuppliers] = useState(() => DB.get('suppliers', []));
    const [expenses, setExpenses] = useState(() => DB.get('expenses', []));
    const [users, setUsers] = useState(() => DB.get('users', [{ id: 'u1', name: 'Admin', role: 'admin',
        password: 'admin123' }]));
    const [register, setRegister] = useState(() => DB.get('register', { isOpen: false, openingCash: 0, openedAt: null }));
    const [stockMovements, setStockMovements] = useState(() => DB.get('stockMovements', []));
    const [purchases, setPurchases] = useState(() => DB.get('purchases', []));
    const [auditLogs, setAuditLogs] = useState(() => DB.get('auditLogs', []));
    const [cart, setCart] = useState([]);
    const [parkedCarts, setParkedCarts] = useState(() => DB.get('parkedCarts', []));
    const [heldSales, setHeldSales] = useState(() => DB.get('heldSales', []));
    const savedSession = DB.get(SESSION_KEY, null);
    const [currentUser, setCurrentUser] = useState(() => savedSession?.user || null);
    const [currentCompany, setCurrentCompany] = useState(() => savedSession?.company || null);
    const [toast, setToast] = useState(null);
    const [offlineQueueVersion, setOfflineQueueVersion] = useState(0);

    const clearLocalTenantData = () => {
        setProducts([]); setSales([]); setCustomers([]); setSuppliers([]); setExpenses([]);
        setUsers([]); setRegister({ isOpen: false, openingCash: 0, openedAt: null });
        setStockMovements([]); setPurchases([]); setAuditLogs([]);
        setParkedCarts([]); setHeldSales([]); DB.set('parkedCarts', []); DB.set('heldSales', []);
    };

    const refreshTenantData = async () => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (!token) return;
        if (token === 'local-demo-token') {
            const localUsers = getLocalUsers();
            const currentSession = DB.get(SESSION_KEY, null);
            const localOwner = localUsers.find(user => user.id === currentSession?.user?.id) || localUsers[0];
            const company = localOwner?.company || { id: 'local-tenant', name: 'Local Business', business_type: 'Other', country: 'GH', currency: 'GHS' };
            setProducts(DB.get('products', []));
            setGroups(DB.get('groups', []));
            setQuickSellItems(DB.get('quickSellItems', []));
            setSales(DB.get('sales', []));
            setCustomers(DB.get('customers', []));
            setSuppliers(DB.get('suppliers', []));
            setExpenses(DB.get('expenses', []));
            setUsers(localUsers);
            setRegister(DB.get('register', { isOpen: false, openingCash: 0, openedAt: null }));
            setStockMovements(DB.get('stockMovements', []));
            setPurchases(DB.get('purchases', []));
            setAuditLogs(DB.get('auditLogs', []));
            setHeldSales(DB.get('heldSales', []));
            setCurrentCompany(company);
            return;
        }
        const data = await apiRequest('/api/bootstrap', {}, token);
        setProducts(data.products || []); setGroups(data.groups || []); setQuickSellItems(data.quickSellItems || []); setSales(data.sales || []); setCustomers(data.customers || []);
        setSuppliers(data.suppliers || []); setExpenses(data.expenses || []); setUsers(data.users || []);
        setRegister(data.register || { isOpen: false, openingCash: 0, openedAt: null });
        setStockMovements(data.stockMovements || []); setPurchases(data.purchases || []); setAuditLogs(data.auditLogs || []);
        setHeldSales(data.heldSales || DB.get('heldSales', []));
    };

    const apiMutation = (path, method, body, successMessage) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (!token) return false;
        return apiRequest(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, token)
            .then(() => refreshTenantData()).then(() => { showToast(successMessage); });
    };

    const authenticate = async (path, credentials) => {
        try {
            const session = await apiRequest(path, { method: 'POST', body: JSON.stringify(credentials) });
            DB.set(SESSION_KEY, session);
            setCurrentUser(session.user);
            setCurrentCompany(session.company || null);
            clearLocalTenantData();
            setUsers([session.user]);
            await refreshTenantData();
            return session;
        } catch (error) {
            if (error instanceof TypeError || error.message === 'Failed to fetch' || error.message.includes('too long')) {
                throw new Error('Unable to complete your request right now. Please try again.');
            }
            throw error;
        }
    };

    const logout = () => {
        DB.set(SESSION_KEY, null);
        setCurrentUser(null);
        setCurrentCompany(null);
        clearLocalTenantData();
        setCart([]);
    };

    useEffect(() => {
        if (!savedSession?.accessToken || !savedSession.user) return;
        clearLocalTenantData();
        apiRequest('/api/bootstrap', {}, savedSession.accessToken)
            .then(data => { setProducts(data.products || []); setGroups(data.groups || []); setQuickSellItems(data.quickSellItems || []); setSales(data.sales || []); setCustomers(data.customers || []); setSuppliers(data.suppliers || []); setExpenses(data.expenses || []); setUsers(data.users || [savedSession.user]); setRegister(data.register || { isOpen: false, openingCash: 0, openedAt: null }); setStockMovements(data.stockMovements || []); setPurchases(data.purchases || []); setAuditLogs(data.auditLogs || []); })
            .catch(async error => {
                if (error.status === 401 && savedSession.refreshToken) {
                    try {
                        const session = await apiRequest('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: savedSession.refreshToken }) });
                        DB.set(SESSION_KEY, session);
                        setCurrentUser(session.user);
                        setCurrentCompany(session.company || null);
                        const data = await apiRequest('/api/bootstrap', {}, session.accessToken);
                        setProducts(data.products || []); setGroups(data.groups || []); setQuickSellItems(data.quickSellItems || []); setSales(data.sales || []); setCustomers(data.customers || []); setSuppliers(data.suppliers || []); setExpenses(data.expenses || []); setUsers(data.users || [session.user]); setRegister(data.register || { isOpen: false, openingCash: 0, openedAt: null }); setStockMovements(data.stockMovements || []); setPurchases(data.purchases || []); setAuditLogs(data.auditLogs || []);
                    } catch { logout(); showToast('Session expired. Please sign in again.', 'error'); }
                } else if (error.status === 401) { logout(); showToast('Your session has expired. Please sign in again.', 'error'); }
                else { showToast('Could not refresh shop data. Your current screen is still available.', 'error'); }
            });
    }, []);

    useEffect(() => {
        const handleRefresh = (event) => {
            const session = event.detail;
            if (session?.user) setCurrentUser(session.user);
            if (session?.company) setCurrentCompany(session.company);
        };
        window.addEventListener('nexatill:session-refreshed', handleRefresh);
        return () => window.removeEventListener('nexatill:session-refreshed', handleRefresh);
    }, []);

    // Persist
    useEffect(() => { DB.set('products', products); }, [products]);
    useEffect(() => { DB.set('groups', groups); }, [groups]);
    useEffect(() => { DB.set('quickSellItems', quickSellItems); }, [quickSellItems]);
    useEffect(() => { DB.set('sales', sales); }, [sales]);
    useEffect(() => { DB.set('customers', customers); }, [customers]);
    useEffect(() => { DB.set('suppliers', suppliers); }, [suppliers]);
    useEffect(() => { DB.set('expenses', expenses); }, [expenses]);
    useEffect(() => { DB.set('users', users); }, [users]);
    useEffect(() => { DB.set('register', register); }, [register]);
    useEffect(() => { DB.set('stockMovements', stockMovements); }, [stockMovements]);
    useEffect(() => { DB.set('purchases', purchases); }, [purchases]);
    useEffect(() => { DB.set('auditLogs', auditLogs); }, [auditLogs]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const addGroup = (group) => { const token=DB.get(SESSION_KEY,null)?.accessToken; if(token){ apiRequest('/api/groups',{method:'POST',body:JSON.stringify(group)},token).then(()=>refreshTenantData()).then(()=>showToast('Group added')).catch(e=>showToast(e.message,'error')); return; } setGroups(prev=>[...prev,{...group,id:'g'+Date.now(),displayOrder:group.displayOrder||prev.length,isActive:true}]); };
    const assignProductGroup = (productId, groupId) => { const token=DB.get(SESSION_KEY,null)?.accessToken; if(token){apiRequest(`/api/products/${productId}/group`,{method:'PATCH',body:JSON.stringify({groupId})},token).then(()=>refreshTenantData()).catch(e=>showToast(e.message,'error'));return;} setProducts(prev=>prev.map(x=>x.id===productId?{...x,groupId}:x)); };
    const saveQuickSell = (productIds) => { const token=DB.get(SESSION_KEY,null)?.accessToken; if(token){apiRequest('/api/quick-sell',{method:'PUT',body:JSON.stringify({productIds})},token).then(()=>refreshTenantData()).then(()=>showToast('Quick-sell grid updated')).catch(e=>showToast(e.message,'error'));return;} setQuickSellItems(productIds.map((productId,displayOrder)=>({productId,displayOrder,isActive:true}))); };

    const logAction = (action, details = '') => {
        setAuditLogs(prev => [...prev, {
            id: 'a' + Date.now(), action, details, user: currentUser?.name || 'Local user',
            date: new Date().toISOString()
        }]);
    };

    const addProduct = (p) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { return apiRequest('/api/products', { method: 'POST', body: JSON.stringify(p) }, token).then(data => { setProducts(prev => [data.product, ...prev]); showToast('Product added successfully!'); }); }
        setProducts(prev => [...prev, { ...p, id: 'p' + Date.now(), dateAdded: new Date().toISOString() }]);
        logAction('Product added', p.name);
        showToast('Product added successfully!');
        return Promise.resolve();
    };

    const updateProduct = (id, data) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { return apiRequest(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token).then(result => { setProducts(prev => prev.map(product => product.id === id ? result.product : product)); showToast('Product updated!'); }); }
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
        logAction('Product updated', id);
        showToast('Product updated!');
        return Promise.resolve();
    };

    const deleteProduct = (id) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { return apiRequest(`/api/products/${id}`, { method: 'DELETE' }, token).then(() => { setProducts(prev => prev.filter(product => product.id !== id)); showToast('Product archived.', 'info'); }); }
        setProducts(prev => prev.filter(p => p.id !== id));
        logAction('Product deleted', id);
        showToast('Product archived.', 'info');
        return Promise.resolve();
    };

    const adjustStock = (productId, quantity, reason = 'Manual adjustment') => {
        const amount = Math.trunc(Number(quantity));
        if (!Number.isFinite(amount) || amount === 0) return;
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { apiRequest(`/api/products/${productId}/stock-adjustments`, { method: 'POST', body: JSON.stringify({ quantity: amount, reason }) }, token).then(() => refreshTenantData()).then(() => showToast('Stock updated')).catch(error => showToast(error.message, 'error')); return; }
        setProducts(prev => prev.map(product => product.id === productId ? {
            ...product,
            quantity: Math.max(0, Math.round(Number(product.quantity) + amount))
        } : product));
        setStockMovements(prev => [...prev, {
            id: 'm' + Date.now(),
            productId,
            quantity: amount,
            reason,
            date: new Date().toISOString()
        }]);
        logAction('Stock adjusted', `${productId}: ${amount}`);
        showToast('Stock updated');
    };

    const openRegister = (openingCash) => {
        const amount = Number(openingCash) || 0;
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { apiRequest('/api/register/open', { method: 'POST', body: JSON.stringify({ openingCash: amount }) }, token).then(() => refreshTenantData()).then(() => showToast('Register opened')).catch(error => showToast(error.message, 'error')); return; }
        const nextRegister = { isOpen: true, openingCash: amount, openedAt: new Date().toISOString() };
        setRegister(nextRegister);
        DB.set('register', nextRegister);
        logAction('Register opened', formatCurrency(amount));
        showToast('Register opened');
    };

    const closeRegister = (closingCash) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { apiRequest('/api/register/close', { method: 'POST', body: JSON.stringify({ closingCash: Number(closingCash) || 0 }) }, token).then(() => refreshTenantData()).then(() => showToast('Register closed')).catch(error => showToast(error.message, 'error')); return; }
        const nextRegister = { ...register, isOpen: false, closingCash: Number(closingCash) || 0,
            closedAt: new Date().toISOString() };
        setRegister(nextRegister);
        DB.set('register', nextRegister);
        logAction('Register closed', formatCurrency(nextRegister.closingCash));
        showToast('Register closed');
    };

    const refundSale = (saleId) => {
        const sale = sales.find(item => item.id === saleId);
        if (!sale || sale.status === 'refunded') return false;
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { apiRequest(`/api/sales/${saleId}/refund`, { method: 'POST' }, token).then(() => refreshTenantData()).then(() => showToast('Sale refunded and stock restored')).catch(error => showToast(error.message, 'error')); return true; }
        const updatedProducts = products.map(product => {
            const item = sale.items.find(line => line.productId === product.id);
            return item ? { ...product, quantity: product.quantity + item.quantity } : product;
        });
        const updatedSales = sales.map(item => item.id === saleId ? {
            ...item, status: 'refunded', refundedAt: new Date().toISOString()
        } : item);
        setProducts(updatedProducts);
        setSales(updatedSales);
        DB.set('products', updatedProducts);
        DB.set('sales', updatedSales);
        setStockMovements(prev => [...prev, ...sale.items.map(item => ({
            id: 'm' + Date.now() + item.productId,
            productId: item.productId,
            quantity: item.quantity,
            reason: 'Refund',
            date: new Date().toISOString()
        }))]);
        logAction('Sale refunded', saleId);
        showToast('Sale refunded and stock restored');
        return true;
    };

    const recordPurchase = (purchase) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { apiRequest('/api/purchases', { method: 'POST', body: JSON.stringify(purchase) }, token).then(() => refreshTenantData()).then(() => showToast('Purchase recorded and stock updated')).catch(error => showToast(error.message, 'error')); return; }
        const updatedProducts = products.map(product => product.id === purchase.productId ? {
            ...product,
            quantity: product.quantity + purchase.quantity,
            buyingPrice: purchase.unitCost || product.buyingPrice,
            supplier: purchase.supplier || product.supplier
        } : product);
        const entry = { ...purchase, id: 'pu' + Date.now(), date: new Date().toISOString() };
        setProducts(updatedProducts);
        setPurchases(prev => [...prev, entry]);
        DB.set('products', updatedProducts);
        setStockMovements(prev => [...prev, {
            id: 'm' + Date.now(), productId: purchase.productId, quantity: purchase.quantity,
            reason: 'Purchase', date: new Date().toISOString()
        }]);
        logAction('Purchase recorded', `${purchase.productId}: ${purchase.quantity}`);
        showToast('Purchase recorded and stock updated');
    };

    const addToCart = (product, qty = 1) => {
        const resolvedProduct = typeof product === 'string' ? products.find(p => p.id === product) : product;
        if (!resolvedProduct) { showToast('Product could not be added to cart', 'error'); return; }
        setCart(prev => {
            const existing = prev.find(c => c.productId === resolvedProduct.id);
            if (existing) {
                return prev.map(c => c.productId === resolvedProduct.id ? { ...c, quantity: c.quantity + qty } : c);
            }
            return [...prev, { productId: resolvedProduct.id, product: resolvedProduct, quantity: qty }];
        });
        showToast(`Added ${resolvedProduct.name} to cart`);
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(c => c.productId !== productId));
    };

    const updateCartQty = (productId, qty) => {
        if (qty <= 0) { removeFromCart(productId); return; }
        setCart(prev => prev.map(c => c.productId === productId ? { ...c, quantity: qty } : c));
    };

    const clearCart = () => setCart([]);

    const parkCart = (name) => {
        if (!cart.length) return false;
        const snapshot = {
            id: 'cart' + Date.now(),
            name: name || `Customer ${parkedCarts.length + 1}`,
            items: cart,
            subtotal: cart.reduce((sum, c) => sum + c.quantity * c.product.sellingPrice, 0),
            total: cart.reduce((sum, c) => sum + c.quantity * c.product.sellingPrice, 0),
            savedAt: new Date().toISOString(),
            customerName: name || 'Walk-in Customer',
            status: 'held'
        };
        setParkedCarts(prev => {
            const next = [...prev, snapshot];
            DB.set('parkedCarts', next);
            return next;
        });
        setHeldSales(prev => {
            const next = [...prev, { ...snapshot, type: 'held-sale' }];
            DB.set('heldSales', next);
            return next;
        });
        setCart([]);
        return true;
    };

    const resumeCart = (id) => {
        const parked = parkedCarts.find(item => item.id === id) || heldSales.find(item => item.id === id);
        if (!parked) return;
        if (cart.length) parkCart('Previous customer');
        setCart(parked.items);
        setParkedCarts(prev => {
            const next = prev.filter(item => item.id !== id);
            DB.set('parkedCarts', next);
            return next;
        });
        setHeldSales(prev => {
            const next = prev.filter(item => item.id !== id);
            DB.set('heldSales', next);
            return next;
        });
    };

    const createHeldSale = (meta = {}) => {
        if (!cart.length) return null;
        const payload = {
            id: 'held' + Date.now(),
            name: meta.customerName || `Held sale ${heldSales.length + 1}`,
            customerName: meta.customerName || 'Walk-in Customer',
            customerPhone: meta.customerPhone || '',
            items: cart,
            subtotal: cart.reduce((sum, c) => sum + c.quantity * c.product.sellingPrice, 0),
            discount: Number(meta.discount) || 0,
            total: cart.reduce((sum, c) => sum + c.quantity * c.product.sellingPrice, 0) - (Number(meta.discount) || 0),
            status: 'held',
            savedAt: new Date().toISOString()
        };
        const next = [payload, ...heldSales];
        setHeldSales(next);
        DB.set('heldSales', next);
        setCart([]);
        return payload;
    };

    const completeSale = (saleData) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        const normalizedSale = { ...saleData, clientReference: saleData.clientReference || `sale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
        if (token && token !== 'local-demo-token' && navigator.onLine) {
            return apiRequestWithSession('/api/sales', { method: 'POST', body: JSON.stringify(normalizedSale), timeoutMs: 10000 }).then(data => {
                setProducts(prev => prev.map(product => {
                    const item = normalizedSale.items.find(line => line.productId === product.id);
                    return item ? { ...product, quantity: Math.max(0, product.quantity - item.quantity) } : product;
                }));
                setSales(prev => {
                    if (prev.some(sale => sale.id === data.sale.id || sale.clientReference === normalizedSale.clientReference)) return prev;
                    return [...prev, data.sale];
                });
                clearCart();
                showToast('Sale completed! Receipt generated.');
                return data.sale;
            }).catch(error => {
                // A network interruption should not trap checkout indefinitely. Queue the sale locally;
                // a genuine stock/validation error is shown to the user instead.
                if (error.status === 409 || error.status === 400) throw error;
                return queueOfflineSale(normalizedSale);
            });
        }
        return queueOfflineSale(normalizedSale);
    };

    const queueOfflineSale = (normalizedSale) => {
        const updatedProducts = products.map(p => {
            const item = normalizedSale.items.find(i => i.productId === p.id);
            return item ? { ...p, quantity: Math.max(0, Number(p.quantity || 0) - Number(item.quantity || 0)) } : p;
        });
        setProducts(updatedProducts);
        DB.set('products', updatedProducts);
        const now = new Date().toISOString();
        const newSale = { id: 's' + Date.now(), ...normalizedSale, date: now, saleDate: new Date().toLocaleDateString('en-CA'), syncStatus: 'pending' };
        const queue = DB.get('offlineSaleQueue', []);
        if (!queue.some(item => item.id === normalizedSale.clientReference)) {
            DB.set('offlineSaleQueue', [...queue, { id: normalizedSale.clientReference, payload: normalizedSale, localSaleId: newSale.id, queuedAt: now }]);
        }
        setOfflineQueueVersion(v => v + 1);
        setSales(prev => [...prev, newSale]);
        DB.set('sales', [...sales, newSale]);
        setStockMovements(prev => [...prev, ...normalizedSale.items.map(item => ({ id:'m'+Date.now()+item.productId, productId:item.productId, quantity:-Math.round(Number(item.quantity)), reason:'Sale', date:now }))]);
        logAction('Sale completed offline', newSale.id);
        clearCart();
        showToast('Sale saved. It will sync when the connection is restored.');
        return newSale;
    };

    const flushOfflineSales = async () => {
        const session = DB.get(SESSION_KEY, null);
        if (!session?.accessToken || session.accessToken === 'local-demo-token' || !navigator.onLine) return;
        const queue = DB.get('offlineSaleQueue', []);
        if (!queue.length) return;
        const remaining = [];
        for (const item of queue) {
            try {
                const data = await apiRequest('/api/sales', { method: 'POST', body: JSON.stringify(item.payload) }, session.accessToken);
                setSales(prev => prev.map(sale => sale.id === item.localSaleId ? data.sale : sale));
            } catch (error) {
                if (error.status === 401 && session.refreshToken) {
                    try {
                        const refreshed = await apiRequest('/api/auth/refresh', { method:'POST', body:JSON.stringify({ refreshToken:session.refreshToken }) });
                        DB.set(SESSION_KEY, refreshed);
                        window.dispatchEvent(new CustomEvent('nexatill:session-refreshed', { detail: refreshed }));
                        const data = await apiRequest('/api/sales', { method:'POST', body:JSON.stringify(item.payload) }, refreshed.accessToken);
                        setSales(prev => prev.map(sale => sale.id === item.localSaleId ? data.sale : sale));
                        continue;
                    } catch (_) { remaining.push(item); continue; }
                }
                if (error.status !== 409) remaining.push(item);
            }
        }
        DB.set('offlineSaleQueue', remaining);
        setOfflineQueueVersion(v => v + 1);
        if (!remaining.length) showToast('Offline sales synced successfully');
        await refreshTenantData();
    };

    useEffect(() => {
        const handleOnline = () => setTimeout(() => flushOfflineSales(), 700);
        window.addEventListener('online', handleOnline);
        if (navigator.onLine) setTimeout(() => flushOfflineSales(), 1000);
        return () => window.removeEventListener('online', handleOnline);
    }, [currentUser?.id]);

    const value = {
        products,
        setProducts,
        groups,
        quickSellItems,
        addGroup,
        assignProductGroup,
        saveQuickSell,
        sales,
        setSales,
        customers,
        setCustomers,
        suppliers,
        setSuppliers,
        expenses,
        setExpenses,
        users,
        setUsers,
        register,
        openRegister,
        closeRegister,
        stockMovements,
        adjustStock,
        auditLogs,
        offlineSaleQueue: DB.get('offlineSaleQueue', []),
        flushOfflineSales,
        purchases,
        recordPurchase,
        refundSale,
        cart,
        setCart,
        parkedCarts,
        heldSales,
        parkCart,
        resumeCart,
        createHeldSale,
        currentUser,
        setCurrentUser,
        currentCompany,
        authenticate,
        logout,
        refreshTenantData,
        apiMutation,
        toast,
        showToast,
        addProduct,
        updateProduct,
        deleteProduct,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        completeSale,
    };

    return React.createElement(AppContext.Provider, { value }, children);
}

function useApp() { return useContext(AppContext); }

// ---------- Hooks ----------
function useLocalStorage(key, initial) {
    const [state, setState] = useState(() => DB.get(key, initial));
    useEffect(() => { DB.set(key, state); }, [key, state]);
    return [state, setState];
}

function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    useEffect(() => {
        const setOnline = () => setIsOnline(true);
        const setOffline = () => setIsOnline(false);
        window.addEventListener('online', setOnline);
        window.addEventListener('offline', setOffline);
        return () => {
            window.removeEventListener('online', setOnline);
            window.removeEventListener('offline', setOffline);
        };
    }, []);
    return isOnline;
}

function downloadBackup() {
    const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        products: DB.get('products', []),
        sales: DB.get('sales', []),
        customers: DB.get('customers', []),
        suppliers: DB.get('suppliers', []),
        expenses: DB.get('expenses', []),
        users: DB.get('users', []),
        register: DB.get('register', {}),
        stockMovements: DB.get('stockMovements', []),
        purchases: DB.get('purchases', []),
        auditLogs: DB.get('auditLogs', [])
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `korapoint-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ============================================================
//  COMPONENTS
// ============================================================

// ---- Toast ----
function Toast() {
    const { toast } = useApp();
    if (!toast) return null;
    const colors = {
        success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
        error: 'bg-rose-50 border-rose-300 text-rose-800',
        info: 'bg-blue-50 border-blue-300 text-blue-800',
        warning: 'bg-amber-50 border-amber-300 text-amber-800'
    };
    return React.createElement('div', {
        className: `fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl border shadow-lg toast ${colors[toast.type] || colors.success}`,
        style: { minWidth: '200px', maxWidth: '90vw' }
    }, toast.msg);
}

// ---- Modal ----
function Modal({ isOpen, onClose, title, children: propChildren, maxWidth = 'max-w-2xl' }, children) {
    children = children || propChildren;
    if (!isOpen) return null;
    return React.createElement('div', {
        className: 'fixed inset-0 z-40 flex items-center justify-center p-3 modal-overlay',
        onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    }, React.createElement('div', {
        className: `bg-white rounded-2xl w-full ${maxWidth} modal-content shadow-2xl`
    }, React.createElement('div', {
        className: 'flex items-center justify-between px-5 py-4 border-b border-gray-100'
    }, React.createElement('h3', { className: 'text-lg font-bold text-gray-800' }, title),
        React.createElement('button', {
            onClick: onClose,
            className: 'p-1.5 rounded-lg hover:bg-gray-100 transition'
        }, '✕')
    ), React.createElement('div', { className: 'p-5' }, children)));
}

// ---- Stat Card ----
function StatCard({ icon, label, value, sub, color = 'amber' }) {
    const colors = {
        amber: 'bg-amber-50 text-amber-600',
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-600',
        violet: 'bg-violet-50 text-violet-600',
        cyan: 'bg-cyan-50 text-cyan-600'
    };
    return React.createElement('div', { className: 'stat-card p-4' },
        React.createElement('div', { className: 'flex items-start justify-between' },
            React.createElement('div', null,
                React.createElement('p', { className: 'text-xs font-medium text-gray-400 uppercase tracking-wider' },
                    label),
                React.createElement('p', { className: 'text-2xl font-bold text-gray-800 mt-0.5' }, value),
                sub && React.createElement('p', { className: 'text-xs text-gray-400 mt-0.5' }, sub)
            ),
            React.createElement('div', { className: `w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}` },
                React.createElement('span', { className: 'text-lg' }, icon)
            )
        )
    );
}

// ---- Product Card ----
function ProductCard({ product, onEdit, onDelete, onAddToCart, onAdjustStock, className = '' }) {
    const lowStock = product.quantity <= product.minStockLevel;
    const outOfStock = product.quantity === 0;
    const statusColor = outOfStock ? 'bg-rose-100 text-rose-700' : lowStock ? 'bg-amber-100 text-amber-700' :
        'bg-emerald-100 text-emerald-700';
    const statusText = outOfStock ? 'Out of Stock' : lowStock ? 'Low Stock' : 'In Stock';
    const hasProductImage = typeof product.image === 'string' &&
        (product.image.startsWith('data:image/') || product.image.startsWith('http'));

    return React.createElement('div', { className: `${className || 'product-card'} p-3.5 card-hover` },
        React.createElement('div', { className: 'flex items-start gap-3' },
            React.createElement('div', { className: 'w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0 border border-gray-100' },
                hasProductImage
                    ? React.createElement('img', { src: product.image, alt: product.name, className: 'w-full h-full object-cover rounded-xl' })
                    : product.image || '📦'
            ),
            React.createElement('div', { className: 'flex-1 min-w-0' },
                React.createElement('p', { className: 'font-semibold text-gray-800 text-sm truncate' }, product
                    .name),
                React.createElement('p', { className: 'text-xs text-gray-400 truncate' }, product.category),
                React.createElement('div', { className: 'flex items-center gap-2 mt-0.5 flex-wrap' },
                    React.createElement('span', { className: 'text-sm font-bold text-amber-600' }, formatCurrency(product
                        .sellingPrice)),
                    React.createElement('span', { className: `badge-stock ${statusColor}` }, statusText),
                    React.createElement('span', { className: 'text-xs text-gray-400' }, product.quantity + ' ' +
                        product.unit)
                )
            )
        ),
        React.createElement('div', { className: 'flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-50' },
            React.createElement('button', {
                onClick: () => onAddToCart(product),
                className: 'flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition'
            }, 'Add to Cart'),
            React.createElement('button', {
                onClick: () => onEdit(product),
                className: 'p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-600'
            }, '✎'),
            React.createElement('button', {
                onClick: () => onDelete(product.id),
                className: 'p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg transition text-rose-500'
            }, '🗑'),
            React.createElement('button', {
                onClick: () => onAdjustStock(product),
                className: 'stock-adjust-button p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition text-emerald-600',
                title: 'Adjust stock'
            }, '+')
        )
    );
}

// ---- Product Table / Grid View ----
function ProductTable({ products, onEdit, onDelete, onAddToCart, onAdjustStock }) {
    return React.createElement('div', { className: 'product-table-shell', role: 'region', 'aria-label': 'Products table', tabIndex: 0 },
        React.createElement('table', { className: 'product-table' },
            React.createElement('thead', null,
                React.createElement('tr', null,
                    React.createElement('th', { scope: 'col' }, 'Product'),
                    React.createElement('th', { scope: 'col', className: 'product-table-brand' }, 'Brand'),
                    React.createElement('th', { scope: 'col', className: 'product-table-category' }, 'Category'),
                    React.createElement('th', { scope: 'col' }, 'Price'),
                    React.createElement('th', { scope: 'col' }, 'Stock'),
                    React.createElement('th', { scope: 'col' }, 'Status'),
                    React.createElement('th', { scope: 'col', className: 'product-table-actions' }, 'Actions')
                )
            ),
            React.createElement('tbody', null,
                products.map(product => {
                    const lowStock = Number(product.quantity) <= Number(product.minStockLevel || 0);
                    const outOfStock = Number(product.quantity) === 0;
                    const statusClass = outOfStock ? 'out' : lowStock ? 'low' : 'in';
                    const statusText = outOfStock ? 'Out of Stock' : lowStock ? 'Low Stock' : 'In Stock';
                    return React.createElement('tr', { key: product.id, className: outOfStock ? 'is-out-of-stock' : '' },
                        React.createElement('td', { className: 'product-table-name' },
                            React.createElement('button', {
                                type: 'button',
                                className: 'product-table-name-button',
                                onClick: () => onAddToCart(product),
                                title: `Add ${product.name} to cart`
                            }, product.name)
                        ),
                        React.createElement('td', { className: 'product-table-brand', title: product.brand || '' }, product.brand || '—'),
                        React.createElement('td', { className: 'product-table-category', title: product.category || '' }, product.category || '—'),
                        React.createElement('td', { className: 'product-table-price' }, formatCurrency(product.sellingPrice)),
                        React.createElement('td', { className: 'product-table-stock' },
                            React.createElement('span', null, product.quantity),
                            React.createElement('span', { className: 'product-table-unit' }, product.unit || '')
                        ),
                        React.createElement('td', null,
                            React.createElement('span', { className: `product-table-status ${statusClass}` }, statusText)
                        ),
                        React.createElement('td', { className: 'product-table-actions' },
                            React.createElement('div', { className: 'product-table-action-group' },
                                React.createElement('button', {
                                    type: 'button',
                                    className: 'product-table-add',
                                    onClick: () => onAddToCart(product),
                                    disabled: outOfStock,
                                    title: outOfStock ? 'Out of stock' : 'Add to cart'
                                }, outOfStock ? 'Out' : '+ Add'),
                                React.createElement('button', {
                                    type: 'button', className: 'product-table-icon edit', onClick: () => onEdit(product), title: 'Edit product', 'aria-label': `Edit ${product.name}`
                                }, '✎'),
                                React.createElement('button', {
                                    type: 'button', className: 'product-table-icon stock', onClick: () => onAdjustStock(product), title: 'Adjust stock', 'aria-label': `Adjust stock for ${product.name}`
                                }, '+'),
                                React.createElement('button', {
                                    type: 'button', className: 'product-table-icon delete', onClick: () => onDelete(product.id), title: 'Delete product', 'aria-label': `Delete ${product.name}`
                                }, '🗑')
                            )
                        )
                    );
                })
            )
        )
    );
}

// ---- Cart Sidebar ----
function CartSidebar({ isOpen, onClose }) {
    const { cart, removeFromCart, updateCartQty, clearCart, products, completeSale, showToast, parkedCarts, heldSales, parkCart, resumeCart, createHeldSale } = useApp();
    const [showCheckout, setShowCheckout] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [cashReceived, setCashReceived] = useState('');
    const [processingSale, setProcessingSale] = useState(false);
    const [saleComplete, setSaleComplete] = useState(false);

    const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);
    const totalAmount = cart.reduce((sum, c) => sum + c.quantity * c.product.sellingPrice, 0);
    const totalProfit = cart.reduce((sum, c) => sum + c.quantity * (c.product.sellingPrice - c.product.buyingPrice),
    0);

    const handleCheckout = async () => {
        if (processingSale) return;
        if (cart.length === 0) { showToast('Cart is empty', 'error'); return; }
        // Check stock
        for (const item of cart) {
            const prod = products.find(p => p.id === item.productId);
            if (!prod || prod.quantity < item.quantity) {
                showToast(`Not enough stock for ${item.product.name}`, 'error');
                return;
            }
        }
        const received = Number(cashReceived) || 0;
        if (paymentMethod === 'Cash' && received < totalAmount) {
            showToast(`Cash received must be at least ${formatCurrency(totalAmount)}`, 'error');
            return;
        }
        const saleData = {
            customerName: customerName || 'Walk-in Customer',
            customerPhone,
            paymentMethod,
            items: cart.map(c => ({
                productId: c.productId,
                productName: c.product.name,
                quantity: c.quantity,
                sellingPrice: c.product.sellingPrice,
                buyingPrice: c.product.buyingPrice
            })),
            total: totalAmount,
            profit: totalProfit,
            cashReceived: paymentMethod === 'Cash' ? received : 0,
            change: paymentMethod === 'Cash' ? received - totalAmount : 0
        };
        setProcessingSale(true);
        try {
            await completeSale(saleData);
            setSaleComplete(true);
        } catch (error) {
            showToast(error.message || 'Sale could not be completed. Your transaction was not saved.', 'error');
        } finally {
            setProcessingSale(false);
        }
    };

    const finishCheckout = () => {
        setSaleComplete(false);
        setShowCheckout(false);
        setCustomerName('');
        setCustomerPhone('');
        setPaymentMethod('Cash');
        setCashReceived('');
        onClose();
    };

    return React.createElement('div', {
        className: `cart-mobile-sheet fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0 is-open' : 'translate-x-full'}`,
        style: { maxWidth: '100vw' }
    },
        React.createElement('div', { className: 'flex items-center justify-between p-4 border-b border-gray-100' },
            React.createElement('h2', { className: 'text-lg font-bold text-gray-800' },
                '🛒 Cart (', totalItems, ')'
            ),
            React.createElement('div', { className: 'flex items-center gap-2' },
                cart.length > 0 && React.createElement('button', {
                    onClick: clearCart,
                    className: 'text-xs text-rose-500 hover:text-rose-700 font-medium'
                }, 'Clear'),
                React.createElement('button', {
                    onClick: onClose,
                    className: 'p-1.5 rounded-lg hover:bg-gray-100'
                }, '✕')
            )
        ),
        React.createElement('div', { className: 'flex gap-2 p-3 border-b border-gray-100 bg-gray-50' },
            React.createElement('button', { onClick: () => { const name = window.prompt('Name this held sale', 'Customer'); if (name !== null && parkCart(name)) showToast('Sale held and ready to resume'); }, disabled: !cart.length, className: 'flex-1 btn-secondary text-xs disabled:opacity-50' }, '⏸ Hold Sale'),
            React.createElement('button', { onClick: () => { const name = window.prompt('Name this held sale', 'Customer'); if (name !== null && createHeldSale({ customerName: name })) showToast('Held sale saved'); }, disabled: !cart.length, className: 'flex-1 btn-secondary text-xs disabled:opacity-50' }, '🗃 Save Hold'),
            React.createElement('button', { onClick: clearCart, disabled: !cart.length, className: 'flex-1 btn-secondary text-xs disabled:opacity-50' }, 'Clear cart')
        ),
        (parkedCarts.length > 0 || heldSales.length > 0) && React.createElement('div', { className: 'px-3 py-2 border-b border-amber-100 bg-amber-50' },
            React.createElement('p', { className: 'text-xs font-semibold text-amber-800 mb-1' }, 'Held sales'),
            [...parkedCarts, ...heldSales].slice(0, 6).map(item => React.createElement('button', { key: item.id, onClick: () => resumeCart(item.id), className: 'w-full flex justify-between text-xs text-amber-900 py-1 hover:underline' }, React.createElement('span', null, item.name || item.customerName || 'Held sale'), React.createElement('span', null, (item.items || []).reduce((sum, line) => sum + line.quantity, 0), ' items')))
        ),
        React.createElement('div', { className: 'flex-1 overflow-y-auto p-4', style: { maxHeight: 'calc(100vh - 180px)' } },
            cart.length === 0 ?
            React.createElement('p', { className: 'text-center text-gray-400 py-12' }, 'Your cart is empty') :
            cart.map(item =>
                React.createElement('div', { key: item.productId, className: 'cart-item flex items-center gap-3' },
                    React.createElement('div', { className: 'w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl flex-shrink-0' },
                        typeof item.product.image === 'string' &&
                        (item.product.image.startsWith('data:image/') || item.product.image.startsWith('http'))
                            ? React.createElement('img', { src: item.product.image, alt: item.product.name, className: 'w-full h-full object-cover rounded-lg' })
                            : item.product.image || '📦'
                    ),
                    React.createElement('div', { className: 'flex-1 min-w-0' },
                        React.createElement('p', { className: 'font-medium text-sm text-gray-800 truncate' },
                            item.product.name),
                        React.createElement('p', { className: 'text-xs text-gray-400' },
                            formatCurrency(item.product.sellingPrice), ' × ', item.quantity)
                    ),
                    React.createElement('div', { className: 'flex items-center gap-1' },
                        React.createElement('button', {
                            onClick: () => updateCartQty(item.productId, item.quantity - 1),
                            className: 'w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold'
                        }, '−'),
                        React.createElement('span', { className: 'w-6 text-center text-sm font-medium' },
                            item.quantity),
                        React.createElement('button', {
                            onClick: () => updateCartQty(item.productId, item.quantity + 1),
                            className: 'w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold'
                        }, '+')
                    ),
                    React.createElement('button', {
                        onClick: () => removeFromCart(item.productId),
                        className: 'text-rose-400 hover:text-rose-600 text-sm px-1'
                    }, '✕')
                )
            )
        ),
        React.createElement('div', { className: 'border-t border-gray-100 p-4 bg-gray-50/50' },
            React.createElement('div', { className: 'flex justify-between text-sm mb-1' },
                React.createElement('span', { className: 'text-gray-500' }, 'Items'),
                React.createElement('span', { className: 'font-medium' }, totalItems)
            ),
            React.createElement('div', { className: 'flex justify-between text-sm mb-1' },
                React.createElement('span', { className: 'text-gray-500' }, 'Total'),
                React.createElement('span', { className: 'text-xl font-bold text-amber-600' }, formatCurrency(totalAmount))
            ),
            React.createElement('div', { className: 'flex justify-between text-xs text-gray-400 mb-3' },
                React.createElement('span', null, 'Est. profit: ', formatCurrency(totalProfit))
            ),
            React.createElement('button', {
                onClick: () => setShowCheckout(true),
                disabled: cart.length === 0,
                className: `w-full py-3 rounded-xl font-bold text-white transition ${cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`
            }, 'Proceed to Checkout')
        ),
        // Checkout modal
        Modal({
            isOpen: showCheckout,
            onClose: () => setShowCheckout(false),
            title: 'Checkout',
            maxWidth: 'max-w-md'
        },
        saleComplete
            ? React.createElement('div', { className: 'sale-success-panel text-center py-6' },
                React.createElement('div', { className: 'sale-success-check' }, '✓'),
                React.createElement('h3', { className: 'text-2xl font-extrabold text-emerald-700 mt-4' }, 'Sale Done!'),
                React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, 'The sale was recorded and stock was updated.'),
                React.createElement('p', { className: 'text-xl font-bold text-gray-800 mt-4' }, formatCurrency(totalAmount)),
                React.createElement('button', { onClick: finishCheckout, className: 'w-full mt-5 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition checkout-done-btn' }, '✓ Done & Exit')
            )
            : React.createElement('div', { className: 'space-y-3' },
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-1' },
                    'Customer Name (optional)'),
                React.createElement('input', {
                    type: 'text',
                    value: customerName,
                    onChange: (e) => setCustomerName(e.target.value),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    placeholder: 'Walk-in Customer'
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-1' },
                    'Phone Number'),
                React.createElement('input', {
                    type: 'text',
                    value: customerPhone,
                    onChange: (e) => setCustomerPhone(e.target.value),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    placeholder: '+123456789'
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-1' },
                    'Payment Method'),
                React.createElement('select', {
                    value: paymentMethod,
                    onChange: (e) => setPaymentMethod(e.target.value),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
                },
                React.createElement('option', { value: 'Cash' }, '💵 Cash'),
                React.createElement('option', { value: 'Mobile Money' }, '📱 Mobile Money'),
                React.createElement('option', { value: 'Card' }, '💳 Card'),
                React.createElement('option', { value: 'Other' }, 'Other')
                )
            ),
            React.createElement('div', null,
                React.createElement('label', { htmlFor: 'cash-received', className: 'block text-xs font-medium text-gray-500 mb-1' },
                    'Cash Received (GHS)'),
                React.createElement('input', {
                    id: 'cash-received',
                    type: 'number',
                    min: totalAmount,
                    step: '0.01',
                    value: cashReceived,
                    onChange: (e) => setCashReceived(e.target.value),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    placeholder: formatCurrency(totalAmount),
                    disabled: paymentMethod !== 'Cash'
                }),
                paymentMethod === 'Cash' && React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                    'Balance after payment: ', formatCurrency(Math.max(0, (Number(cashReceived) || 0) - totalAmount)))
            ),
            React.createElement('div', { className: 'bg-gray-50 rounded-xl p-3 space-y-1 text-sm' },
                React.createElement('div', { className: 'flex justify-between' },
                    React.createElement('span', { className: 'text-gray-500' }, 'Items'),
                    React.createElement('span', null, totalItems)
                ),
                React.createElement('div', { className: 'flex justify-between font-bold text-lg' },
                    React.createElement('span', null, 'Total'),
                    React.createElement('span', { className: 'text-amber-600' }, formatCurrency(totalAmount))
                ),
                paymentMethod === 'Cash' && React.createElement('div', { className: 'flex justify-between text-sm text-emerald-700 font-semibold' },
                    React.createElement('span', null, 'Customer balance'),
                    React.createElement('span', null, formatCurrency(Math.max(0, (Number(cashReceived) || 0) - totalAmount)))
                )
            ),
            React.createElement('button', {
                onClick: handleCheckout,
                disabled: processingSale,
                className: `w-full py-3 rounded-xl font-bold text-white transition checkout-submit-btn ${processingSale ? 'opacity-70 cursor-wait' : ''}`
            }, processingSale ? '⏳ Processing sale...' : '✓ Complete Sale')
        ))
    );
}

// ---- Register ----
function RegisterPanel({ sales }) {
    const { register, openRegister, closeRegister, showToast } = useApp();
    const [cashInput, setCashInput] = useState('');
    const today = new Date().toLocaleDateString('en-CA');
    const cashSales = sales.filter(s => isActiveSale(s) && (s.saleDate || new Date(s.date).toLocaleDateString('en-CA')) === today &&
        (s.paymentMethod || 'Cash') === 'Cash');
    const cashCollected = cashSales.reduce((sum, sale) => sum + (sale.cashReceived || sale.total), 0);
    const expectedCash = (register.openingCash || 0) + cashCollected;

    const handleOpen = () => {
        if (Number(cashInput) < 0) { showToast('Opening cash cannot be negative', 'error'); return; }
        openRegister(cashInput);
        setCashInput('');
    };

    const handleClose = () => {
        if (cashInput === '') { showToast('Enter the cash counted at closing', 'error'); return; }
        closeRegister(cashInput);
        setCashInput('');
    };

    return React.createElement('div', { className: 'stat-card p-4 space-y-3' },
        React.createElement('div', { className: 'flex items-center justify-between' },
            React.createElement('div', null,
                React.createElement('p', { className: 'text-sm font-semibold text-gray-700' }, '💼 Register'),
                React.createElement('p', { className: 'text-xs text-gray-400' }, register.isOpen ? 'Open for business' : 'Closed')
            ),
            React.createElement('span', { className: `badge-stock ${register.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}` },
                register.isOpen ? 'OPEN' : 'CLOSED')
        ),
        register.isOpen ? React.createElement('div', { className: 'space-y-2' },
            React.createElement('div', { className: 'flex justify-between text-sm' },
                React.createElement('span', { className: 'text-gray-500' }, 'Expected cash'),
                React.createElement('strong', null, formatCurrency(expectedCash))
            ),
            React.createElement('div', { className: 'flex gap-2' },
                React.createElement('input', { type: 'number', min: 0, step: '0.01', value: cashInput,
                    onChange: e => setCashInput(e.target.value), placeholder: 'Cash counted (GHS)',
                    className: 'flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
                React.createElement('button', { onClick: handleClose, className: 'btn-danger text-sm' }, 'Close Register')
            )
        ) : React.createElement('div', { className: 'flex gap-2' },
            React.createElement('input', { type: 'number', min: 0, step: '0.01', value: cashInput,
                onChange: e => setCashInput(e.target.value), placeholder: 'Opening cash (GHS)',
                className: 'flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
            React.createElement('button', { onClick: handleOpen, className: 'btn-success text-sm' }, 'Open Register')
        )
    );
}

// ---- Dashboard ----
function Dashboard() {
    const { products, sales, currentUser } = useApp();
    const [chartRef, setChartRef] = useState(null);
    const chartInstance = useRef(null);
    const isCashier = currentUser?.role === 'cashier';

    const totalProducts = products.length;
    const today = new Date().toLocaleDateString('en-CA');
    const todaySales = sales.filter(s => isActiveSale(s) && (s.saleDate || new Date(s.date).toLocaleDateString('en-CA')) === today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekSales = sales.filter(s => isActiveSale(s) && new Date(s.date) >= weekAgo);
    const weekRevenue = weekSales.reduce((sum, s) => sum + s.total, 0);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthSales = sales.filter(s => isActiveSale(s) && new Date(s.date) >= monthAgo);
    const monthRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    const totalRevenue = sales.filter(isActiveSale).reduce((sum, s) => sum + s.total, 0);
    const lowStockItems = products.filter(p => p.quantity <= p.minStockLevel && p.quantity > 0);
    const outOfStockItems = products.filter(p => p.quantity === 0);
    const recentSales = sales.filter(isActiveSale).slice(-5).reverse();

    // Chart
    useEffect(() => {
        if (chartRef) {
            const ctx = chartRef.getContext('2d');
            if (chartInstance.current) chartInstance.current.destroy();
            const days = 7;
            const labels = [];
            const data = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('en', { weekday: 'short' }));
                const day = d.toLocaleDateString('en-CA');
                const daySales = sales.filter(s => isActiveSale(s) && (s.saleDate || new Date(s.date).toLocaleDateString('en-CA')) === day);
                data.push(daySales.reduce((sum, s) => sum + s.total, 0));
            }
            chartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Daily Sales (GHS)', data, backgroundColor: '#f59e0b',
                        borderRadius: 6, borderSkipped: false }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } } } }
            });
            return () => { if (chartInstance.current) chartInstance.current.destroy(); };
        }
    }, [chartRef, sales]);

    const displayName = String(currentUser?.name || currentUser?.email || 'Shop Owner').trim().split(' ')[0] || 'Shop Owner';

    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'stat-card p-4 sm:p-5' },
            React.createElement('p', { className: 'text-xs font-bold uppercase tracking-wide text-blue-600' }, 'KoraPoint'),
            React.createElement('h2', { className: 'text-xl sm:text-2xl font-bold text-gray-800 mt-1' }, 'Welcome back, ', displayName, '! 👋'),
            React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, 'Here is how your shop is doing today.')
        ),
        // Stats
        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' },
            React.createElement(StatCard, { icon: '📦', label: 'Products', value: totalProducts, color: 'amber' }),
            !isCashier && React.createElement(StatCard, { icon: '💰', label: "Today's Sales", value: formatCurrency(todayRevenue),
                sub: todaySales.length + ' orders', color: 'emerald' }),
            React.createElement(StatCard, { icon: '⚠️', label: 'Low Stock', value: lowStockItems.length,
                sub: outOfStockItems.length + ' out of stock', color: 'rose' }),
            !isCashier && React.createElement(StatCard, { icon: '🔄', label: 'Recent Sales', value: recentSales.length,
                sub: 'last 5 transactions', color: 'blue' })
        ),
        !isCashier && React.createElement(RegisterPanel, { sales }),
        !isCashier && React.createElement('div', { className: 'stat-card p-4' },
            React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' },
                '📊 Last 7 Days Sales'),
            React.createElement('div', { className: 'chart-container' },
                React.createElement('canvas', { ref: setChartRef }))
        ),
        React.createElement('div', { className: 'grid md:grid-cols-2 gap-4' },
            React.createElement('div', { className: 'stat-card p-4' },
                React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' },
                    '⚠️ Low Stock Alerts'),
                lowStockItems.length === 0 ?
                React.createElement('p', { className: 'text-sm text-gray-400' }, 'All products well stocked ✅') :
                React.createElement('div', { className: 'space-y-1.5' },
                    lowStockItems.slice(0, 5).map(p =>
                        React.createElement('div', { key: p.id, className:
                                'flex justify-between text-sm items-center' },
                            React.createElement('span', { className: 'text-gray-700' }, p.name),
                            React.createElement('span', { className: 'text-amber-600 font-medium' }, p
                                .quantity, ' / ', p.minStockLevel)
                        )
                    )
                )
            ),
            !isCashier && React.createElement('div', { className: 'stat-card p-4' },
                React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' },
                    '🔄 Recently Sold'),
                recentSales.length === 0 ?
                React.createElement('p', { className: 'text-sm text-gray-400' }, 'No recent sales') :
                recentSales.map(s =>
                    React.createElement('div', { key: s.id, className: 'flex justify-between text-sm py-1 border-b border-gray-50' },
                        React.createElement('span', { className: 'text-gray-600' }, s.customerName || 'Walk-in'),
                        React.createElement('span', { className: 'font-medium text-amber-600' }, formatCurrency(s.total))
                    )
                )
            )
        )
    );
}

// ---- Barcode Scanner ----
function BarcodeScanner({ onDetected, onClose }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const frameRef = useRef(null);
    const [message, setMessage] = useState('Point the camera at a product barcode.');

    useEffect(() => {
        let active = true;
        const detectorSupported = 'BarcodeDetector' in window;
        if (!detectorSupported || !navigator.mediaDevices?.getUserMedia) {
            setMessage('Barcode scanning is not supported here. Enter the barcode in the search box.');
            return undefined;
        }
        const detector = new BarcodeDetector({ formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'] });
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
            .then(stream => {
                if (!active) { stream.getTracks().forEach(track => track.stop()); return; }
                streamRef.current = stream;
                videoRef.current.srcObject = stream;
                return videoRef.current.play();
            })
            .then(() => {
                const scan = async () => {
                    if (!active || !videoRef.current) return;
                    try {
                        const codes = await detector.detect(videoRef.current);
                        if (codes.length > 0 && codes[0].rawValue) {
                            onDetected(codes[0].rawValue);
                            return;
                        }
                    } catch { setMessage('Keep the barcode centered and try again.'); }
                    frameRef.current = requestAnimationFrame(scan);
                };
                frameRef.current = requestAnimationFrame(scan);
            })
            .catch(() => setMessage('Camera access was blocked. Enter the barcode manually instead.'));
        return () => {
            active = false;
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            streamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, [onDetected]);

    return Modal({ isOpen: true, onClose, title: 'Scan Barcode', maxWidth: 'max-w-md' },
        React.createElement('div', { className: 'space-y-3' },
            React.createElement('video', { ref: videoRef, className: 'w-full rounded-xl bg-gray-900 aspect-video', muted: true, playsInline: true }),
            React.createElement('p', { className: 'text-sm text-gray-500 text-center' }, message),
            React.createElement('button', { onClick: onClose, className: 'btn-secondary w-full' }, 'Close Scanner')
        )
    );
}


// ---- Mobile-first Sell Page ----
function SellPage() {
    const { products, addToCart, cart, showToast } = useApp();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter(p => {
            const matchesSearch = !q || [p.name, p.barcode, p.sku, p.productCode, p.category, p.materialType, p.supplier, p.unit]
                .filter(Boolean).some(v => String(v).toLowerCase().includes(q));
            return matchesSearch && (category === 'All' || p.category === category);
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [products, search, category]);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + item.quantity * item.product.sellingPrice, 0);

    return React.createElement('div', { className: 'space-y-4 sell-page' },
        React.createElement('div', { className: 'sell-header' },
            React.createElement('div', null,
                React.createElement('h2', { className: 'text-xl sm:text-2xl font-bold text-gray-800' }, '🛒 Sell'),
                React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, 'Find a product, choose the quantity, and add it to the cart.')
            ),
            React.createElement('button', { onClick: () => setSearch(''), className: 'btn-secondary sell-clear' }, 'Clear search')
        ),
        React.createElement('div', { className: 'sell-search-wrap' },
            React.createElement('span', { className: 'sell-search-icon' }, '🔍'),
            React.createElement('input', {
                value: search, onChange: e => setSearch(e.target.value),
                placeholder: 'Search cement, nails, rods, roofing sheets...',
                className: 'sell-search', autoComplete: 'off', 'aria-label': 'Search products'
            })
        ),
        React.createElement('div', { className: 'category-scroll', role: 'tablist', 'aria-label': 'Product categories' },
            categories.map(c => React.createElement('button', {
                key: c, onClick: () => setCategory(c),
                className: `filter-chip ${category === c ? 'active' : ''}`,
                role: 'tab', 'aria-selected': category === c
            }, c))
        ),
        React.createElement('div', { className: 'sell-results-head' },
            React.createElement('span', null, filtered.length, filtered.length === 1 ? ' product' : ' products'),
            search && React.createElement('span', { className: 'text-gray-400' }, ` for “${search}”`)
        ),
        filtered.length === 0
            ? React.createElement('div', { className: 'empty-state' },
                React.createElement('div', { className: 'text-3xl mb-2' }, '🔎'),
                React.createElement('strong', null, 'No products found'),
                React.createElement('p', null, 'Try another search or choose a different category.')
              )
            : React.createElement('div', { className: 'sell-product-list' },
                filtered.map(p => {
                    const out = Number(p.quantity) <= 0;
                    return React.createElement('div', { key: p.id, className: 'sell-product-row' },
                        React.createElement('div', { className: 'sell-product-icon' },
                            typeof p.image === 'string' && (p.image.startsWith('data:image/') || p.image.startsWith('http'))
                                ? React.createElement('img', { src: p.image, alt: '', loading: 'lazy' })
                                : p.image || '📦'
                        ),
                        React.createElement('div', { className: 'sell-product-info' },
                            React.createElement('div', { className: 'sell-product-name' }, p.name),
                            React.createElement('div', { className: 'sell-product-meta' },
                                formatCurrency(p.sellingPrice), ' · ',
                                React.createElement('span', { className: out ? 'stock-out' : Number(p.quantity) <= Number(p.minStockLevel) ? 'stock-low' : '' },
                                    out ? 'Out of stock' : `${p.quantity} ${p.unit || 'in stock'}`
                                )
                            )
                        ),
                        React.createElement('button', {
                            disabled: out,
                            onClick: () => { addToCart(p); showToast(`${p.name} added to cart`, 'success'); },
                            className: 'sell-add-btn'
                        }, out ? 'Out' : '+ Add')
                    );
                })
            ),
        totalItems > 0 && React.createElement('button', {
            className: 'mobile-cart-bar',
            onClick: () => window.dispatchEvent(new CustomEvent('nexatill:open-cart'))
        },
            React.createElement('span', null, '🛒 ', totalItems, totalItems === 1 ? ' item' : ' items'),
            React.createElement('strong', null, formatCurrency(total)),
            React.createElement('span', null, 'View cart ›')
        )
    );
}

// ---- Stock Activity Page ----
function StockActivityPage() {
    const { stockMovements, products } = useApp();
    const movements = [...stockMovements].reverse();
    return React.createElement('div', { className: 'space-y-4' },
        React.createElement('div', null,
            React.createElement('h2', { className: 'text-xl sm:text-2xl font-bold text-gray-800' }, '📦 Stock Activity'),
            React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, 'A simple history of stock added, removed, and adjusted.')
        ),
        React.createElement('div', { className: 'stat-card overflow-hidden' },
            movements.length === 0
                ? React.createElement('div', { className: 'empty-state' }, React.createElement('div', { className: 'text-3xl mb-2' }, '📦'), React.createElement('strong', null, 'No stock activity yet'), React.createElement('p', null, 'Stock changes will appear here.'))
                : React.createElement('div', { className: 'stock-activity-list' },
                    movements.map(m => {
                        const product = products.find(p => p.id === m.productId);
                        return React.createElement('div', { key: m.id, className: 'stock-activity-row' },
                            React.createElement('div', { className: 'min-w-0' },
                                React.createElement('strong', { className: 'block truncate' }, product?.name || 'Deleted product'),
                                React.createElement('span', { className: 'text-xs text-gray-400' }, m.reason || 'Stock adjustment', m.date ? ` · ${new Date(m.date).toLocaleString()}` : '')
                            ),
                            React.createElement('span', { className: m.quantity > 0 ? 'stock-in' : 'stock-out' }, m.quantity > 0 ? '+' : '', m.quantity)
                        );
                    })
                )
        )
    );
}


// ---- Customers Page ----
function CustomersPage() {
    const { customers, sales } = useApp();
    const customerList = [...(customers || [])].sort((a,b) => String(a.name||'').localeCompare(String(b.name||'')));
    return React.createElement('div', { className: 'space-y-4' },
        React.createElement('div', null,
            React.createElement('h2', { className: 'text-xl sm:text-2xl font-bold text-gray-800' }, '👥 Customers'),
            React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, 'Keep track of customers and what they owe.')
        ),
        customerList.length === 0
            ? React.createElement('div', { className: 'empty-state' },
                React.createElement('div', { className: 'text-3xl mb-2' }, '👥'),
                React.createElement('strong', null, 'No customers yet'),
                React.createElement('p', null, 'Customers will appear here when they are added to sales.')
              )
            : React.createElement('div', { className: 'customer-list stat-card overflow-hidden' },
                customerList.map(c => {
                    const name = c.name || 'Unnamed customer';
                    const customerSales = (sales || []).filter(s => s.customerName === name && isActiveSale(s));
                    const total = customerSales.reduce((sum,s) => sum + Number(s.total || 0), 0);
                    const balance = Number(c.balance || c.amountOwed || 0);
                    return React.createElement('div', { key: c.id || name, className: 'customer-row' },
                        React.createElement('div', { className: 'min-w-0' },
                            React.createElement('strong', { className: 'block truncate' }, name),
                            React.createElement('span', { className: 'text-xs text-gray-400' }, c.phone || `${customerSales.length} recorded sale${customerSales.length === 1 ? '' : 's'}`)
                        ),
                        React.createElement('div', { className: 'text-right' },
                            React.createElement('strong', { className: 'block' }, formatCurrency(balance)),
                            React.createElement('span', { className: balance > 0 ? 'text-xs text-rose-500' : 'text-xs text-emerald-600' }, balance > 0 ? 'Balance owed' : 'No balance')
                        )
                    );
                })
              )
    );
}

// ---- Products Page ----
function ProductsPage() {
    const { products, deleteProduct, addToCart, adjustStock, stockMovements, showToast } = useApp();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [sort, setSort] = useState('name');
    const [editing, setEditing] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);

    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return ['All', ...cats];
    }, [products]);

    const filtered = useMemo(() => {
        let result = products;
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(p => [p.name, p.barcode, p.sku, p.productCode, p.category, p.materialType, p.unit].some(v => String(v || '').toLowerCase().includes(s)));
        }
        if (category !== 'All') {
            result = result.filter(p => p.category === category);
        }
        // Sort
        if (sort === 'price-asc') result = [...result].sort((a, b) => a.sellingPrice - b.sellingPrice);
        else if (sort === 'price-desc') result = [...result].sort((a, b) => b.sellingPrice - a.sellingPrice);
        else if (sort === 'quantity') result = [...result].sort((a, b) => a.quantity - b.quantity);
        else if (sort === 'recent') result = [...result].sort((a, b) => new Date(b.dateAdded) - new Date(a
        .dateAdded));
        else result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        return result;
    }, [products, search, category, sort]);

    const handleDelete = (id) => {
        if (window.confirm('Delete this product permanently?')) {
            deleteProduct(id);
        }
    };

    const handleAdjustStock = (product) => {
        const amount = window.prompt(`Add or remove stock for ${product.name}. Use a negative number to remove stock.`, '1');
        if (amount !== null) adjustStock(product.id, amount, 'Manual adjustment');
    };


    return React.createElement('div', { className: 'space-y-4' },
        // Header
        React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
            React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '📦 Inventory'),
            React.createElement('div', { className: 'flex items-center gap-2' },
                React.createElement('button', { onClick: () => setShowAdd(true), className: 'btn-primary text-sm' }, '➕ Add Product')
            )
        ),
        // Filters
        React.createElement('div', { className: 'flex flex-wrap items-center gap-2' },
            React.createElement('input', {
                type: 'text',
                placeholder: '🔍 Search products...',
                value: search,
                onChange: (e) => setSearch(e.target.value),
                className: 'flex-1 min-w-[140px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white'
            }),
            React.createElement('select', {
                value: category,
                onChange: (e) => setCategory(e.target.value),
                className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white'
            }, categories.map(c => React.createElement('option', { key: c, value: c }, c))),
            React.createElement('select', {
                value: sort,
                onChange: (e) => setSort(e.target.value),
                className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white'
            },
                React.createElement('option', { value: 'name' }, 'Sort: Name'),
                React.createElement('option', { value: 'price-asc' }, 'Sort: Price ↑'),
                React.createElement('option', { value: 'price-desc' }, 'Sort: Price ↓'),
                React.createElement('option', { value: 'quantity' }, 'Sort: Stock'),
                React.createElement('option', { value: 'recent' }, 'Sort: Recent')
            ),
            React.createElement('button', {
                onClick: () => setScannerOpen(true),
                className: 'btn-secondary text-sm min-h-[42px]'
            }, '📷 Scan')
        ),
        // Products always use the compact one-line table layout to prevent overcrowding.
        React.createElement(ProductTable, {
            products: filtered,
            onEdit: (product) => setEditing(product),
            onDelete: handleDelete,
            onAddToCart: addToCart,
            onAdjustStock: handleAdjustStock
        }),
        filtered.length === 0 && React.createElement('p', { className: 'text-center text-gray-400 py-8' },
            'No products found'),
        // Add modal
        Modal({
            isOpen: showAdd,
            onClose: () => setShowAdd(false),
            title: 'Add Product',
            maxWidth: 'max-w-xl'
        }, React.createElement(ProductForm, {
            onClose: () => setShowAdd(false),
            mode: 'add'
        })),

        // Edit modal
        editing && Modal({
            isOpen: !!editing,
            onClose: () => setEditing(null),
            title: 'Edit Product',
            maxWidth: 'max-w-xl'
        }, React.createElement(ProductForm, {
            product: editing,
            onClose: () => setEditing(null),
            mode: 'edit'
        })),
        scannerOpen && React.createElement(BarcodeScanner, {
            onClose: () => setScannerOpen(false),
            onDetected: code => { setSearch(code); setScannerOpen(false); showToast(`Barcode scanned: ${code}`); }
        })
    );
}

// ---- Product Form ----
function ProductForm({ product, onClose, mode }) {
    const { addProduct, updateProduct, showToast } = useApp();
    const getDefaultForm = (selectedProduct = null) => ({
        name: selectedProduct?.name || '',
        image: selectedProduct?.image || '📦',
        category: selectedProduct?.category || 'Cement',
        materialType: selectedProduct?.materialType || '',
        supplier: selectedProduct?.supplier || '',
        buyingPrice: (Number(selectedProduct?.buyingPrice) > 0 ? String(selectedProduct.buyingPrice) : ''),
        sellingPrice: (Number(selectedProduct?.sellingPrice) > 0 ? String(selectedProduct.sellingPrice) : ''),
        quantity: Math.round(Number(selectedProduct?.quantity ?? 0)),
        minStockLevel: Math.round(Number(selectedProduct?.minStockLevel ?? 5)),
        unit: selectedProduct?.unit || 'piece',
        description: selectedProduct?.description || '',
        barcode: selectedProduct?.barcode || '',
        sku: selectedProduct?.sku || selectedProduct?.productCode || '',
    });
    const [form, setForm] = useState(() => getDefaultForm(product));
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        setForm(getDefaultForm(product));
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [product, mode]);

    const readImageFile = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Unable to read image'));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error('Unable to process image'));
            image.onload = () => {
                const maxDimension = 500;
                const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                let quality = 0.68;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                while (dataUrl.length > 70000 && quality > 0.35) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(dataUrl);
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });

    const categories = ['Cement', 'Nails', 'Paints', 'Electrical materials', 'Plumbing materials', 'Roofing materials',
        'Tools', 'Wood materials', 'Steel materials', 'Pipes', 'Tiles', 'Building blocks', 'Safety equipment',
        'Adhesives', 'Other'
    ];
    const units = ['piece', 'box', 'bag', 'meter', 'carton', 'bottle', 'can', 'roll', 'sheet', 'kg', 'g', 'L', 'mL'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;
        if (!form.name.trim()) { showToast('Product name is required', 'error'); return; }
        const buyingPrice = form.buyingPrice === '' ? null : Number(form.buyingPrice);
        const sellingPrice = form.sellingPrice === '' ? 0 : Number(form.sellingPrice);
        if ((buyingPrice !== null && (!Number.isFinite(buyingPrice) || buyingPrice < 0)) || !Number.isFinite(sellingPrice) || sellingPrice <= 0 || form.quantity < 0 || form.minStockLevel < 0) {
            showToast('Enter valid prices and stock quantities', 'error');
            return;
        }
        const data = { ...form, buyingPrice: buyingPrice === null ? 0 : buyingPrice, sellingPrice };
        setSaving(true);
        try {
            if (mode === 'add') await addProduct(data);
            else if (product) await updateProduct(product.id, data);
            onClose();
        } catch (error) {
            showToast(error.message || 'Unable to save product. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const image = await readImageFile(file);
                setForm(prev => ({ ...prev, image }));
            } catch {
                showToast('Unable to process image', 'error');
            }
        }
    };

    const handleCamera = () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    try {
                        const image = await readImageFile(file);
                        setForm(prev => ({ ...prev, image }));
                    } catch {
                        showToast('Unable to process image', 'error');
                    }
                }
            };
            input.click();
        } else {
            showToast('Camera not supported on this device', 'error');
        }
    };

    return React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
        // Image
        React.createElement('div', { className: 'flex items-center gap-4' },
            React.createElement('div', {
                className: 'image-upload-preview w-28 h-28 flex-shrink-0',
                onClick: () => fileInputRef.current?.click()
            },
                form.image && (form.image.startsWith('data:') || form.image.startsWith('http') || form.image
                    .length < 10) ?
                React.createElement('img', { src: form.image, alt: 'Product', className: 'w-full h-full object-cover rounded-xl' }) :
                React.createElement('span', { className: 'text-4xl' }, form.image || '📦')
            ),
            React.createElement('div', { className: 'flex-1 space-y-1.5' },
                React.createElement('button', {
                    type: 'button',
                    onClick: () => fileInputRef.current?.click(),
                    className: 'text-sm btn-secondary w-full'
                }, '📁 Upload Image'),
                React.createElement('button', {
                    type: 'button',
                    onClick: handleCamera,
                    className: 'text-sm btn-secondary w-full'
                }, '📷 Take Photo'),
                React.createElement('input', {
                    ref: fileInputRef,
                    type: 'file',
                    accept: 'image/*',
                    onChange: handleImageUpload,
                    className: 'hidden'
                })
            )
        ),
        // Fields
        React.createElement('div', { className: 'grid sm:grid-cols-2 gap-3' },
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Product Name *'),
                React.createElement('input', {
                    type: 'text',
                    value: form.name,
                    onChange: (e) => setForm(prev => ({ ...prev, name: e.target.value })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    required: true
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Category *'),
                React.createElement('select', {
                    value: form.category,
                    onChange: (e) => setForm(prev => ({ ...prev, category: e.target.value })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
                }, categories.map(c => React.createElement('option', { key: c, value: c }, c)))
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Material Type'),
                React.createElement('input', {
                    type: 'text',
                    value: form.materialType,
                    onChange: (e) => setForm(prev => ({ ...prev, materialType: e.target.value })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    placeholder: 'e.g. Steel, Plastic'
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Supplier'),
                React.createElement('input', {
                    type: 'text',
                    value: form.supplier,
                    onChange: (e) => setForm(prev => ({ ...prev, supplier: e.target.value })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Buying Price (GHS)'),
                React.createElement('input', {
                    type: 'number',
                    step: '0.01',
                    value: form.buyingPrice,
                    onChange: (e) => setForm(prev => ({ ...prev, buyingPrice: e.target.value })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    placeholder: 'e.g. 85.00'
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Selling Price (GHS) *'),
                React.createElement('input', {
                    type: 'number',
                    step: '0.01',
                    value: form.sellingPrice,
                    onChange: (e) => setForm(prev => ({ ...prev, sellingPrice: e.target.value })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    placeholder: 'e.g. 100.00',
                    required: true
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Quantity *'),
                React.createElement('input', {
                    type: 'number',
                    step: '1',
                    value: form.quantity,
                    onChange: (e) => setForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    required: true,
                    min: 0
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Min Stock Alert'),
                React.createElement('input', {
                    type: 'number',
                    step: '1',
                    value: form.minStockLevel,
                    onChange: (e) => setForm(prev => ({ ...prev, minStockLevel: parseInt(e.target.value) ||
                            5 })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    min: 0
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Unit *'),
                React.createElement('select', {
                    value: form.unit,
                    onChange: (e) => setForm(prev => ({ ...prev, unit: e.target.value })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
                }, units.map(u => React.createElement('option', { key: u, value: u }, u)))
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Barcode / Product ID'),
                React.createElement('input', {
                    type: 'text',
                    value: form.barcode,
                    onChange: (e) => setForm(prev => ({ ...prev, barcode: e.target.value })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    placeholder: 'Auto-generated if empty'
                })
            )
        ),
        React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                'Description'),
            React.createElement('textarea', {
                value: form.description,
                onChange: (e) => setForm(prev => ({ ...prev, description: e.target.value })),
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                rows: 3,
                placeholder: 'Product description...'
            })
        ),
        React.createElement('div', { className: 'flex gap-2 justify-end pt-2' },
            React.createElement('button', {
                type: 'button',
                onClick: onClose,
                className: 'btn-secondary'
            }, 'Cancel'),
            React.createElement('button', {
                type: 'submit',
                className: 'btn-primary'
            }, saving ? 'Saving...' : (mode === 'add' ? 'Add Product' : 'Update Product'))
        )
    );
}

// ---- Sales Records ----
function SalesPage() {
    const { sales, products, showToast, refundSale } = useApp();
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);

    const filteredSales = useMemo(() => {
        let result = [...sales];
        if (filter === 'today') {
            const today = new Date().toLocaleDateString('en-CA');
            result = result.filter(s => (s.saleDate || new Date(s.date).toLocaleDateString('en-CA')) === today);
        } else if (filter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            result = result.filter(s => new Date(s.date) >= weekAgo);
        } else if (filter === 'month') {
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            result = result.filter(s => new Date(s.date) >= monthAgo);
        } else if (filter === 'year') {
            const yearAgo = new Date();
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            result = result.filter(s => new Date(s.date) >= yearAgo);
        }
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(sale =>
                sale.customerName?.toLowerCase().includes(s) ||
                sale.items.some(item => item.productName.toLowerCase().includes(s))
            );
        }
        return result.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [sales, filter, search]);

    const activeFilteredSales = filteredSales.filter(s => s.status !== 'refunded');
    const totalFiltered = activeFilteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalProfitFiltered = activeFilteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);

    const handleRefund = (sale) => {
        if (sale.status === 'refunded') return;
        if (window.confirm('Refund this sale and return the items to stock?')) refundSale(sale.id);
    };

    const printReceipt = (sale) => {
        const win = window.open('', '_blank', 'width=400,height=600');
        if (!win) return;
        const itemsHtml = sale.items.map(item =>
            `<tr><td>${item.productName}</td><td>×${item.quantity}</td><td>${formatCurrency(item.sellingPrice)}</td><td>${formatCurrency(item.quantity * item.sellingPrice)}</td></tr>`
        ).join('');
        win.document.write(`
            <html><head><title>Receipt</title>
            <style>body{font-family:'Courier New',monospace;padding:20px;max-width:380px;margin:0 auto;background:#fff;}
            .line{border-top:1px dashed #ccc;margin:8px 0;} .total{font-size:1.2rem;font-weight:700;}
            table{width:100%;font-size:0.85rem;} td{padding:2px 0;} .text-right{text-align:right;}
</style></head>
<body>
    <div style="text-align:center;margin-bottom:12px;">
        <h2 style="margin:0;">🏪 KoraPoint</h2>
        <p style="margin:2px 0;font-size:0.8rem;color:#666;">${new Date(sale.date).toLocaleString()}</p>
    </div>
    <div class="line"></div>
    <p><strong>Customer:</strong> ${sale.customerName || 'Walk-in'}</p>
    <p><strong>Payment:</strong> ${sale.paymentMethod || 'Cash'}</p>
    <div class="line"></div>
    <table>
        <tr><th>Item</th><th>Qty</th><th>Price</th><th class="text-right">Total</th></tr>
        ${itemsHtml}
    </table>
    <div class="line"></div>
    <div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:700;">
        <span>TOTAL</span>
        <span>${formatCurrency(sale.total)}</span>
    </div>
    <div style="font-size:0.8rem;color:#666;margin-top:4px;">Profit: ${formatCurrency(sale.profit || 0)}</div>
    <div class="line"></div>
    <p style="text-align:center;font-size:0.75rem;color:#999;">Thank you for your business!</p>
</body></html>
`);
win.document.close();
win.print();
};

    const shareReceipt = async (sale) => {
        const receiptText = [
            'KoraPoint Receipt',
            new Date(sale.date).toLocaleString(),
            `Customer: ${sale.customerName || 'Walk-in Customer'}`,
            ...sale.items.map(item => `${item.productName} x${item.quantity} ${formatCurrency(item.quantity * item.sellingPrice)}`),
            `Total: ${formatCurrency(sale.total)}`,
            `Payment: ${sale.paymentMethod || 'Cash'}`
        ].join('\n');
        try {
            if (navigator.share) {
                await navigator.share({ title: 'KoraPoint Receipt', text: receiptText });
                return;
            }
            await navigator.clipboard.writeText(receiptText);
            showToast('Receipt copied. You can paste it into WhatsApp.');
        } catch (error) {
            if (error.name !== 'AbortError') showToast('Could not share receipt', 'error');
        }
    };

return React.createElement('div', { className: 'space-y-4' },
React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '📋 Sales Records'),
React.createElement('div', { className: 'flex gap-2 flex-wrap' },
React.createElement('button', {
onClick: () => setFilter('all'),
className: `filter-chip ${filter === 'all' ? 'active' : ''}`
}, 'All'),
React.createElement('button', {
onClick: () => setFilter('today'),
className: `filter-chip ${filter === 'today' ? 'active' : ''}`
}, 'Today'),
React.createElement('button', {
onClick: () => setFilter('week'),
className: `filter-chip ${filter === 'week' ? 'active' : ''}`
}, 'Week'),
React.createElement('button', {
onClick: () => setFilter('month'),
className: `filter-chip ${filter === 'month' ? 'active' : ''}`
}, 'Month'),
React.createElement('button', {
onClick: () => setFilter('year'),
className: `filter-chip ${filter === 'year' ? 'active' : ''}`
}, 'Year')
)
),
// Summary
React.createElement('div', { className: 'grid grid-cols-1 gap-3' },
React.createElement(StatCard, { icon: '📊', label: 'Transactions', value: filteredSales.length, color: 'blue' })
),
// Search
React.createElement('input', {
type: 'text',
placeholder: '🔍 Search by customer or product...',
value: search,
onChange: (e) => setSearch(e.target.value),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white'
}),
// List
React.createElement('div', { className: 'space-y-2' },
filteredSales.length === 0 ?
React.createElement('p', { className: 'text-center text-gray-400 py-8' }, 'No sales records') :
filteredSales.map(sale =>
React.createElement('div', {
key: sale.id,
className: 'stat-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:border-amber-200',
onClick: () => setSelectedSale(sale)
},
React.createElement('div', { className: 'flex-1 min-w-0' },
React.createElement('p', { className: 'font-semibold text-gray-800 text-sm' },
sale.customerName || 'Walk-in Customer'),
React.createElement('p', { className: 'text-xs text-gray-400' },
new Date(sale.date).toLocaleString(), ' • ',
sale.items.length, ' items • ',
sale.paymentMethod || 'Cash'
)
),
React.createElement('div', { className: 'flex items-center gap-3' },
React.createElement('span', { className: `font-bold ${sale.status === 'refunded' ? 'text-gray-400 line-through' : 'text-amber-600'}` }, formatCurrency(sale.total)),
React.createElement('button', {
onClick: (e) => { e.stopPropagation();
printReceipt(sale); },
className: 'text-xs text-blue-500 hover:text-blue-700 font-medium'
}, '🖨️ Receipt')
,
React.createElement('button', {
onClick: (e) => { e.stopPropagation(); shareReceipt(sale); },
className: 'text-xs text-emerald-600 hover:text-emerald-700 font-medium'
}, '↗ Share')
,
React.createElement('button', {
onClick: (e) => { e.stopPropagation(); handleRefund(sale); },
disabled: sale.status === 'refunded',
className: 'text-xs text-rose-500 hover:text-rose-700 disabled:text-gray-400 font-medium'
}, sale.status === 'refunded' ? '↩ Refunded' : '↩ Refund')
)
)
)
)
);
}

// ---- Suppliers Page ----
function SuppliersPage() {
const { suppliers, setSuppliers, products, purchases, recordPurchase, showToast, apiMutation } = useApp();
const [showAdd, setShowAdd] = useState(false);
const [showPurchase, setShowPurchase] = useState(false);
const [editing, setEditing] = useState(null);
const [form, setForm] = useState({ name: '', contact: '', phone: '' });
const [purchaseForm, setPurchaseForm] = useState({ productId: '', supplier: '', quantity: 1, unitCost: 0 });

const handleSave = async () => {
if (!form.name.trim()) { showToast('Supplier name is required', 'error'); return; }
if (editing) {
const mutation = apiMutation(`/api/suppliers/${editing.id}`, 'PATCH', form, 'Supplier updated');
if (mutation) { try { await mutation; setForm({ name: '', contact: '', phone: '' }); setEditing(null); setShowAdd(false); } catch (error) { showToast(error.message, 'error'); } return; }
setSuppliers(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s));
showToast('Supplier updated');
} else {
const mutation = apiMutation('/api/suppliers', 'POST', form, 'Supplier added');
if (mutation) { try { await mutation; setForm({ name: '', contact: '', phone: '' }); setEditing(null); setShowAdd(false); } catch (error) { showToast(error.message, 'error'); } return; }
setSuppliers(prev => [...prev, { ...form, id: 's' + Date.now() }]);
showToast('Supplier added');
}
setForm({ name: '', contact: '', phone: '' });
setEditing(null);
setShowAdd(false);
};

const handleDelete = async (id) => {
if (window.confirm('Delete this supplier?')) {
const mutation = apiMutation(`/api/suppliers/${id}`, 'DELETE', undefined, 'Supplier removed');
if (mutation) { try { await mutation; } catch (error) { showToast(error.message, 'error'); } return; }
setSuppliers(prev => prev.filter(s => s.id !== id));
showToast('Supplier removed', 'info');
}
};

const handlePurchase = () => {
if (!purchaseForm.productId || !purchaseForm.supplier || purchaseForm.quantity <= 0 || purchaseForm.unitCost < 0) {
showToast('Select a product, supplier, quantity, and cost', 'error');
return;
}
recordPurchase({ ...purchaseForm, quantity: Number(purchaseForm.quantity), unitCost: Number(purchaseForm.unitCost) });
setPurchaseForm({ productId: '', supplier: '', quantity: 1, unitCost: 0 });
setShowPurchase(false);
};

return React.createElement('div', { className: 'space-y-4' },
React.createElement('div', { className: 'flex items-center justify-between' },
React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '🏢 Suppliers'),
React.createElement('button', {
onClick: () => { setEditing(null);
setForm({ name: '', contact: '', phone: '' });
setShowAdd(true); },
className: 'btn-primary text-sm'
}, '➕ Add Supplier')
,
React.createElement('button', {
onClick: () => setShowPurchase(true),
className: 'btn-secondary text-sm'
}, '📥 Record Purchase')
),
React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
suppliers.map(s =>
React.createElement('div', { key: s.id, className: 'stat-card p-4' },
React.createElement('div', { className: 'flex justify-between items-start' },
React.createElement('div', null,
React.createElement('p', { className: 'font-semibold text-gray-800' }, s.name),
React.createElement('p', { className: 'text-xs text-gray-400' }, s.contact || ''),
React.createElement('p', { className: 'text-xs text-gray-400' }, s.phone || '')
),
React.createElement('div', { className: 'flex gap-1' },
React.createElement('button', {
onClick: () => { setEditing(s);
setForm(s);
setShowAdd(true); },
className: 'p-1 text-gray-400 hover:text-gray-600'
}, '✎'),
React.createElement('button', {
onClick: () => handleDelete(s.id),
className: 'p-1 text-rose-400 hover:text-rose-600'
}, '🗑')
)
)
)
)
),
React.createElement('div', { className: 'stat-card p-4' },
React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' }, '📥 Recent Purchases'),
purchases.length === 0 ? React.createElement('p', { className: 'text-sm text-gray-400' }, 'No purchases recorded') :
purchases.slice(-5).reverse().map(purchase => {
const product = products.find(item => item.id === purchase.productId);
return React.createElement('div', { key: purchase.id, className: 'flex justify-between items-center py-1.5 border-b border-gray-50 text-sm' },
React.createElement('span', null, product?.name || 'Deleted product', ' · ', purchase.supplier),
React.createElement('span', { className: 'font-medium text-emerald-600' }, '+', purchase.quantity, ' · ', formatCurrency(purchase.quantity * purchase.unitCost)));
})
),
Modal({
isOpen: showAdd,
onClose: () => setShowAdd(false),
title: editing ? 'Edit Supplier' : 'Add Supplier',
maxWidth: 'max-w-md'
},
React.createElement('div', { className: 'space-y-3' },
React.createElement('input', {
type: 'text',
placeholder: 'Supplier Name *',
value: form.name,
onChange: (e) => setForm(prev => ({ ...prev, name: e.target.value })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
}),
React.createElement('input', {
type: 'text',
placeholder: 'Contact Person',
value: form.contact,
onChange: (e) => setForm(prev => ({ ...prev, contact: e.target.value })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
}),
React.createElement('input', {
type: 'text',
placeholder: 'Phone Number',
value: form.phone,
onChange: (e) => setForm(prev => ({ ...prev, phone: e.target.value })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
}),
React.createElement('div', { className: 'flex gap-2 justify-end pt-2' },
React.createElement('button', { onClick: () => setShowAdd(false), className: 'btn-secondary' },
'Cancel'),
React.createElement('button', { onClick: handleSave, className: 'btn-primary' },
editing ? 'Update' : 'Add')
)
)
)
,
Modal({
isOpen: showPurchase,
onClose: () => setShowPurchase(false),
title: 'Record Purchase',
maxWidth: 'max-w-md'
},
React.createElement('div', { className: 'space-y-3' },
React.createElement('select', { value: purchaseForm.productId, onChange: e => setPurchaseForm(prev => ({ ...prev, productId: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' },
React.createElement('option', { value: '' }, 'Select product *'), products.map(product => React.createElement('option', { key: product.id, value: product.id }, product.name))),
React.createElement('select', { value: purchaseForm.supplier, onChange: e => setPurchaseForm(prev => ({ ...prev, supplier: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' },
React.createElement('option', { value: '' }, 'Select supplier *'), suppliers.map(supplier => React.createElement('option', { key: supplier.id, value: supplier.name }, supplier.name))),
React.createElement('input', { type: 'number', min: 1, value: purchaseForm.quantity, onChange: e => setPurchaseForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 })), placeholder: 'Quantity *', className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('input', { type: 'number', min: 0, step: '0.01', value: purchaseForm.unitCost, onChange: e => setPurchaseForm(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 })), placeholder: 'Unit cost (GHS) *', className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('div', { className: 'flex justify-end gap-2' },
React.createElement('button', { onClick: () => setShowPurchase(false), className: 'btn-secondary' }, 'Cancel'),
React.createElement('button', { onClick: handlePurchase, className: 'btn-primary' }, 'Save Purchase')
)
)
)
);
}

// ---- Expenses Page ----
function ExpensesPage() {
const { expenses, setExpenses, showToast, apiMutation, refreshTenantData } = useApp();
const [showAdd, setShowAdd] = useState(false);
const [form, setForm] = useState({ description: '', amount: 0, category: 'Utilities', date: new Date().toISOString()
.split('T')[0] });

const categories = ['Utilities', 'Rent', 'Salaries', 'Supplies', 'Transport', 'Maintenance', 'Other'];

const handleSave = async () => {
if (!form.description.trim() || form.amount <= 0) { showToast('Please fill in all fields', 'error'); return; }
const mutation = apiMutation('/api/expenses', 'POST', form, 'Expense added');
if (mutation) { try { await mutation; setForm({ description: '', amount: 0, category: 'Utilities', date: new Date().toISOString().split('T')[0] }); setShowAdd(false); } catch (error) { showToast(error.message, 'error'); } return; }
setExpenses(prev => [...prev, { ...form, id: 'e' + Date.now() }]);
showToast('Expense added');
setForm({ description: '', amount: 0, category: 'Utilities', date: new Date().toISOString().split('T')[0] });
setShowAdd(false);
};

const handleDeleteExpense = async (id) => {
if (!window.confirm('Delete this expense? This action cannot be undone.')) return;
const token = DB.get(SESSION_KEY, null)?.accessToken;
if (token && token !== 'local-demo-token') {
try { await apiRequest(`/api/expenses/${id}`, { method: 'DELETE' }, token); await refreshTenantData(); showToast('Expense deleted', 'info'); }
catch (error) { showToast(error.message, 'error'); }
return;
}
setExpenses(prev => prev.filter(e => e.id !== id));
logAction('Expense deleted', id);
showToast('Expense deleted', 'info');
};

const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

return React.createElement('div', { className: 'space-y-4' },
React.createElement('div', { className: 'flex items-center justify-between' },
React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '💸 Expenses'),
React.createElement('button', {
onClick: () => setShowAdd(true),
className: 'btn-primary text-sm'
}, '➕ Add Expense')
),
React.createElement(StatCard, { icon: '💰', label: 'Total Expenses', value: formatCurrency(totalExpenses),
color: 'rose' }),
React.createElement('div', { className: 'space-y-2' },
expenses.length === 0 ?
React.createElement('p', { className: 'text-center text-gray-400 py-8' }, 'No expenses recorded') :
[...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e =>
React.createElement('div', { key: e.id, className: 'stat-card p-3 flex items-center justify-between gap-3' },
React.createElement('div', { className: 'min-w-0' },
React.createElement('p', { className: 'font-medium text-gray-800 text-sm truncate' }, e.description),
React.createElement('p', { className: 'text-xs text-gray-400' }, e.category, ' • ', new Date(e.date).toLocaleDateString())
),
React.createElement('div', { className: 'flex items-center gap-3 shrink-0' },
React.createElement('span', { className: 'font-bold text-rose-500' }, formatCurrency(e.amount)),
React.createElement('button', { onClick: () => handleDeleteExpense(e.id), className: 'btn-danger expense-delete-btn text-xs px-3 py-2', title: 'Delete expense', 'aria-label': `Delete expense ${e.description}` }, '🗑 Delete')
)
)
)
),
Modal({
isOpen: showAdd,
onClose: () => setShowAdd(false),
title: 'Add Expense',
maxWidth: 'max-w-md'
},
React.createElement('div', { className: 'space-y-3' },
React.createElement('input', {
type: 'text',
placeholder: 'Description *',
value: form.description,
onChange: (e) => setForm(prev => ({ ...prev, description: e.target.value })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
}),
React.createElement('input', {
type: 'number',
placeholder: 'Amount (GHS) *',
value: form.amount || '',
onChange: (e) => setForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
step: '0.01'
}),
React.createElement('select', {
value: form.category,
onChange: (e) => setForm(prev => ({ ...prev, category: e.target.value })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
}, categories.map(c => React.createElement('option', { key: c, value: c }, c))),
React.createElement('input', {
type: 'date',
value: form.date,
onChange: (e) => setForm(prev => ({ ...prev, date: e.target.value })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
}),
React.createElement('div', { className: 'flex gap-2 justify-end pt-2' },
React.createElement('button', { onClick: () => setShowAdd(false), className: 'btn-secondary' },
'Cancel'),
React.createElement('button', { onClick: handleSave, className: 'btn-primary' }, 'Add Expense')
)
)
)
);
}

// ---- Reports Page ----
function ReportsPage() {
const { products, sales, expenses, showToast } = useApp();
const [reportEmail, setReportEmail] = useState('');
const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
const activeSales = sales.filter(isActiveSale);
const totalRevenue = activeSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
const totalProfit = activeSales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
const netProfit = totalProfit - totalExpenses;
const selectedSales = activeSales.filter(s => (s.saleDate || new Date(s.date).toLocaleDateString('en-CA')) === selectedDate)
    .sort((a,b) => new Date(a.date) - new Date(b.date));
const selectedTotal = selectedSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
const selectedProfit = selectedSales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
const selectedRows = selectedSales.flatMap(sale => (sale.items || []).map((item, index) => ({
    id: `${sale.id}-${index}`, time: new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    customer: sale.customerName || 'Walk-in Customer', item: item.productName || 'Item', qty: Number(item.quantity || 0),
    price: Number(item.sellingPrice || 0), amount: Number(item.quantity || 0) * Number(item.sellingPrice || 0), saleTotal: Number(sale.total || 0),
    payment: sale.paymentMethod || 'Cash'
})))

const downloadDaySales = () => {
    if (!selectedSales.length) { showToast('There are no sales for this day.', 'error'); return; }
    const rows = [['Time','Customer','Item Purchased','Qty','Unit Price (GHS)','Amount (GHS)','Payment Method']];
    selectedRows.forEach(r => rows.push([r.time,r.customer,r.item,r.qty,r.price.toFixed(2),r.amount.toFixed(2),r.payment]));
    rows.push([]); rows.push(['','','','','DAY TOTAL',selectedTotal.toFixed(2),'']);
    const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `KoraPoint-sales-${selectedDate}.csv`; link.click(); URL.revokeObjectURL(url);
    showToast(`Sales for ${selectedDate} downloaded`);
};

const sendDailyReport = async () => {
    const recipient = reportEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) { showToast('Enter a valid report email address', 'error'); return; }
    const body = [`KoraPoint sales report for ${selectedDate}`, `Revenue: ${formatCurrency(selectedTotal)}`, `Gross profit: ${formatCurrency(selectedProfit)}`, `Transactions: ${selectedSales.length}`].join('\n');
    try { await apiRequestWithSession('/api/reports/email', { method:'POST', body:JSON.stringify({ recipient, subject:`KoraPoint sales report - ${selectedDate}`, report:body }) }); showToast('Daily report sent successfully'); }
    catch(error) { showToast(error.message, 'error'); }
};

return React.createElement('div', { className: 'space-y-5' },
React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
React.createElement('div', null, React.createElement('h2', { className:'text-xl font-bold text-gray-800' }, '📊 Reports'), React.createElement('p',{className:'text-sm text-gray-500'},'Simple records you can read at a glance.')),
React.createElement('div',{className:'flex flex-wrap gap-2 no-print'},
React.createElement('input',{type:'date',value:selectedDate,onChange:e=>setSelectedDate(e.target.value),className:'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white',title:'Choose a day'}),
React.createElement('button',{onClick:downloadDaySales,className:'btn-primary text-sm'},'⬇ Download Day\'s Sales'))
),
React.createElement('div',{className:'stat-card p-3 sm:p-5'},
React.createElement('div',{className:'flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4'},
React.createElement('div',null,React.createElement('h3',{className:'text-lg font-bold text-gray-800'},'📖 Sales Record'),React.createElement('p',{className:'text-sm text-gray-500'},new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'}))),
React.createElement('div',{className:'text-right'},React.createElement('p',{className:'text-xs text-gray-400'},selectedSales.length,' sale',selectedSales.length===1?'':'s'),React.createElement('p',{className:'text-lg font-bold text-blue-800'},formatCurrency(selectedTotal)))),
React.createElement('div',{className:'overflow-x-auto rounded-lg border border-gray-200'},
React.createElement('table',{className:'w-full text-sm min-w-[720px]'},
React.createElement('thead',{className:'bg-blue-50 text-blue-900'},React.createElement('tr',null,
['Time','Customer Name','Item Purchased','Qty','Price','Amount','Payment'].map(h=>React.createElement('th',{key:h,className:'px-3 py-3 text-left font-bold'},h)))),
React.createElement('tbody',null,
selectedRows.length===0 ? React.createElement('tr',null,React.createElement('td',{colSpan:7,className:'px-4 py-10 text-center text-gray-400'},'No sales recorded for this day.')) : selectedRows.map(row=>React.createElement('tr',{key:row.id,className:'border-t border-gray-100 hover:bg-blue-50/40'},
React.createElement('td',{className:'px-3 py-3 whitespace-nowrap text-gray-500'},row.time),React.createElement('td',{className:'px-3 py-3 font-medium text-gray-800'},row.customer),React.createElement('td',{className:'px-3 py-3 text-gray-700'},row.item),React.createElement('td',{className:'px-3 py-3'},row.qty),React.createElement('td',{className:'px-3 py-3'},formatCurrency(row.price)),React.createElement('td',{className:'px-3 py-3 font-semibold'},formatCurrency(row.amount)),React.createElement('td',{className:'px-3 py-3 text-gray-500'},row.payment)))),
React.createElement('tfoot',null,React.createElement('tr',{className:'border-t-2 border-blue-200 bg-blue-50'},React.createElement('td',{colSpan:5,className:'px-3 py-3 text-right font-bold text-blue-900'},'DAY TOTAL'),React.createElement('td',{className:'px-3 py-3 font-extrabold text-lg text-blue-900'},formatCurrency(selectedTotal)),React.createElement('td',{className:'px-3 py-3'})))
)),
React.createElement('div',{className:'mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500'},React.createElement('span',null,'Gross profit: ',formatCurrency(selectedProfit)),React.createElement('span',null,'Choose another date above to view another day.'))),
React.createElement('div',{className:'stat-card p-4'},React.createElement('div',{className:'flex flex-col sm:flex-row gap-2'},React.createElement('input',{type:'email',value:reportEmail,onChange:e=>setReportEmail(e.target.value),placeholder:'Report email',className:'flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm'}),React.createElement('button',{onClick:sendDailyReport,className:'btn-secondary text-sm'},'✉ Email Selected Day'))),
React.createElement('div',{className:'stat-card p-4'},React.createElement('p',{className:'text-sm font-semibold text-gray-700'},'📈 Business Summary'),React.createElement('p',{className:'text-sm text-gray-500 mt-1'},'Net profit: ',React.createElement('strong',{className:netProfit>=0?'text-emerald-600':'text-rose-600'},formatCurrency(netProfit))))
);
}

// ---- Settings / Users ----
function SettingsPage() {
const { users, setUsers, currentUser, showToast, auditLogs, authenticate, logout, refreshTenantData } = useApp();
const safeUsers = Array.isArray(users) ? users : [];
const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];
const hasSession = Boolean(DB.get(SESSION_KEY, null)?.accessToken);
const [showAdd, setShowAdd] = useState(false);
const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' });
const [showStaffPassword, setShowStaffPassword] = useState(false);
const [loginUser, setLoginUser] = useState({ email: '', password: '' });
const recoveryParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const recoveryAccessToken = recoveryParams.get('access_token') || '';
const [authMode, setAuthMode] = useState(() => recoveryAccessToken ? 'reset' : 'login');
const [forgotEmail, setForgotEmail] = useState('');
const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });
const [isSubmitting, setIsSubmitting] = useState(false);
const [authMessage, setAuthMessage] = useState('');
const [showAuthPassword, setShowAuthPassword] = useState(false);
const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
const [passwordMessage, setPasswordMessage] = useState('');
const [isChangingPassword, setIsChangingPassword] = useState(false);
const [isLogin, setIsLogin] = useState(!currentUser || !hasSession);
const backupInputRef = useRef(null);
const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const handleLogin = async () => {
if (isSubmitting) return;
if (!isValidEmail(loginUser.email)) {
setAuthMessage('Enter a valid email address.');
showToast('Enter a valid email address', 'error');
return;
}
try {
setIsSubmitting(true);
setAuthMessage('Signing you in...');
const session = await authenticate('/api/auth/login', loginUser);
setIsLogin(false);
showToast('Welcome, ' + session.user.name);
} catch (error) {
setAuthMessage(error.message);
showToast(error.message, 'error');
} finally {
setIsSubmitting(false);
}
};

const handleForgotPassword = async () => {
if (isSubmitting) return;
if (!isValidEmail(forgotEmail)) { setAuthMessage('Enter a valid email address.'); return; }
try {
setIsSubmitting(true);
setAuthMessage('Sending reset instructions...');
const response = await apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: forgotEmail }) });
setAuthMessage(response.message);
} catch (error) { setAuthMessage(error.message); } finally { setIsSubmitting(false); }
};

const handleResetPassword = async () => {
if (isSubmitting) return;
if (!recoveryAccessToken) { setAuthMessage('This password reset link is invalid or expired.'); return; }
if (resetForm.password.length < 12 || resetForm.password.length > 128) { setAuthMessage('Password must be 12-128 characters.'); return; }
if (resetForm.password !== resetForm.confirmPassword) { setAuthMessage('Passwords do not match.'); return; }
try {
setIsSubmitting(true);
const response = await apiRequest('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ accessToken: recoveryAccessToken, password: resetForm.password }) });
setAuthMessage(response.message);
setAuthMode('login');
window.history.replaceState({}, document.title, window.location.pathname);
} catch (error) { setAuthMessage(error.message); } finally { setIsSubmitting(false); }
};

const handleLogout = () => {
logout();
setIsLogin(true);
showToast('Logged out', 'info');
};

const handleChangePassword = async () => {
if (isChangingPassword) return;
if (passwordForm.newPassword.length < 12) { setPasswordMessage('New password must be at least 12 characters.'); return; }
if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordMessage('New passwords do not match.'); return; }
try {
setIsChangingPassword(true);
setPasswordMessage('Updating your password...');
await apiRequest('/api/auth/password', { method: 'PATCH', body: JSON.stringify(passwordForm) }, DB.get(SESSION_KEY, null)?.accessToken);
setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
setPasswordMessage('Password updated successfully.');
showToast('Password updated');
} catch (error) {
setPasswordMessage(error.message);
showToast(error.message, 'error');
} finally { setIsChangingPassword(false); }
};

const handleAddUser = async () => {
if (!['owner', 'manager'].includes(currentUser?.role)) { showToast('Only the owner or a manager can manage staff', 'error'); return; }
const email = form.email.trim().toLowerCase();
if (!form.name.trim() || !isValidEmail(email) || form.password.length < 12 || form.password.length > 128) {
showToast('Name, valid email, and a 12-128 character password are required', 'error');
return;
}
if (safeUsers.find(u => u.email?.toLowerCase() === email)) { showToast('That email is already in use', 'error'); return; }
const userData = { ...form, name: form.name.trim(), email };
const token = DB.get(SESSION_KEY, null)?.accessToken;
if (token && token !== 'local-demo-token') {
try {
await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(userData) }, token);
await refreshTenantData();
showToast('User added');
setForm({ name: '', email: '', password: '', role: 'cashier' });
setShowAdd(false);
} catch (error) { showToast(error.message, 'error'); }
return;
}
setUsers(prev => [...prev, { ...userData, id: 'u' + Date.now() }]);
showToast('User added');
setForm({ name: '', email: '', password: '', role: 'cashier' });
setShowAdd(false);
};

const handleDeleteUser = async (id) => {
if (currentUser?.role !== 'owner') { showToast('Only the business owner can revoke user access', 'error'); return; }
if (id === currentUser?.id) { showToast('Cannot delete yourself', 'error'); return; }
if (window.confirm('Delete this user?')) {
const mutation = apiMutation(`/api/users/${id}`, 'DELETE', undefined, 'User removed');
if (mutation) { try { await mutation; } catch (error) { showToast(error.message, 'error'); } return; }
setUsers(prev => prev.filter(u => u.id !== id));
showToast('User removed', 'info');
}
};

const handleRestore = (event) => {
const file = event.target.files?.[0];
if (!file) return;
const reader = new FileReader();
reader.onload = () => {
try {
const backup = JSON.parse(reader.result);
['products', 'sales', 'customers', 'suppliers', 'expenses', 'users', 'register', 'stockMovements', 'purchases', 'auditLogs'].forEach(key => {
if (backup[key] !== undefined) DB.set(key, backup[key]);
});
showToast('Backup restored. Reloading...');
setTimeout(() => window.location.reload(), 500);
} catch {
showToast('Invalid backup file', 'error');
}
};

reader.readAsText(file);
event.target.value = '';
};

const handleResetApp = async () => {
if (!['owner', 'manager'].includes(currentUser?.role)) { showToast('Only the owner or a manager can reset the whole POS.', 'error'); return; }
const phrase = window.prompt('This will permanently clear this shop\'s sales, stock, products, expenses and records. Type RESET to continue.');
if (phrase !== 'RESET') { if (phrase !== null) showToast('Reset cancelled', 'info'); return; }
try {
    await apiRequestWithSession('/api/admin/reset', { method:'POST' });
    localStorage.removeItem('nexatill_offlineSaleQueue');
    ['products','sales','customers','suppliers','expenses','stockMovements','purchases','auditLogs','parkedCarts','heldSales','groups','quickSellItems'].forEach(k=>DB.set(k, []));
    showToast('POS reset successfully. Reloading...');
    setTimeout(()=>window.location.reload(),700);
} catch(error) { showToast(error.message || 'Reset failed', 'error'); }
};

const startTour = () => window.dispatchEvent(new Event('nexatill:start-tour'));

if (isLogin || !currentUser || !hasSession) {
return React.createElement('div', { className: 'login-screen' },
React.createElement('div', { className: 'login-layout' },
React.createElement('div', { className: 'login-card' },
React.createElement('h2', { className: 'text-2xl font-bold text-center text-gray-800 mb-2' }, 'Bopstina Ventures'),
React.createElement('p', { className: 'text-center text-gray-400 text-sm mb-6' }, 'Sign in to your business workspace'),
authMessage && React.createElement('p', { role: 'alert', className: `text-center text-sm mb-3 ${authMessage.includes('...') ? 'text-amber-600' : 'text-rose-600'}` }, authMessage),
React.createElement('div', { className: 'space-y-3' },
authMode === 'login' && React.createElement(React.Fragment, null,
React.createElement('input', { type: 'email', placeholder: 'Email address', autoComplete: 'username', required: true, value: loginUser.email, onChange: e => setLoginUser(prev => ({ ...prev, email: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('div', { className: 'relative' },
React.createElement('input', { type: showAuthPassword ? 'text' : 'password', placeholder: 'Password', autoComplete: 'current-password', required: true, value: loginUser.password, onChange: e => setLoginUser(prev => ({ ...prev, password: e.target.value })), className: 'w-full px-3 py-2 pr-20 border border-gray-200 rounded-lg text-sm', onKeyDown: e => e.key === 'Enter' && handleLogin() }),
React.createElement('button', { type: 'button', onClick: () => setShowAuthPassword(!showAuthPassword), className: 'absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-amber-600' }, showAuthPassword ? 'Hide' : 'Show')
),
React.createElement('button', { onClick: handleLogin, disabled: isSubmitting, className: 'w-full btn-primary' }, isSubmitting ? 'Connecting...' : 'Sign In'),
React.createElement('button', { type: 'button', onClick: () => { setAuthMode('forgot'); setAuthMessage(''); }, className: 'w-full text-sm text-amber-600 hover:text-amber-700' }, 'Forgot password?')
),
authMode === 'forgot' && React.createElement(React.Fragment, null,
React.createElement('input', { type: 'email', placeholder: 'Account email address', autoComplete: 'email', value: forgotEmail, onChange: e => setForgotEmail(e.target.value), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('button', { onClick: handleForgotPassword, disabled: isSubmitting, className: 'w-full btn-primary' }, isSubmitting ? 'Sending...' : 'Send Reset Link'),
React.createElement('button', { type: 'button', onClick: () => { setAuthMode('login'); setAuthMessage(''); }, className: 'w-full text-sm text-gray-500 hover:text-gray-700' }, 'Back to sign in')
),
authMode === 'reset' && React.createElement(React.Fragment, null,
React.createElement('input', { type: 'password', placeholder: 'New password (12-128 characters)', value: resetForm.password, onChange: e => setResetForm(prev => ({ ...prev, password: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('input', { type: 'password', placeholder: 'Confirm new password', value: resetForm.confirmPassword, onChange: e => setResetForm(prev => ({ ...prev, confirmPassword: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('button', { onClick: handleResetPassword, disabled: isSubmitting, className: 'w-full btn-primary' }, isSubmitting ? 'Saving...' : 'Set New Password'),
React.createElement('button', { type: 'button', onClick: () => { setAuthMode('login'); setAuthMessage(''); }, className: 'w-full text-sm text-gray-500 hover:text-gray-700' }, 'Back to sign in')
)
),
),
React.createElement('div', { className: 'login-visual' },
React.createElement('div', { className: 'login-visual-copy' },
React.createElement('span', { className: 'login-visual-kicker' }, 'Bopstina Ventures'),
React.createElement('h3', null, 'Everything your shop needs, in one place.'),
React.createElement('p', null, 'Track stock, serve customers, and keep every sale moving.'),
React.createElement('div', { className: 'hardware-scene', 'aria-hidden': 'true' },
React.createElement('div', { className: 'hardware-shelf' }),
React.createElement('div', { className: 'hardware-item hardware-box' }, 'NUTS'),
React.createElement('div', { className: 'hardware-item hardware-paint' }, 'PAINT'),
React.createElement('div', { className: 'hardware-item hardware-tools' }, 'TOOLS'),
React.createElement('div', { className: 'hardware-item hardware-bag' }, 'BOPSTINA'),
React.createElement('div', { className: 'hardware-tag' }, 'INVENTORY', React.createElement('strong', null, 'IN SYNC'))
)
),
React.createElement('div', { className: 'login-visual-footer' }, 'A calmer way to run the counter', React.createElement('span', null, '● LIVE'))
)
)
);
}


return React.createElement('div', { className: 'settings-page' },
React.createElement('div', { className: 'settings-header flex items-center justify-between' },
React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '⚙️ Settings'),
React.createElement('button', {
onClick: handleLogout,
className: 'text-sm text-rose-500 hover:text-rose-700 font-medium'
}, '🚪 Logout')
),
React.createElement('div', { className: 'stat-card p-4 kora-install-card' },
React.createElement('div', null,
React.createElement('p', { className: 'text-sm font-semibold text-gray-700' }, '📲 Install KoraPoint'),
React.createElement('p', { className: 'text-xs text-gray-400 mt-1' }, 'Install the POS on this device for faster access like an app.')
),
React.createElement('button', {
id: 'kora-install-settings-button',
type: 'button',
className: 'btn-primary text-sm whitespace-nowrap',
onClick: async () => {
  const event = window.__koraDeferredInstallPrompt;
  if (event) {
    try { event.prompt(); await event.userChoice; } catch (e) { console.warn('PWA install prompt failed', e); }
    window.__koraDeferredInstallPrompt = null;
  } else {
    showToast(/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'On iPhone/iPad: tap Share, then Add to Home Screen.' : 'Open your browser menu and choose Install KoraPoint or Add to Home screen.', 'info');
  }
}
}, 'INSTALL APP')
),
React.createElement('div', { className: 'stat-card p-4' },
React.createElement('p', { className: 'text-sm text-gray-600' },
'Logged in as ', React.createElement('span', { className: 'font-semibold' }, currentUser.name),
' (', currentUser.role, ')'
)
),
React.createElement('div', { className: 'stat-card p-4 flex items-center justify-between gap-3' },
React.createElement('div', null,
React.createElement('p', { className: 'text-sm font-semibold text-gray-700' }, '🧭 Guided Tour'),
React.createElement('p', { className: 'text-xs text-gray-400' }, 'Review the main POS workflow and features.')
),
React.createElement('button', { onClick: startTour, className: 'btn-secondary text-sm whitespace-nowrap' }, 'Start Tour')
),
React.createElement('div', { className: 'stat-card p-4' },
React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-1' }, '💾 Data Protection'),
React.createElement('p', { className: 'text-xs text-gray-400 mb-3' }, 'Keep a copy of your products, sales, expenses, and settings.'),
React.createElement('div', { className: 'flex flex-wrap gap-2' },
React.createElement('button', { onClick: downloadBackup, className: 'btn-secondary text-sm' }, '⬇ Export Backup'),
React.createElement('button', { onClick: () => backupInputRef.current?.click(), className: 'btn-secondary text-sm' }, '⬆ Restore Backup'),
React.createElement('input', { ref: backupInputRef, type: 'file', accept: '.json,application/json', onChange: handleRestore, className: 'hidden' })
)
),
currentUser && hasSession && React.createElement('div', { className: 'manager-reset-card' },
React.createElement('div', null,
React.createElement('h3', { className: 'text-base font-bold text-red-900 mb-1' }, '⚠️ Owner / Manager Reset'),
React.createElement('p', { className: 'text-xs text-red-700 mb-2' }, 'Permanently clear this shop\'s operational records and start fresh. Your manager account remains.'),
!['owner', 'manager'].includes(currentUser?.role) && React.createElement('p', { className: 'text-xs font-semibold text-red-800' }, '🔒 Owner or manager access required to use Reset.')
),
React.createElement('button', { onClick: handleResetApp, disabled: !['owner', 'manager'].includes(currentUser?.role), className: 'manager-reset-button' }, 'RESET WHOLE POS')
),
React.createElement('div', { className: 'stat-card p-4' },
React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-1' }, '🔑 Change Password'),
React.createElement('p', { className: 'text-xs text-gray-400 mb-3' }, 'Use a new password with at least 12 characters.'),
React.createElement('div', { className: 'grid gap-3 sm:grid-cols-3' },
React.createElement('input', { type: 'password', placeholder: 'Current password', value: passwordForm.currentPassword, onChange: e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('input', { type: 'password', placeholder: 'New password', value: passwordForm.newPassword, onChange: e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('input', { type: 'password', placeholder: 'Confirm new password', value: passwordForm.confirmPassword, onChange: e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' })
),
passwordMessage && React.createElement('p', { className: `text-xs mt-2 ${passwordMessage.includes('successfully') ? 'text-emerald-600' : 'text-rose-600'}` }, passwordMessage),
React.createElement('button', { onClick: handleChangePassword, disabled: isChangingPassword, className: 'btn-primary text-sm mt-3' }, isChangingPassword ? 'Updating...' : 'Update Password')
),
React.createElement('div', { className: 'stat-card p-4' },
React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' }, '🛡️ Activity Log'),
safeAuditLogs.length === 0 ? React.createElement('p', { className: 'text-xs text-gray-400' }, 'No activity yet') :
safeAuditLogs.slice(-8).reverse().map(log => React.createElement('div', { key: log.id, className: 'flex justify-between gap-2 py-1.5 border-b border-gray-50 text-xs' },
React.createElement('span', { className: 'text-gray-700' }, log.action, log.details ? ` · ${log.details}` : ''),
React.createElement('span', { className: 'text-gray-400 whitespace-nowrap' }, new Date(log.date).toLocaleTimeString())
))
),
React.createElement('div', { className: 'stat-card p-4' },
React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' }, '📖 How KoraPoint works'),
React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600' },
React.createElement('p', null, '1. Add products and set prices in Products.'),
React.createElement('p', null, '2. Open the register before trading.'),
React.createElement('p', null, '3. Add items to the cart and complete checkout.'),
React.createElement('p', null, '4. Sales automatically reduce stock.'),
React.createElement('p', null, '5. Record purchases to increase stock.'),
React.createElement('p', null, '6. Use Reports and the activity log to review performance.'),
React.createElement('p', null, '7. Managers can add cashiers and managers.'),
React.createElement('p', null, '8. Each company sees only its own workspace.')
)
),
['owner', 'manager'].includes(currentUser?.role) && React.createElement('div', { className: 'flex items-center justify-between' },
React.createElement('h3', { className: 'font-semibold text-gray-700' }, '👥 Users'),
React.createElement('p', { className: 'text-xs text-gray-400 mb-2' }, 'Owner: full access · Manager: shop operations + staff · Cashier: selling and checkout only.'),
React.createElement('button', {
onClick: () => setShowAdd(true),
className: 'btn-primary text-sm'
}, '➕ Add User')
),
['owner', 'manager'].includes(currentUser?.role) && React.createElement('div', { className: 'space-y-2' },
safeUsers.map(u =>
React.createElement('div', { key: u.id, className: 'stat-card p-3 flex items-center justify-between' },
React.createElement('div', null,
React.createElement('p', { className: 'font-medium text-gray-800 text-sm' }, u.name),
React.createElement('p', { className: 'text-xs text-gray-400' }, u.role === 'owner' ? 'Full access' : u.role === 'manager' ? 'Shop + staff management' : 'Sales + checkout')
),
currentUser?.role === 'owner' && u.id !== currentUser?.id && React.createElement('button', {
onClick: () => handleDeleteUser(u.id),
className: 'text-rose-400 hover:text-rose-600 text-sm'
}, '🗑')
)
)
),
Modal({
isOpen: showAdd,
onClose: () => setShowAdd(false),
title: 'Add User',
maxWidth: 'max-w-md'
},
React.createElement('div', { className: 'space-y-3' },
React.createElement('input', {
type: 'text',
placeholder: 'Full name *',
value: form.name,
onChange: (e) => setForm(prev => ({ ...prev, name: e.target.value })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
}),
React.createElement('input', { type: 'email', placeholder: 'Email *', value: form.email, onChange: e => setForm(prev => ({ ...prev, email: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('div', { className: 'relative' },
React.createElement('input', {
type: showStaffPassword ? 'text' : 'password',
placeholder: 'Password *',
value: form.password,
onChange: (e) => setForm(prev => ({ ...prev, password: e.target.value })),
className: 'w-full px-3 py-2 pr-20 border border-gray-200 rounded-lg text-sm'
}),
React.createElement('button', {
type: 'button',
onClick: () => setShowStaffPassword(!showStaffPassword),
className: 'absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-amber-600',
ariaLabel: showStaffPassword ? 'Hide staff password' : 'Show staff password'
}, showStaffPassword ? 'Hide' : 'Show')
),
React.createElement('select', {
value: form.role,
onChange: (e) => setForm(prev => ({ ...prev, role: e.target.value })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
},
React.createElement('option', { value: 'manager' }, 'Manager'),
React.createElement('option', { value: 'cashier' }, 'Cashier')
),
React.createElement('div', { className: 'flex gap-2 justify-end pt-2' },
React.createElement('button', { onClick: () => setShowAdd(false), className: 'btn-secondary' },
'Cancel'),
React.createElement('button', { onClick: handleAddUser, className: 'btn-primary' }, 'Add User')
)
)
)
);
}

// ---- Guided Tour ----
function Tour({ step, onNext, onBack, onClose, onNavigate }) {
    const steps = [
        { page: 'dashboard', icon: '📊', title: 'Your business at a glance', text: 'See today\'s sales, stock levels, register status, and recent activity from one screen.' },
        { page: 'sell', icon: '🛒', title: 'Sell quickly', text: 'Search products, choose a quantity, and add items to the cart with one tap.' },
        { page: 'products', icon: '📦', title: 'Manage your stock', text: 'Open the cart, choose a payment method, enter cash received, and see the change instantly.' },
        { page: 'reports', icon: '📈', title: 'Know how the shop is doing', text: 'Use Reports for daily closing, payment totals, profit, expenses, and best-selling products.' },
        { page: 'settings', icon: '🛡️', title: 'Keep your data protected', text: 'Export backups, restore records, review the activity log, and restart this tour from Settings.' }
    ];
    const current = steps[step];
    return React.createElement('div', { className: 'tour-overlay', role: 'dialog', 'aria-modal': 'true' },
        React.createElement('div', { className: 'tour-card' },
            React.createElement('div', { className: 'tour-icon' }, current.icon),
            React.createElement('p', { className: 'tour-step' }, 'STEP ', step + 1, ' OF ', steps.length),
            React.createElement('h2', null, current.title),
            React.createElement('p', { className: 'tour-text' }, current.text),
            React.createElement('div', { className: 'tour-dots' }, steps.map((item, index) => React.createElement('span', {
                key: item.title, className: index === step ? 'active' : ''
            }))),
            React.createElement('div', { className: 'tour-actions' },
                React.createElement('button', { onClick: onClose, className: 'btn-secondary' }, 'Skip'),
                React.createElement('div', { className: 'flex gap-2' },
                    step > 0 && React.createElement('button', { onClick: onBack, className: 'btn-secondary' }, 'Back'),
                    React.createElement('button', {
                        onClick: () => { onNavigate(current.page); onNext(); },
                        className: 'btn-primary'
                    }, step === steps.length - 1 ? 'Finish' : 'Next')
                )
            )
        )
    );
}

// ---- Main App ----
function App() {
const { currentUser, currentCompany, offlineSaleQueue, flushOfflineSales } = useApp();
const hasSession = Boolean(DB.get(SESSION_KEY, null)?.accessToken);
const [currentPage, setCurrentPage] = useState('dashboard');
const [sidebarOpen, setSidebarOpen] = useState(false);
const [cartOpen, setCartOpen] = useState(false);
const isOnline = useOnlineStatus();
const [tourStep, setTourStep] = useState(() => DB.get('tourComplete', false) ? null : 0);

useEffect(() => {
    const openTour = () => setTourStep(0);
    window.addEventListener('nexatill:start-tour', openTour);
    return () => window.removeEventListener('nexatill:start-tour', openTour);
}, []);
useEffect(() => {
    const openCart = () => setCartOpen(true);
    window.addEventListener('nexatill:open-cart', openCart);
    return () => window.removeEventListener('nexatill:open-cart', openCart);
}, []);

if (!currentUser || !hasSession) return React.createElement(SettingsPage);

const closeTour = () => {
    DB.set('tourComplete', true);
    setTourStep(null);
};

const isCashier = currentUser?.role === 'cashier';
const restrictedPages = ['suppliers', 'expenses', 'reports'];
const navItems = [
{ id: 'dashboard', label: 'Home', icon: '🏠' },
{ id: 'sell', label: 'Sell', icon: '🛒' },
{ id: 'products', label: 'Stock', icon: '📦' },
{ id: 'sales', label: 'Sales', icon: '🧾' },
{ id: 'expenses', label: 'Expenses', icon: '💰' },
{ id: 'reports', label: 'Reports', icon: '📊' },
{ id: 'settings', label: 'Settings', icon: '⚙️' },
].filter(item => !isCashier || !restrictedPages.includes(item.id));
const moreItems = [
{ id: 'expenses', label: 'Expenses', icon: '💰' },
{ id: 'reports', label: 'Reports', icon: '📊' },
{ id: 'stockActivity', label: 'Stock Activity', icon: '📦' },
{ id: 'settings', label: 'Settings', icon: '⚙️' },
].filter(item => !isCashier || !restrictedPages.includes(item.id));

const renderPage = () => {
if (isCashier && restrictedPages.includes(currentPage)) {
    return React.createElement(Dashboard);
}

switch (currentPage) {
case 'dashboard':
return React.createElement(Dashboard);
case 'sell':
return React.createElement(SellPage);
case 'products':
return React.createElement(ProductsPage);
case 'sales':
return React.createElement(SalesPage);
case 'stockActivity':
return React.createElement(StockActivityPage);
case 'expenses':
return React.createElement(ExpensesPage);
case 'reports':
return React.createElement(ReportsPage);
case 'settings':
return React.createElement(SettingsPage);
default:
return React.createElement(Dashboard);
}
};

// Mobile nav
const MobileNav = () => React.createElement('div', {
className: `fixed inset-0 z-30 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`
},
React.createElement('div', {
className: `absolute inset-0 bg-black/40 overlay ${sidebarOpen ? 'open' : ''}`,
onClick: () => setSidebarOpen(false)
}),
React.createElement('div', {
className: `absolute top-0 left-0 bottom-0 w-80 max-w-[88vw] bg-white shadow-2xl mobile-nav ${sidebarOpen ? 'open' : ''}`
},
React.createElement('div', { className: 'p-5 border-b border-gray-100' },
React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '🏪 ', currentCompany?.name || 'KoraPoint'),
React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, 'Simple shop management')
),
React.createElement('div', { className: 'p-3' },
React.createElement('p', { className: 'px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-400' }, 'Main menu'),
navItems.slice(0, 4).map(item =>
React.createElement('button', {
key: item.id,
onClick: () => { setCurrentPage(item.id); setSidebarOpen(false); },
className: `w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-semibold transition sidebar-link ${currentPage === item.id ? 'active bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`
},
React.createElement('span', { className: 'text-xl' }, item.icon),
React.createElement('span', null, item.label)
)
),
React.createElement('p', { className: 'px-3 pt-5 pb-2 text-xs font-bold uppercase tracking-wide text-gray-400' }, 'More'),
moreItems.map(item =>
React.createElement('button', {
key: `more-${item.id}`,
onClick: () => { setCurrentPage(item.id); setSidebarOpen(false); },
className: `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${currentPage === item.id ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`
},
React.createElement('span', { className: 'text-lg' }, item.icon),
React.createElement('span', null, item.label)
)
)
)
)
); 

// Desktop sidebar
const DesktopSidebar = () => React.createElement('div', { className: 'hidden lg:flex lg:flex-col lg:w-56 lg:flex-shrink-0 lg:bg-white lg:border-r lg:border-gray-100 lg:min-h-screen lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto' },
React.createElement('div', { className: 'p-4 border-b border-gray-100' },
React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '🏪 ', currentCompany?.name || 'KoraPoint'),
React.createElement('p', { className: 'text-xs text-gray-400' }, currentCompany?.business_type || 'Point of Sale')
),
React.createElement('nav', { className: 'p-3 space-y-0.5 flex-1' },
navItems.map(item =>
React.createElement('button', {
key: item.id,
onClick: () => setCurrentPage(item.id),
className: `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition sidebar-link ${currentPage === item.id ? 'active bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`
},
React.createElement('span', null, item.icon),
React.createElement('span', null, item.label)
)
)
),
React.createElement('div', { className: 'p-3 border-t border-gray-100 text-xs text-gray-400' },
'© 2026 KoraPoint'
)
);

return React.createElement(React.Fragment, null,
React.createElement(Toast),
!isOnline && React.createElement('div', { className: 'offline-banner' }, 'Offline mode — sales are saved on this device.', offlineSaleQueue?.length ? ` ${offlineSaleQueue.length} sale${offlineSaleQueue.length === 1 ? '' : 's'} waiting to sync.` : ''),
    isOnline && offlineSaleQueue?.length > 0 && React.createElement('div', { className: 'sync-banner' }, `⏳ ${offlineSaleQueue.length} offline sale${offlineSaleQueue.length === 1 ? '' : 's'} waiting to sync. `, React.createElement('button', { onClick: flushOfflineSales, className: 'underline font-semibold' }, 'Sync now')),
tourStep !== null && React.createElement(Tour, {
    step: tourStep,
    onNext: () => tourStep >= 4 ? closeTour() : setTourStep(tourStep + 1),
    onBack: () => setTourStep(Math.max(0, tourStep - 1)),
    onClose: closeTour,
    onNavigate: setCurrentPage
}),
// Header
React.createElement('header', { className: 'lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20' },
React.createElement('div', { className: 'flex items-center gap-3' },
React.createElement('button', {
onClick: () => setSidebarOpen(!sidebarOpen),
className: 'p-1.5 rounded-lg hover:bg-gray-100 transition flex flex-col gap-1'
},
React.createElement('span', { className: 'hamburger-line top' }),
React.createElement('span', { className: 'hamburger-line middle' }),
React.createElement('span', { className: 'hamburger-line bottom' })
),
React.createElement('h1', { className: 'text-lg font-bold text-gray-800' }, '🏪 KoraPoint')
),
React.createElement('button', {
onClick: () => setCartOpen(true),
className: 'relative p-2 rounded-lg bg-amber-50 text-amber-600'
},
'🛒',
React.createElement('span', { className: 'absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center' },
useApp().cart.reduce((sum, c) => sum + c.quantity, 0)
)
)
),
// Main layout
React.createElement('div', { className: 'flex min-h-screen' },
React.createElement(DesktopSidebar),
React.createElement(MobileNav),
React.createElement('main', { className: 'flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full' },
React.createElement('div', { className: 'mb-4 flex items-center justify-between' },
React.createElement('div', null,
React.createElement('h1', { className: 'text-2xl font-bold text-gray-800 hidden lg:block' },
navItems.find(i => i.id === currentPage)?.label || 'Dashboard'
),
React.createElement('p', { className: 'text-sm text-gray-400' },
new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)
),
React.createElement('button', {
onClick: () => setCartOpen(true),
className: 'hidden lg:flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-xl transition'
},
'🛒 Cart (', useApp().cart.reduce((sum, c) => sum + c.quantity, 0), ')'
)
),
renderPage()
)
),
React.createElement('nav', { className: 'mobile-bottom-nav lg:hidden', 'aria-label': 'Main navigation' },
navItems.slice(0, 4).map(item => React.createElement('button', {
key: item.id,
onClick: () => setCurrentPage(item.id),
className: currentPage === item.id ? 'active' : ''
}, React.createElement('span', { className: 'mobile-nav-icon' }, item.icon), React.createElement('span', null, item.label))),
React.createElement('button', {
onClick: () => setSidebarOpen(true),
className: sidebarOpen ? 'active' : ''
}, React.createElement('span', { className: 'mobile-nav-icon' }, '☰'), React.createElement('span', null, 'More'))
),
// Cart sidebar
React.createElement(CartSidebar, { isOpen: cartOpen, onClose: () => setCartOpen(false) })
);
}

// ============================================================
//  RENDER
// ============================================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(AppProvider, null, React.createElement(App)));


// ---- PWA Install support ----
window.koraInstallPrompt = window.koraInstallPrompt || null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.koraInstallPrompt = event;
  window.dispatchEvent(new Event('kora:pwa-install-ready'));
});
window.addEventListener('appinstalled', () => {
  window.koraInstallPrompt = null;
  window.dispatchEvent(new Event('kora:pwa-installed'));
});

function KoraPWAInstallCard() {
  const [available, setAvailable] = React.useState(Boolean(window.koraInstallPrompt));
  const [installed, setInstalled] = React.useState(window.matchMedia?.('(display-mode: standalone)').matches || false);
  React.useEffect(() => {
    const ready = () => setAvailable(true);
    const done = () => { setAvailable(false); setInstalled(true); };
    window.addEventListener('kora:pwa-install-ready', ready);
    window.addEventListener('kora:pwa-installed', done);
    return () => {
      window.removeEventListener('kora:pwa-install-ready', ready);
      window.removeEventListener('kora:pwa-installed', done);
    };
  }, []);
  const install = async () => {
    if (!window.koraInstallPrompt) {
      alert('If Install App is not offered by your browser, open the browser menu and choose “Install KoraPoint” or “Add to Home screen”.');
      return;
    }
    const prompt = window.koraInstallPrompt;
    window.koraInstallPrompt = null;
    try { await prompt.prompt(); await prompt.userChoice; } catch (e) { console.warn('PWA install prompt failed', e); }
    setAvailable(false);
  };
  return React.createElement('div', { className: 'stat-card p-4 pwa-install-card' },
    React.createElement('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
      React.createElement('div', null,
        React.createElement('p', { className: 'text-sm font-semibold text-gray-700' }, '📲 Install KoraPoint'),
        React.createElement('p', { className: 'text-xs text-gray-400 mt-1' }, installed ? 'KoraPoint is installed on this device.' : 'Install the POS for faster access like an app.')
      ),
      installed ? React.createElement('span', { className: 'pwa-installed-badge' }, '✓ Installed') :
      React.createElement('button', { onClick: install, className: 'btn-primary text-sm whitespace-nowrap' }, 'Install App')
    )
  );
}

/* Reliable PWA install prompt capture. Must run before Settings is opened. */
(function(){
  window.__koraDeferredInstallPrompt = window.__koraDeferredInstallPrompt || null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    window.__koraDeferredInstallPrompt = e;
    window.dispatchEvent(new Event('kora:install-state'));
  });
  window.addEventListener('appinstalled', function(){
    window.__koraDeferredInstallPrompt = null;
    window.dispatchEvent(new Event('kora:install-state'));
  });
})();
