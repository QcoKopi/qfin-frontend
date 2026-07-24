// ============================================================
// QFIN CORE - Config, Cache, API Communication
// Counterpart: Config.gs + Utils.gs
// ============================================================

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEY = 'qfin_cache_';

let masterData = {
    products: [], resep: [], customers: [], suppliers: [],
    salesmen: [], coa: [], cash: [], kemasan: []
};

let __qfinJsonpSeq = 0;

function getGasUrl() {
    return localStorage.getItem('qfin_gas_url') || document.getElementById('gasUrl')?.value || '';
}

function saveGasUrl() {
    const url = document.getElementById('gasUrl').value;
    if (url) { 
        localStorage.setItem('qfin_gas_url', url); 
        showAlert('success', 'GAS URL saved'); 
    }
}

function callGAS(action, data = {}, timeoutMs = 60000) {
    return new Promise((resolve) => {
        const url = getGasUrl();
        if (!url) { 
            showAlert('danger', 'GAS URL not configured'); 
            resolve({ success: false }); 
            return; 
        }

        showLoading(true);
        const callbackName = '__qfin_cb_' + (Date.now()) + '_' + (__qfinJsonpSeq++);

        const qs = new URLSearchParams();
        qs.set('action', action);
        qs.set('callback', callbackName);
        const adminToken = sessionStorage.getItem('qfin_admin_token');
        if (adminToken) qs.set('admin_token', adminToken);
        Object.keys(data).forEach(key => {
            const val = data[key];
            if (val === undefined || val === null) return;
            qs.set(key, (typeof val === 'object') ? JSON.stringify(val) : String(val));
        });

        const script = document.createElement('script');
        let settled = false;

        const cleanup = () => {
            window[callbackName] = function() {};
            if (script.parentNode) script.parentNode.removeChild(script);
            clearTimeout(timeoutId);
        };
        const finish = (result) => {
            if (settled) return;
            settled = true;
            cleanup();
            showLoading(false);
            resolve(result);
        };

        const timeoutId = setTimeout(() => {
            showAlert('danger', 'Request timeout - cek GAS URL / deployment access.');
            finish({ success: false, message: 'Request timeout' });
        }, timeoutMs);

        window[callbackName] = function(result) { finish(result); };

        script.onerror = function() {
            showAlert('danger', 'Gagal terhubung ke GAS. Cek GAS URL & deployment (Anyone can access).');
            finish({ success: false, message: 'Network error calling GAS' });
        };

        script.src = url + (url.includes('?') ? '&' : '?') + qs.toString();
        document.body.appendChild(script);
    });
}

function getCache(key) {
    const cached = localStorage.getItem(CACHE_KEY + key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY + key); 
        return null;
    }
    return parsed.data;
}

function setCache(key, data) {
    localStorage.setItem(CACHE_KEY + key, JSON.stringify({ timestamp: Date.now(), data }));
}

async function loadMasterData() {
    const tables = ['Master_Produk', 'Master_Customer', 'Master_Supplier', 'Master_Salesman', 'Master_COA', 'Master_CashAccount', 'Master_Kemasan'];
    const missing = [];
    tables.forEach(table => {
        const cached = getCache(table);
        if (cached) updateMasterData(table, cached); 
        else missing.push(table);
    });
    if (missing.length === 0) return;

    const result = await callGAS('getBulk', { tables: missing }, 90000);
    if (result.success && result.data) {
        missing.forEach(table => {
            const tableResult = result.data[table];
            if (tableResult && tableResult.success) {
                setCache(table, tableResult.data);
                updateMasterData(table, tableResult.data);
            }
        });
    }
}

function updateMasterData(table, data) {
    switch(table) {
        case 'Master_Produk': masterData.products = data; break;
        case 'Master_Resep': masterData.resep = data; break;
        case 'Master_Customer': masterData.customers = data; break;
        case 'Master_Supplier': masterData.suppliers = data; break;
        case 'Master_Salesman': masterData.salesmen = data; break;
        case 'Master_COA': masterData.coa = data; break;
        case 'Master_CashAccount': masterData.cash = data; break;
        case 'Master_Kemasan': masterData.kemasan = data; break;
    }
}

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    const n = typeof num === 'number' ? num : parseFloat(num);
    if (isNaN(n)) return '0';
    const rounded = Math.round(n * 100) / 100;
    const parts = Math.abs(rounded).toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const sign = rounded < 0 ? '-' : '';
    return sign + parts.join(',');
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(d => { 
        if (!d.value) d.value = today; 
    });
}

function showLoading(show) { 
    document.getElementById('loadingOverlay').classList.toggle('show', show); 
}

function showAlert(type, message, elementId) {
    const el = elementId ? document.getElementById(elementId) : document.getElementById('assemblyAlert');
    if (el) { 
        el.className = 'alert alert-' + type; 
        el.textContent = message; 
        el.style.display = 'flex'; 
        setTimeout(() => el.style.display = 'none', 8000); 
    }
}

function clearCacheAndReload() {
    localStorage.clear();
    location.reload();
}

async function loadAllData() {
    await loadMasterData();
    showAlert('success', 'All data refreshed', 'assemblyAlert');
}
