/* ============================
   Auth Module (API-based)
   ============================ */

const Auth = (() => {
    async function login(username, password) {
        return Store.login(username, password);
    }

    function logout() {
        Store.logout();
    }

    function getCurrentUser() {
        return Store.getSession();
    }

    function isLoggedIn() {
        return Store.isLoggedIn();
    }

    function isAdmin() {
        const user = getCurrentUser();
        return user && user.role === 'admin';
    }

    function requireAuth() {
        if (!isLoggedIn()) {
            window.location.hash = '#/login';
            return false;
        }
        return true;
    }

    return { login, logout, getCurrentUser, isLoggedIn, isAdmin, requireAuth };
})();
