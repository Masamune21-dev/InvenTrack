/* ============================
   History Page (API-based)
   Transaction Logs + Export
   ============================ */

const HistoryPage = (() => {
    let filterType = '';
    let filterSearch = '';
    let lastLoadedTxs = [];

    function render() {
        return `
        <div class="page-header">
            <h1 class="page-title">Riwayat Transaksi</h1>
            <p class="page-subtitle">Log lengkap semua pergerakan barang masuk dan keluar</p>
        </div>

        <div class="toolbar fade-in">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="historySearch" placeholder="Cari barang, user, atau keterangan...">
            </div>
            <select class="filter-select" id="historyFilter">
                <option value="">Semua Tipe</option>
                <option value="check-in">Check-in (Masuk)</option>
                <option value="check-out">Check-out (Keluar)</option>
            </select>
        </div>

        <!-- Export Toolbar -->
        <div class="toolbar fade-in" style="margin-top:-8px;gap:8px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:8px;margin-right:auto">
                <label style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap">Filter tanggal:</label>
                <input type="date" class="form-input" id="historyDateFrom" style="width:auto;padding:6px 10px;font-size:0.8rem">
                <span style="color:var(--text-muted);font-size:0.8rem">s/d</span>
                <input type="date" class="form-input" id="historyDateTo" style="width:auto;padding:6px 10px;font-size:0.8rem">
                <button class="btn btn-ghost btn-sm" id="btnHistoryDateFilter"><i class="fas fa-filter"></i> Filter</button>
                <button class="btn btn-ghost btn-sm" id="btnHistoryDateReset" style="color:var(--text-muted)"><i class="fas fa-times"></i></button>
            </div>
            <button class="btn btn-ghost btn-sm" id="btnExportHistoryPDF" style="color:var(--accent-danger)">
                <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="btn btn-ghost btn-sm" id="btnExportHistoryCSV" style="color:var(--accent-success)">
                <i class="fas fa-file-csv"></i> Export Excel
            </button>
        </div>

        <div class="card fade-in">
            <div class="card-body" style="padding:0">
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Tipe</th>
                                <th>Aset</th>
                                <th>Jumlah</th>
                                <th>Petugas</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody id="historyTableBody">
                            <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Memuat...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }

    async function renderTable(dateFrom, dateTo) {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;

        try {
            let txs = await Store.getTransactions(filterType, filterSearch);

            // Client-side date filter
            if (dateFrom || dateTo) {
                txs = txs.filter(t => {
                    const d = (t.createdAt || t.created_at || '').slice(0, 10);
                    if (dateFrom && d < dateFrom) return false;
                    if (dateTo && d > dateTo) return false;
                    return true;
                });
            }

            lastLoadedTxs = txs;

            if (txs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-clipboard-list"></i><h4>Tidak ada data</h4><p>Belum ada transaksi yang sesuai filter</p></div></td></tr>`;
                return;
            }

            tbody.innerHTML = txs.map(t => `
                <tr>
                    <td style="white-space:nowrap">${formatDateTime(t.createdAt)}</td>
                    <td>
                        <span class="badge ${t.type === 'check-in' ? 'badge-success' : 'badge-warning'}">
                            ${t.type === 'check-in' ? '<i class="fas fa-arrow-down" style="margin-right:4px"></i>Masuk' : '<i class="fas fa-arrow-up" style="margin-right:4px"></i>Keluar'}
                        </span>
                    </td>
                    <td style="font-weight:500;color:var(--text-primary)">${t.assetName}</td>
                    <td><strong>${t.quantity}</strong></td>
                    <td>${t.user}</td>
                    <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.note || '-'}</td>
                </tr>
            `).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--accent-danger);padding:24px">Gagal memuat: ${e.message}</td></tr>`;
        }
    }

    function getDateRange() {
        const from = document.getElementById('historyDateFrom')?.value || '';
        const to = document.getElementById('historyDateTo')?.value || '';
        let label = '';
        if (from && to) label = `Periode: ${from} s/d ${to}`;
        else if (from) label = `Dari: ${from}`;
        else if (to) label = `Sampai: ${to}`;
        return { from, to, label };
    }

    async function init() {
        await renderTable();

        let searchTimeout;
        document.getElementById('historySearch')?.addEventListener('input', (e) => {
            filterSearch = e.target.value;
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => renderTable(), 300);
        });

        document.getElementById('historyFilter')?.addEventListener('change', (e) => {
            filterType = e.target.value;
            renderTable();
        });

        // Date filter
        document.getElementById('btnHistoryDateFilter')?.addEventListener('click', () => {
            const { from, to } = getDateRange();
            renderTable(from, to);
        });
        document.getElementById('btnHistoryDateReset')?.addEventListener('click', () => {
            document.getElementById('historyDateFrom').value = '';
            document.getElementById('historyDateTo').value = '';
            renderTable();
        });

        // Export buttons
        document.getElementById('btnExportHistoryPDF')?.addEventListener('click', () => {
            if (lastLoadedTxs.length === 0) { App.showToast('Tidak ada data untuk diexport', 'error'); return; }
            const { label } = getDateRange();
            ExportUtil.exportHistoryPDF(lastLoadedTxs, label || `Total: ${lastLoadedTxs.length} transaksi`);
            App.showToast('PDF berhasil didownload', 'success');
        });

        document.getElementById('btnExportHistoryCSV')?.addEventListener('click', () => {
            if (lastLoadedTxs.length === 0) { App.showToast('Tidak ada data untuk diexport', 'error'); return; }
            ExportUtil.exportHistoryCSV(lastLoadedTxs);
            App.showToast('File CSV berhasil didownload', 'success');
        });
    }

    return { render, init };
})();
