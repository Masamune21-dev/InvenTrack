/* ============================
   Export Utility Module
   PDF (jsPDF) & CSV/Excel Export
   ============================ */

const ExportUtil = (() => {

    // Format date for display
    function fmtDate(d) {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ============ CSV Export ============

    function escapeCSV(val) {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    function downloadCSV(filename, headers, rows) {
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ].join('\n');

        const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, filename);
    }

    // ============ PDF Export ============

    function generatePDF(title, subtitle, headers, rows, filename) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: headers.length > 5 ? 'landscape' : 'portrait' });

        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('InvenTrack', 14, 15);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 23);
        if (subtitle) {
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(subtitle, 14, 29);
            doc.setTextColor(0);
        }

        // Table
        doc.autoTable({
            head: [headers],
            body: rows,
            startY: subtitle ? 34 : 28,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: {
                fillColor: [99, 102, 241],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 14, right: 14 }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `Dicetak: ${new Date().toLocaleString('id-ID')} | Halaman ${i}/${pageCount}`,
                14, doc.internal.pageSize.getHeight() - 10
            );
        }

        doc.save(filename);
    }

    // ============ Download Helper ============

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ============ Assets Export ============

    function exportAssetsCSV(assets) {
        const headers = ['Nama', 'SKU', 'Kategori', 'Stok', 'Kondisi', 'Lokasi', 'Terakhir Update'];
        const rows = assets.map(a => [
            a.name, a.sku, a.category, a.quantity,
            a.condition, a.location, fmtDate(a.updated_at || a.updatedAt)
        ]);
        const dateStr = new Date().toISOString().slice(0, 10);
        downloadCSV(`InvenTrack_Aset_${dateStr}.csv`, headers, rows);
    }

    function exportAssetsPDF(assets, dateRange) {
        const headers = ['Nama Barang', 'SKU', 'Kategori', 'Stok', 'Kondisi', 'Lokasi', 'Update'];
        const rows = assets.map(a => [
            a.name, a.sku, a.category, String(a.quantity),
            a.condition, a.location, fmtDate(a.updated_at || a.updatedAt)
        ]);
        const subtitle = dateRange || `Total: ${assets.length} aset`;
        const dateStr = new Date().toISOString().slice(0, 10);
        generatePDF('Laporan Daftar Aset', subtitle, headers, rows, `InvenTrack_Aset_${dateStr}.pdf`);
    }

    // ============ History Export ============

    function exportHistoryCSV(transactions) {
        const headers = ['Waktu', 'Tipe', 'Aset', 'Jumlah', 'Petugas', 'Keterangan'];
        const rows = transactions.map(t => [
            fmtDate(t.createdAt || t.created_at),
            t.type === 'check-in' ? 'Masuk' : 'Keluar',
            t.assetName || t.asset_name,
            t.quantity,
            t.user || t.user_name,
            t.note || ''
        ]);
        const dateStr = new Date().toISOString().slice(0, 10);
        downloadCSV(`InvenTrack_Riwayat_${dateStr}.csv`, headers, rows);
    }

    function exportHistoryPDF(transactions, dateRange) {
        const headers = ['Waktu', 'Tipe', 'Aset', 'Jumlah', 'Petugas', 'Keterangan'];
        const rows = transactions.map(t => [
            fmtDate(t.createdAt || t.created_at),
            t.type === 'check-in' ? 'Masuk' : 'Keluar',
            t.assetName || t.asset_name,
            String(t.quantity),
            t.user || t.user_name,
            t.note || '-'
        ]);
        const subtitle = dateRange || `Total: ${transactions.length} transaksi`;
        const dateStr = new Date().toISOString().slice(0, 10);
        generatePDF('Laporan Riwayat Transaksi', subtitle, headers, rows, `InvenTrack_Riwayat_${dateStr}.pdf`);
    }

    return {
        exportAssetsCSV, exportAssetsPDF,
        exportHistoryCSV, exportHistoryPDF,
        downloadBlob
    };
})();
