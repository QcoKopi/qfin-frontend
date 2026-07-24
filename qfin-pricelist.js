// ============================================================
// QFIN PRICELIST - Pricelist Generate & Save
// Counterpart: Pricelist.gs
// ============================================================

let pricelistData = null;

async function generatePricelistTable() {
    const cached = getCache('pricelist_data');
    if (cached) {
        pricelistData = cached;
        renderPricelistTable();
        showAlert('info', 'Pricelist dimuat dari cache. Klik Generate untuk data terbaru.', 'pricelistAlert');
        return;
    }
    document.getElementById('pricelistTableBody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);">Menghitung...</td></tr>';
    const result = await callGAS('generatePricelist', {
        markup_percent: document.getElementById('plMarkupDefault').value
    });
    if (result.success) {
        pricelistData = result.data;
        setCache('pricelist_data', pricelistData);
        renderPricelistTable();
    } else {
        showAlert('danger', 'Gagal generate: ' + result.message, 'pricelistAlert');
    }
}

function renderPricelistTable() {
    const body = document.getElementById('pricelistTableBody');
    if (!pricelistData) { body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);">Klik Generate untuk memuat pricelist</td></tr>'; return; }
    const query = (document.getElementById('plSearch').value || '').toLowerCase();
    const visibleIdx = pricelistData.map((r, i) => i).filter(i => pricelistData[i].nama_produk.toLowerCase().includes(query));
    if (visibleIdx.length === 0) { body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);">Tidak ada data</td></tr>'; return; }
    body.innerHTML = visibleIdx.map(i => {
        const r = pricelistData[i];
        return `<tr>
            <td>${r.nama_produk}</td>
            <td>${r.berat_kg}</td>
            <td><input type="number" value="${r.hpp_per_kg}" style="width:100px;" oninput="updatePricelistRow(${i}, 'hpp_per_kg', this.value)"></td>
            <td>${r.nama_kemasan || '-'}</td>
            <td><input type="number" value="${r.harga_kemasan}" style="width:100px;" oninput="updatePricelistRow(${i}, 'harga_kemasan', this.value)"></td>
            <td><input type="number" value="${r.markup_percent}" style="width:70px;" oninput="updatePricelistRow(${i}, 'markup_percent', this.value)"></td>
            <td id="pl-hasil-${i}" style="font-weight:bold;">Rp ${formatNumber(r.harga_jual)}</td>
        </tr>`;
    }).join('');
}

function updatePricelistRow(i, field, value) {
    const r = pricelistData[i];
    r[field] = parseFloat(value) || 0;
    const subtotal = (r.hpp_per_kg * r.berat_kg) + r.harga_kemasan;
    r.harga_jual = Math.round(r.nama_kemasan ? subtotal * (1 + r.markup_percent / 100) : subtotal);
    document.getElementById(`pl-hasil-${i}`).textContent = 'Rp ' + formatNumber(r.harga_jual);
}

async function savePricelistTable() {
    if (!pricelistData || pricelistData.length === 0) { showAlert('danger', 'Belum ada data untuk disimpan - klik Generate dulu', 'pricelistAlert'); return; }
    const trimmed = pricelistData.map(r => ({
        id_produk: r.id_produk, 
        berat_kg: r.berat_kg, 
        hpp_per_kg: r.hpp_per_kg,
        nama_kemasan: r.nama_kemasan, 
        harga_kemasan: r.harga_kemasan,
        markup_percent: r.markup_percent, 
        harga_jual: r.harga_jual
    }));
    const CHUNK_SIZE = 15;
    const chunks = [];
    for (let i = 0; i < trimmed.length; i += CHUNK_SIZE) chunks.push(trimmed.slice(i, i + CHUNK_SIZE));

    let totalSaved = 0;
    for (let i = 0; i < chunks.length; i++) {
        showAlert('info', `Menyimpan bagian ${i + 1}/${chunks.length}...`, 'pricelistAlert');
        const result = await callGAS('savePricelist', { items: JSON.stringify(chunks[i]), isFirstChunk: i === 0 ? 'true' : 'false' });
        if (!result.success) {
            showAlert('danger', `Gagal simpan bagian ${i + 1}/${chunks.length}: ${result.message} (${totalSaved} produk sebelumnya sudah tersimpan)`, 'pricelistAlert');
            return;
        }
        totalSaved += result.saved || 0;
    }
    showAlert('success', totalSaved + ' harga tersimpan. Harga jual di Penjualan akan otomatis pakai ini.', 'pricelistAlert');
    setCache('pricelist_data', pricelistData);
}

function printPricelist() {
    if (!pricelistData || pricelistData.length === 0) { showAlert('danger', 'Belum ada data untuk dicetak - klik Generate dulu', 'pricelistAlert'); return; }
    const printableData = pricelistData.filter(r => r.hpp_per_kg > 0);
    if (printableData.length === 0) { showAlert('danger', 'Semua produk masih HPP Rp0 - tidak ada yang bisa dicetak', 'pricelistAlert'); return; }
    const rowsHtml = printableData.map(r => `
        <tr>
            <td>${r.nama_produk}</td>
            <td style="text-align:center;">${r.berat_kg} kg</td>
            <td style="text-align:right;">${formatNumber(r.harga_jual)}</td>
        </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pricelist</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #222; }
        .box { max-width: 700px; margin: 0 auto; }
        h1 { color: #2451a6; text-align: center; }
        .tanggal { text-align: center; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { border: 1px solid #999; padding: 8px 10px; }
        th { background: #eef2fb; text-align: left; }
        .print-btn { margin: 16px auto; display: block; padding: 10px 24px; background: #2451a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
        @media print { .print-btn { display: none; } }
    </style></head><body>
    <button class="print-btn" onclick="window.print()">Cetak / Simpan sebagai PDF</button>
    <div class="box">
        <h1>PRICELIST</h1>
        <div class="tanggal">Berlaku sejak ${new Date().toLocaleDateString('id-ID')}</div>
        <table>
            <thead><tr><th>Produk</th><th style="text-align:center;">Berat</th><th style="text-align:right;">Harga (Rp)</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    </div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
}
