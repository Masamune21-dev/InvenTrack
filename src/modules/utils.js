/* ============================
   Utils — helper umum frontend
   ============================ */

// Escape teks sebelum dimasukkan ke innerHTML / template HTML.
// Semua data dari server (nama aset, catatan, nama user, dll) wajib lewat sini.
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
