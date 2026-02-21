/* ============================
   Backup Page (Admin only)
   Database download & management
   ============================ */

const BackupPage = (() => {
    function render() {
        return `
        <div class="page-header">
            <h1 class="page-title">Backup & Restore</h1>
            <p class="page-subtitle">Kelola backup database untuk keamanan data</p>
        </div>

        <div class="stats-grid fade-in" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))">
            <!-- Download Backup -->
            <div class="card">
                <div class="card-body" style="text-align:center;padding:32px">
                    <div style="width:64px;height:64px;border-radius:16px;background:rgba(99,102,241,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;color:var(--accent-primary)">
                        <i class="fas fa-download"></i>
                    </div>
                    <h3 style="margin-bottom:8px;color:var(--text-primary)">Download Database</h3>
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px">
                        Download file database SQLite sebagai backup. Simpan file ini di tempat aman.
                    </p>
                    <button class="btn btn-primary" id="btnDownloadDB" style="width:100%">
                        <i class="fas fa-database"></i> Download Backup (.db)
                    </button>
                </div>
            </div>

            <!-- Export as JSON -->
            <div class="card">
                <div class="card-body" style="text-align:center;padding:32px">
                    <div style="width:64px;height:64px;border-radius:16px;background:rgba(16,185,129,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;color:var(--accent-success)">
                        <i class="fas fa-file-code"></i>
                    </div>
                    <h3 style="margin-bottom:8px;color:var(--text-primary)">Export Data (JSON)</h3>
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px">
                        Export semua data sebagai file JSON. Bisa digunakan untuk migrasi atau arsip.
                    </p>
                    <button class="btn btn-success" id="btnExportJSON" style="width:100%">
                        <i class="fas fa-file-export"></i> Export JSON
                    </button>
                </div>
            </div>

            <!-- Send via Email -->
            <div class="card">
                <div class="card-body" style="text-align:center;padding:32px">
                    <div style="width:64px;height:64px;border-radius:16px;background:rgba(245,158,11,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;color:var(--accent-warning)">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <h3 style="margin-bottom:8px;color:var(--text-primary)">Kirim via Email</h3>
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px">
                        Buka email client dengan backup JSON terlampir untuk dikirim ke email tujuan.
                    </p>
                    <div class="form-group" style="margin-bottom:12px">
                        <input type="email" class="form-input" id="backupEmail" placeholder="email@contoh.com" style="text-align:center">
                    </div>
                    <button class="btn btn-warning" id="btnSendEmail" style="width:100%;color:#fff">
                        <i class="fas fa-paper-plane"></i> Buka Email Client
                    </button>
                </div>
            </div>
        </div>

        <!-- Backup Info -->
        <div class="card fade-in" style="margin-top:20px">
            <div class="card-body">
                <h3 style="margin-bottom:16px;color:var(--text-primary)"><i class="fas fa-circle-info" style="color:var(--accent-info);margin-right:8px"></i>Informasi Database</h3>
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px" id="backupStats">
                    <div style="text-align:center">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--accent-primary)" id="statAssets">-</div>
                        <div style="font-size:0.8rem;color:var(--text-muted)">Total Aset</div>
                    </div>
                    <div style="text-align:center">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--accent-success)" id="statTransactions">-</div>
                        <div style="font-size:0.8rem;color:var(--text-muted)">Total Transaksi</div>
                    </div>
                    <div style="text-align:center">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--accent-warning)" id="statUsers">-</div>
                        <div style="font-size:0.8rem;color:var(--text-muted)">Total User</div>
                    </div>
                    <div style="text-align:center">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--accent-info)" id="statDate">-</div>
                        <div style="font-size:0.8rem;color:var(--text-muted)">Tanggal Sekarang</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Restore Section -->
        <div class="card fade-in" style="margin-top:20px">
            <div class="card-body">
                <h3 style="margin-bottom:8px;color:var(--text-primary)"><i class="fas fa-upload" style="color:var(--accent-danger);margin-right:8px"></i>Restore Database</h3>
                <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px">
                    ⚠️ Upload file backup (.db) untuk mengembalikan data. <strong>Data saat ini akan digantikan!</strong>
                </p>
                <div style="display:flex;gap:12px;align-items:center">
                    <input type="file" id="restoreFile" accept=".db" class="form-input" style="flex:1">
                    <button class="btn btn-danger" id="btnRestore">
                        <i class="fas fa-upload"></i> Restore
                    </button>
                </div>
            </div>
        </div>`;
    }

    async function init() {
        // Load stats
        try {
            const stats = await Store.getDashboardStats();
            const users = await Store.getUsers();
            const txs = await Store.getTransactions();

            document.getElementById('statAssets').textContent = stats.total || 0;
            document.getElementById('statTransactions').textContent = txs.length || 0;
            document.getElementById('statUsers').textContent = users.length || 0;
            document.getElementById('statDate').textContent = new Date().toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
        } catch (e) {
            console.error('Failed to load backup stats:', e);
        }

        // Download DB
        document.getElementById('btnDownloadDB')?.addEventListener('click', async () => {
            try {
                App.showToast('Menyiapkan backup...', 'info');
                const token = Store.getToken();
                const _base = window.location.pathname.replace(/\/$/, '');
                const res = await fetch(_base + '/api/backup/download', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Gagal download');
                const blob = await res.blob();
                const dateStr = new Date().toISOString().slice(0, 10);
                ExportUtil.downloadBlob(blob, `inventrack_backup_${dateStr}.db`);
                App.showToast('Backup berhasil didownload', 'success');
            } catch (e) {
                App.showToast('Gagal download backup: ' + e.message, 'error');
            }
        });

        // Export JSON
        document.getElementById('btnExportJSON')?.addEventListener('click', async () => {
            try {
                App.showToast('Menyiapkan export...', 'info');
                const [assets, txs, users] = await Promise.all([
                    Store.getAssets(),
                    Store.getTransactions(),
                    Store.getUsers()
                ]);

                const data = {
                    exportedAt: new Date().toISOString(),
                    app: 'InvenTrack',
                    data: { assets, transactions: txs, users }
                };

                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const dateStr = new Date().toISOString().slice(0, 10);
                ExportUtil.downloadBlob(blob, `inventrack_export_${dateStr}.json`);
                App.showToast('Export JSON berhasil', 'success');
            } catch (e) {
                App.showToast('Gagal export: ' + e.message, 'error');
            }
        });

        // Send via Email
        document.getElementById('btnSendEmail')?.addEventListener('click', async () => {
            const email = document.getElementById('backupEmail').value.trim();
            const subject = encodeURIComponent(`InvenTrack Backup - ${new Date().toLocaleDateString('id-ID')}`);
            const body = encodeURIComponent(
                `Backup database InvenTrack\n` +
                `Tanggal: ${new Date().toLocaleString('id-ID')}\n\n` +
                `Catatan: File backup (.db atau .json) perlu dilampirkan secara manual.\n` +
                `Silakan download backup terlebih dahulu menggunakan tombol "Download Backup" atau "Export JSON", ` +
                `lalu lampirkan file tersebut ke email ini.\n\n` +
                `---\nInvenTrack - Sistem Inventaris Aset`
            );

            const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
            window.open(mailto);
            App.showToast('Email client dibuka. Lampirkan file backup secara manual.', 'info');
        });

        // Restore
        document.getElementById('btnRestore')?.addEventListener('click', async () => {
            const fileInput = document.getElementById('restoreFile');
            const file = fileInput?.files[0];
            if (!file) {
                App.showToast('Pilih file backup (.db) terlebih dahulu', 'error');
                return;
            }
            if (!file.name.endsWith('.db')) {
                App.showToast('File harus berformat .db', 'error');
                return;
            }
            const confirmed = await Dialog.confirm({
                title: 'Restore Database?',
                message: 'Data saat ini akan <strong>DIGANTIKAN</strong> dengan data dari file backup.<br>Aksi ini <strong>tidak bisa dibatalkan</strong>.',
                type: 'warning',
                confirmText: 'Ya, Restore',
                cancelText: 'Batal'
            });
            if (!confirmed) {
                return;
            }

            try {
                App.showToast('Memproses restore...', 'info');
                const token = Store.getToken();
                const formData = new FormData();
                formData.append('database', file);

                const _base2 = window.location.pathname.replace(/\/$/, '');
                const res = await fetch(_base2 + '/api/backup/restore', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Gagal restore');
                }

                App.showToast('Restore berhasil! Halaman akan dimuat ulang...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } catch (e) {
                App.showToast('Gagal restore: ' + e.message, 'error');
            }
        });
    }

    return { render, init };
})();
