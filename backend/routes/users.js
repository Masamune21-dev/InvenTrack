const bcrypt = require('bcryptjs');
const { queryAll, queryOne, execute } = require('../db');
const { authMiddleware, adminOnly } = require('./auth');
const { createRouter } = require('../utils');

const router = createRouter();

const ROLES = ['admin', 'staff'];
const optionalString = (v) => v === undefined || v === null || typeof v === 'string';

async function countAdmins() {
    return (await queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"))?.count || 0;
}

// All routes require admin
router.use(authMiddleware);
router.use(adminOnly);

// GET /api/users — list all users
router.get('/', async (req, res) => {
    const users = await queryAll('SELECT id, username, name, role FROM users ORDER BY role ASC, name ASC');
    res.json(users);
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
    const user = await queryOne('SELECT id, username, name, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json(user);
});

// POST /api/users — create new user
router.post('/', async (req, res) => {
    const { username, password, name, role } = req.body;

    if (!username || !password || !name) {
        return res.status(400).json({ error: 'Username, password, dan nama wajib diisi' });
    }
    if (![username, password, name].every(v => typeof v === 'string') || !optionalString(role)) {
        return res.status(400).json({ error: 'Format data user tidak valid' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const existing = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
        return res.status(409).json({ error: 'Username sudah digunakan' });
    }

    const id = 'u' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'staff';

    await execute(
        'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
        [id, username, hashedPassword, name, userRole]
    );

    const user = await queryOne('SELECT id, username, name, role FROM users WHERE id = ?', [id]);
    res.status(201).json(user);
});

// PUT /api/users/:id — update user
router.put('/:id', async (req, res) => {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const { username, password, name, role } = req.body;

    if (![username, password, name].every(optionalString)) {
        return res.status(400).json({ error: 'Format data user tidak valid' });
    }
    if (role && !ROLES.includes(role)) {
        return res.status(400).json({ error: 'Role harus admin atau staff' });
    }
    // Jangan sampai tidak ada admin tersisa
    if (user.role === 'admin' && role === 'staff' && await countAdmins() <= 1) {
        return res.status(400).json({ error: 'Minimal harus ada satu admin' });
    }

    // Check username uniqueness if changed
    if (username && username !== user.username) {
        const existing = await queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.params.id]);
        if (existing) {
            return res.status(409).json({ error: 'Username sudah digunakan' });
        }
    }

    if (password && password.length < 6) {
        return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const newUsername = username || user.username;
    const newName = name || user.name;
    const newRole = role || user.role;
    const newPassword = password ? bcrypt.hashSync(password, 10) : user.password;

    await execute(
        'UPDATE users SET username = ?, password = ?, name = ?, role = ? WHERE id = ?',
        [newUsername, newPassword, newName, newRole, req.params.id]
    );

    const updated = await queryOne('SELECT id, username, name, role FROM users WHERE id = ?', [req.params.id]);
    res.json(updated);
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Prevent deleting self
    if (req.user.id === req.params.id) {
        return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
    }
    if (user.role === 'admin' && await countAdmins() <= 1) {
        return res.status(400).json({ error: 'Minimal harus ada satu admin' });
    }

    await execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User berhasil dihapus' });
});

module.exports = router;
