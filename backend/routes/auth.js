const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'inventrack-default-dev-key-change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

// Middleware: verify JWT token
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token tidak ditemukan' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token tidak valid atau expired' });
    }
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
    const { username, password } = req.body;
    if (!username || !password) {
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

module.exports = { router, authMiddleware, adminOnly, JWT_SECRET };
