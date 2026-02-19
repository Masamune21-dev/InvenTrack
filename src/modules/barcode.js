/* ============================
   Barcode Module
   Generate & Print Barcodes
   ============================ */

const BarcodeModule = (() => {

    function generateBarcodeSVG(containerId, value, displayValue) {
        try {
            JsBarcode(`#${containerId}`, value, {
                format: 'CODE128',
                width: 2,
                height: 60,
                displayValue: true,
                text: displayValue || value,
                fontSize: 14,
                margin: 8,
                background: '#ffffff',
                lineColor: '#000000'
            });
        } catch (e) {
            console.error('Barcode generation failed:', e);
        }
    }

    function generateBarcodeCanvas(canvas, value) {
        try {
            JsBarcode(canvas, value, {
                format: 'CODE128',
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 14,
                margin: 8,
                background: '#ffffff',
                lineColor: '#000000'
            });
        } catch (e) {
            console.error('Barcode generation failed:', e);
        }
    }

    function createLabelHTML(asset) {
        return `
            <div class="barcode-label" id="barcode-label-${asset.id}">
                <svg id="barcode-svg-${asset.id}"></svg>
                <div class="label-name">${asset.name}</div>
            </div>
        `;
    }

    function printLabel(asset) {
        const printWindow = window.open('', '_blank', 'width=400,height=300');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Label - ${asset.name}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
                <style>
                    body { 
                        font-family: 'Inter', Arial, sans-serif; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        min-height: 100vh;
                        margin: 0;
                        background: white;
                    }
                    .label {
                        text-align: center;
                        padding: 20px;
                        border: 2px dashed #ccc;
                        border-radius: 8px;
                    }
                    .label-name {
                        margin-top: 8px;
                        font-weight: 600;
                        font-size: 13px;
                        color: #333;
                    }
                    .label-loc {
                        margin-top: 2px;
                        font-size: 11px;
                        color: #777;
                    }
                    @media print {
                        body { min-height: auto; }
                        .label { border: none; padding: 10px; }
                    }
                </style>
            </head>
            <body>
                <div class="label">
                    <svg id="barcode"></svg>
                    <div class="label-name">${asset.name}</div>
                    <div class="label-loc">${asset.location || ''}</div>
                </div>
                <script>
                    JsBarcode("#barcode", "${asset.sku}", {
                        format: "CODE128",
                        width: 2,
                        height: 60,
                        displayValue: true,
                        fontSize: 14,
                        margin: 8
                    });
                    setTimeout(() => window.print(), 300);
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    return { generateBarcodeSVG, generateBarcodeCanvas, createLabelHTML, printLabel };
})();
