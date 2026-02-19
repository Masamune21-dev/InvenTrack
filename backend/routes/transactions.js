const express = require('express');
const { queryAll, queryOne, execute, runTransaction } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/transactions — list with optional filters
router.get('/', async (req, res) => {
    const { type, search } = req.query;
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];

    if (type) {
        sql += ' AND type = ?';
        params.push(type);
    }
    if (search) {
        sql += ' AND (asset_name LIKE ? OR user_name LIKE ? OR note LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q);
    }

    sql += ' ORDER BY created_at DESC';
    const txs = await queryAll(sql, params);

    // Map snake_case to camelCase for frontend compatibility
    const mapped = txs.map(t => ({
        id: t.id,
        assetId: t.asset_id,
        assetName: t.asset_name,
        type: t.type,
        quantity: t.quantity,
        user: t.user_name,
        userId: t.user_id,
        note: t.note,
        createdAt: t.created_at
    }));

    res.json(mapped);
});

// GET /api/transactions/stats/monthly
router.get('/stats/monthly', async (req, res) => {
    const months = parseInt(req.query.months) || 6;
    const stats = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')} 23:59:59`;

        const checkIn = (await queryOne("SELECT COALESCE(SUM(quantity), 0) as total FROM transactions WHERE type = 'check-in' AND created_at >= ? AND created_at <= ?", [start, end]))?.total || 0;
        const checkOut = (await queryOne("SELECT COALESCE(SUM(quantity), 0) as total FROM transactions WHERE type = 'check-out' AND created_at >= ? AND created_at <= ?", [start, end]))?.total || 0;

        stats.push({
            label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
            checkIn,
            checkOut
        });
    }

    res.json(stats);
});

// POST /api/transactions — create check-in or check-out
router.post('/', async (req, res) => {
    const { assetId, type, quantity, note } = req.body;

    if (!assetId || !type || !quantity) {
        return res.status(400).json({ error: 'assetId, type, dan quantity wajib diisi' });
    }

    if (!['check-in', 'check-out'].includes(type)) {
        return res.status(400).json({ error: 'Type harus check-in atau check-out' });
    }

    const asset = await queryOne('SELECT * FROM assets WHERE id = ?', [assetId]);
    if (!asset) return res.status(404).json({ error: 'Aset tidak ditemukan' });

    if (type === 'check-out' && quantity > asset.quantity) {
        return res.status(400).json({ error: `Stok tidak mencukupi! Tersedia: ${asset.quantity}` });
    }

    const id = 't' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const userName = req.user.name;
    const userId = req.user.id;

    await runTransaction(async () => {
        await execute(
            `INSERT INTO transactions (id, asset_id, asset_name, type, quantity, user_name, user_id, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, assetId, asset.name, type, quantity, userName, userId, note || '', now]
        );

        const newQty = type === 'check-in'
            ? asset.quantity + quantity
            : asset.quantity - quantity;

        await execute('UPDATE assets SET quantity = ?, updated_at = ? WHERE id = ?',
            [Math.max(0, newQty), now, assetId]);
    });

    const tx = {
        id, assetId, assetName: asset.name, type, quantity,
        user: userName, userId, note: note || '', createdAt: now
    };

    res.status(201).json(tx);
});

module.exports = router;
