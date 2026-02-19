const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, saveDb } = require('./backend/db');

// Load .env file if present
try {
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const [key, ...vals] = line.split('=');
            if (key && vals.length > 0) {
                process.env[key.trim()] = vals.join('=').trim();
            }
        });
    }
} catch (e) { /* .env is optional */ }

async function startServer() {
    // Initialize database first
    await initDb();

    const app = express();
    const PORT = process.env.PORT || 3000;

    // --- Security Middleware ---

    // Trust proxy (if behind nginx/reverse proxy)
    app.set('trust proxy', 1);

    // CORS - restrict in production
    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    }));

    // Parse JSON with size limit
    app.use(express.json({ limit: '1mb' }));

    // Security headers
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        // Remove Express fingerprint
        res.removeHeader('X-Powered-By');
        next();
    });

    // Rate limiting for login endpoint (prevent brute force)
    const loginAttempts = new Map();
    app.use('/api/auth/login', (req, res, next) => {
        if (req.method !== 'POST') return next();

        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxAttempts = 10;

        // Clean old entries
        const attempts = (loginAttempts.get(ip) || []).filter(t => now - t < windowMs);

        if (attempts.length >= maxAttempts) {
            return res.status(429).json({
                error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.'
            });
        }

        attempts.push(now);
        loginAttempts.set(ip, attempts);

        // Clean map periodically
        if (loginAttempts.size > 1000) {
            for (const [key, val] of loginAttempts) {
                if (val.every(t => now - t > windowMs)) loginAttempts.delete(key);
            }
        }

        next();
    });

    // API rate limiting (general)
    const apiRequests = new Map();
    app.use('/api', (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute
        const maxRequests = 120;

        const requests = (apiRequests.get(ip) || []).filter(t => now - t < windowMs);

        if (requests.length >= maxRequests) {
            return res.status(429).json({ error: 'Terlalu banyak request. Coba lagi nanti.' });
        }

        requests.push(now);
        apiRequests.set(ip, requests);

        // Clean map periodically
        if (apiRequests.size > 1000) {
            for (const [key, val] of apiRequests) {
                if (val.every(t => now - t > windowMs)) apiRequests.delete(key);
            }
        }

        next();
    });

    // --- Static Files ---
    app.use(express.static(path.join(__dirname), {
        maxAge: '1d',
        etag: true,
        index: 'index.html'
    }));

    // --- API Routes ---
    const { router: authRouter } = require('./backend/routes/auth');
    const assetsRouter = require('./backend/routes/assets');
    const transactionsRouter = require('./backend/routes/transactions');
    const usersRouter = require('./backend/routes/users');
    const backupRouter = require('./backend/routes/backup');

    app.use('/api/auth', authRouter);
    app.use('/api/assets', assetsRouter);
    app.use('/api/transactions', transactionsRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/backup', backupRouter);

    // API 404 handler
    app.all('/api/*', (req, res) => {
        res.status(404).json({ error: 'Endpoint tidak ditemukan' });
    });

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Global error handler
    app.use((err, req, res, next) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    });

    // --- Start Server ---
    const server = app.listen(PORT, () => {
        console.log('');
        console.log('  ╔══════════════════════════════════════════╗');
        console.log('  ║                                          ║');
        console.log('  ║   🏭 InvenTrack Server                   ║');
        console.log('  ║                                          ║');
        console.log(`  ║   Local:   http://localhost:${PORT}          ║`);
        console.log('  ║                                          ║');
        console.log('  ║   Login:   admin / admin123              ║');
        console.log('  ║                                          ║');
        console.log('  ╚══════════════════════════════════════════╝');
        console.log('');
        console.log('  💡 Segera ubah password admin setelah login');
        console.log('     melalui menu Kelola User di sidebar.');
        console.log('');
    });

    // --- Graceful Shutdown ---
    function shutdown(signal) {
        console.log(`\n  ⏹️  ${signal} received. Shutting down...`);
        saveDb();
        server.close(() => {
            console.log('  ✅ Server stopped. Database saved.\n');
            process.exit(0);
        });
        // Force close after 5s
        setTimeout(() => {
            console.error('  ⚠️  Forced shutdown after timeout');
            process.exit(1);
        }, 5000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
        console.error(`[FATAL] ${new Date().toISOString()} -`, err);
        saveDb();
        process.exit(1);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
