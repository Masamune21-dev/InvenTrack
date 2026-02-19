/* ============================
   Scanner Page (API-based)
   Webcam + USB Scanner
   ============================ */

const ScannerPage = (() => {
    let html5QrcodeScanner = null;
    let lastScannedAsset = null;
    let scanCooldown = false;

    function render() {
        return `
        <div class="page-header">
            <h1 class="page-title">Scan Aset</h1>
            <p class="page-subtitle">Scan barcode/QR code untuk mencari dan mengupdate data aset dengan cepat</p>
        </div>

        <div class="scanner-container fade-in">
            <div>
                <div class="card" style="margin-bottom:16px">
                    <div class="card-header">
                        <h3><i class="fas fa-camera" style="margin-right:8px;color:var(--accent-primary)"></i>Kamera Scanner</h3>
                        <button class="btn btn-primary btn-sm" id="btnStartCamera">
                            <i class="fas fa-video"></i> Nyalakan Kamera
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="scanner-preview" id="scannerPreview">
                            <div id="reader" style="width:100%"></div>
                            <div class="scanner-placeholder" id="scannerPlaceholder">
                                <i class="fas fa-qrcode"></i>
                                <p>Klik "Nyalakan Kamera" untuk mulai scan</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="usb-scanner-input">
                    <label><i class="fas fa-keyboard" style="margin-right:6px"></i>Scanner USB / Manual Input</label>
                    <input type="text" id="usbScanInput" placeholder="Arahkan barcode scanner ke sini atau ketik SKU..." autocomplete="off">
                    <p style="font-size:0.72rem;color:var(--text-muted);margin-top:6px">
                        <i class="fas fa-info-circle"></i> Scanner USB otomatis mengirim input ke sini. Tekan Enter untuk mencari.
                    </p>
                </div>
            </div>

            <div>
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-box" style="margin-right:8px;color:var(--accent-success)"></i>Hasil Scan</h3>
                    </div>
                    <div class="card-body">
                        <div id="scanResult">
                            <div class="empty-state">
                                <i class="fas fa-barcode"></i>
                                <h4>Belum ada hasil</h4>
                                <p>Scan barcode untuk melihat detail aset</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Edit Modal -->
        <div class="modal-overlay" id="quickEditModal">
            <div class="modal" style="max-width:420px">
                <div class="modal-header">
                    <h3>Update Stok Cepat</h3>
                    <button class="modal-close" id="quickEditClose"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px" id="quickEditInfo"></p>
                    <div class="form-group">
                        <label class="form-label">Stok Baru</label>
                        <input type="number" class="form-input" id="quickEditQty" min="0">
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-ghost" id="quickEditCancel">Batal</button>
                        <button class="btn btn-primary" id="quickEditSave"><i class="fas fa-check"></i> Simpan</button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function init() {
        const usbInput = document.getElementById('usbScanInput');
        if (usbInput) {
            usbInput.focus();
            usbInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const val = usbInput.value.trim();
                    if (val) { handleScan(val); usbInput.value = ''; }
                }
            });
        }

        document.getElementById('btnStartCamera')?.addEventListener('click', toggleCamera);
        document.getElementById('quickEditClose')?.addEventListener('click', closeQuickEdit);
        document.getElementById('quickEditCancel')?.addEventListener('click', closeQuickEdit);
        document.getElementById('quickEditModal')?.addEventListener('click', (e) => { if (e.target.id === 'quickEditModal') closeQuickEdit(); });
        document.getElementById('quickEditSave')?.addEventListener('click', saveQuickEdit);
    }

    function toggleCamera() {
        const btn = document.getElementById('btnStartCamera');
        const placeholder = document.getElementById('scannerPlaceholder');

        if (html5QrcodeScanner) {
            stopCamera();
            btn.innerHTML = '<i class="fas fa-video"></i> Nyalakan Kamera';
            placeholder.style.display = 'block';
            return;
        }

        placeholder.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-video-slash"></i> Matikan Kamera';

        try {
            const formatsToSupport = [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.CODE_93,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.ITF,
                Html5QrcodeSupportedFormats.CODABAR,
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.DATA_MATRIX
            ];

            html5QrcodeScanner = new Html5Qrcode("reader", {
                formatsToSupport: formatsToSupport,
                experimentalFeatures: { useBarCodeDetectorIfSupported: true }
            });

            // Calculate responsive qrbox based on container
            const readerEl = document.getElementById('reader');
            const containerWidth = readerEl ? readerEl.offsetWidth : 500;
            const qrboxWidth = Math.min(Math.floor(containerWidth * 0.8), 500);
            const qrboxHeight = Math.floor(qrboxWidth * 0.6);

            html5QrcodeScanner.start(
                { facingMode: "environment" },
                {
                    fps: 15,
                    qrbox: { width: qrboxWidth, height: qrboxHeight },
                    aspectRatio: 1.5,
                    disableFlip: false
                },
                (decodedText) => {
                    if (scanCooldown) return;
                    scanCooldown = true;
                    handleScan(decodedText);
                    setTimeout(() => { scanCooldown = false; }, 3000);
                },
                () => { }
            ).catch(err => {
                console.error('Camera start failed:', err);
                App.showToast('Gagal mengakses kamera. Pastikan izin kamera diberikan.', 'error');
                btn.innerHTML = '<i class="fas fa-video"></i> Nyalakan Kamera';
                placeholder.style.display = 'block';
                html5QrcodeScanner = null;
            });
        } catch (err) {
            console.error('Camera init failed:', err);
            App.showToast('Browser tidak mendukung scanner kamera', 'error');
            placeholder.style.display = 'block';
            html5QrcodeScanner = null;
        }
    }

    function stopCamera() {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop().then(() => { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }).catch(() => { html5QrcodeScanner = null; });
        }
    }

    async function handleScan(code) {
        const resultDiv = document.getElementById('scanResult');
        resultDiv.innerHTML = '<div style="text-align:center;padding:20px"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:var(--accent-primary)"></i><p style="margin-top:8px;color:var(--text-muted)">Mencari...</p></div>';

        const asset = await Store.getAssetBySku(code);

        if (!asset) {
            resultDiv.innerHTML = `
                <div style="text-align:center;padding:20px">
                    <i class="fas fa-circle-xmark" style="font-size:2.5rem;color:var(--accent-danger);margin-bottom:12px;display:block"></i>
                    <h4 style="color:var(--accent-danger);margin-bottom:4px">Tidak Ditemukan</h4>
                    <p style="font-size:0.85rem;color:var(--text-secondary)">Kode "<strong>${code}</strong>" tidak cocok dengan aset manapun</p>
                </div>`;
            App.showToast('Aset tidak ditemukan: ' + code, 'warning');
            return;
        }

        lastScannedAsset = asset;
        App.showToast('Aset ditemukan: ' + asset.name, 'success');

        resultDiv.innerHTML = `
            <div class="scan-result-card">
                <div class="asset-name">${asset.name}</div>
                <div class="asset-sku"><i class="fas fa-barcode" style="margin-right:4px"></i>${asset.sku}</div>
                <div class="detail-row"><span class="label">Kategori</span><span class="value"><span class="badge badge-primary">${asset.category}</span></span></div>
                <div class="detail-row"><span class="label">Stok</span><span class="value"><span class="badge ${asset.quantity <= 5 ? 'badge-warning' : 'badge-success'}">${asset.quantity} unit</span></span></div>
                <div class="detail-row"><span class="label">Kondisi</span><span class="value">${asset.condition}</span></div>
                <div class="detail-row"><span class="label">Lokasi</span><span class="value">${asset.location}</span></div>
                <div class="detail-row"><span class="label">Terakhir Update</span><span class="value">${formatDateTime(asset.updated_at || asset.updatedAt)}</span></div>
                <div class="quick-actions">
                    <button class="btn btn-ghost btn-sm" onclick="ScannerPage.openQuickEdit()"><i class="fas fa-pen"></i> Edit Stok</button>
                    <button class="btn btn-warning btn-sm" onclick="ScannerPage.quickCheckout()"><i class="fas fa-arrow-up"></i> Check-out</button>
                    <button class="btn btn-success btn-sm" onclick="ScannerPage.quickCheckin()"><i class="fas fa-arrow-down"></i> Check-in</button>
                    <button class="btn btn-ghost btn-sm" onclick="AssetsPage.showBarcode('${asset.id}')"><i class="fas fa-print"></i> Cetak</button>
                </div>
            </div>`;
    }

    function openQuickEdit() {
        if (!lastScannedAsset) return;
        document.getElementById('quickEditInfo').textContent = lastScannedAsset.name + ' — stok saat ini: ' + lastScannedAsset.quantity;
        document.getElementById('quickEditQty').value = lastScannedAsset.quantity;
        document.getElementById('quickEditModal').classList.add('active');
    }

    function closeQuickEdit() { document.getElementById('quickEditModal')?.classList.remove('active'); }

    async function saveQuickEdit() {
        if (!lastScannedAsset) return;
        const newQty = parseInt(document.getElementById('quickEditQty').value);
        if (isNaN(newQty) || newQty < 0) { App.showToast('Jumlah tidak valid', 'error'); return; }

        try {
            await Store.updateAsset(lastScannedAsset.id, { quantity: newQty });
            lastScannedAsset.quantity = newQty;
            App.showToast('Stok berhasil diupdate', 'success');
            closeQuickEdit();
            handleScan(lastScannedAsset.sku);
        } catch (e) {
            App.showToast('Gagal update: ' + e.message, 'error');
        }
    }

    function quickCheckout() {
        if (!lastScannedAsset) return;
        window.location.hash = '#/transactions?type=check-out&asset=' + lastScannedAsset.id;
    }

    function quickCheckin() {
        if (!lastScannedAsset) return;
        window.location.hash = '#/transactions?type=check-in&asset=' + lastScannedAsset.id;
    }

    function destroy() { stopCamera(); }

    return { render, init, destroy, openQuickEdit, quickCheckout, quickCheckin };
})();
