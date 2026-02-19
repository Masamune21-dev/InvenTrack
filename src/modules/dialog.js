/* ============================
   Dialog Module
   Custom Confirm & Alert Modals
   ============================ */

const Dialog = (() => {

    let dialogContainer = null;

    function ensureContainer() {
        if (dialogContainer) return dialogContainer;
        dialogContainer = document.createElement('div');
        dialogContainer.id = 'dialogContainer';
        document.body.appendChild(dialogContainer);
        return dialogContainer;
    }

    function getIconHTML(type) {
        const icons = {
            danger: { icon: 'fa-triangle-exclamation', color: 'var(--accent-danger)', bg: 'rgba(239,68,68,0.12)' },
            warning: { icon: 'fa-exclamation-circle', color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.12)' },
            info: { icon: 'fa-circle-info', color: 'var(--accent-info)', bg: 'rgba(6,182,212,0.12)' },
            success: { icon: 'fa-circle-check', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.12)' },
            delete: { icon: 'fa-trash-can', color: 'var(--accent-danger)', bg: 'rgba(239,68,68,0.12)' }
        };
        const cfg = icons[type] || icons.info;
        return `<div class="dialog-icon" style="background:${cfg.bg};color:${cfg.color}"><i class="fas ${cfg.icon}"></i></div>`;
    }

    function getButtonClass(type) {
        if (type === 'danger' || type === 'delete') return 'btn-danger';
        if (type === 'warning') return 'btn-warning';
        if (type === 'success') return 'btn-success';
        return 'btn-primary';
    }

    /**
     * Show a confirm dialog (replaces native confirm())
     * @param {Object} options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Dialog message (supports HTML)
     * @param {string} [options.type='danger'] - danger | warning | info | success | delete
     * @param {string} [options.confirmText='Ya, Lanjutkan'] - Confirm button text
     * @param {string} [options.cancelText='Batal'] - Cancel button text
     * @returns {Promise<boolean>}
     */
    function confirm({ title, message, type = 'danger', confirmText = 'Ya, Lanjutkan', cancelText = 'Batal' }) {
        return new Promise((resolve) => {
            const container = ensureContainer();
            const id = 'dlg_' + Date.now();

            container.innerHTML = `
            <div class="dialog-overlay active" id="${id}">
                <div class="dialog-box dialog-enter">
                    ${getIconHTML(type)}
                    <h3 class="dialog-title">${title}</h3>
                    <p class="dialog-message">${message}</p>
                    <div class="dialog-actions">
                        <button class="btn btn-ghost dialog-btn-cancel">${cancelText}</button>
                        <button class="btn ${getButtonClass(type)} dialog-btn-confirm">${confirmText}</button>
                    </div>
                </div>
            </div>`;

            const overlay = document.getElementById(id);
            const box = overlay.querySelector('.dialog-box');
            const btnConfirm = overlay.querySelector('.dialog-btn-confirm');
            const btnCancel = overlay.querySelector('.dialog-btn-cancel');

            function close(result) {
                box.classList.remove('dialog-enter');
                box.classList.add('dialog-exit');
                overlay.style.opacity = '0';
                setTimeout(() => {
                    container.innerHTML = '';
                    resolve(result);
                }, 200);
            }

            btnConfirm.addEventListener('click', () => close(true));
            btnCancel.addEventListener('click', () => close(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });

            // Focus confirm button
            setTimeout(() => btnCancel.focus(), 50);
        });
    }

    /**
     * Show an alert dialog (replaces native alert())
     * @param {Object} options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Dialog message
     * @param {string} [options.type='info'] - danger | warning | info | success
     * @param {string} [options.buttonText='OK'] - Button text
     * @returns {Promise<void>}
     */
    function alert({ title, message, type = 'info', buttonText = 'OK' }) {
        return new Promise((resolve) => {
            const container = ensureContainer();
            const id = 'dlg_' + Date.now();

            container.innerHTML = `
            <div class="dialog-overlay active" id="${id}">
                <div class="dialog-box dialog-enter">
                    ${getIconHTML(type)}
                    <h3 class="dialog-title">${title}</h3>
                    <p class="dialog-message">${message}</p>
                    <div class="dialog-actions">
                        <button class="btn ${getButtonClass(type)} dialog-btn-ok" style="min-width:120px">${buttonText}</button>
                    </div>
                </div>
            </div>`;

            const overlay = document.getElementById(id);
            const box = overlay.querySelector('.dialog-box');
            const btnOk = overlay.querySelector('.dialog-btn-ok');

            function close() {
                box.classList.remove('dialog-enter');
                box.classList.add('dialog-exit');
                overlay.style.opacity = '0';
                setTimeout(() => {
                    container.innerHTML = '';
                    resolve();
                }, 200);
            }

            btnOk.addEventListener('click', close);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });

            setTimeout(() => btnOk.focus(), 50);
        });
    }

    return { confirm, alert };
})();
