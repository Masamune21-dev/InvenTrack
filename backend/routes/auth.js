const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne } = require('../db');
const { createRouter } = require('../utils');

const router = createRouter();

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'GANTI-DENGAN-SECRET-ANDA-YANG-PANJANG-DAN-ACAK') {
    // Jangan pakai secret yang bisa ditebak. Secret acak ini hilang saat restart,
    // jadi semua user harus login ulang — isi JWT_SECRET di .env untuk production.
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('  ⚠️  JWT_SECRET belum diisi di .env — memakai secret acak sementara.');
}
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

// Middleware: verify JWT token, lalu ambil data user terbaru dari database
// agar user yang dihapus / diubah role-nya langsung berlaku.
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token tidak ditemukan' });
    }
    let decoded;
    try {
        decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'Token tidak valid atau expired' });
    }
    const user = await queryOne('SELECT id, username, name, role FROM users WHERE id = ?', [String(decoded.id)]);
    if (!user) {
        return res.status(401).json({ error: 'Token tidak valid atau expired' });
    }
    req.user = user;
    next();
}

// Middleware: admin only
function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak. Hanya admin.' });
    }
    next();
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Username atau password salah' });
    }

    const payload = { id: user.id, username: user.username, name: user.name, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({ token, user: payload });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

module.exports = { router, authMiddleware, adminOnly };
