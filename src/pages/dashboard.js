/* ============================
   Dashboard Page (API-based)
   ============================ */

const DashboardPage = (() => {
    let chartInstance = null;

    function render() {
        // Return skeleton, data loaded async in init()
        return `
        <div class="page-header">
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">Ringkasan inventaris dan aktivitas terkini</p>
        </div>

        <div class="stats-grid fade-in" id="statsGrid">
            <div class="stat-card primary">
                <div class="stat-icon"><i class="fas fa-boxes-stacked"></i></div>
                <div class="stat-value" id="statTotalQty">—</div>
                <div class="stat-label" id="statTotalLabel">Total Unit Aset</div>
            </div>
            <div class="stat-card success">
                <div class="stat-icon"><i class="fas fa-arrow-down"></i></div>
                <div class="stat-value" id="statIn">—</div>
                <div class="stat-label">Barang Masuk Bulan Ini</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-icon"><i class="fas fa-arrow-up"></i></div>
                <div class="stat-value" id="statOut">—</div>
                <div class="stat-label">Barang Keluar Bulan Ini</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-icon"><i class="fas fa-triangle-exclamation"></i></div>
                <div class="stat-value" id="statLow">—</div>
                <div class="stat-label">Stok Menipis (≤ 5)</div>
            </div>
        </div>

        <div class="dashboard-grid fade-in">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-chart-bar" style="margin-right:8px;color:var(--accent-primary)"></i>Pergerakan Barang (6 Bulan)</h3>
                </div>
                <div class="chart-container">
                    <canvas id="movementChart"></canvas>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-triangle-exclamation" style="margin-right:8px;color:var(--accent-warning)"></i>Stok Menipis</h3>
                </div>
                <div class="card-body" id="lowStockList">
                    <div class="empty-state" style="padding:24px"><p style="color:var(--text-muted)">Memuat...</p></div>
                </div>
            </div>
        </div>

        <div class="card fade-in">
            <div class="card-header">
                <h3><i class="fas fa-clock-rotate-left" style="margin-right:8px;color:var(--accent-info)"></i>Aktivitas Terbaru</h3>
            </div>
            <div class="card-body">
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Tipe</th>
                                <th>Aset</th>
                                <th>Jumlah</th>
                                <th>User</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody id="recentTxBody">
                            <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Memuat...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }

    async function init() {
        await Promise.all([loadStats(), loadChart(), loadLowStock(), loadRecentTx()]);
    }

    async function loadStats() {
        try {
            const stats = await Store.getDashboardStats();
            document.getElementById('statTotalQty').textContent = stats.totalQty;
            document.getElementById('statTotalLabel').textContent = `Total Unit Aset (${stats.total} jenis)`;
            document.getElementById('statIn').textContent = stats.inThisMonth;
            document.getElementById('statOut').textContent = stats.outThisMonth;
            document.getElementById('statLow').textContent = stats.lowStock;
        } catch (e) { console.error('Stats error:', e); }
    }

    async function loadChart() {
        const canvas = document.getElementById('movementChart');
        if (!canvas) return;
        if (chartInstance) chartInstance.destroy();

        try {
            const stats = await Store.getMonthlyStats(6);
            chartInstance = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: stats.map(s => s.label),
                    datasets: [
                        {
                            label: 'Barang Masuk',
                            data: stats.map(s => s.checkIn),
                            backgroundColor: 'rgba(16, 185, 129, 0.7)',
                            borderColor: 'rgba(16, 185, 129, 1)',
                            borderWidth: 1, borderRadius: 6, barPercentage: 0.6
                        },
                        {
                            label: 'Barang Keluar',
                            data: stats.map(s => s.checkOut),
                            backgroundColor: 'rgba(245, 158, 11, 0.7)',
                            borderColor: 'rgba(245, 158, 11, 1)',
                            borderWidth: 1, borderRadius: 6, barPercentage: 0.6
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, usePointStyle: true, pointStyle: 'rectRounded', padding: 16 }
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } },
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 }, stepSize: 5 } }
                    }
                }
            });
        } catch (e) { console.error('Chart error:', e); }
    }

    async function loadLowStock() {
        const el = document.getElementById('lowStockList');
        if (!el) return;
        try {
            const lowStock = await Store.getLowStockAssets();
            if (lowStock.length === 0) {
                el.innerHTML = `<div class="empty-state" style="padding:24px"><i class="fas fa-check-circle" style="color:var(--accent-success)"></i><p>Semua stok aman!</p></div>`;
            } else {
                el.innerHTML = lowStock.map(a => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
                        <div>
                            <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary)">${a.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted)">${a.location}</div>
                        </div>
                        <span class="badge ${a.quantity <= 2 ? 'badge-danger' : 'badge-warning'}">${a.quantity} unit</span>
                    </div>
                `).join('');
            }
        } catch (e) { console.error('Low stock error:', e); }
    }

    async function loadRecentTx() {
        const tbody = document.getElementById('recentTxBody');
        if (!tbody) return;
        try {
            const txs = await Store.getTransactions();
            const recent = txs.slice(0, 8);
            if (recent.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Belum ada aktivitas</td></tr>`;
            } else {
                tbody.innerHTML = recent.map(t => `
                    <tr>
                        <td style="white-space:nowrap">${formatDateTime(t.createdAt)}</td>
                        <td><span class="badge ${t.type === 'check-in' ? 'badge-success' : 'badge-warning'}">${t.type === 'check-in' ? '↓ Masuk' : '↑ Keluar'}</span></td>
                        <td style="font-weight:500;color:var(--text-primary)">${t.assetName}</td>
                        <td>${t.quantity}</td>
                        <td>${t.user}</td>
                        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.note || '-'}</td>
                    </tr>
                `).join('');
            }
        } catch (e) { console.error('Recent tx error:', e); }
    }

    function destroy() {
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    }

    return { render, init, destroy };
})();

// Global helpers
function formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
