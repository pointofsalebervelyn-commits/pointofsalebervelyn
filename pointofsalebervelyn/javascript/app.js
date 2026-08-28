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
    const timeout = setTimeout(() => controller.abort(), 45000);
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
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
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
    const savedSession = DB.get(SESSION_KEY, null);
    const [currentUser, setCurrentUser] = useState(() => savedSession?.user || null);
    const [currentCompany, setCurrentCompany] = useState(() => savedSession?.company || null);
    const [toast, setToast] = useState(null);

    const clearLocalTenantData = () => {
        setProducts([]); setSales([]); setCustomers([]); setSuppliers([]); setExpenses([]);
        setUsers([]); setRegister({ isOpen: false, openingCash: 0, openedAt: null });
        setStockMovements([]); setPurchases([]); setAuditLogs([]);
        setParkedCarts([]); DB.set('parkedCarts', []);
    };

    const refreshTenantData = async () => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (!token) return;
        const data = await apiRequest('/api/bootstrap', {}, token);
        setProducts(data.products || []); setGroups(data.groups || []); setQuickSellItems(data.quickSellItems || []); setSales(data.sales || []); setCustomers(data.customers || []);
        setSuppliers(data.suppliers || []); setExpenses(data.expenses || []); setUsers(data.users || []);
        setRegister(data.register || { isOpen: false, openingCash: 0, openedAt: null });
        setStockMovements(data.stockMovements || []); setPurchases(data.purchases || []); setAuditLogs(data.auditLogs || []);
    };

    const apiMutation = (path, method, body, successMessage) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (!token) return false;
        apiRequest(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, token)
            .then(() => refreshTenantData()).then(() => showToast(successMessage)).catch(error => showToast(error.message, 'error'));
        return true;
    };

    const authenticate = async (path, credentials) => {
        let session;
        try {
            session = await apiRequest(path, { method: 'POST', body: JSON.stringify(credentials) });
        } catch (error) {
            if (error instanceof TypeError || error.message === 'Failed to fetch' || error.message.includes('too long')) {
                throw new Error('Unable to complete your request right now. Please try again.');
            }
            throw error;
        }
        DB.set(SESSION_KEY, session);
        setCurrentUser(session.user);
        setCurrentCompany(session.company || null);
        clearLocalTenantData();
        setUsers([session.user]);
        try {
            await refreshTenantData();
        } catch { /* Empty inventory is valid for a new company. */ }
        return session;
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
            .catch(() => { logout(); showToast('Session expired. Please sign in again.', 'error'); });
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
        if (token) { apiRequest('/api/products', { method: 'POST', body: JSON.stringify(p) }, token).then(() => refreshTenantData()).then(() => showToast('Product added successfully!')).catch(error => showToast(error.message, 'error')); return; }
        setProducts(prev => [...prev, { ...p, id: 'p' + Date.now(), dateAdded: new Date().toISOString() }]);
        logAction('Product added', p.name);
        showToast('Product added successfully!');
    };

    const updateProduct = (id, data) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { apiRequest(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token).then(() => refreshTenantData()).then(() => showToast('Product updated!')).catch(error => showToast(error.message, 'error')); return; }
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
        logAction('Product updated', id);
        showToast('Product updated!');
    };

    const deleteProduct = (id) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { apiRequest(`/api/products/${id}`, { method: 'DELETE' }, token).then(() => refreshTenantData()).then(() => showToast('Product removed.', 'info')).catch(error => showToast(error.message, 'error')); return; }
        setProducts(prev => prev.filter(p => p.id !== id));
        logAction('Product deleted', id);
        showToast('Product removed.', 'info');
    };

    const adjustStock = (productId, quantity, reason = 'Manual adjustment') => {
        const amount = Number(quantity);
        if (!Number.isFinite(amount) || amount === 0) return;
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { apiRequest(`/api/products/${productId}/stock-adjustments`, { method: 'POST', body: JSON.stringify({ quantity: amount, reason }) }, token).then(() => refreshTenantData()).then(() => showToast('Stock updated')).catch(error => showToast(error.message, 'error')); return; }
        setProducts(prev => prev.map(product => product.id === productId ? {
            ...product,
            quantity: Math.max(0, product.quantity + amount)
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
        setCart(prev => {
            const existing = prev.find(c => c.productId === product.id);
            if (existing) {
                return prev.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + qty } : c);
            }
            return [...prev, { productId: product.id, product, quantity: qty }];
        });
        showToast(`Added ${product.name} to cart`);
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
        setParkedCarts(prev => {
            const next = [...prev, { id: 'cart' + Date.now(), name: name || `Customer ${prev.length + 1}`, items: cart, savedAt: new Date().toISOString() }];
            DB.set('parkedCarts', next);
            return next;
        });
        setCart([]);
        return true;
    };

    const resumeCart = (id) => {
        const parked = parkedCarts.find(item => item.id === id);
        if (!parked) return;
        if (cart.length) parkCart('Previous customer');
        setCart(parked.items);
        setParkedCarts(prev => {
            const next = prev.filter(item => item.id !== id);
            DB.set('parkedCarts', next);
            return next;
        });
    };

    const completeSale = (saleData) => {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        if (token) { apiRequest('/api/sales', { method: 'POST', body: JSON.stringify(saleData) }, token).then(() => refreshTenantData()).then(() => { clearCart(); showToast('Sale completed! Receipt generated.'); }).catch(error => showToast(error.message, 'error')); return null; }
        // Reduce inventory
        const updatedProducts = products.map(p => {
            const item = saleData.items.find(i => i.productId === p.id);
            if (item) {
                return { ...p, quantity: Math.max(0, p.quantity - item.quantity) };
            }
            return p;
        });
        setProducts(updatedProducts);
        DB.set('products', updatedProducts);
        setStockMovements(prev => [...prev, ...saleData.items.map(item => ({
            id: 'm' + Date.now() + item.productId,
            productId: item.productId,
            quantity: -item.quantity,
            reason: 'Sale',
            date: new Date().toISOString()
        }))]);
        const newSale = {
            id: 's' + Date.now(),
            ...saleData,
            date: new Date().toISOString(),
            saleDate: new Date().toLocaleDateString('en-CA')
        };
        const updatedSales = [...sales, newSale];
        setSales(updatedSales);
        DB.set('sales', updatedSales);
        logAction('Sale completed', newSale.id);
        // Update customer
        if (saleData.customerName) {
            setCustomers(prev => {
                const existing = prev.find(c => c.name === saleData.customerName);
                if (existing) {
                    return prev.map(c => c.name === saleData.customerName ? { ...c,
                        lastPurchase: new Date().toISOString(),
                        totalSpent: (c.totalSpent || 0) + saleData.total,
                        purchaseCount: (c.purchaseCount || 0) + 1 } : c);
                }
                return [...prev, { id: 'c' + Date.now(), name: saleData.customerName,
                    phone: saleData.customerPhone || '', lastPurchase: new Date().toISOString(),
                    totalSpent: saleData.total, purchaseCount: 1 }];
            });
        }
        clearCart();
        showToast('Sale completed! Receipt generated.');
        return newSale;
    };

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
        purchases,
        recordPurchase,
        refundSale,
        cart,
        setCart,
        parkedCarts,
        parkCart,
        resumeCart,
        currentUser,
        setCurrentUser,
        currentCompany,
        authenticate,
        logout,
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
function ProductCard({ product, onEdit, onDelete, onAddToCart, onAdjustStock }) {
    const lowStock = product.quantity <= product.minStockLevel;
    const outOfStock = product.quantity === 0;
    const statusColor = outOfStock ? 'bg-rose-100 text-rose-700' : lowStock ? 'bg-amber-100 text-amber-700' :
        'bg-emerald-100 text-emerald-700';
    const statusText = outOfStock ? 'Out of Stock' : lowStock ? 'Low Stock' : 'In Stock';
    const hasProductImage = typeof product.image === 'string' &&
        (product.image.startsWith('data:image/') || product.image.startsWith('http'));

    return React.createElement('div', { className: 'product-card p-3.5 card-hover' },
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

// ---- Cart Sidebar ----
function CartSidebar({ isOpen, onClose }) {
    const { cart, removeFromCart, updateCartQty, clearCart, products, completeSale, showToast, parkedCarts, parkCart, resumeCart } = useApp();
    const [showCheckout, setShowCheckout] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [cashReceived, setCashReceived] = useState('');

    const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);
    const totalAmount = cart.reduce((sum, c) => sum + c.quantity * c.product.sellingPrice, 0);
    const totalProfit = cart.reduce((sum, c) => sum + c.quantity * (c.product.sellingPrice - c.product.buyingPrice),
    0);

    const handleCheckout = () => {
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
        completeSale(saleData);
        setCustomerName('');
        setCustomerPhone('');
        setPaymentMethod('Cash');
        setCashReceived('');
        setShowCheckout(false);
        onClose();
    };

    return React.createElement('div', {
        className: `fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`,
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
            React.createElement('button', { onClick: () => { const name = window.prompt('Name this pending cart', 'Customer'); if (name !== null && parkCart(name)) showToast('Cart saved as pending'); }, disabled: !cart.length, className: 'flex-1 btn-secondary text-xs disabled:opacity-50' }, '⏸ Park cart'),
            React.createElement('button', { onClick: clearCart, disabled: !cart.length, className: 'flex-1 btn-secondary text-xs disabled:opacity-50' }, 'Clear cart')
        ),
        parkedCarts.length > 0 && React.createElement('div', { className: 'px-3 py-2 border-b border-amber-100 bg-amber-50' },
            React.createElement('p', { className: 'text-xs font-semibold text-amber-800 mb-1' }, 'Pending carts'),
            parkedCarts.map(item => React.createElement('button', { key: item.id, onClick: () => resumeCart(item.id), className: 'w-full flex justify-between text-xs text-amber-900 py-1 hover:underline' }, React.createElement('span', null, item.name), React.createElement('span', null, item.items.reduce((sum, line) => sum + line.quantity, 0), ' items')))
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
        React.createElement('div', { className: 'space-y-3' },
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
                className: 'w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition'
            }, '✅ Complete Sale')
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
    const { products, sales } = useApp();
    const [chartRef, setChartRef] = useState(null);
    const chartInstance = useRef(null);

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
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

    return React.createElement('div', { className: 'space-y-6' },
        // Stats
        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' },
            React.createElement(StatCard, { icon: '📦', label: 'Products', value: totalProducts, color: 'amber' }),
            React.createElement(StatCard, { icon: '📊', label: 'Total Stock', value: totalStock, color: 'blue' }),
                React.createElement(StatCard, { icon: '💰', label: "Today's Sales", value: formatCurrency(todayRevenue),
                    sub: todaySales.length + ' orders', color: 'emerald' }),
                React.createElement(StatCard, { icon: '📈', label: 'Weekly Sales', value: formatCurrency(weekRevenue),
                    sub: weekSales.length + ' orders', color: 'violet' }),
                React.createElement(StatCard, { icon: '📅', label: 'Monthly Sales', value: formatCurrency(monthRevenue),
                    sub: monthSales.length + ' orders', color: 'cyan' }),
                React.createElement(StatCard, { icon: '🏦', label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'emerald' }),
            React.createElement(StatCard, { icon: '⚠️', label: 'Low Stock', value: lowStockItems.length,
                sub: outOfStockItems.length + ' out of stock', color: 'rose' }),
            React.createElement(StatCard, { icon: '🔄', label: 'Recent Sales', value: recentSales.length,
                sub: 'last 5 transactions', color: 'blue' })
        ),
            React.createElement(RegisterPanel, { sales }),
        // Chart
        React.createElement('div', { className: 'stat-card p-4' },
            React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' },
                '📊 Last 7 Days Sales'),
            React.createElement('div', { className: 'chart-container' },
                React.createElement('canvas', { ref: setChartRef }))
        ),
        // Low stock & recent sales
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
            React.createElement('div', { className: 'stat-card p-4' },
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
            result = result.filter(p => p.name.toLowerCase().includes(s) || p.barcode?.toLowerCase().includes(s));
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
            React.createElement('button', {
                onClick: () => setShowAdd(true),
                className: 'btn-primary text-sm'
            }, '➕ Add Product')
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
        // Product grid
        React.createElement('div', { className: 'grid-cards' },
            filtered.map(p =>
                React.createElement(ProductCard, {
                    key: p.id,
                    product: p,
                    onEdit: () => setEditing(p),
                    onDelete: handleDelete,
                    onAddToCart: addToCart,
                    onAdjustStock: handleAdjustStock
                })
            )
        ),
        filtered.length === 0 && React.createElement('p', { className: 'text-center text-gray-400 py-8' },
            'No products found'),
        stockMovements.length > 0 && React.createElement('div', { className: 'stat-card p-4' },
            React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' }, '📦 Recent Stock Activity'),
            stockMovements.slice(-5).reverse().map(movement => {
                const product = products.find(item => item.id === movement.productId);
                return React.createElement('div', { key: movement.id, className: 'flex justify-between items-center py-1.5 border-b border-gray-50 text-xs' },
                    React.createElement('span', { className: 'text-gray-600 truncate pr-2' }, product?.name || 'Deleted product'),
                    React.createElement('span', { className: movement.quantity > 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold' },
                        movement.quantity > 0 ? '+' : '', movement.quantity, ' ', movement.reason)
                );
            })
        ),

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
    const [form, setForm] = useState({
        name: product?.name || '',
        image: product?.image || '📦',
        category: product?.category || 'Cement',
        materialType: product?.materialType || '',
        supplier: product?.supplier || '',
        buyingPrice: product?.buyingPrice || 0,
        sellingPrice: product?.sellingPrice || 0,
        quantity: product?.quantity || 0,
        minStockLevel: product?.minStockLevel || 5,
        unit: product?.unit || 'piece',
        description: product?.description || '',
        barcode: product?.barcode || '',
    });
    const [imageFile, setImageFile] = useState(null);
    const fileInputRef = useRef(null);

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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) { showToast('Product name is required', 'error'); return; }
        if (form.buyingPrice < 0 || form.sellingPrice <= 0 || form.quantity < 0 || form.minStockLevel < 0) {
            showToast('Enter valid prices and stock quantities', 'error');
            return;
        }
        const data = { ...form };
        if (mode === 'add') {
            addProduct(data);
            showToast('Product added successfully');
        } else if (product) {
            updateProduct(product.id, data);
        }
        onClose();
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
                    onChange: (e) => setForm(prev => ({ ...prev, buyingPrice: parseFloat(e.target.value) ||
                            0 })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Selling Price (GHS) *'),
                React.createElement('input', {
                    type: 'number',
                    step: '0.01',
                    value: form.sellingPrice,
                    onChange: (e) => setForm(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) ||
                            0 })),
                    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                    required: true
                })
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-medium text-gray-500 mb-0.5' },
                    'Quantity *'),
                React.createElement('input', {
                    type: 'number',
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
            }, mode === 'add' ? 'Add Product' : 'Update Product')
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
React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
React.createElement(StatCard, { icon: '📊', label: 'Transactions', value: filteredSales.length, color: 'blue' }),
React.createElement(StatCard, { icon: '💰', label: 'Revenue', value: formatCurrency(totalFiltered),
color: 'emerald' }),
React.createElement(StatCard, { icon: '📈', label: 'Profit', value: formatCurrency(totalProfitFiltered),
color: 'amber' })
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

const handleSave = () => {
if (!form.name.trim()) { showToast('Supplier name is required', 'error'); return; }
if (editing) {
if (apiMutation(`/api/suppliers/${editing.id}`, 'PATCH', form, 'Supplier updated')) { setForm({ name: '', contact: '', phone: '' }); setEditing(null); setShowAdd(false); return; }
setSuppliers(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s));
showToast('Supplier updated');
} else {
if (apiMutation('/api/suppliers', 'POST', form, 'Supplier added')) { setForm({ name: '', contact: '', phone: '' }); setEditing(null); setShowAdd(false); return; }
setSuppliers(prev => [...prev, { ...form, id: 's' + Date.now() }]);
showToast('Supplier added');
}
setForm({ name: '', contact: '', phone: '' });
setEditing(null);
setShowAdd(false);
};

const handleDelete = (id) => {
if (window.confirm('Delete this supplier?')) {
if (apiMutation(`/api/suppliers/${id}`, 'DELETE', undefined, 'Supplier removed')) return;
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
const { expenses, setExpenses, showToast, apiMutation } = useApp();
const [showAdd, setShowAdd] = useState(false);
const [form, setForm] = useState({ description: '', amount: 0, category: 'Utilities', date: new Date().toISOString()
.split('T')[0] });

const categories = ['Utilities', 'Rent', 'Salaries', 'Supplies', 'Transport', 'Maintenance', 'Other'];

const handleSave = () => {
if (!form.description.trim() || form.amount <= 0) { showToast('Please fill in all fields', 'error'); return; }
if (apiMutation('/api/expenses', 'POST', form, 'Expense added')) { setForm({ description: '', amount: 0, category: 'Utilities', date: new Date().toISOString().split('T')[0] }); setShowAdd(false); return; }
setExpenses(prev => [...prev, { ...form, id: 'e' + Date.now() }]);
showToast('Expense added');
setForm({ description: '', amount: 0, category: 'Utilities', date: new Date().toISOString().split('T')[0] });
setShowAdd(false);
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
expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(e =>
React.createElement('div', { key: e.id, className: 'stat-card p-3 flex items-center justify-between' },
React.createElement('div', null,
React.createElement('p', { className: 'font-medium text-gray-800 text-sm' }, e.description),
React.createElement('p', { className: 'text-xs text-gray-400' },
e.category, ' • ', new Date(e.date).toLocaleDateString()
)
),
React.createElement('span', { className: 'font-bold text-rose-500' }, formatCurrency(e.amount))
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
const { products, sales, expenses } = useApp();
const [reportEmail, setReportEmail] = useState('');
const activeSales = sales.filter(isActiveSale);
const totalRevenue = activeSales.reduce((sum, s) => sum + s.total, 0);
const totalProfit = activeSales.reduce((sum, s) => sum + (s.profit || 0), 0);
const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
const netProfit = totalProfit - totalExpenses;
const totalStockValue = products.reduce((sum, p) => sum + p.quantity * p.buyingPrice, 0);
const todayKey = new Date().toLocaleDateString('en-CA');
const todaySales = activeSales.filter(s => (s.saleDate || new Date(s.date).toLocaleDateString('en-CA')) === todayKey);
const todayExpenses = expenses.filter(e => e.date === todayKey);
const closingRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
const closingProfit = todaySales.reduce((sum, s) => sum + (s.profit || 0), 0);
const closingExpenses = todayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
const paymentTotals = todaySales.reduce((totals, sale) => {
    const method = sale.paymentMethod || 'Cash';
    totals[method] = (totals[method] || 0) + sale.total;
    return totals;
}, {});
const cashCollected = todaySales
    .filter(s => (s.paymentMethod || 'Cash') === 'Cash')
    .reduce((sum, s) => sum + (Number.isFinite(s.cashReceived) && s.cashReceived > 0 ? s.cashReceived : s.total), 0);

// Best selling products
const productSales = {};
activeSales.forEach(s => {
s.items.forEach(item => {
if (!productSales[item.productId]) {
productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
}
productSales[item.productId].qty += item.quantity;
productSales[item.productId].revenue += item.quantity * item.sellingPrice;
});
});
const bestSellers = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);
const sendDailyReport = async () => {
    const recipient = reportEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        showToast('Enter a valid report email address', 'error');
        return;
    }
    const subject = `KoraPoint daily sales report - ${todayKey}`;
    const body = [
        `KoraPoint daily sales report for ${todayKey}`,
        `Revenue: ${formatCurrency(closingRevenue)}`,
        `Gross profit: ${formatCurrency(closingProfit)}`,
        `Expenses: ${formatCurrency(closingExpenses)}`,
        `Cash collected: ${formatCurrency(cashCollected)}`,
        `Transactions: ${todaySales.length}`
    ].join('\n');
    try {
        const token = DB.get(SESSION_KEY, null)?.accessToken;
        await apiRequest('/api/reports/email', { method: 'POST', body: JSON.stringify({ recipient, subject, report: body }) }, token);
        showToast('Daily report sent successfully');
    } catch (error) {
        showToast(error.message, 'error');
    }
};

return React.createElement('div', { className: 'space-y-5' },
React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-3' },
React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '📊 Reports & Analytics'),
React.createElement('div', { className: 'flex flex-wrap gap-2 no-print' },
React.createElement('button', { onClick: () => window.print(), className: 'btn-secondary text-sm' }, '🖨 Save as PDF'),
React.createElement('input', { type: 'email', value: reportEmail, onChange: e => setReportEmail(e.target.value), placeholder: 'Report email', className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('button', { onClick: sendDailyReport, className: 'btn-secondary text-sm' }, '✉ Open email tab')
)
),
// Summary cards
React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
React.createElement(StatCard, { icon: '💰', label: 'Total Revenue', value: formatCurrency(totalRevenue),
color: 'emerald' }),
React.createElement(StatCard, { icon: '📈', label: 'Gross Profit', value: formatCurrency(totalProfit),
color: 'amber' }),
React.createElement(StatCard, { icon: '💸', label: 'Total Expenses', value: formatCurrency(totalExpenses),
color: 'rose' }),
React.createElement(StatCard, { icon: '🏆', label: 'Net Profit', value: formatCurrency(netProfit),
color: netProfit >= 0 ? 'emerald' : 'rose' }),
React.createElement(StatCard, { icon: '📦', label: 'Inventory Value', value: formatCurrency(totalStockValue),
color: 'blue' }),
React.createElement(StatCard, { icon: '📋', label: 'Total Sales', value: sales.length, color: 'violet' })
),
// Daily closing report
React.createElement('div', { className: 'stat-card p-4 space-y-3' },
React.createElement('div', { className: 'flex items-center justify-between gap-2' },
React.createElement('div', null,
React.createElement('p', { className: 'text-sm font-semibold text-gray-700' }, '📅 Today\'s Closing Report'),
React.createElement('p', { className: 'text-xs text-gray-400' }, todaySales.length, ' transactions')
),
React.createElement('span', { className: 'text-lg font-bold text-emerald-600' }, formatCurrency(closingRevenue))
),
React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm' },
React.createElement('div', { className: 'bg-gray-50 rounded-lg p-2' },
React.createElement('p', { className: 'text-xs text-gray-400' }, 'Cash collected'),
React.createElement('p', { className: 'font-semibold text-gray-800' }, formatCurrency(cashCollected))
),
React.createElement('div', { className: 'bg-gray-50 rounded-lg p-2' },
React.createElement('p', { className: 'text-xs text-gray-400' }, 'Mobile Money'),
React.createElement('p', { className: 'font-semibold text-gray-800' }, formatCurrency(paymentTotals['Mobile Money'] || 0))
),
React.createElement('div', { className: 'bg-gray-50 rounded-lg p-2' },
React.createElement('p', { className: 'text-xs text-gray-400' }, 'Card'),
React.createElement('p', { className: 'font-semibold text-gray-800' }, formatCurrency(paymentTotals.Card || 0))
),
React.createElement('div', { className: 'bg-gray-50 rounded-lg p-2' },
React.createElement('p', { className: 'text-xs text-gray-400' }, 'Net result'),
React.createElement('p', { className: `font-semibold ${closingProfit - closingExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}` },
formatCurrency(closingProfit - closingExpenses))
)
),
React.createElement('div', { className: 'flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2' },
React.createElement('span', null, 'Gross profit: ', formatCurrency(closingProfit)),
React.createElement('span', null, 'Expenses: ', formatCurrency(closingExpenses))
)
),
// Best sellers
React.createElement('div', { className: 'stat-card p-4' },
React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' }, '🏆 Best Selling Products'),
bestSellers.length === 0 ?
React.createElement('p', { className: 'text-sm text-gray-400' }, 'No sales data yet') :
bestSellers.map((item, i) =>
React.createElement('div', { key: i, className: 'flex justify-between items-center py-1.5 border-b border-gray-50' },
React.createElement('span', { className: 'text-sm text-gray-700' },
'#', i + 1, ' ', item.name
),
React.createElement('span', { className: 'text-sm font-medium text-amber-600' },
 item.qty, ' sold • ', formatCurrency(item.revenue)
)
)
)
)
);
}

// ---- Settings / Users ----
function SettingsPage() {
const { users, setUsers, currentUser, showToast, auditLogs, authenticate, logout, apiMutation } = useApp();
const safeUsers = Array.isArray(users) ? users : [];
const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];
const hasSession = Boolean(DB.get(SESSION_KEY, null)?.accessToken);
const [showAdd, setShowAdd] = useState(false);
const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' });
const [showStaffPassword, setShowStaffPassword] = useState(false);
const [loginUser, setLoginUser] = useState({ email: '', password: '' });
const [signup, setSignup] = useState({ accessCode: '', companyName: '', businessType: '', name: '', email: '', password: '' });
const [showSignup, setShowSignup] = useState(false);
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

const handleLogout = () => {
logout();
setIsLogin(true);
showToast('Logged out', 'info');
};

const handleSignup = async () => {
if (isSubmitting) return;
if (!signup.accessCode.trim() || !signup.companyName.trim() || !signup.businessType.trim() || !signup.name.trim() || !signup.email.trim() || !signup.password) {
setAuthMessage('Complete all company and owner fields.');
showToast('Complete all company and owner fields', 'error');
return;
}
if (signup.password.length < 12) {
setAuthMessage('Password must be at least 12 characters.');
showToast('Password must be at least 12 characters', 'error');
return;
}
if (!isValidEmail(signup.email)) {
setAuthMessage('Enter a valid email address.');
showToast('Enter a valid email address', 'error');
return;
}
try {
setIsSubmitting(true);
setAuthMessage('Creating your company account...');
const session = await authenticate('/api/auth/signup', signup);
setIsLogin(false);
setShowSignup(false);
showToast('Company created. Welcome, ' + session.user.name);
} catch (error) {
setAuthMessage(error.message);
showToast(error.message, 'error');
} finally {
setIsSubmitting(false);
}
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

const handleAddUser = () => {
if (!['owner', 'manager'].includes(currentUser?.role)) { showToast('Only the owner or a manager can manage staff', 'error'); return; }
if (!form.name.trim() || !form.email.trim() || !form.password.trim()) { showToast('Name, email, and password required', 'error'); return; }
if (users.find(u => u.name === form.name)) { showToast('User already exists', 'error'); return; }
if (apiMutation('/api/users', 'POST', form, 'User added')) { setForm({ name: '', email: '', password: '', role: 'cashier' }); setShowAdd(false); return; }
setUsers(prev => [...prev, { ...form, id: 'u' + Date.now() }]);
showToast('User added');
setForm({ name: '', email: '', password: '', role: 'cashier' });
setShowAdd(false);
};

const handleDeleteUser = (id) => {
if (!['owner', 'manager'].includes(currentUser?.role)) { showToast('Only the owner or a manager can revoke access', 'error'); return; }
if (id === currentUser?.id) { showToast('Cannot delete yourself', 'error'); return; }
if (window.confirm('Delete this user?')) {
if (apiMutation(`/api/users/${id}`, 'DELETE', undefined, 'User removed')) return;
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

const startTour = () => window.dispatchEvent(new Event('nexatill:start-tour'));

if (isLogin || !currentUser || !hasSession) {
return React.createElement('div', { className: 'login-screen' },
React.createElement('div', { className: 'login-layout' },
React.createElement('div', { className: 'login-card' },
React.createElement('h2', { className: 'text-2xl font-bold text-center text-gray-800 mb-2' }, 'Bopstina Ventures'),
React.createElement('p', { className: 'text-center text-gray-400 text-sm mb-6' }, 'Sign in to your business workspace'),
authMessage && React.createElement('p', { role: 'alert', className: `text-center text-sm mb-3 ${authMessage.includes('...') ? 'text-amber-600' : 'text-rose-600'}` }, authMessage),
React.createElement('div', { className: 'space-y-3' },
showSignup && React.createElement(React.Fragment, null,
React.createElement('input', { type: 'password', placeholder: 'Approval code from KoraPoint user', required: true, value: signup.accessCode, onChange: e => setSignup(prev => ({ ...prev, accessCode: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('input', { type: 'text', placeholder: 'Company name', required: true, value: signup.companyName, onChange: e => setSignup(prev => ({ ...prev, companyName: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
React.createElement('select', { value: signup.businessType, required: true, onChange: e => setSignup(prev => ({ ...prev, businessType: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' },
React.createElement('option', { value: '' }, 'Select business type *'),
React.createElement('option', { value: 'Hardware shop' }, 'Hardware shop'),
React.createElement('option', { value: 'Provision shop' }, 'Provision shop'),
React.createElement('option', { value: 'Grocery store' }, 'Grocery store'),
React.createElement('option', { value: 'Clothing and fashion' }, 'Clothing and fashion'),
React.createElement('option', { value: 'Pharmacy' }, 'Pharmacy'),
React.createElement('option', { value: 'Electronics shop' }, 'Electronics shop'),
React.createElement('option', { value: 'Restaurant or food business' }, 'Restaurant or food business'),
React.createElement('option', { value: 'Beauty and personal care' }, 'Beauty and personal care'),
React.createElement('option', { value: 'Automotive shop' }, 'Automotive shop'),
React.createElement('option', { value: 'Agricultural supplies' }, 'Agricultural supplies'),
React.createElement('option', { value: 'Other' }, 'Other')
),
React.createElement('input', { type: 'text', placeholder: 'Your name', required: true, value: signup.name, onChange: e => setSignup(prev => ({ ...prev, name: e.target.value })), className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm' })
),
React.createElement('input', {
type: 'email',
placeholder: 'Email address',
autoComplete: showSignup ? 'email' : 'username',
required: true,
ariaInvalid: showSignup && signup.email.length > 0 && !isValidEmail(signup.email),
value: showSignup ? signup.email : loginUser.email,
onChange: (e) => showSignup ? setSignup(prev => ({ ...prev, email: e.target.value })) : setLoginUser(prev => ({ ...prev, email: e.target.value })),
className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
}),
showSignup && signup.email.length > 0 && !isValidEmail(signup.email) && React.createElement('p', { className: 'text-xs text-rose-600 -mt-2' }, 'Enter a valid email address, for example name@company.com.'),
React.createElement('div', { className: 'relative' },
React.createElement('input', {
type: showAuthPassword ? 'text' : 'password',
placeholder: showSignup ? 'Password (12+ characters)' : 'Password',
autoComplete: showSignup ? 'new-password' : 'current-password',
required: true,
value: showSignup ? signup.password : loginUser.password,
onChange: (e) => showSignup ? setSignup(prev => ({ ...prev, password: e.target.value })) : setLoginUser(prev => ({ ...prev, password: e.target.value })),
className: 'w-full px-3 py-2 pr-20 border border-gray-200 rounded-lg text-sm',
onKeyDown: (e) => e.key === 'Enter' && (showSignup ? handleSignup() : handleLogin())
}),
React.createElement('button', {
type: 'button',
onClick: () => setShowAuthPassword(!showAuthPassword),
className: 'absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-amber-600',
ariaLabel: showAuthPassword ? 'Hide password' : 'Show password'
}, showAuthPassword ? 'Hide' : 'Show')
),
React.createElement('button', {
onClick: handleLogin,
disabled: isSubmitting,
className: 'w-full btn-primary'
}, isSubmitting ? 'Connecting...' : 'Sign In')
)
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

return React.createElement('div', { className: 'space-y-4' },
React.createElement('div', { className: 'flex items-center justify-between' },
React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '⚙️ Settings'),
React.createElement('button', {
onClick: handleLogout,
className: 'text-sm text-rose-500 hover:text-rose-700 font-medium'
}, '🚪 Logout')
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
currentUser && hasSession && React.createElement('div', { className: 'stat-card p-4' },
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
React.createElement('p', { className: 'text-xs text-gray-400' }, u.role)
),
u.id !== currentUser?.id && React.createElement('button', {
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
        { page: 'products', icon: '📦', title: 'Sell and manage products', text: 'Search products, scan barcodes, adjust stock, and add items to the cart with one tap.' },
        { page: 'products', icon: '🛒', title: 'Checkout made simple', text: 'Open the cart, choose a payment method, enter cash received, and see the change instantly.' },
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
const { currentUser, currentCompany } = useApp();
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

if (!currentUser || !hasSession) return React.createElement(SettingsPage);

const closeTour = () => {
    DB.set('tourComplete', true);
    setTourStep(null);
};

const navItems = [
{ id: 'dashboard', label: 'Dashboard', icon: '📊' },
{ id: 'products', label: 'Products', icon: '📦' },
{ id: 'sales', label: 'Sales Records', icon: '📋' },
{ id: 'suppliers', label: 'Suppliers', icon: '🏢' },
{ id: 'expenses', label: 'Expenses', icon: '💸' },
{ id: 'reports', label: 'Reports', icon: '📈' },
{ id: 'settings', label: 'Settings', icon: '⚙️' },
];

const renderPage = () => {
switch (currentPage) {
case 'dashboard':
return React.createElement(Dashboard);
case 'products':
return React.createElement(ProductsPage);
case 'sales':
return React.createElement(SalesPage);
case 'suppliers':
return React.createElement(SuppliersPage);
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
className: `absolute top-0 left-0 bottom-0 w-72 bg-white shadow-2xl mobile-nav ${sidebarOpen ? 'open' : ''}`
},
React.createElement('div', { className: 'p-4 border-b border-gray-100' },
React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '🏪 ', currentCompany?.name || 'KoraPoint'),
React.createElement('p', { className: 'text-xs text-gray-400' }, currentCompany?.business_type || 'Point of Sale')
),
React.createElement('nav', { className: 'p-3 space-y-0.5' },
navItems.map(item =>
React.createElement('button', {
key: item.id,
onClick: () => { setCurrentPage(item.id);
setSidebarOpen(false); },
className: `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition sidebar-link ${currentPage === item.id ? 'active bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`
},
React.createElement('span', null, item.icon),
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
!isOnline && React.createElement('div', { className: 'offline-banner' }, 'Offline mode: your records are saved on this device.'),
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
React.createElement('div', { className: 'mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3' },
React.createElement('p', { className: 'text-sm font-semibold text-amber-900' }, 'Welcome back, ', currentUser.name, '!'),
React.createElement('p', { className: 'text-xs text-amber-700 mt-0.5' }, currentCompany?.name || 'Your company', ' workspace')
),
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
React.createElement('nav', { className: 'mobile-bottom-nav lg:hidden' },
navItems.slice(0, 4).map(item => React.createElement('button', {
key: item.id,
onClick: () => setCurrentPage(item.id),
className: currentPage === item.id ? 'active' : ''
}, React.createElement('span', null, item.icon), React.createElement('span', null, item.label)))
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