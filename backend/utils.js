const express = require('express');

// Router yang meneruskan error dari handler async ke error handler Express.
// Express 4 tidak menangkap promise yang reject, sehingga tanpa ini satu
// request dengan input aneh bisa menjadi unhandled rejection dan mematikan server.
function createRouter() {
    const router = express.Router();
    for (const method of ['get', 'post', 'put', 'delete', 'use']) {
        const original = router[method].bind(router);
        router[method] = (...args) => original(...args.map(wrap));
    }
    return router;
}

function wrap(handler) {
    if (typeof handler !== 'function' || handler.length === 4) return handler;
    return (req, res, next) => {
        try {
            const result = handler(req, res, next);
            if (result && typeof result.catch === 'function') result.catch(next);
        } catch (err) {
            next(err);
        }
    };
}

// Timestamp waktu lokal server (YYYY-MM-DD HH:MM:SS), konsisten dengan
// default kolom `datetime('now', 'localtime')` dan perhitungan batas bulan.
function nowLocal() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Ambil query param sebagai string; array/objek (mis. ?a=1&a=2) diabaikan.
function queryString(value) {
    return typeof value === 'string' ? value : undefined;
}

module.exports = { createRouter, nowLocal, queryString };
