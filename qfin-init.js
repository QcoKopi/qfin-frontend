// ============================================================
// QFIN INIT - DOMContentLoaded & Initialization
// Counterpart: Code.gs (main entry)
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    const savedUrl = localStorage.getItem('qfin_gas_url');
    if (savedUrl) document.getElementById('gasUrl').value = savedUrl;
    setDefaultDates();
    loadMasterData();
    if (sessionStorage.getItem('qfin_admin_token')) {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
        document.getElementById('navtab-adminlogin').textContent = '🔓 Admin';
    }
    if (typeof onMasterDataJenisChange === 'function') onMasterDataJenisChange();
});
