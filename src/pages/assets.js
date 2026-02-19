/* ============================
   Assets Page (API-based)
   CRUD + Barcode Generation + Export
   ============================ */

const AssetsPage = (() => {
    let currentSearch = '';
    let currentCategory = '';
    let currentLocation = '';
    let cachedCategories = [];
    let cachedLocations = [];
    let lastLoadedAssets = [];

    function render() {
        const isAdm = Auth.isAdmin();

        return `
        <div class="page-header">
            <h1 class="page-title">Manajemen Aset</h1>
            <p class="page-subtitle">Kelola data semua perangkat dan barang inventaris</p>
        </div>

        <div class="toolbar fade-in">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="assetSearch" placeholder="Cari nama, SKU, atau kategori..." value="${currentSearch}">
            </div>
            <select class="filter-select" id="filterCategory">
                <option value="">Semua Kategori</option>
            </select>
            <select class="filter-select" id="filterLocation">
                <option value="">Semua Lokasi</option>
            </select>
            ${isAdm ? `<button class="btn btn-primary" id="btnAddAsset"><i class="fas fa-plus"></i> Tambah Aset</button>` : ''}
        </div>

        <!-- Export Toolbar -->
        <div class="toolbar fade-in" style="margin-top:-8px;gap:8px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:8px;margin-right:auto">
                <label style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap">Filter tanggal:</label>
                <input type="date" class="form-input" id="assetDateFrom" style="width:auto;padding:6px 10px;font-size:0.8rem">
                <span style="color:var(--text-muted);font-size:0.8rem">s/d</span>
                <input type="date" class="form-input" id="assetDateTo" style="width:auto;padding:6px 10px;font-size:0.8rem">
                <button class="btn btn-ghost btn-sm" id="btnAssetDateFilter"><i class="fas fa-filter"></i> Filter</button>
                <button class="btn btn-ghost btn-sm" id="btnAssetDateReset" style="color:var(--text-muted)"><i class="fas fa-times"></i></button>
            </div>
            <button class="btn btn-ghost btn-sm" id="btnExportAssetPDF" style="color:var(--accent-danger)">
                <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="btn btn-ghost btn-sm" id="btnExportAssetCSV" style="color:var(--accent-success)">
                <i class="fas fa-file-csv"></i> Export Excel
            </button>
        </div>

        <div class="card fade-in">
            <div class="card-body" style="padding:0">
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Nama Barang</th>
                                <th>SKU</th>
                                <th>Kategori</th>
                                <th>Stok</th>
                                <th>Kondisi</th>
                                <th>Lokasi</th>
                                <th>Update</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="assetsTableBody">
                            <tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px">Memuat...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Asset Modal -->
        <div class="modal-overlay" id="assetModal">
            <div class="modal">
                <div class="modal-header">
                    <h3 id="assetModalTitle">Tambah Aset Baru</h3>
                    <button class="modal-close" id="assetModalClose"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="assetForm">
                        <input type="hidden" id="assetId">
                        <div class="form-group">
                            <label class="form-label">Nama Barang *</label>
                            <input type="text" class="form-input" id="assetName" placeholder="Contoh: Router Mikrotik RB750Gr3" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Kategori *</label>
                                <input type="text" class="form-input" id="assetCategory" placeholder="Router, Kabel, OLT, dll." list="categoryList" required>
                                <datalist id="categoryList"></datalist>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Lokasi *</label>
                                <input type="text" class="form-input" id="assetLocation" placeholder="Gudang Pusat, POP, dll." list="locationList" required>
                                <datalist id="locationList"></datalist>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">SKU / Serial Number</label>
                                <div style="display:flex;gap:8px">
                                    <input type="text" class="form-input" id="assetSku" placeholder="Masukkan SN pabrik" style="flex:1">
                                    <button type="button" class="btn btn-ghost btn-sm" id="btnGenerateSku" title="Generate otomatis">
                                        <i class="fas fa-barcode"></i> Generate
                                    </button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Jumlah (Stok) *</label>
                                <input type="number" class="form-input" id="assetQuantity" min="0" value="1" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Kondisi</label>
                            <select class="form-select" id="assetCondition">
                                <option value="Baru">Baru</option>
                                <option value="Bekas (Baik)">Bekas (Baik)</option>
                                <option value="Bekas (Rusak Ringan)">Bekas (Rusak Ringan)</option>
                                <option value="Rusak">Rusak</option>
                            </select>
                        </div>
                        <div id="barcodePreview" style="text-align:center;margin:16px 0;display:none">
                            <div class="barcode-label">
                                <svg id="modalBarcodeSvg"></svg>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-ghost" id="assetFormCancel">Batal</button>
                            <button type="submit" class="btn btn-primary" id="assetFormSubmit">
                                <i class="fas fa-check"></i> Simpan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Barcode View Modal -->
        <div class="modal-overlay" id="barcodeModal">
            <div class="modal" style="max-width:400px">
                <div class="modal-header">
                    <h3>Label Barcode</h3>
                    <button class="modal-close" id="barcodeModalClose"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="text-align:center">
                    <div class="barcode-label" style="margin-bottom:16px">
                        <svg id="viewBarcodeSvg"></svg>
                        <div class="label-name" id="viewBarcodeLabel"></div>
                    </div>
                    <button class="btn btn-primary" id="btnPrintLabel"><i class="fas fa-print"></i> Cetak Label</button>
                </div>
            </div>
        </div>`;
    }

    async function renderTable(dateFrom, dateTo) {
        const tbody = document.getElementById('assetsTableBody');
        if (!tbody) return;
        const isAdm = Auth.isAdmin();

        try {
            let assets = await Store.getAssets(currentSearch, currentCategory, currentLocation);

            // Client-side date filter
            if (dateFrom || dateTo) {
                assets = assets.filter(a => {
                    const d = (a.updated_at || a.updatedAt || '').slice(0, 10);
                    if (dateFrom && d < dateFrom) return false;
                    if (dateTo && d > dateTo) return false;
                    return true;
                });
            }

            lastLoadedAssets = assets;

            if (assets.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-box-open"></i><h4>Tidak ada data</h4><p>Belum ada aset yang cocok dengan filter</p></div></td></tr>`;
                return;
            }

            tbody.innerHTML = assets.map(a => `
                <tr>
                    <td style="font-weight:600;color:var(--text-primary)">${a.name}</td>
                    <td><code style="font-size:0.78rem;color:var(--accent-info);background:rgba(6,182,212,0.1);padding:2px 8px;border-radius:4px">${a.sku}</code></td>
                    <td><span class="badge badge-primary">${a.category}</span></td>
                    <td>
                        <span class="badge ${a.quantity <= 2 ? 'badge-danger' : a.quantity <= 5 ? 'badge-warning' : 'badge-success'}">${a.quantity}</span>
                    </td>
                    <td>${a.condition}</td>
                    <td>${a.location}</td>
                    <td style="white-space:nowrap;font-size:0.78rem">${formatDate(a.updated_at || a.updatedAt)}</td>
                    <td>
                        <div style="display:flex;gap:4px">
                            <button class="btn btn-ghost btn-icon btn-sm" onclick="AssetsPage.showBarcode('${a.id}')" title="Lihat Barcode">
                                <i class="fas fa-barcode"></i>
                            </button>
                            ${isAdm ? `
                                <button class="btn btn-ghost btn-icon btn-sm" onclick="AssetsPage.editAsset('${a.id}')" title="Edit">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="btn btn-ghost btn-icon btn-sm" onclick="AssetsPage.deleteAsset('${a.id}')" title="Hapus" style="color:var(--accent-danger)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--accent-danger);padding:24px">Gagal memuat data: ${e.message}</td></tr>`;
        }
    }

    async function loadFilters() {
        try {
            cachedCategories = await Store.getCategories();
            cachedLocations = await Store.getLocations();

            const filterCat = document.getElementById('filterCategory');
            const filterLoc = document.getElementById('filterLocation');
            const catList = document.getElementById('categoryList');
            const locList = document.getElementById('locationList');

            if (filterCat) {
                cachedCategories.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c; opt.textContent = c;
                    if (c === currentCategory) opt.selected = true;
                    filterCat.appendChild(opt);
                });
            }
            if (filterLoc) {
                cachedLocations.forEach(l => {
                    const opt = document.createElement('option');
                    opt.value = l; opt.textContent = l;
                    if (l === currentLocation) opt.selected = true;
                    filterLoc.appendChild(opt);
                });
            }
            if (catList) catList.innerHTML = cachedCategories.map(c => `<option value="${c}">`).join('');
            if (locList) locList.innerHTML = cachedLocations.map(l => `<option value="${l}">`).join('');
        } catch (e) { console.error('Filter load error:', e); }
    }

    function getDateRange() {
        const from = document.getElementById('assetDateFrom')?.value || '';
        const to = document.getElementById('assetDateTo')?.value || '';
        let label = '';
        if (from && to) label = `Periode: ${from} s/d ${to}`;
        else if (from) label = `Dari: ${from}`;
        else if (to) label = `Sampai: ${to}`;
        return { from, to, label };
    }

    async function init() {
        await Promise.all([renderTable(), loadFilters()]);

        let searchTimeout;
        const search = document.getElementById('assetSearch');
        if (search) {
            search.addEventListener('input', (e) => {
                currentSearch = e.target.value;
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => renderTable(), 300);
            });
        }

        const filterCat = document.getElementById('filterCategory');
        const filterLoc = document.getElementById('filterLocation');
        if (filterCat) filterCat.addEventListener('change', (e) => { currentCategory = e.target.value; renderTable(); });
        if (filterLoc) filterLoc.addEventListener('change', (e) => { currentLocation = e.target.value; renderTable(); });

        // Date filter
        document.getElementById('btnAssetDateFilter')?.addEventListener('click', () => {
            const { from, to } = getDateRange();
            renderTable(from, to);
        });
        document.getElementById('btnAssetDateReset')?.addEventListener('click', () => {
            document.getElementById('assetDateFrom').value = '';
            document.getElementById('assetDateTo').value = '';
            renderTable();
        });

        // Export buttons
        document.getElementById('btnExportAssetPDF')?.addEventListener('click', () => {
            if (lastLoadedAssets.length === 0) { App.showToast('Tidak ada data untuk diexport', 'error'); return; }
            const { label } = getDateRange();
            ExportUtil.exportAssetsPDF(lastLoadedAssets, label || `Total: ${lastLoadedAssets.length} aset`);
            App.showToast('PDF berhasil didownload', 'success');
        });

        document.getElementById('btnExportAssetCSV')?.addEventListener('click', () => {
            if (lastLoadedAssets.length === 0) { App.showToast('Tidak ada data untuk diexport', 'error'); return; }
            ExportUtil.exportAssetsCSV(lastLoadedAssets);
            App.showToast('File CSV berhasil didownload', 'success');
        });

        document.getElementById('btnAddAsset')?.addEventListener('click', () => openModal());
        document.getElementById('assetModalClose')?.addEventListener('click', closeModal);
        document.getElementById('assetFormCancel')?.addEventListener('click', closeModal);
        document.getElementById('barcodeModalClose')?.addEventListener('click', closeBarcodeModal);
        document.getElementById('assetModal')?.addEventListener('click', (e) => { if (e.target.id === 'assetModal') closeModal(); });
        document.getElementById('barcodeModal')?.addEventListener('click', (e) => { if (e.target.id === 'barcodeModal') closeBarcodeModal(); });

        document.getElementById('btnGenerateSku')?.addEventListener('click', async () => {
            const cat = document.getElementById('assetCategory')?.value || 'ITM';
            const sku = await Store.generateSku(cat);
            document.getElementById('assetSku').value = sku;
            showBarcodePreview(sku);
        });

        document.getElementById('assetForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveAsset();
        });
    }

    function openModal(asset) {
        const modal = document.getElementById('assetModal');
        const title = document.getElementById('assetModalTitle');
        const preview = document.getElementById('barcodePreview');

        document.getElementById('assetId').value = asset ? asset.id : '';
        document.getElementById('assetName').value = asset ? asset.name : '';
        document.getElementById('assetCategory').value = asset ? asset.category : '';
        document.getElementById('assetSku').value = asset ? asset.sku : '';
        document.getElementById('assetQuantity').value = asset ? asset.quantity : 1;
        document.getElementById('assetCondition').value = asset ? asset.condition : 'Baru';
        document.getElementById('assetLocation').value = asset ? asset.location : '';

        title.textContent = asset ? 'Edit Aset' : 'Tambah Aset Baru';
        preview.style.display = asset && asset.sku ? 'block' : 'none';

        if (asset && asset.sku) setTimeout(() => showBarcodePreview(asset.sku), 100);

        modal.classList.add('active');
    }

    function closeModal() { document.getElementById('assetModal')?.classList.remove('active'); }
    function closeBarcodeModal() { document.getElementById('barcodeModal')?.classList.remove('active'); }

    function showBarcodePreview(sku) {
        document.getElementById('barcodePreview').style.display = 'block';
        setTimeout(() => BarcodeModule.generateBarcodeSVG('modalBarcodeSvg', sku), 50);
    }

    async function saveAsset() {
        const id = document.getElementById('assetId').value;
        const cat = document.getElementById('assetCategory').value.trim();
        const data = {
            name: document.getElementById('assetName').value.trim(),
            category: cat,
            sku: document.getElementById('assetSku').value.trim(),
            quantity: parseInt(document.getElementById('assetQuantity').value) || 0,
            condition: document.getElementById('assetCondition').value,
            location: document.getElementById('assetLocation').value.trim()
        };

        if (!data.name || !data.category || !data.location) {
            App.showToast('Mohon lengkapi semua field wajib', 'error');
            return;
        }

        // Generate SKU if empty
        if (!data.sku) data.sku = await Store.generateSku(cat);

        try {
            if (id) {
                await Store.updateAsset(id, data);
                App.showToast('Aset berhasil diperbarui', 'success');
            } else {
                await Store.addAsset(data);
                App.showToast('Aset baru berhasil ditambahkan', 'success');
            }
            closeModal();
            renderTable();
        } catch (e) {
            App.showToast('Gagal menyimpan: ' + e.message, 'error');
        }
    }

    async function editAsset(id) {
        const asset = await Store.getAssetById(id);
        if (asset) openModal(asset);
    }

    async function deleteAsset(id) {
        const asset = await Store.getAssetById(id);
        if (!asset) return;
        const confirmed = await Dialog.confirm({
            title: 'Hapus Aset?',
            message: `Aset <strong>"${asset.name}"</strong> akan dihapus secara permanen.<br>Aksi ini tidak bisa dibatalkan.`,
            type: 'delete',
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal'
        });
        if (confirmed) {
            try {
                await Store.deleteAsset(id);
                App.showToast('Aset berhasil dihapus', 'info');
                renderTable();
            } catch (e) {
                App.showToast('Gagal menghapus: ' + e.message, 'error');
            }
        }
    }

    async function showBarcode(id) {
        const asset = await Store.getAssetById(id);
        if (!asset) return;

        const modal = document.getElementById('barcodeModal');
        document.getElementById('viewBarcodeLabel').textContent = asset.name;
        modal.classList.add('active');

        setTimeout(() => BarcodeModule.generateBarcodeSVG('viewBarcodeSvg', asset.sku, asset.sku), 100);

        document.getElementById('btnPrintLabel').onclick = () => BarcodeModule.printLabel(asset);
    }

    return { render, init, editAsset, deleteAsset, showBarcode };
})();
