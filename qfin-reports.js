// ============================================================
// QFIN REPORTS - Neraca, Rugi Laba, Buku Besar
// Counterpart: Reports.gs
// ============================================================

let neracaReportData = null;
let rugiLabaReportData = null;

async function loadNeracaReport(forceRefresh) {
    if (!forceRefresh) {
        const cached = getCache('neracaReport');
        if (cached) {
            neracaReportData = cached.data;
            renderFinancialTable('neracaTable', cached.data);
            showAlert('info', `Data dari cache. Klik Refresh untuk data terbaru.`, 'neracaAlert');
            return;
        }
    }
    document.getElementById('neracaTableBody').innerHTML = '<tr><td>Menghitung...</td></tr>';
    const result = await callGAS('generateNeracaReport', {}, 90000);
    if (!result.success) { showAlert('danger', 'Gagal: ' + result.message, 'neracaAlert'); return; }
    neracaReportData = result;
    setCache('neracaReport', result);
    renderFinancialTable('neracaTable', result);
    if (result.balance) {
        showAlert('success', 'Neraca balance di semua kolom (selisih Rp 0).', 'neracaAlert');
    } else {
        const selisihText = Object.entries(result.selisih_per_kolom).map(([k, v]) => `${k}: Rp${formatNumber(v)}`).join(', ');
        showAlert('danger', 'Neraca TIDAK balance - selisih: ' + selisihText, 'neracaAlert');
    }
}

async function loadRugiLabaReport(forceRefresh) {
    if (!forceRefresh) {
        const cached = getCache('rugiLabaReport');
        if (cached) {
            rugiLabaReportData = cached.data;
            renderFinancialTable('rugiLabaTable', cached.data);
            showAlert('info', `Data dari cache. Klik Refresh untuk data terbaru.`, 'rugiLabaAlert');
            return;
        }
    }
    document.getElementById('rugiLabaTableBody').innerHTML = '<tr><td>Menghitung...</td></tr>';
    const result = await callGAS('generateRugiLabaReportDetailed', {}, 90000);
    if (!result.success) { showAlert('danger', 'Gagal: ' + result.message, 'rugiLabaAlert'); return; }
    rugiLabaReportData = result;
    setCache('rugiLabaReport', result);
    renderFinancialTable('rugiLabaTable', result);
}

function renderFinancialTable(tableId, report) {
    const head = document.getElementById(tableId).querySelector('thead');
    const body = document.getElementById(tableId + 'Body');
    const cols = report.columns;
    head.innerHTML = '<tr><th></th>' + cols.map(c => `<th style="text-align:right;">${c}</th>`).join('') + '</tr>';
    body.innerHTML = report.rows.map(r => {
        if (r.separator) return `<tr><td colspan="${cols.length + 1}" style="border:none;height:10px;padding:0;"></td></tr>`;
        const style = r.isTotal ? 'font-weight:bold;background:#f4f6fb;' : '';
        return `<tr style="${style}"><td>${r.label}</td>` + cols.map(c => `<td style="text-align:right;">${formatNumber(r.values[c])}</td>`).join('') + `</tr>`;
    }).join('');
}

function printFinancialReport(type) {
    const report = type === 'neraca' ? neracaReportData : rugiLabaReportData;
    const title = type === 'neraca' ? 'NERACA' : 'LAPORAN RUGI LABA';
    if (!report) { showAlert('danger', 'Belum ada data - klik Refresh dulu', type === 'neraca' ? 'neracaAlert' : 'rugiLabaAlert'); return; }
    const cols = report.columns;
    const rowsHtml = report.rows.map(r => {
        if (r.separator) return `<tr><td colspan="${cols.length + 1}" style="border:none;height:8px;"></td></tr>`;
        const style = r.isTotal ? 'font-weight:bold;background:#eef2fb;' : '';
        return `<tr style="${style}"><td>${r.label}</td>` + cols.map(c => `<td style="text-align:right;">${formatNumber(r.values[c])}</td>`).join('') + `</tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #222; font-size: 12px; }
        h1 { color: #2451a6; text-align: center; }
        .tanggal { text-align: center; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 5px 8px; }
        th { background: #eef2fb; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
        .print-btn { margin: 16px auto; display: block; padding: 10px 24px; background: #2451a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
        @media print { .print-btn { display: none; } body { font-size: 10px; } }
    </style></head><body>
    <button class="print-btn" onclick="window.print()">Cetak / Simpan sebagai PDF</button>
    <h1>${title}</h1>
    <div class="tanggal">Per ${new Date().toLocaleDateString('id-ID')}</div>
    <table>
        <thead><tr><th style="text-align:left;"></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${rowsHtml}</tbody>
    </table>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
}

let bukuBesarData = null;

async function loadBukuBesar() {
    document.getElementById('bukuBesarTableBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">Memuat...</td></tr>';
    const result = await callGAS('getBukuBesar', {}, 90000);
    if (!result.success) { showAlert('danger', 'Gagal: ' + result.message, 'bukuBesarAlert'); return; }
    bukuBesarData = result.data;
    const akunSet = new Set();
    bukuBesarData.forEach(e => { akunSet.add(e.akun_debit); akunSet.add(e.akun_kredit); });
    const select = document.getElementById('bbAkunFilter');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Semua Akun</option>' + Array.from(akunSet).sort().map(a => `<option value="${a.replace(/"/g, '&quot;')}">${a}</option>`).join('');
    select.value = currentValue;
    renderBukuBesar();
}

function renderBukuBesar() {
    if (!bukuBesarData) return;
    const akunFilter = document.getElementById('bbAkunFilter').value;
    const query = (document.getElementById('bbSearch').value || '').toLowerCase();
    const filtered = bukuBesarData.filter(e => {
        if (akunFilter && e.akun_debit !== akunFilter && e.akun_kredit !== akunFilter) return false;
        if (query) {
            const haystack = (e.keterangan + ' ' + e.pihak + ' ' + e.sumber + ' ' + e.referensi).toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        return true;
    });
    document.getElementById('bbCount').textContent = `Menampilkan ${filtered.length} dari ${bukuBesarData.length} entri` + (akunFilter ? ` - total: Rp ${formatNumber(filtered.reduce((s, e) => s + e.jumlah, 0))}` : '');
    const body = document.getElementById('bukuBesarTableBody');
    if (filtered.length === 0) { body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">Tidak ada data</td></tr>'; return; }
    body.innerHTML = filtered.map(e => `<tr>
        <td>${e.tanggal}</td>
        <td>${e.akun_debit}</td>
        <td>${e.akun_kredit}</td>
        <td style="text-align:right;">${formatNumber(e.jumlah)}</td>
        <td>${e.keterangan}</td>
        <td>${e.pihak || ''}</td>
        <td>${e.sumber}</td>
        <td>${e.referensi}</td>
    </tr>`).join('');
}

function downloadBukuBesarCsv() {
    if (!bukuBesarData || bukuBesarData.length === 0) { showAlert('danger', 'Belum ada data - klik Refresh dulu', 'bukuBesarAlert'); return; }
    const akunFilter = document.getElementById('bbAkunFilter').value;
    const query = (document.getElementById('bbSearch').value || '').toLowerCase();
    const filtered = bukuBesarData.filter(e => {
        if (akunFilter && e.akun_debit !== akunFilter && e.akun_kredit !== akunFilter) return false;
        if (query) {
            const haystack = (e.keterangan + ' ' + e.pihak + ' ' + e.sumber + ' ' + e.referensi).toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        return true;
    });
    const rows = filtered.map(e => [e.tanggal, e.akun_debit, e.akun_kredit, e.jumlah, e.keterangan, e.pihak, e.sumber, e.referensi]);
    downloadCsv('buku-besar.csv', ['Tanggal', 'Akun Debit', 'Akun Kredit', 'Jumlah', 'Keterangan', 'Pihak', 'Sumber', 'Referensi'], rows);
}
