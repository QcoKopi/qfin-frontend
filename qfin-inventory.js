// ============================================================
// QFIN INVENTORY - Stock, Opname, Movement
// Counterpart: StockLogic.gs + Inventory.gs
// ============================================================

let stockTableData = null;
let stockExpandedGroups = new Set();

async function loadStockTable() {
    document.getElementById('stockTableBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">Memuat...</td></tr>';
    const result = await callGAS('getStockBreakdown', {});
    stockTableData = result.success ? result.data : [];
    const kategoriSelect = document.getElementById('stockKategoriFilter');
    const currentValue = kategoriSelect.value;
    const kategoris = [...new Set(stockTableData.map(r => r.kategori).filter(k => k))].sort();
    kategoriSelect.innerHTML = '<option value="">Semua Kategori</option>' + kategoris.map(k => `<option value="${k}">${k}</option>`).join('');
    kategoriSelect.value = kategoris.includes(currentValue) ? currentValue : '';
    renderStockTable();
}

function renderStockTable() {
    const body = document.getElementById('stockTableBody');
    if (!stockTableData) { body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">Klik Refresh untuk memuat data</td></tr>'; return; }
    const query = (document.getElementById('stockSearch').value || '').toLowerCase();
    const kategoriFilter = document.getElementById('stockKategoriFilter').value;
    const rows = stockTableData.filter(r =>
        (r.nama_produk || '').toLowerCase().includes(query) &&
        (!kategoriFilter || r.kategori === kategoriFilter)
    );
    if (rows.length === 0) { body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">Tidak ada data</td></tr>'; return; }

    const groups = {};
    rows.forEach(r => {
        const key = r.id_produk;
        if (!groups[key]) groups[key] = { nama_produk: r.nama_produk, diproduksi: 0, terjual: 0, dipakai_assembly_lain: 0, sisa: 0, batches: [] };
        groups[key].diproduksi += r.diproduksi;
        groups[key].terjual += r.terjual;
        groups[key].dipakai_assembly_lain += r.dipakai_assembly_lain || 0;
        groups[key].sisa += r.sisa;
        groups[key].batches.push(r);
    });
    const groupKeys = Object.keys(groups).sort((a, b) => (groups[a].nama_produk || '').localeCompare(groups[b].nama_produk || ''));

    let html = '';
    groupKeys.forEach(key => {
        const g = groups[key];
        const isExpanded = stockExpandedGroups.has(key);
        const safeKey = key.replace(/'/g, "\'");
        html += `
            <tr style="cursor:pointer;background:#f4f6fb;font-weight:bold;${g.sisa <= 0 ? 'opacity:0.6;' : ''}" onclick="toggleStockGroup('${safeKey}')">
                <td>${isExpanded ? '▼ ' : '▶ '}</td>
                <td>${g.nama_produk}</td>
                <td style="color:var(--gray);font-weight:normal;">${g.batches.length} batch</td>
                <td></td>
                <td style="text-align:right;">${formatNumber(g.diproduksi)}</td>
                <td style="text-align:right;">${formatNumber(g.terjual)}</td>
                <td style="text-align:right;">${formatNumber(g.dipakai_assembly_lain)}</td>
                <td style="text-align:right;${g.sisa <= 0 ? 'color:#dc3545;' : ''}">${formatNumber(g.sisa)}</td>
            </tr>`;
        if (isExpanded) {
            g.batches.forEach(b => {
                html += `
                    <tr style="${b.sisa <= 0 ? 'opacity:0.5;' : ''}">
                        <td></td>
                        <td></td>
                        <td style="padding-left:16px;color:var(--gray);">${b.batch_no}</td>
                        <td>${b.tanggal ? new Date(b.tanggal).toLocaleDateString('id-ID') : ''}</td>
                        <td style="text-align:right;">${formatNumber(b.diproduksi)}</td>
                        <td style="text-align:right;">${formatNumber(b.terjual)}</td>
                        <td style="text-align:right;">${formatNumber(b.dipakai_assembly_lain || 0)}</td>
                        <td style="text-align:right;font-weight:bold;${b.sisa <= 0 ? 'color:#dc3545;' : ''}">${formatNumber(b.sisa)}</td>
                    </tr>`;
            });
        }
    });
    body.innerHTML = html;
}

function toggleStockGroup(key) {
    if (stockExpandedGroups.has(key)) stockExpandedGroups.delete(key); 
    else stockExpandedGroups.add(key);
    renderStockTable();
}

// --- STOCK OPNAME ---
async function fetchStockQty() {
    const produkInput = document.getElementById('opProduk');
    const sku = produkInput?.dataset.value || produkInput?.value; 
    if (!sku) return;
    const result = await callGAS('getStock', { id_produk: sku });
    if (result.success && result.data) { 
        document.getElementById('opQtySistem').value = result.data.saldo || 0; 
        calculateSelisih(); 
    }
}

function calculateSelisih() {
    const sistem = parseFloat(document.getElementById('opQtySistem').value) || 0;
    const fisik = parseFloat(document.getElementById('opQtyFisik').value) || 0;
    document.getElementById('opSelisih').value = fisik - sistem;
}

async function submitOpname() {
    clearMandatoryErrors('tab-opname');
    if (!validateMandatory('tab-opname', 'opnameAlert')) return;
    const data = {
        tanggal: document.getElementById('opDate').value,
        id_produk: document.getElementById('opProduk').dataset.value || document.getElementById('opProduk').value,
        nama_produk: document.getElementById('opProduk').value,
        qty_fisik: parseFloat(document.getElementById('opQtyFisik').value) || 0,
        keterangan: document.getElementById('opKeterangan').value
    };
    const result = await callGAS('submitOpname', data);
    if (result.success) { 
        showAlert('success', 'Opname berhasil! Selisih: ' + result.selisih, 'opnameAlert'); 
        clearOpnameForm(); 
    }
    else showAlert('danger', 'Gagal: ' + result.message, 'opnameAlert');
}

function clearOpnameForm() {
    const opProduk = document.getElementById('opProduk');
    const opQtySistem = document.getElementById('opQtySistem');
    const opQtyFisik = document.getElementById('opQtyFisik');
    const opSelisih = document.getElementById('opSelisih');
    const opKeterangan = document.getElementById('opKeterangan');

    if (opProduk) { opProduk.value = ''; opProduk.dataset.value = ''; }
    if (opQtySistem) opQtySistem.value = ''; 
    if (opQtyFisik) opQtyFisik.value = '';
    if (opSelisih) opSelisih.value = ''; 
    if (opKeterangan) opKeterangan.value = '';
}

// --- STOCK MOVEMENT ---
async function submitMovement() {
    clearMandatoryErrors('tab-movement');
    if (!validateMandatory('tab-movement', 'movementAlert')) return;
    const data = {
        tanggal: document.getElementById('movDate').value,
        id_produk: document.getElementById('movProduk').dataset.value || document.getElementById('movProduk').value,
        nama_produk: document.getElementById('movProduk').value,
        tipe: document.getElementById('movTipe').value,
        qty_in: parseFloat(document.getElementById('movQtyIn').value) || 0,
        qty_out: parseFloat(document.getElementById('movQtyOut').value) || 0,
        referensi: document.getElementById('movRef').value,
        keterangan: document.getElementById('movKeterangan').value
    };
    const result = await callGAS('submitMovement', data);
    if (result.success) { 
        showAlert('success', 'Movement berhasil! Saldo: ' + result.saldo, 'movementAlert'); 
        clearMovementForm(); 
    }
    else showAlert('danger', 'Gagal: ' + result.message, 'movementAlert');
}

function clearMovementForm() {
    const movProduk = document.getElementById('movProduk');
    const movQtyIn = document.getElementById('movQtyIn');
    const movQtyOut = document.getElementById('movQtyOut');
    const movRef = document.getElementById('movRef');
    const movKeterangan = document.getElementById('movKeterangan');

    if (movProduk) { movProduk.value = ''; movProduk.dataset.value = ''; }
    if (movQtyIn) movQtyIn.value = '0'; 
    if (movQtyOut) movQtyOut.value = '0';
    if (movRef) movRef.value = ''; 
    if (movKeterangan) movKeterangan.value = '';
}
