// ============================================================
// QFIN UI - Tabs, Dropdowns, Validation, Utilities
// Counterpart: Code.gs (UI handlers)
// ============================================================

// --- TABS ---
function switchTab(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const tabEl = document.getElementById('tab-' + tabName);
    if (tabEl) tabEl.classList.add('active');
    if (btn) btn.classList.add('active');

    setDefaultDates();

    const tabInit = {
        'preview': () => { if (typeof updatePreviewStats === 'function') updatePreviewStats(); },
        'pembelian': () => { if (typeof clearPembelianForm === 'function') clearPembelianForm(); },
        'penjualan': () => { 
            if (typeof clearPenjualanForm === 'function') clearPenjualanForm(); 
            autoFillNextDoc('penInvoice', 'Penjualan_App', 'no_invoice'); 
            if (typeof loadStockCacheForPenjualan === 'function') loadStockCacheForPenjualan(); 
        },
        'stock': () => { if (typeof stockTableData !== 'undefined' && stockTableData === null && typeof loadStockTable === 'function') loadStockTable(); },
        'master-data': () => { 
            if (document.getElementById('mdJenis')) {
                if (typeof onMasterDataJenisChange === 'function') onMasterDataJenisChange();
            }
        },
        'neraca': () => { if (typeof neracaReportData !== 'undefined' && neracaReportData === null && typeof loadNeracaReport === 'function') loadNeracaReport(); },
        'rugilaba': () => { if (typeof rugiLabaReportData !== 'undefined' && rugiLabaReportData === null && typeof loadRugiLabaReport === 'function') loadRugiLabaReport(); },
        'bukubesar': () => { if (typeof bukuBesarData !== 'undefined' && bukuBesarData === null && typeof loadBukuBesar === 'function') loadBukuBesar(); },
        'piutanghutang': () => { 
            if (typeof piutangHutangData !== 'undefined' && piutangHutangData === null && typeof loadPiutangHutangDetail === 'function') loadPiutangHutangDetail();
            if (typeof piutangReconSummary !== 'undefined' && piutangReconSummary === null && typeof loadPiutangReconciliationSummary === 'function') loadPiutangReconciliationSummary();
            if (typeof hutangReconSummary !== 'undefined' && hutangReconSummary === null && typeof loadHutangReconciliationSummary === 'function') loadHutangReconciliationSummary();
        }
    };

    if (tabInit[tabName]) tabInit[tabName]();
}

async function autoFillNextDoc(inputId, table, field, filterExpr) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const params = { table, field };
    if (filterExpr) params.filter = filterExpr;
    const result = await callGAS('getNextDocNumber', params);
    if (!result.success || !result.next) return;
    const currentVal = input.value.trim();
    const isInvoiceFormat = /^INV/i.test(currentVal);
    const isPembelianFormat = /^(FP|PB|PH|STOK)/i.test(currentVal);
    const shouldFill = !currentVal ||
        (table === 'Pembelian_App' && isInvoiceFormat) ||
        (table === 'Penjualan_App' && isPembelianFormat);
    if (shouldFill) input.value = result.next;
}

// --- DROPDOWNS ---
let stockCache = null;
let hppCache = {};
const HPP_CACHE_TTL = 5 * 60 * 1000;

async function loadStockCacheForPenjualan() {
    const result = await callGAS('getAllStock', {}, 30000);
    if (result.success) {
        stockCache = {};
        result.data.forEach(s => { stockCache[s.id_produk] = parseFloat(s.saldo) || 0; });
    }
}

function searchDropdown(inputId, dataType) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(inputId + '-list');
    if (!input || !list) return;
    const searchTerm = input.value.toLowerCase();
    let data = masterData[dataType] || [];
    const isPenjualanBarang = /^pen-barang-\d+$/.test(inputId);
    if (isPenjualanBarang) {
        data = data.filter(item => item.tipe !== 'Fix Asset' && item.tipe !== 'SDM' && item.kategori !== 'Fix Asset' && item.kategori !== 'SDM');
        if (stockCache) data = data.filter(item => (stockCache[item.id_produk] || 0) > 0);
    }
    const filtered = data.filter(item => {
        const label = (item.nama_produk || item.nama_customer || item.nama_supplier || item.nama_salesman || item.nama_akun || item.nama_cash || item.nama_resep || item.nama_kemasan || item.nama || '').toLowerCase();
        const value = (item.id_produk || item.id_customer || item.id_supplier || item.id_salesman || item.coa || item.id_cash || item.id_resep || item.id_kemasan || item.id || '').toLowerCase();
        return label.includes(searchTerm) || value.includes(searchTerm);
    }).slice(0, 20);
    list.innerHTML = filtered.map(item => {
        const value = item.id_produk || item.id_customer || item.id_supplier || item.id_salesman || item.coa || item.id_cash || item.id_resep || item.id_kemasan || item.id;
        const label = item.nama_produk || item.nama_customer || item.nama_supplier || item.nama_salesman || item.nama_akun || item.nama_cash || item.nama_resep || item.nama_kemasan || item.nama;
        const stockNote = (isPenjualanBarang && stockCache && stockCache[value] !== undefined) ? ` — stok ${formatNumber(stockCache[value])}` : '';
        return `<div class="dropdown-item" onclick="selectDropdown('${inputId}', '${value}', '${label.replace(/'/g, "\'")}')">${label} (${value})${stockNote}</div>`;
    }).join('');
    list.classList.add('show');
}

function showDropdown(inputId) { 
    searchDropdown(inputId, getDataTypeForInput(inputId)); 
}

function getDataTypeForInput(inputId) {
    if (inputId.includes('Sku') || inputId.includes('Produk') || inputId.includes('Barang')) return 'products';
    if (inputId.includes('Customer') || inputId.includes('Lawan')) return 'customers';
    if (inputId.includes('Supplier')) return 'suppliers';
    if (inputId.includes('Sales') || inputId.includes('Salesman')) return 'salesmen';
    if (inputId.includes('COA')) return 'coa';
    if (inputId.includes('Cash')) return 'cash';
    if (inputId.includes('kemasan') || inputId.includes('Kemasan')) return 'kemasan';
    return 'products';
}

function selectDropdown(inputId, value, label) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = label; 
    input.dataset.value = value;
    const list = document.getElementById(inputId + '-list');
    if (list) list.classList.remove('show');

    if (inputId === 'asmSku') { 
        const namaBarang = document.getElementById('asmNamaBarang');
        if (namaBarang) namaBarang.value = label.split(' (')[0]; 
        if (typeof loadRecipeForProduct === 'function') loadRecipeForProduct(value); 
        if (typeof autoFillBatchNo === 'function') autoFillBatchNo(); 
    }
    if (inputId === 'opProduk' && typeof fetchStockQty === 'function') fetchStockQty();

    const penBarangMatch = inputId.match(/^pen-barang-(\d+)$/);
    if (penBarangMatch) {
        const rowId = parseInt(penBarangMatch[1], 10);
        if (typeof calculatePenjualanHPP === 'function') calculatePenjualanHPP(rowId);
        const kemasanInput = document.getElementById(`pen-kemasan-${rowId}`);
        const jumlahKemasanInput = document.getElementById(`pen-jumlah-kemasan-${rowId}`);
        if (kemasanInput) { kemasanInput.value = ''; kemasanInput.dataset.value = ''; }
        if (jumlahKemasanInput) jumlahKemasanInput.value = '';
    }
    if (inputId === 'pemSupplier' && typeof updateAllKodeLot === 'function') updateAllKodeLot();
    const pemBarangMatch = inputId.match(/^pem-barang-(\d+)$/);
    if (pemBarangMatch && typeof updateKodeLotForRow === 'function') updateKodeLotForRow(parseInt(pemBarangMatch[1], 10));
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.searchable-dropdown')) 
        document.querySelectorAll('.dropdown-list').forEach(l => l.classList.remove('show'));
});

// --- MANDATORY VALIDATION ---
function validateMandatory(containerId, alertId) {
    const container = document.getElementById(containerId);
    if (!container) return true;
    container.querySelectorAll('.mandatory-empty').forEach(el => el.classList.remove('mandatory-empty'));
    let missing = [];
    const formGroups = container.querySelectorAll('.form-group');
    formGroups.forEach(group => {
        const label = group.querySelector('label.mandatory-label');
        if (!label) return;
        const input = group.querySelector('input:not([readonly]):not([type="hidden"])');
        const select = group.querySelector('select');
        const el = input || select;
        if (!el || el.offsetParent === null || el.disabled) return;
        const labelText = label.textContent.replace(' *', '').trim();
        const isDropdown = el.closest('.searchable-dropdown');
        if (isDropdown) {
            const datasetVal = (el.dataset.value || '').trim();
            const textVal = (el.value || '').trim();
            if (!datasetVal && !textVal) {
                el.classList.add('mandatory-empty');
                missing.push(labelText);
            }
        } else {
            const val = (el.value || '').trim();
            if (!val) {
                el.classList.add('mandatory-empty');
                missing.push(labelText);
            }
        }
    });
    if (missing.length > 0) {
        showAlert('danger', 'Field wajib belum diisi: ' + missing.join(', '), alertId);
        return false;
    }
    return true;
}

function clearMandatoryErrors(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.mandatory-empty').forEach(el => el.classList.remove('mandatory-empty'));
}

// --- CSV DOWNLOAD UTILITY ---
function downloadCsv(filename, headers, rows) {
    const escape = v => {
        const s = (v === null || v === undefined) ? '' : String(v);
        return '"' + s.replace(/"/g, '""') + '"';
    };
    const lines = [headers.map(escape).join(',')].concat(rows.map(row => row.map(escape).join(',')));
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = filename;
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
// END OF qfin-ui.js
