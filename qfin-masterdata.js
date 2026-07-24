// ============================================================
// QFIN MASTER DATA - Master Data Entry & List
// Counterpart: MasterData.gs
// ============================================================

const MD_NAME_FIELD = {
    Master_Produk: 'nama_produk', 
    Master_Kemasan: 'nama_kemasan', 
    Master_Resep: 'nama_resep',
    Master_Customer: 'nama_customer', 
    Master_Supplier: 'nama_supplier', 
    Master_Salesman: 'nama_salesman', 
    Master_COA: 'nama_akun'
};

let masterDataListCache = [];
let resepBahanRowId = 0;

function onMasterDataJenisChange() {
    const jenis = document.getElementById('mdJenis').value;
    Object.keys(MD_NAME_FIELD).forEach(t => {
        const el = document.getElementById('md-fields-' + t);
        if (el) el.style.display = 'none';
    });
    const selectedEl = document.getElementById('md-fields-' + jenis);
    if (selectedEl) selectedEl.style.display = '';

    const bahanContainer = document.getElementById('md-fields-Master_Resep-bahan-container');
    if (bahanContainer) {
        bahanContainer.style.display = (jenis === 'Master_Resep') ? '' : 'none';
    }

    loadMasterDataList();
}

function addResepBahanRow() {
    const id = resepBahanRowId++;
    const container = document.getElementById('mdResepBahanRows');
    const div = document.createElement('div');
    div.className = 'form-grid';
    div.id = `resep-bahan-row-${id}`;
    div.style.cssText = 'grid-template-columns:2fr 1fr 1fr auto;align-items:end;margin-bottom:8px;';
    div.innerHTML = `
        <div class="form-group" style="margin-bottom:0;">
            <label class="mandatory-label">Bahan</label>
            <div class="searchable-dropdown">
                <input type="text" id="resep-bahan-${id}" placeholder="Cari bahan baku..." oninput="searchDropdown('resep-bahan-${id}', 'products')" onfocus="showDropdown('resep-bahan-${id}')">
                <div class="dropdown-list" id="resep-bahan-${id}-list"></div>
            </div>
        </div>
        <div class="form-group" style="margin-bottom:0;"><label class="mandatory-label">Komposisi</label><input type="number" id="resep-komposisi-${id}" step="0.01" placeholder="0"></div>
        <div class="form-group" style="margin-bottom:0;"><label class="mandatory-label">Satuan</label><input type="text" id="resep-satuan-${id}" placeholder="kg"></div>
        <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('resep-bahan-row-${id}').remove()">✕ </button>
    `;
    container.appendChild(div);
}

async function submitMasterDataForm() {
    clearMandatoryErrors('tab-master-data');
    if (!validateMandatory('tab-master-data', 'masterDataAlert')) return;
    const jenis = document.getElementById('mdJenis').value;

    if (jenis === 'Master_Resep') {
        const namaResep = document.getElementById('mdResepNama').value;
        const idProdukJadi = document.getElementById('mdResepProdukJadi').dataset.value || '';
        if (!namaResep) { showAlert('danger', 'Nama Resep tidak boleh kosong', 'masterDataAlert'); return; }
        const bahanRows = Array.from(document.getElementById('mdResepBahanRows').children);
        if (bahanRows.length === 0) { showAlert('danger', 'Tambahkan minimal 1 bahan baku', 'masterDataAlert'); return; }
        let successCount = 0, failMessages = [];
        for (const row of bahanRows) {
            const id = row.id.replace('resep-bahan-row-', '');
            const bahan = document.getElementById(`resep-bahan-${id}`).value;
            if (!bahan) continue;
            const result = await callGAS('submitMasterData', {
                table: 'Master_Resep',
                nama_resep: namaResep,
                id_produk_jadi: idProdukJadi,
                bahan: bahan,
                komposisi: parseFloat(document.getElementById(`resep-komposisi-${id}`).value) || 0,
                satuan: document.getElementById(`resep-satuan-${id}`).value
            });
            if (result.success) successCount++; 
            else failMessages.push(bahan + ': ' + result.message);
        }
        if (successCount > 0) {
            showAlert(failMessages.length ? 'danger' : 'success', `${successCount} bahan tersimpan.` + (failMessages.length ? ' Gagal: ' + failMessages.join('; ') : ''), 'masterDataAlert');
            document.getElementById('mdResepNama').value = '';
            document.getElementById('mdResepProdukJadi').value = '';
            document.getElementById('mdResepProdukJadi').dataset.value = '';
            document.getElementById('mdResepBahanRows').innerHTML = '';
            addResepBahanRow();
            localStorage.removeItem(CACHE_KEY + jenis);
            await loadMasterData();
            loadMasterDataList();
        } else {
            showAlert('danger', 'Gagal: ' + (failMessages.join('; ') || 'tidak ada bahan diisi'), 'masterDataAlert');
        }
        return;
    }

    let data = { table: jenis };
    if (jenis === 'Master_Produk') {
        data = Object.assign(data, {
            nama_produk: document.getElementById('mdProdukNama').value,
            tipe: document.getElementById('mdProdukTipe').value,
            kategori: document.getElementById('mdProdukKategori').value,
            satuan: document.getElementById('mdProdukSatuan').value,
            harga_beli: parseFloat(document.getElementById('mdProdukHargaBeli').value) || 0,
            harga_jual: parseFloat(document.getElementById('mdProdukHargaJual').value) || 0,
            stok_min: parseFloat(document.getElementById('mdProdukStokMin').value) || 0
        });
    } else if (jenis === 'Master_Kemasan') {
        data = Object.assign(data, {
            nama_kemasan: document.getElementById('mdKemasanNama').value,
            kapasitas: parseFloat(document.getElementById('mdKemasanKapasitas').value) || 0,
            satuan: document.getElementById('mdKemasanSatuan').value,
            harga: parseFloat(document.getElementById('mdKemasanHarga').value) || 0
        });
    } else if (jenis === 'Master_Customer') {
        data = Object.assign(data, {
            nama_customer: document.getElementById('mdCustomerNama').value,
            alamat: document.getElementById('mdCustomerAlamat').value,
            telepon: document.getElementById('mdCustomerTelepon').value,
            email: document.getElementById('mdCustomerEmail').value
        });
    } else if (jenis === 'Master_Supplier') {
        data = Object.assign(data, {
            nama_supplier: document.getElementById('mdSupplierNama').value,
            alamat: document.getElementById('mdSupplierAlamat').value,
            telepon: document.getElementById('mdSupplierTelepon').value,
            email: document.getElementById('mdSupplierEmail').value
        });
    } else if (jenis === 'Master_Salesman') {
        data = Object.assign(data, {
            nama_salesman: document.getElementById('mdSalesmanNama').value,
            telepon: document.getElementById('mdSalesmanTelepon').value,
            email: document.getElementById('mdSalesmanEmail').value
        });
    } else if (jenis === 'Master_COA') {
        data = Object.assign(data, {
            coa: document.getElementById('mdCoaKode').value,
            kategori_1: document.getElementById('mdCoaKategori1').value,
            kategori_2: document.getElementById('mdCoaKategori2').value,
            nama_akun: document.getElementById('mdCoaNama').value
        });
    }

    const nameField = MD_NAME_FIELD[jenis];
    if (!data[nameField]) { showAlert('danger', 'Nama tidak boleh kosong', 'masterDataAlert'); return; }

    const result = await callGAS('submitMasterData', data);
    if (result.success) {
        showAlert('success', data[nameField] + ' berhasil ditambahkan ke ' + jenis, 'masterDataAlert');
        document.querySelectorAll('#md-fields-' + jenis + ' input').forEach(el => el.value = '');
        document.getElementById('mdResepProdukJadi').dataset.value = '';
        localStorage.removeItem(CACHE_KEY + jenis);
        await loadMasterData();
        loadMasterDataList();
    } else {
        showAlert('danger', 'Gagal: ' + result.message, 'masterDataAlert');
    }
}

async function loadMasterDataList() {
    const jenis = document.getElementById('mdJenis').value;
    document.getElementById('mdListTableBody').innerHTML = '<tr><td>Memuat...</td></tr>';
    const result = await callGAS('getAll', { table: jenis });
    masterDataListCache = result.success ? result.data : [];
    renderMasterDataList();
}

function renderMasterDataList() {
    const jenis = document.getElementById('mdJenis').value;
    const nameField = MD_NAME_FIELD[jenis];
    const query = (document.getElementById('mdListSearch').value || '').toLowerCase();
    const rows = masterDataListCache.filter(r => (r[nameField] || '').toLowerCase().includes(query));
    const head = document.getElementById('mdListTableHead');
    const body = document.getElementById('mdListTableBody');
    const cols = Object.keys(masterDataListCache[0] || { [nameField]: '' }).filter(k => !['created_at', 'updated_at'].includes(k));
    head.innerHTML = '<tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>';
    if (rows.length === 0) { body.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center;color:var(--gray);">Tidak ada data</td></tr>`; return; }
    body.innerHTML = rows.map(r => '<tr>' + cols.map(c => `<td>${r[c] !== undefined ? r[c] : ''}</td>`).join('') + '</tr>').join('');
}
