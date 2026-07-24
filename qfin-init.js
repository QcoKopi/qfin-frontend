// ============================================================
// QFIN INIT - DOMContentLoaded & Initialization
// Counterpart: Code.gs (main entry)
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    const savedUrl = localStorage.getItem('qfin_gas_url');
    const gasUrlInput = document.getElementById('gasUrl');
    if (savedUrl && gasUrlInput) gasUrlInput.value = savedUrl;
    setDefaultDates();
    loadMasterData();
    if (sessionStorage.getItem('qfin_admin_token')) {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
        const adminLoginBtn = document.getElementById('navtab-adminlogin');
        if (adminLoginBtn) adminLoginBtn.textContent = '🔓 Admin';
    }
    // FIX: Only call onMasterDataJenisChange if element exists
    if (document.getElementById('mdJenis') && typeof onMasterDataJenisChange === 'function') {
        onMasterDataJenisChange();
    }
});
