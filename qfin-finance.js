// ============================================================
// QFIN FINANCE - Kas Masuk, Piutang, Hutang
// Counterpart: Finance.gs
// ============================================================

async function loadUnpaidInvoicesList() {
    const datalist = document.getElementById('kmInvoiceList');
    if (!datalist) return;
    const result = await callGAS('getUnpaidInvoices', {});
    if (result.success && result.data) {
        datalist.innerHTML = result.data.map(inv => `<option value="${inv.no_invoice}">${inv.customer} - Sisa: Rp ${formatNumber(inv.sisa)}</option>`).join('');
    }
}

async function lookupInvoiceForPayment() {
    const noInv = document.getElementById('kmNoDokumen').value.trim();
    if (!noInv) return;

    const result = await callGAS('getInvoiceForPayment', { no_invoice: noInv });

    if (result.success && result.data) {
        const inv = result.data;
        const salesInput = document.getElementById('kmSales');
        if (salesInput) salesInput.value = inv.salesman || '';

        const lawanInput = document.getElementById('kmLawan');
        if (lawanInput) lawanInput.value = inv.customer || '';

        const jumlahInput = document.getElementById('kmJumlah');
        if (jumlahInput) jumlahInput.value = inv.sisa || 0;

        const infoEl = document.getElementById('kmInvoiceInfo');
        if (infoEl) {
            infoEl.textContent = `Customer: ${inv.customer} | Total Tagihan: Rp ${formatNumber(inv.total_tagihan)} | Sisa: Rp ${formatNumber(inv.sisa)}`;
        }
    }
}

function onKmJumlahChange() {
    // Can be extended for auto-calculation
}

async function submitKasMasuk() {
    clearMandatoryErrors('tab-kas-masuk');
    if (!validateMandatory('tab-kas-masuk', 'kasMasukAlert')) return;
    const isPiutang = document.getElementById('kmKodeTransaksi').value.toLowerCase().includes('piutang');
    const terminVisible = document.getElementById('kmTerminGroup').style.display !== 'none';
    const data = {
        tanggal: document.getElementById('kmDate').value, 
        sales: document.getElementById('kmSales').value,
        no_dokumen: document.getElementById('kmNoDokumen').value, 
        cash_account: document.getElementById('kmCash').value,
        kode_transaksi: document.getElementById('kmKodeTransaksi').value,
        lawan_transaksi: document.getElementById('kmLawan').value,
        no_invoice_ref: isPiutang ? document.getElementById('kmNoDokumen').value : '',
        sumber_dana: !isPiutang ? document.getElementById('kmSumberDana').value : '',
        termin: terminVisible ? document.getElementById('kmTermin').value : '',
        kas_masuk: parseFloat(document.getElementById('kmJumlah').value) || 0, 
        keterangan: document.getElementById('kmKeterangan').value
    };
    const result = await callGAS('submitKasMasuk', data);
    if (result.success) {
        showAlert('success', 'Kas Masuk berhasil! ID: ' + result.id_kas, 'kasMasukAlert');
        clearKasMasukForm();
    } else {
        showAlert('danger', 'Gagal: ' + result.message, 'kasMasukAlert');
    }
}

function onKasKodeTransaksiChange() {
    const isPiutang = document.getElementById('kmKodeTransaksi').value.toLowerCase().includes('piutang');
    document.getElementById('kmSumberDanaGroup').style.display = isPiutang ? 'none' : '';
    document.getElementById('kmTerminGroup').style.display = isPiutang ? '' : 'none';
}

function clearKasMasukForm() {
    document.getElementById('kmNoDokumen').value = '';
    document.getElementById('kmSales').value = '';
    document.getElementById('kmLawan').value = '';
    document.getElementById('kmJumlah').value = '';
    document.getElementById('kmKeterangan').value = '';
    document.getElementById('kmInvoiceInfo').textContent = '';
    document.getElementById('kmSumberDana').value = '';
    document.getElementById('kmTerminGroup').style.display = 'none';
}

// --- PIUTANG & HUTANG ---
let piutangHutangData = null;
let phExpanded = new Set();

async function loadPiutangHutangDetail() {
    document.getElementById('piutangTableBody').innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--gray);">Memuat...</td></tr>';
    document.getElementById('hutangTableBody').innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--gray);">Memuat...</td></tr>';
    const result = await callGAS('generatePiutangHutangDetail', {}, 60000);
    if (!result.success) { showAlert('danger', 'Gagal: ' + result.message, 'piutangHutangAlert'); return; }
    piutangHutangData = result;
    phExpanded.clear();
    renderPiutangHutangDetail();
}

function togglePhRow(kind, idx) {
    const key = kind + '-' + idx;
    if (phExpanded.has(key)) phExpanded.delete(key); 
    else phExpanded.add(key);
    renderPiutangHutangDetail();
}

function renderPiutangHutangDetail() {
    if (!piutangHutangData) return;
    document.getElementById('piutangTotal').textContent = 'Total Piutang: Rp ' + formatNumber(piutangHutangData.total_piutang);
    document.getElementById('hutangTotal').textContent = 'Total Hutang: Rp ' + formatNumber(piutangHutangData.total_hutang);

    const renderList = (list, kind, bodyId) => {
        const body = document.getElementById(bodyId);
        if (list.length === 0) { body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--gray);">Tidak ada saldo</td></tr>'; return; }
        body.innerHTML = list.map((party, idx) => {
            const key = kind + '-' + idx;
            const isOpen = phExpanded.has(key);
            let html = `<tr style="cursor:pointer;" onclick="togglePhRow('${kind}', ${idx})">
                <td>${isOpen ? '▼ ' : '▶ '}</td>
                <td>${party.nama}</td>
                <td style="text-align:right;font-weight:bold;">${formatNumber(party.saldo)}</td>
            </tr>`;
            if (isOpen) {
                html += party.detail.map(d => `<tr style="background:#f9fafb;">
                    <td></td>
                    <td colspan="1" style="color:var(--gray);font-size:13px;">${d.keterangan}</td>
                    <td style="text-align:right;color:var(--gray);font-size:13px;">${formatNumber(d.jumlah)}</td>
                </tr>`).join('');
            }
            return html;
        }).join('');
    };
    renderList(piutangHutangData.piutang, 'p', 'piutangTableBody');
    renderList(piutangHutangData.hutang, 'h', 'hutangTableBody');
}

function downloadPiutangHutangCsv(kind) {
    if (!piutangHutangData) { showAlert('danger', 'Belum ada data - klik Refresh dulu', 'piutangHutangAlert'); return; }
    const list = kind === 'piutang' ? piutangHutangData.piutang : piutangHutangData.hutang;
    const rows = [];
    list.forEach(party => {
        party.detail.forEach(d => {
            rows.push([party.nama, party.saldo, d.keterangan, d.jumlah]);
        });
    });
    const label = kind === 'piutang' ? 'Customer' : 'Supplier';
    downloadCsv(kind + '-detail.csv', [label, 'Saldo Total', 'Keterangan Transaksi', 'Jumlah Transaksi'], rows);
}

// --- RECONCILIATION ---
let piutangReconSummary = null, hutangReconSummary = null;
let piutangReconDetailCache = {}, hutangReconDetailCache = {};
let piutangReconExpanded = new Set(), hutangReconExpanded = new Set();

async function loadPiutangReconciliationSummary(forceRefresh) {
    document.getElementById('piutangReconTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray);">Memuat...</td></tr>';
    const result = await callGAS('generatePiutangReconciliationSummary', forceRefresh ? { refresh: 'true' } : {}, 60000);
    if (!result.success) { showAlert('danger', 'Gagal: ' + result.message, 'piutangReconAlert'); return; }
    piutangReconSummary = result.data;
    piutangReconDetailCache = {}; 
    piutangReconExpanded = new Set();
    renderPiutangReconciliationSummary();
}

function renderPiutangReconciliationSummary() {
    if (!piutangReconSummary) return;
    const query = (document.getElementById('prSearch').value || '').toLowerCase();
    const filtered = piutangReconSummary.filter(c => c.customer.toLowerCase().includes(query));
    const body = document.getElementById('piutangReconTableBody');
    if (filtered.length === 0) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray);">Tidak ada data</td></tr>'; return; }
    body.innerHTML = filtered.map(c => {
        const isOpen = piutangReconExpanded.has(c.customer);
        let html = `<tr style="cursor:pointer;" onclick="togglePiutangReconRow('${c.customer.replace(/'/g, "\'")}')">
            <td>${isOpen ? '▼ ' : '▶ '}</td>
            <td>${c.customer}</td>
            <td style="text-align:right;">${c.jumlah_invoice}</td>
            <td style="text-align:right;">${c.jumlah_belum_lunas + c.jumlah_cek}</td>
            <td style="text-align:right;font-weight:bold;">${formatNumber(c.total_belum_lunas)}</td>
        </tr>`;
        if (isOpen) {
            const detail = piutangReconDetailCache[c.customer];
            if (!detail) {
                html += `<tr><td></td><td colspan="4" style="color:var(--gray);">Memuat rincian...</td></tr>`;
            } else {
                html += detail.map(r => `<tr style="background:#f9fafb;">
                    <td></td>
                    <td colspan="2" style="font-size:13px;">${r.no_invoice_piutang} - ${r.tanggal}</td>
                    <td style="text-align:right;font-size:13px;">${formatNumber(r.jumlah)}</td>
                    <td style="font-size:13px;font-weight:bold;color:${r.status === 'Lunas' ? 'var(--success)' : (r.status === 'CEK JUMLAH' ? 'var(--warning)' : 'var(--danger)')};">${r.status}${r.no_invoice_pembayaran ? ' - ' + r.no_invoice_pembayaran : ''}</td>
                </tr>`).join('');
            }
        }
        return html;
    }).join('');
}

async function togglePiutangReconRow(customer) {
    if (piutangReconExpanded.has(customer)) {
        piutangReconExpanded.delete(customer);
        renderPiutangReconciliationSummary();
        return;
    }
    piutangReconExpanded.add(customer);
    renderPiutangReconciliationSummary();
    if (!piutangReconDetailCache[customer]) {
        const result = await callGAS('generatePiutangReconciliation', { customer: customer }, 60000);
        piutangReconDetailCache[customer] = result.success ? result.data : [];
        renderPiutangReconciliationSummary();
    }
}

async function loadHutangReconciliationSummary(forceRefresh) {
    document.getElementById('hutangReconTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray);">Memuat...</td></tr>';
    const result = await callGAS('generateHutangReconciliationSummary', forceRefresh ? { refresh: 'true' } : {}, 60000);
    if (!result.success) { showAlert('danger', 'Gagal: ' + result.message, 'hutangReconAlert'); return; }
    hutangReconSummary = result.data;
    hutangReconDetailCache = {}; 
    hutangReconExpanded = new Set();
    renderHutangReconciliationSummary();
}

function renderHutangReconciliationSummary() {
    if (!hutangReconSummary) return;
    const query = (document.getElementById('hrSearch').value || '').toLowerCase();
    const filtered = hutangReconSummary.filter(s => s.supplier.toLowerCase().includes(query));
    const body = document.getElementById('hutangReconTableBody');
    if (filtered.length === 0) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray);">Tidak ada data</td></tr>'; return; }
    body.innerHTML = filtered.map(s => {
        const isOpen = hutangReconExpanded.has(s.supplier);
        let html = `<tr style="cursor:pointer;" onclick="toggleHutangReconRow('${s.supplier.replace(/'/g, "\'")}')">
            <td>${isOpen ? '▼ ' : '▶ '}</td>
            <td>${s.supplier}</td>
            <td style="text-align:right;">${s.jumlah_dokumen}</td>
            <td style="text-align:right;">${s.jumlah_belum_lunas}</td>
            <td style="text-align:right;font-weight:bold;">${formatNumber(s.total_belum_lunas)}</td>
        </tr>`;
        if (isOpen) {
            const detail = hutangReconDetailCache[s.supplier];
            if (!detail) {
                html += `<tr><td></td><td colspan="4" style="color:var(--gray);">Memuat rincian...</td></tr>`;
            } else {
                html += detail.map(r => `<tr style="background:#f9fafb;">
                    <td></td>
                    <td colspan="2" style="font-size:13px;">${r.no_dokumen_hutang} - ${r.tanggal}</td>
                    <td style="text-align:right;font-size:13px;">${formatNumber(r.jumlah)}</td>
                    <td style="font-size:13px;font-weight:bold;color:${r.status === 'Lunas' ? 'var(--success)' : 'var(--danger)'};">${r.status}${r.no_dokumen_pembayaran ? ' - ' + r.no_dokumen_pembayaran : ''}</td>
                </tr>`).join('');
            }
        }
        return html;
    }).join('');
}

async function toggleHutangReconRow(supplier) {
    if (hutangReconExpanded.has(supplier)) {
        hutangReconExpanded.delete(supplier);
        renderHutangReconciliationSummary();
        return;
    }
    hutangReconExpanded.add(supplier);
    renderHutangReconciliationSummary();
    if (!hutangReconDetailCache[supplier]) {
        const result = await callGAS('generateHutangReconciliation', { supplier: supplier }, 60000);
        hutangReconDetailCache[supplier] = result.success ? result.data : [];
        renderHutangReconciliationSummary();
    }
}

async function downloadReconciliationCsv(kind) {
    showAlert('info', 'Menyiapkan data lengkap untuk di-download, mohon tunggu (bisa sampai beberapa menit)...', kind === 'piutang' ? 'piutangReconAlert' : 'hutangReconAlert');
    if (kind === 'piutang') {
        const result = await callGAS('generatePiutangReconciliation', {}, 300000);
        if (!result.success) { showAlert('danger', 'Gagal: ' + result.message, 'piutangReconAlert'); return; }
        const rows = result.data.map(r => [r.no_invoice_piutang, r.customer, r.tanggal, r.jumlah, r.no_invoice_pembayaran, r.status]);
        downloadCsv('piutang-per-invoice.csv', ['No Invoice Piutang', 'Customer', 'Tanggal', 'Jumlah', 'No Invoice Pembayaran', 'Status'], rows);
    } else {
        const result = await callGAS('generateHutangReconciliation', {}, 300000);
        if (!result.success) { showAlert('danger', 'Gagal: ' + result.message, 'hutangReconAlert'); return; }
        const rows = result.data.map(r => [r.no_dokumen_hutang, r.supplier, r.tanggal, r.jumlah, r.no_dokumen_pembayaran, r.status]);
        downloadCsv('hutang-per-dokumen.csv', ['No Dokumen Hutang', 'Supplier', 'Tanggal', 'Jumlah', 'No Dokumen Pembayaran', 'Status'], rows);
    }
}
