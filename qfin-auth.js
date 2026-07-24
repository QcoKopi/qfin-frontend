// ============================================================
// QFIN AUTH - Admin Authentication
// Counterpart: Auth.gs
// ============================================================

async function showAdminLoginPrompt() {
    if (sessionStorage.getItem('qfin_admin_token')) {
        if (confirm('Sudah login sebagai admin. Logout?')) {
            sessionStorage.removeItem('qfin_admin_token');
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            document.getElementById('navtab-adminlogin').textContent = '🔒 Admin';
            switchTab('assembly', document.querySelector('.nav-tab'));
        }
        return;
    }
    const password = prompt('Masukkan password admin:');
    if (!password) return;
    const result = await callGAS('verifyAdminPassword', { password: password });
    if (result.success) {
        sessionStorage.setItem('qfin_admin_token', result.token);
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
        document.getElementById('navtab-adminlogin').textContent = '🔓 Admin';
        alert('Login admin berhasil.');
    } else {
        alert('Gagal login: ' + result.message);
    }
}
