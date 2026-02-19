/**
 * Database Module — MariaDB / MySQL Version
 * 
 * File ini adalah alternatif dari db.js (SQLite).
 * Untuk menggunakan MariaDB, ganti require di server.js:
 * 
 *   SEBELUM: const { initDb, saveDb } = require('./backend/db');
 *   SESUDAH: const { initDb, saveDb } = require('./backend/db-mysql');
 * 
 * Lalu tambahkan config MySQL di file .env:
 *   DB_TYPE=mysql
 *   DB_HOST=localhost
 *   DB_PORT=3306
 *   DB_USER=inventrack
 *   DB_PASSWORD=password_anda
 *   DB_NAME=inventrack
 * 
 * Install dependency tambahan:
 *   npm install mysql2
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let pool = null;

// Initialize database
async function initDb() {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'inventrack',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'inventrack',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    });

    // Test connection
    try {
        const conn = await pool.getConnection();
        console.log('📂 Connected to MariaDB/MySQL');
        conn.release();
    } catch (err) {
        console.error('❌ Gagal koneksi ke database:', err.message);
        console.error('   Pastikan MariaDB/MySQL sudah berjalan dan config .env sudah benar');
        process.exit(1);
    }

    // Create tables
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'staff'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS assets (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            sku VARCHAR(100) UNIQUE NOT NULL,
            quantity INT NOT NULL DEFAULT 0,
            \`condition\` VARCHAR(100) DEFAULT 'Baru',
            location VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_sku (sku),
            INDEX idx_category (category),
            INDEX idx_location (location)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(50) PRIMARY KEY,
            asset_id VARCHAR(50) NOT NULL,
            asset_name VARCHAR(255) NOT NULL,
            type VARCHAR(20) NOT NULL,
            quantity INT NOT NULL,
            user_name VARCHAR(255) NOT NULL,
            user_id VARCHAR(50) NOT NULL,
            note TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_asset_id (asset_id),
            INDEX idx_type (type),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Seed default admin
    await seed();

    return pool;
}

async function seed() {
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM users');
    if (rows[0].cnt > 0) return;

    console.log('📦 Membuat akun admin default...');

    await pool.execute(
        'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
        ['u1', 'admin', bcrypt.hashSync('admin123', 10), 'Administrator', 'admin']
    );

    console.log('✅ Akun admin berhasil dibuat (admin / admin123)');
}

// --- Query Helpers (API sama dengan db.js) ---

// Execute SELECT query, return array of objects
async function queryAll(sql, params = []) {
    // Convert ? placeholders — MySQL uses ? already, just pass through
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// Execute SELECT query, return first row or null
async function queryOne(sql, params = []) {
    const rows = await queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

// Execute INSERT/UPDATE/DELETE
async function execute(sql, params = []) {
    await pool.execute(sql, params);
}

// Run multiple queries in a transaction
async function runTransaction(fn) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
        // Override pool temporarily for the transaction
        const origPool = pool;
        pool = conn;
        await fn();
        pool = origPool;
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

// No-op for MySQL (data is auto-persisted)
function saveDb() {
    // MySQL auto-saves, nothing to do
}

function getDb() {
    return pool;
}

module.exports = { initDb, getDb, queryAll, queryOne, execute, runTransaction, saveDb };
