/* ============================
   User Management Page (Admin Only)
   ============================ */

const UsersPage = (() => {
    let usersList = [];

    function render() {
        return `
        <div class="page-header">
            <h1 class="page-title">Manajemen User</h1>
            <p class="page-subtitle">Kelola akun pengguna sistem inventaris</p>
        </div>

        <div class="toolbar fade-in">
            <div style="flex:1"></div>
            <button class="btn btn-primary" id="btnAddUser"><i class="fas fa-user-plus"></i> Tambah User</button>
        </div>

        <div class="card fade-in">
            <div class="card-body" style="padding:0">
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Nama</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Memuat...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- User Modal -->
        <div class="modal-overlay" id="userModal">
            <div class="modal" style="max-width:480px">
                <div class="modal-header">
                    <h3 id="userModalTitle">Tambah User Baru</h3>
                    <button class="modal-close" id="userModalClose"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="userForm">
                        <input type="hidden" id="userId">
                        <div class="form-group">
                            <label class="form-label">Nama Lengkap *</label>
                            <input type="text" class="form-input" id="userName" placeholder="Contoh: Budi Santoso" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Username *</label>
                            <input type="text" class="form-input" id="userUsername" placeholder="Username untuk login" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" id="userPasswordLabel">Password *</label>
                            <input type="password" class="form-input" id="userPassword" placeholder="Minimal 6 karakter">
                            <p class="form-hint" id="passwordHint" style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;display:none">
                                Kosongkan jika tidak ingin mengubah password
                            </p>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Role *</label>
                            <select class="form-select" id="userRole">
                                <option value="staff">🔧 Staff / Teknisi</option>
                                <option value="admin">⭐ Admin</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-ghost" id="userFormCancel">Batal</button>
                            <button type="submit" class="btn btn-primary" id="userFormSubmit">
                                <i class="fas fa-check"></i> Simpan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
    }

    async function renderTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        try {
            usersList = await Store.getUsers();
            const currentUser = Auth.getCurrentUser();

            if (usersList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fas fa-users"></i><h4>Tidak ada user</h4></div></td></tr>`;
                return;
            }

            tbody.innerHTML = usersList.map(u => {
                const isSelf = u.id === currentUser?.id;
                const roleIcon = u.role === 'admin' ? '⭐' : '🔧';
                const roleBadge = u.role === 'admin' ? 'badge-primary' : 'badge-info';
                const roleLabel = u.role === 'admin' ? 'Admin' : 'Staff';

                return `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:10px">
                            <div class="user-avatar" style="width:36px;height:36px;min-width:36px;font-size:0.75rem">
                                ${u.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                            <div>
                                <div style="font-weight:600;color:var(--text-primary)">${u.name}</div>
                                ${isSelf ? '<span style="font-size:0.7rem;color:var(--accent-primary)">(Anda)</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td><code style="font-size:0.82rem;color:var(--accent-info);background:rgba(6,182,212,0.1);padding:2px 8px;border-radius:4px">${u.username}</code></td>
                    <td><span class="badge ${roleBadge}">${roleIcon} ${roleLabel}</span></td>
                    <td>
                        <div style="display:flex;gap:4px">
                            <button class="btn btn-ghost btn-icon btn-sm" onclick="UsersPage.editUser('${u.id}')" title="Edit">
                                <i class="fas fa-pen"></i>
                            </button>
                            ${!isSelf ? `
                                <button class="btn btn-ghost btn-icon btn-sm" onclick="UsersPage.deleteUser('${u.id}')" title="Hapus" style="color:var(--accent-danger)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--accent-danger);padding:24px">Gagal memuat: ${e.message}</td></tr>`;
        }
    }

    async function init() {
        await renderTable();

        document.getElementById('btnAddUser')?.addEventListener('click', () => openModal());
        document.getElementById('userModalClose')?.addEventListener('click', closeModal);
        document.getElementById('userFormCancel')?.addEventListener('click', closeModal);
        document.getElementById('userModal')?.addEventListener('click', (e) => { if (e.target.id === 'userModal') closeModal(); });

        document.getElementById('userForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveUser();
        });
    }

    function openModal(user) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const passwordHint = document.getElementById('passwordHint');
        const passwordInput = document.getElementById('userPassword');

        document.getElementById('userId').value = user ? user.id : '';
        document.getElementById('userName').value = user ? user.name : '';
        document.getElementById('userUsername').value = user ? user.username : '';
        document.getElementById('userPassword').value = '';
        document.getElementById('userRole').value = user ? user.role : 'staff';

        if (user) {
            title.textContent = 'Edit User';
            passwordHint.style.display = 'block';
            passwordInput.required = false;
            passwordInput.placeholder = 'Kosongkan jika tidak diubah';
        } else {
            title.textContent = 'Tambah User Baru';
            passwordHint.style.display = 'none';
            passwordInput.required = true;
            passwordInput.placeholder = 'Minimal 6 karakter';
        }

        modal.classList.add('active');
    }

    function closeModal() {
        document.getElementById('userModal')?.classList.remove('active');
    }

    async function saveUser() {
        const id = document.getElementById('userId').value;
        const data = {
            name: document.getElementById('userName').value.trim(),
            username: document.getElementById('userUsername').value.trim(),
            role: document.getElementById('userRole').value
        };

        const password = document.getElementById('userPassword').value;
        if (password) data.password = password;

        if (!data.name || !data.username) {
            App.showToast('Nama dan username wajib diisi', 'error');
            return;
        }

        if (!id && !password) {
            App.showToast('Password wajib diisi untuk user baru', 'error');
            return;
        }

        const btn = document.getElementById('userFormSubmit');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

        try {
            if (id) {
                await Store.updateUser(id, data);
                App.showToast('User berhasil diperbarui', 'success');
            } else {
                await Store.createUser(data);
                App.showToast('User baru berhasil ditambahkan', 'success');
            }
            closeModal();
            renderTable();
        } catch (e) {
            App.showToast('Gagal: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Simpan';
        }
    }

    async function editUser(id) {
        try {
            const user = await Store.getUserById(id);
            if (user) openModal(user);
        } catch (e) {
            App.showToast('Gagal memuat user', 'error');
        }
    }

    async function deleteUser(id) {
        const user = usersList.find(u => u.id === id);
        if (!user) return;

        const confirmed = await Dialog.confirm({
            title: 'Hapus User?',
            message: `User <strong>"${user.name}"</strong> akan dihapus.<br>User ini tidak akan bisa login lagi.`,
            type: 'delete',
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal'
        });
        if (confirmed) {
            try {
                await Store.deleteUser(id);
                App.showToast('User berhasil dihapus', 'info');
                renderTable();
            } catch (e) {
                App.showToast('Gagal: ' + e.message, 'error');
            }
        }
    }

    return { render, init, editUser, deleteUser };
})();
