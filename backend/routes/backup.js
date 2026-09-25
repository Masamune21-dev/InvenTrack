const path = require('path');
const fs = require('fs');
const { saveDb, restoreDb } = require('../db');
const { authMiddleware, adminOnly } = require('./auth');
const { createRouter } = require('../utils');

const router = createRouter();

// All backup routes are admin only
router.use(authMiddleware);
router.use(adminOnly);

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'inventrack.db');

// GET /api/backup/download — download database file
router.get('/download', (req, res) => {
    if (!fs.existsSync(DB_PATH)) {
        return res.status(404).json({ error: 'File database tidak ditemukan' });
    }
    saveDb(); // pastikan perubahan terbaru ikut ter-download

    const dateStr = new Date().toISOString().slice(0, 10);
    res.download(DB_PATH, `inventrack_backup_${dateStr}.db`, (err) => {
        if (err) {
            console.error('Download error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Gagal download file' });
            }
        }
    });
});

// POST /api/backup/restore — restore database from uploaded file
router.post('/restore', (req, res) => {
    // Accept raw binary upload via multipart
    const chunks = [];
    let totalSize = 0;
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB limit
    let aborted = false;

    req.on('data', (chunk) => {
        if (aborted) return;
        totalSize += chunk.length;
        if (totalSize > MAX_SIZE) {
            aborted = true;
            res.status(413).json({ error: 'File terlalu besar (maks 50MB)' });
            req.destroy();
            return;
        }
        chunks.push(chunk);
    });

    req.on('end', async () => {
        if (aborted) return;
        try {
            let dbBuffer = Buffer.concat(chunks);

            // If multipart form data, extract the file
            const contentType = req.headers['content-type'] || '';
            if (contentType.includes('multipart/form-data')) {
                const boundary = contentType.split('boundary=')[1];
                if (boundary) {
                    const raw = dbBuffer.toString('binary');
                    const parts = raw.split('--' + boundary);
                    for (const part of parts) {
                        if (part.includes('filename=') && part.includes('.db')) {
                            const headerEnd = part.indexOf('\r\n\r\n');
                            if (headerEnd > -1) {
                                const bodyStr = part.slice(headerEnd + 4);
                                // Remove trailing \r\n
                                const cleanBody = bodyStr.replace(/\r\n$/, '');
                                dbBuffer = Buffer.from(cleanBody, 'binary');
                                break;
                            }
                        }
                    }
                }
            }

            // Validate SQLite header
            const header = dbBuffer.slice(0, 16).toString('utf-8');
            if (!header.startsWith('SQLite format 3')) {
                return res.status(400).json({ error: 'File bukan database SQLite yang valid' });
            }

            // Validasi isi backup lalu ganti database aktif (database lama disimpan dulu)
            try {
                await restoreDb(dbBuffer);
            } catch (e) {
                return res.status(400).json({ error: 'File backup tidak valid: ' + e.message });
            }

            console.log('🔄 Database berhasil di-restore dari file backup');
            res.json({ success: true, message: 'Restore berhasil.' });
        } catch (e) {
            console.error('Restore error:', e);
            res.status(500).json({ error: 'Gagal restore: ' + e.message });
        }
    });
});

module.exports = router;
