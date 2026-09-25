const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'inventrack.db');
const dataDir = path.dirname(DB_PATH);

let db = null;

// Save database to file
function saveDb() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// Initialize database
async function initDb() {
    const SQL = await initSqlJs();

    // Ensure data directory
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load existing database or create new
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('📂 Database loaded from disk');
    } else {
        db = new SQL.Database();
        console.log('🆕 Creating new database');
    }

    createSchema();

    // Seed data
    seed();
    saveDb();

    // Auto-save every 30 seconds
    setInterval(saveDb, 30000);

    return db;
}

function createSchema() {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            condition TEXT DEFAULT 'Baru',
            location TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            asset_id TEXT NOT NULL,
            asset_name TEXT NOT NULL,
            type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            user_id TEXT NOT NULL,
            note TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
        )
    `);

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_assets_sku ON assets(sku)');
    db.run('CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category)');
    db.run('CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location)');
    db.run('CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON transactions(asset_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
    db.run('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
}

function seed() {
    const result = db.exec('SELECT COUNT(*) as cnt FROM users');
    const count = result[0]?.values[0][0] || 0;
    if (count > 0) return;

    console.log('📦 Membuat akun admin default...');

    // Hanya buat akun admin default untuk login pertama kali
    db.run('INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
        ['u1', 'admin', bcrypt.hashSync('admin123', 10), 'Administrator', 'admin']);

    console.log('✅ Akun admin berhasil dibuat (admin / admin123)');
}

// Ganti database aktif dengan isi file backup (tanpa restart server).
// File divalidasi dulu; database lama disimpan sebagai *_pre_restore_*.db.
async function restoreDb(buffer) {
    const SQL = await initSqlJs();
    const candidate = new SQL.Database(buffer);
    try {
        const tables = (candidate.exec("SELECT name FROM sqlite_master WHERE type = 'table'")[0]?.values || []).flat();
        for (const table of ['users', 'assets', 'transactions']) {
            if (!tables.includes(table)) throw new Error(`Tabel "${table}" tidak ditemukan di file backup`);
        }
        const admins = candidate.exec("SELECT COUNT(*) FROM users WHERE role = 'admin'")[0].values[0][0];
        if (!admins) throw new Error('File backup tidak memiliki akun admin');
    } catch (e) {
        candidate.close();
        throw e;
    }

    saveDb();
    if (fs.existsSync(DB_PATH)) {
        fs.copyFileSync(DB_PATH, DB_PATH.replace(/\.db$/, `_pre_restore_${Date.now()}.db`));
    }

    const previous = db;
    db = candidate;
    createSchema();
    saveDb();
    previous?.close();
}

// Helper functions to wrap sql.js API to mimic better-sqlite3 style
function getDb() {
    return db;
}

// Execute query and return all rows as array of objects
function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// Execute query and return first row as object
function queryOne(sql, params = []) {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

// Track if inside a transaction
let inTransaction = false;

// Execute non-select query (INSERT, UPDATE, DELETE)
function execute(sql, params = []) {
    db.run(sql, params);
    if (!inTransaction) saveDb();
}

// Run multiple queries in a transaction
async function runTransaction(fn) {
    db.run('BEGIN TRANSACTION');
    inTransaction = true;
    try {
        await fn();
        inTransaction = false;
        db.run('COMMIT');
        saveDb();
    } catch (e) {
        inTransaction = false;
        db.run('ROLLBACK');
        throw e;
    }
}

module.exports = { initDb, getDb, queryAll, queryOne, execute, runTransaction, saveDb, restoreDb };
