/* ============================
   App - Router & Layout
   ============================ */

const App = (() => {
    let currentPage = null;
    let layoutResizeHandler = null;

    const routes = {
        '/login': { page: LoginPage, title: 'Login', public: true },
        '/dashboard': { page: DashboardPage, title: 'Dashboard', icon: 'fa-gauge-high' },
        '/assets': { page: AssetsPage, title: 'Daftar Aset', icon: 'fa-boxes-stacked' },
        '/scanner': { page: ScannerPage, title: 'Scan Aset', icon: 'fa-qrcode' },
        '/transactions': { page: TransactionsPage, title: 'Transaksi', icon: 'fa-right-left' },
        '/history': { page: HistoryPage, title: 'Riwayat', icon: 'fa-clock-rotate-left' },
        '/users': { page: UsersPage, title: 'Manajemen User', icon: 'fa-users-gear', adminOnly: true },
        '/backup': { page: BackupPage, title: 'Backup', icon: 'fa-shield-halved', adminOnly: true }
    };

    function isCompactViewport() {
        const visualWidth = window.innerWidth || 0;
        const screenWidth = window.screen?.width || visualWidth;
        const isTouchDevice = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        return isTouchDevice || Math.min(visualWidth, screenWidth) <= 1024;
    }

    function unbindLayoutEvents() {
        if (layoutResizeHandler) {
            window.removeEventListener('resize', layoutResizeHandler);
            layoutResizeHandler = null;
        }
    }

    function getLayout(content, activeRoute) {
        const user = Auth.getCurrentUser();
        const isAdm = Auth.isAdmin();

        const navItems = [
            { route: '/dashboard', icon: 'fa-gauge-high', label: 'Dashboard', section: 'Utama' },
            { route: '/assets', icon: 'fa-boxes-stacked', label: 'Daftar Aset', section: 'Utama' },
            { route: '/scanner', icon: 'fa-qrcode', label: 'Scan Aset', section: 'Operasi' },
            { route: '/transactions', icon: 'fa-right-left', label: 'Transaksi', section: 'Operasi' },
            { route: '/history', icon: 'fa-clock-rotate-left', label: 'Riwayat', section: 'Operasi' },
            ...(isAdm ? [
                { route: '/users', icon: 'fa-users-gear', label: 'Kelola User', section: 'Admin' },
                { route: '/backup', icon: 'fa-shield-halved', label: 'Backup', section: 'Admin' }
            ] : [])
        ];

        let currentSection = '';
        const navHTML = navItems.map(item => {
            let sectionLabel = '';
            if (item.section !== currentSection) {
                currentSection = item.section;
                sectionLabel = `<div class="nav-section-label">${item.section}</div>`;
            }
            return `${sectionLabel}<a class="nav-item ${activeRoute === item.route ? 'active' : ''}" href="#${item.route}">
                <i class="fas ${item.icon}"></i>
                <span>${item.label}</span>
            </a>`;
        }).join('');

        const initials = user ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) : '?';

        return `
        <button class="mobile-toggle" id="mobileToggle"><i class="fas fa-bars"></i></button>
        <div class="sidebar-overlay" id="sidebarOverlay"></div>

        <div class="app-layout">
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-brand">
                    <div class="brand-icon"><i class="fas fa-boxes-stacked"></i></div>
                    <span class="brand-text">InvenTrack</span>
                </div>
                <nav class="sidebar-nav">
                    ${navHTML}
                </nav>
                <div class="sidebar-footer">
                    <div class="user-card">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <div class="user-name">${user ? user.name : 'Guest'}</div>
                            <div class="user-role">${user ? (user.role === 'admin' ? '⭐ Admin' : '🔧 Teknisi') : ''}</div>
                        </div>
                        <button class="btn-logout" id="btnLogout" title="Logout"><i class="fas fa-right-from-bracket"></i></button>
                    </div>
                </div>
            </aside>
            <main class="main-content" id="pageContent">
                ${content}
            </main>
        </div>
        <footer class="app-footer">
            <span>© ${new Date().getFullYear()} Masamune — InvenTrack v1.0</span>
        </footer>
        <div class="toast-container" id="toastContainer"></div>`;
    }

    async function navigate(hash) {
        const path = hash.replace('#', '').split('?')[0] || '/dashboard';
        const route = routes[path];

        unbindLayoutEvents();

        // Destroy previous page
        if (currentPage && currentPage.destroy) currentPage.destroy();

        const app = document.getElementById('app');

        if (!route) {
            window.location.hash = '#/dashboard';
            return;
        }

        // Public route (login)
        if (route.public) {
            if (Auth.isLoggedIn()) {
                window.location.hash = '#/dashboard';
                return;
            }
            app.innerHTML = route.page.render();
            await route.page.init();
            currentPage = route.page;
            document.title = 'InvenTrack — ' + route.title;
            return;
        }

        // Auth required
        if (!Auth.isLoggedIn()) {
            window.location.hash = '#/login';
            return;
        }

        // Render with layout
        const content = route.page.render();
        app.innerHTML = getLayout(content, path);
        await route.page.init();
        currentPage = route.page;
        document.title = 'InvenTrack — ' + route.title;

        // Bind layout events
        bindLayoutEvents();
    }

    function bindLayoutEvents() {
        // Logout
        document.getElementById('btnLogout')?.addEventListener('click', () => {
            Auth.logout();
            window.location.hash = '#/login';
        });

        // Mobile sidebar
        const toggle = document.getElementById('mobileToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const setSidebarOpen = (open) => {
            sidebar?.classList.toggle('open', open);
            overlay?.classList.toggle('open', open);
            toggle?.classList.toggle('is-hidden', open);
            document.body.classList.toggle('sidebar-open', open);
        };

        toggle?.addEventListener('click', () => {
            const isOpen = sidebar?.classList.contains('open') || false;
            setSidebarOpen(!isOpen);
        });

        overlay?.addEventListener('click', () => {
            setSidebarOpen(false);
        });

        // Close sidebar on nav click (mobile)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (isCompactViewport()) {
                    setSidebarOpen(false);
                }
            });
        });

        layoutResizeHandler = () => {
            if (!isCompactViewport()) setSidebarOpen(false);
        };
        window.addEventListener('resize', layoutResizeHandler);

        // Always start from a closed sidebar when route changes.
        setSidebarOpen(false);
    }

    function showToast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    function init() {
        window.addEventListener('hashchange', () => {
            navigate(window.location.hash);
        });

        // Initial route
        if (!window.location.hash) {
            window.location.hash = Auth.isLoggedIn() ? '#/dashboard' : '#/login';
        } else {
            navigate(window.location.hash);
        }
    }

    return { init, navigate, showToast };
})();
