/* ============================
   Login Page
   ============================ */

const LoginPage = (() => {
    function render() {
        return `
        <div class="login-page">
            <div class="login-card">
                <div class="login-header">
                    <div class="brand-icon"><i class="fas fa-boxes-stacked"></i></div>
                    <h1>InvenTrack</h1>
                    <p>Sistem Inventaris Aset</p>
                </div>
                <div class="login-body">
                    <div class="login-error" id="loginError">
                        <i class="fas fa-circle-exclamation"></i>
                        <span id="loginErrorMsg"></span>
                    </div>
                    <form id="loginForm">
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" class="form-input" id="loginUsername" placeholder="Masukkan username" autocomplete="username" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-input" id="loginPassword" placeholder="Masukkan password" autocomplete="current-password" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg" id="loginBtn">
                            <i class="fas fa-right-to-bracket"></i> Masuk
                        </button>
                    </form>

                </div>
            </div>
        </div>`;
    }

    function init() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errEl = document.getElementById('loginError');
            const errMsg = document.getElementById('loginErrorMsg');
            const btn = document.getElementById('loginBtn');

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

            const result = await Auth.login(username, password);
            if (result.success) {
                errEl.classList.remove('show');
                window.location.hash = '#/dashboard';
            } else {
                errMsg.textContent = result.message;
                errEl.classList.add('show');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Masuk';
            }
        });
    }

    return { render, init };
})();
