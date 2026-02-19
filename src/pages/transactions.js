/* ============================
   Transactions Page (API-based)
   Check-in & Check-out
   ============================ */

const TransactionsPage = (() => {
    let activeType = 'check-out';
    let preselectedAssetId = null;
    let assetsList = [];

    function render() {
        const user = Auth.getCurrentUser();

        return `
        <div class="page-header">
            <h1 class="page-title">Transaksi Aset</h1>
            <p class="page-subtitle">Catat pengambilan (check-out) dan pengembalian (check-in) barang</p>
        </div>

        <div class="fade-in">
            <div class="transaction-type-toggle">
                <button class="toggle-btn ${activeType === 'check-out' ? 'active' : ''}" id="toggleCheckout">
                    <i class="fas fa-arrow-up" style="margin-right:6px"></i>Check-out (Ambil)
                </button>
                <button class="toggle-btn ${activeType === 'check-in' ? 'active' : ''}" id="toggleCheckin">
                    <i class="fas fa-arrow-down" style="margin-right:6px"></i>Check-in (Kembali)
                </button>
            </div>
        </div>

        <div class="card fade-in" style="max-width:640px">
            <div class="card-header">
                <h3 id="txFormTitle">
                    <i class="fas ${activeType === 'check-out' ? 'fa-arrow-up' : 'fa-arrow-down'}" style="margin-right:8px;color:${activeType === 'check-out' ? 'var(--accent-warning)' : 'var(--accent-success)'}"></i>
                    ${activeType === 'check-out' ? 'Form Pengambilan Barang' : 'Form Pengembalian Barang'}
                </h3>
            </div>
            <div class="card-body">
                <form id="txForm">
                    <div class="form-group">
                        <label class="form-label">Pilih Aset *</label>
                        <select class="form-select" id="txAsset" required>
                            <option value="">-- Memuat data... --</option>
                        </select>
                    </div>

                    <div id="txAssetInfo" style="display:none;margin-bottom:16px">
                        <div class="scan-result-card" style="padding:14px">
                            <div style="display:flex;gap:16px;align-items:center">
                                <div class="barcode-label" style="padding:8px;background:white;border-radius:8px">
                                    <svg id="txBarcodeSvg" style="max-width:150px"></svg>
                                </div>
                                <div>
                                    <div class="asset-name" id="txAssetName" style="font-size:1rem"></div>
                                    <div class="asset-sku" id="txAssetSku" style="margin-bottom:8px"></div>
                                    <span class="badge badge-info" id="txAssetStock"></span>
                                    <span class="badge badge-primary" id="txAssetLoc" style="margin-left:4px"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Jumlah *</label>
                            <input type="number" class="form-input" id="txQuantity" min="1" value="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Petugas</label>
                            <input type="text" class="form-input" id="txUser" value="${user ? user.name : ''}" readonly>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Keterangan / Tujuan</label>
                        <textarea class="form-textarea" id="txNote" placeholder="${activeType === 'check-out' ? 'Contoh: Instalasi klien baru di Jl. Merdeka' : 'Contoh: Pengembalian setelah maintenance'}"></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-ghost" onclick="window.location.hash='#/dashboard'">Batal</button>
                        <button type="submit" class="btn ${activeType === 'check-out' ? 'btn-warning' : 'btn-success'}" id="txSubmitBtn">
                            <i class="fas ${activeType === 'check-out' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                            ${activeType === 'check-out' ? 'Proses Check-out' : 'Proses Check-in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>`;
    }

    async function init() {
        // Parse URL params
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
        if (params.get('type')) activeType = params.get('type');
        if (params.get('asset')) preselectedAssetId = params.get('asset');

        // Render the page first
        const content = document.getElementById('pageContent');
        if (content) content.innerHTML = render();

        // Load assets for select
        await loadAssets();
        bindEvents();
    }

    async function loadAssets() {
        try {
            assetsList = await Store.getAssets();
            const select = document.getElementById('txAsset');
            if (select) {
                select.innerHTML = '<option value="">-- Pilih Barang --</option>' +
                    assetsList.map(a => `<option value="${a.id}" ${a.id === preselectedAssetId ? 'selected' : ''}>${a.name} (Stok: ${a.quantity}) — ${a.sku}</option>`).join('');
            }
            if (preselectedAssetId) showAssetInfo(preselectedAssetId);
        } catch (e) {
            console.error('Load assets error:', e);
        }
    }

    function bindEvents() {
        document.getElementById('toggleCheckout')?.addEventListener('click', () => {
            activeType = 'check-out';
            preselectedAssetId = null;
            init();
        });

        document.getElementById('toggleCheckin')?.addEventListener('click', () => {
            activeType = 'check-in';
            preselectedAssetId = null;
            init();
        });

        const assetSelect = document.getElementById('txAsset');
        if (assetSelect) {
            assetSelect.addEventListener('change', () => showAssetInfo(assetSelect.value));
        }

        document.getElementById('txForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            processTransaction();
        });
    }

    function showAssetInfo(assetId) {
        const info = document.getElementById('txAssetInfo');
        if (!assetId) { info.style.display = 'none'; return; }

        const asset = assetsList.find(a => a.id === assetId);
        if (!asset) { info.style.display = 'none'; return; }

        document.getElementById('txAssetName').textContent = asset.name;
        document.getElementById('txAssetSku').textContent = asset.sku;
        document.getElementById('txAssetStock').textContent = 'Stok: ' + asset.quantity;
        document.getElementById('txAssetLoc').textContent = asset.location;

        info.style.display = 'block';
        setTimeout(() => { try { BarcodeModule.generateBarcodeSVG('txBarcodeSvg', asset.sku); } catch (e) { } }, 50);
    }

    async function processTransaction() {
        const assetId = document.getElementById('txAsset').value;
        const quantity = parseInt(document.getElementById('txQuantity').value);
        const note = document.getElementById('txNote').value.trim();

        if (!assetId) { App.showToast('Pilih aset terlebih dahulu', 'error'); return; }
        if (!quantity || quantity < 1) { App.showToast('Jumlah harus minimal 1', 'error'); return; }

        const btn = document.getElementById('txSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

        try {
            await Store.addTransaction({
                assetId,
                type: activeType,
                quantity,
                note
            });

            const asset = assetsList.find(a => a.id === assetId);
            const msg = activeType === 'check-out'
                ? `✓ ${quantity}x ${asset?.name || 'barang'} berhasil di-checkout`
                : `✓ ${quantity}x ${asset?.name || 'barang'} berhasil dikembalikan`;

            App.showToast(msg, 'success');

            preselectedAssetId = null;
            await init();
        } catch (e) {
            App.showToast('Gagal: ' + e.message, 'error');
            btn.disabled = false;
            btn.innerHTML = activeType === 'check-out'
                ? '<i class="fas fa-arrow-up"></i> Proses Check-out'
                : '<i class="fas fa-arrow-down"></i> Proses Check-in';
        }
    }

    return { render, init };
})();
