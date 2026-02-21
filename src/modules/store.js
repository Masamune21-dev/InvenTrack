/* ============================
   Data Store Module
   API-based (fetch)
   ============================ */

const Store = (() => {
    // Auto-detect sub-path (e.g. '/inventrack' when proxied, '' when direct)
    const _subpath = window.location.pathname.replace(/\/$/, '').replace(/#.*$/, '');
    const API_BASE = _subpath + '/api';

    // --- Helpers ---
    function getToken() {
        return localStorage.getItem('inventrack_token');
    }

    function setToken(token) {
        localStorage.setItem('inventrack_token', token);
    }

    function clearToken() {
        localStorage.removeItem('inventrack_token');
    }

    async function apiFetch(path, options = {}) {
        const token = getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        };

        const res = await fetch(API_BASE + path, { ...options, headers });

        if (res.status === 401) {
            clearToken();
            localStorage.removeItem('inventrack_user');
            window.location.hash = '#/login';
            throw new Error('Session expired');
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    }

    // --- Auth ---
    async function login(username, password) {
        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            setToken(data.token);
            localStorage.setItem('inventrack_user', JSON.stringify(data.user));
            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, message: err.message };
        }
    }

    function logout() {
        clearToken();
        localStorage.removeItem('inventrack_user');
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem('inventrack_user'));
        } catch { return null; }
    }

    function isLoggedIn() {
        return !!getToken() && !!getSession();
    }

    // --- Assets ---
    async function getAssets(search, category, location) {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        if (location) params.set('location', location);
        const q = params.toString();
        return apiFetch('/assets' + (q ? '?' + q : ''));
    }

    async function getAssetById(id) {
        try { return await apiFetch('/assets/' + id); }
        catch { return null; }
    }

    async function getAssetBySku(sku) {
        try { return await apiFetch('/assets/sku/' + encodeURIComponent(sku)); }
        catch { return null; }
    }

    async function addAsset(asset) {
        return apiFetch('/assets', {
            method: 'POST',
            body: JSON.stringify(asset)
        });
    }

    async function updateAsset(id, updates) {
        return apiFetch('/assets/' + id, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async function deleteAsset(id) {
        return apiFetch('/assets/' + id, { method: 'DELETE' });
    }

    async function getCategories() {
        try { return await apiFetch('/assets/meta/categories'); }
        catch { return []; }
    }

    async function getLocations() {
        try { return await apiFetch('/assets/meta/locations'); }
        catch { return []; }
    }

    async function getDashboardStats() {
        return apiFetch('/assets/stats/summary');
    }

    async function getLowStockAssets() {
        return apiFetch('/assets/stats/low-stock');
    }

    async function generateSku(category) {
        const data = await apiFetch('/assets/generate-sku?category=' + encodeURIComponent(category || 'ITM'));
        return data.sku;
    }

    // --- Transactions ---
    async function getTransactions(type, search) {
        const params = new URLSearchParams();
        if (type) params.set('type', type);
        if (search) params.set('search', search);
        const q = params.toString();
        return apiFetch('/transactions' + (q ? '?' + q : ''));
    }

    async function addTransaction(tx) {
        return apiFetch('/transactions', {
            method: 'POST',
            body: JSON.stringify(tx)
        });
    }

    async function getMonthlyStats(months) {
        return apiFetch('/transactions/stats/monthly?months=' + (months || 6));
    }

    // --- Users ---
    async function getUsers() {
        return apiFetch('/users');
    }

    async function getUserById(id) {
        try { return await apiFetch('/users/' + id); }
        catch { return null; }
    }

    async function createUser(data) {
        return apiFetch('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async function updateUser(id, data) {
        return apiFetch('/users/' + id, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async function deleteUser(id) {
        return apiFetch('/users/' + id, { method: 'DELETE' });
    }

    return {
        login, logout, getSession, isLoggedIn,
        getToken, setToken, clearToken,
        getAssets, getAssetById, getAssetBySku,
        addAsset, updateAsset, deleteAsset,
        getCategories, getLocations,
        getDashboardStats, getLowStockAssets, generateSku,
        getTransactions, addTransaction, getMonthlyStats,
        getUsers, getUserById, createUser, updateUser, deleteUser
    };
})();
