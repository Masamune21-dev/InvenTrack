const express = require('express');
const { queryAll, queryOne, execute, runTransaction } = require('../db');
const { authMiddleware, adminOnly } = require('./auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/assets — list with optional search/filter
router.get('/', async (req, res) => {
    const { search, category, location } = req.query;
    let sql = 'SELECT * FROM assets WHERE 1=1';
    const params = [];

    if (search) {
        sql += ' AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q);
    }
    if (category) {
        sql += ' AND category = ?';
        params.push(category);
    }
    if (location) {
        sql += ' AND location = ?';
        params.push(location);
    }

    sql += ' ORDER BY updated_at DESC';
    const assets = await queryAll(sql, params);
    res.json(assets);
});

// GET /api/assets/stats/summary — dashboard stats
router.get('/stats/summary', async (req, res) => {
    const total = (await queryOne('SELECT COUNT(*) as count FROM assets'))?.count || 0;
    const totalQty = (await queryOne('SELECT COALESCE(SUM(quantity), 0) as total FROM assets'))?.total || 0;
    const lowStock = (await queryOne('SELECT COUNT(*) as count FROM assets WHERE quantity <= 5'))?.count || 0;

    // This month
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const inThisMonth = (await queryOne("SELECT COALESCE(SUM(quantity), 0) as total FROM transactions WHERE type = 'check-in' AND created_at >= ?", [startOfMonth]))?.total || 0;
    const outThisMonth = (await queryOne("SELECT COALESCE(SUM(quantity), 0) as total FROM transactions WHERE type = 'check-out' AND created_at >= ?", [startOfMonth]))?.total || 0;

    res.json({ total, totalQty, lowStock, inThisMonth, outThisMonth });
});

// GET /api/assets/stats/low-stock
router.get('/stats/low-stock', async (req, res) => {
    const assets = await queryAll('SELECT * FROM assets WHERE quantity <= 5 ORDER BY quantity ASC');
    res.json(assets);
});

// GET /api/assets/meta/categories
router.get('/meta/categories', async (req, res) => {
    const rows = await queryAll('SELECT DISTINCT category FROM assets ORDER BY category');
    res.json(rows.map(r => r.category));
});

// GET /api/assets/meta/locations
router.get('/meta/locations', async (req, res) => {
    const rows = await queryAll('SELECT DISTINCT location FROM assets ORDER BY location');
    res.json(rows.map(r => r.location));
});

// GET /api/assets/generate-sku
router.get('/generate-sku', (req, res) => {
    const { category } = req.query;
    const prefix = (category || 'ITM').substring(0, 3).toUpperCase();
    const num = Date.now().toString().slice(-6);
    res.json({ sku: `${prefix}-${num}` });
});

// GET /api/assets/:id
router.get('/:id', async (req, res) => {
    const asset = await queryOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (!asset) return res.status(404).json({ error: 'Aset tidak ditemukan' });
    res.json(asset);
});

// GET /api/assets/sku/:sku
router.get('/sku/:sku', async (req, res) => {
    const asset = await queryOne('SELECT * FROM assets WHERE sku = ?', [req.params.sku]);
    if (!asset) return res.status(404).json({ error: 'Aset tidak ditemukan' });
    res.json(asset);
});

// POST /api/assets — create (admin only)
router.post('/', adminOnly, async (req, res) => {
    const { name, category, sku, quantity, condition, location } = req.body;
    if (!name || !category || !location) {
        return res.status(400).json({ error: 'Nama, kategori, dan lokasi wajib diisi' });
    }

    const id = 'a' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const finalSku = sku || (category.substring(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-6));
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    try {
        await execute(
            `INSERT INTO assets (id, name, category, sku, quantity, \`condition\`, location, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, category, finalSku, quantity || 0, condition || 'Baru', location, now, now]
        );

        const asset = await queryOne('SELECT * FROM assets WHERE id = ?', [id]);
        res.status(201).json(asset);
    } catch (err) {
        if (err.message && (err.message.includes('UNIQUE') || err.message.includes('Duplicate'))) {
            return res.status(409).json({ error: 'SKU sudah ada. Gunakan SKU lain.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/assets/:id — update
router.put('/:id', async (req, res) => {
    const asset = await queryOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (!asset) return res.status(404).json({ error: 'Aset tidak ditemukan' });

    const { name, category, sku, quantity, condition, location } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    try {
        await execute(
            `UPDATE assets SET
            name = COALESCE(?, name),
            category = COALESCE(?, category),
            sku = COALESCE(?, sku),
            quantity = COALESCE(?, quantity),
            \`condition\` = COALESCE(?, \`condition\`),
            location = COALESCE(?, location),
            updated_at = ?
            WHERE id = ?`,
            [
                name || null, category || null, sku || null,
                quantity !== undefined ? quantity : null,
                condition || null, location || null, now, req.params.id
            ]
        );
        const updated = await queryOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/assets/:id — delete (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
    const asset = await queryOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (!asset) return res.status(404).json({ error: 'Aset tidak ditemukan' });

    await execute('DELETE FROM assets WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Aset berhasil dihapus' });
});

module.exports = router;
