// ============================================================
// QFIN SALES - Penjualan, Invoice, Kemasan, HPP
// Counterpart: Sales.gs
// ============================================================

let penjualanDetails = [];
let lastSubmittedSaleData = null;

function extractBeratGramDariNama(namaBarang) {
    if (!namaBarang) return 0;
    const nama = namaBarang.toString();
    const matchG = nama.match(/(\d+(?:\.\d+)?)\s*(?:gram|gr|g)\b/i);
    if (matchG) return Math.round(parseFloat(matchG[1]));
    const matchKg = nama.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
    if (matchKg) return Math.round(parseFloat(matchKg[1]) * 1000);
    const matchNum = nama.match(/\b(\d{2,4})\b/);
    if (matchNum) return parseInt(matchNum[1], 10);
    const upperNama = nama.toUpperCase();
    if (upperNama.includes('RB') || upperNama.includes('HOUSEBLEND') || upperNama.includes('HOUSE BLEND') || upperNama.includes('HB')) return 1000;
    return 0;
}

function filterKemasanDropdown(id) {
    const barangInput = document.getElementById(`pen-barang-${id}`);
    const list = document.getElementById(`pen-kemasan-${id}-list`);
    if (!barangInput || !list) return;

    const namaBarang = (barangInput.value || '').trim();
    const barangId = barangInput.dataset.value;

    const selectedProductObj = (masterData.products || []).find(p => (p.id_produk || p.id) === barangId || (p.nama_produk || p.nama) === namaBarang);
    const kategoriBarang = ((selectedProductObj && selectedProductObj.kategori) || '').toString().toUpperCase();
    const isKopi = kategoriBarang.includes('KOPI') || namaBarang.toUpperCase().includes('KOPI');

    const qty = parseFloat(document.getElementById(`pen-qty-${id}`)?.value) || 0;
    const beratGram = extractBeratGramDariNama(namaBarang);
    const totalGram = beratGram * qty;

    if (!barangId) {
        list.innerHTML = '<div class="dropdown-item disabled">Pilih barang dulu</div>';
        list.classList.add('show');
        return;
    }

    let kemasanList = masterData.kemasan || [];

    if (isKopi) {
        kemasanList = kemasanList.filter(k => {
            const namaKemasan = (k.nama_kemasan || k.nama || '').toString().toLowerCase();
            const is250Ml = namaKemasan.includes('250') && (namaKemasan.includes('ml') || namaKemasan.includes('botol'));
            return !is250Ml;
        });
    }

    if (totalGram > 0) {
        kemasanList = kemasanList.filter(k => {
            const kap = parseFloat(k.kapasitas || k.kapasitas_gram || 0);
            const sat = (k.satuan || '').toString().toLowerCase();
            const kapGram = sat.startsWith('kg') ? kap * 1000 : kap;
            return kapGram <= totalGram;
        });
    }

    if (kemasanList.length === 0) {
        const allKemasan = masterData.kemasan || [];
        if (allKemasan.length === 0) {
            list.innerHTML = '<div class="dropdown-item disabled">Tidak ada kemasan yang cocok</div>';
        } else {
            list.innerHTML = '<div class="dropdown-item disabled" style="font-style:italic;">Filter terlalu ketat — menampilkan semua kemasan:</div>' +
            allKemasan.map(k => {
                const kemasanId = k.id_kemasan || k.id;
                const namaKemasan = k.nama_kemasan || k.nama;
                const kap = parseFloat(k.kapasitas || k.kapasitas_gram || 0);
                const sat = (k.satuan || '').toString().toLowerCase();
                const kapGram = sat.startsWith('kg') ? kap * 1000 : kap;
                const jumlahKemasan = (totalGram > 0 && kapGram > 0) ? Math.ceil(totalGram / kapGram) : '?';
                return `<div class="dropdown-item" onclick="selectKemasan(${id}, '${kemasanId}', '${namaKemasan.replace(/'/g, "\'")}', ${kapGram}, ${jumlahKemasan})">${namaKemasan} (${kap}${k.satuan || ''}) &rarr; ${jumlahKemasan} pcs</div>`;
            }).join('');
        }
    } else {
        list.innerHTML = kemasanList.map(k => {
            const kemasanId = k.id_kemasan || k.id;
            const namaKemasan = k.nama_kemasan || k.nama;
            const kap = parseFloat(k.kapasitas || k.kapasitas_gram || 0);
            const sat = (k.satuan || '').toString().toLowerCase();
            const kapGram = sat.startsWith('kg') ? kap * 1000 : kap;
            const jumlahKemasan = (totalGram > 0 && kapGram > 0) ? Math.ceil(totalGram / kapGram) : '?';
            return `<div class="dropdown-item" onclick="selectKemasan(${id}, '${kemasanId}', '${namaKemasan.replace(/'/g, "\'")}', ${kapGram}, ${jumlahKemasan})">${namaKemasan} (${kap}${k.satuan || ''}) &rarr; ${jumlahKemasan} pcs</div>`;
        }).join('');
    }
    list.classList.add('show');
}

function selectKemasan(id, kemasanId, namaKemasan, kapasitasGram, jumlahAuto) {
    const kemasanInput = document.getElementById(`pen-kemasan-${id}`);
    const jumlahInput = document.getElementById(`pen-jumlah-kemasan-${id}`);
    const list = document.getElementById(`pen-kemasan-${id}-list`);

    if (kemasanInput) {
        kemasanInput.value = namaKemasan;
        kemasanInput.dataset.value = kemasanId;
    }
    if (jumlahInput) {
        jumlahInput.value = jumlahAuto;
    }
    if (list) list.classList.remove('show');
}

function onPenjualanQtyChange(id) {
    const kemasanInput = document.getElementById(`pen-kemasan-${id}`);
    const jumlahKemasanInput = document.getElementById(`pen-jumlah-kemasan-${id}`);
    if (kemasanInput) {
        kemasanInput.value = '';
        kemasanInput.dataset.value = '';
    }
    if (jumlahKemasanInput) jumlahKemasanInput.value = '';
}

function addPenjualanDetail() {
    const id = penjualanDetails.length;
    const div = document.createElement('div'); 
    div.className = 'detail-row'; 
    div.id = `pen-detail-${id}`;
    div.innerHTML = `
        <div class="detail-row-header"><span><strong>Barang #${id + 1}</strong></span><button class="btn-remove" onclick="removePenjualanDetail(${id})">Hapus</button></div>
        <div class="alert alert-danger" id="pen-nostock-${id}" style="display:none;"></div>
        <div class="form-grid">
            <div class="form-group"><label class="mandatory-label">Nama Barang</label><div class="searchable-dropdown"><input type="text" id="pen-barang-${id}" placeholder="Cari barang..." oninput="searchDropdown('pen-barang-${id}', 'products')" onfocus="showDropdown('pen-barang-${id}')"><div class="dropdown-list" id="pen-barang-${id}-list"></div></div></div>
            <div class="form-group"><label class="mandatory-label">Jumlah</label><input type="number" id="pen-qty-${id}" step="0.01" placeholder="0" onchange="validateQtyAgainstStock(${id}); calculatePenjualanItemTotal(${id}); onPenjualanQtyChange(${id})"></div>
            <div class="form-group"><label class="mandatory-label">Harga Satuan</label><input type="number" id="pen-price-${id}" step="1000" placeholder="0" onchange="calculatePenjualanItemTotal(${id})"></div>
            <div class="form-group"><label>Total</label><input type="number" id="pen-total-${id}" readonly placeholder="0"></div>
            <div class="form-group"><label>Diskon</label><input type="number" id="pen-diskon-${id}" step="1000" value="0" onchange="calculatePenjualanItemTotal(${id})"></div>
            <div class="form-group"><label>HPP (Auto)</label><input type="number" id="pen-hpp-${id}" readonly placeholder="0"></div>
            <div class="form-group"><label class="mandatory-label">Kemasan</label><div class="searchable-dropdown"><input type="text" id="pen-kemasan-${id}" placeholder="Pilih kemasan..." oninput="filterKemasanDropdown(${id})" onfocus="filterKemasanDropdown(${id})"><div class="dropdown-list" id="pen-kemasan-${id}-list"></div></div></div>
            <div class="form-group"><label class="mandatory-label">Jumlah Kemasan</label><input type="number" id="pen-jumlah-kemasan-${id}" step="1" placeholder="0" readonly style="background:#f8f9fa;"></div>
            <div class="form-group">
                <label class="mandatory-label">Batch No</label>
                <input type="text" id="pen-batch-${id}" placeholder="Batch No" list="pen-batch-list-${id}">
                <datalist id="pen-batch-list-${id}"></datalist>
                <small id="pen-stock-${id}" style="color:var(--gray);font-size:11px;"></small>
            </div>
        </div>`;
    document.getElementById('penjualanDetails').appendChild(div);
    penjualanDetails.push(id);
}

function removePenjualanDetail(id) { 
    const el = document.getElementById(`pen-detail-${id}`); 
    if (el) el.remove(); 
    penjualanDetails = penjualanDetails.filter(i => i !== id); 
    calculatePenjualanSummary(); 
}

async function calculatePenjualanHPP(id) {
    const barangInput = document.getElementById(`pen-barang-${id}`);
    const sku = barangInput?.dataset.value; 
    if (!sku) return;

    const pembayaranSection = document.getElementById('penPembayaranSection');
    if (pembayaranSection && pembayaranSection.style.display === 'none') pembayaranSection.style.display = '';

    const now = Date.now();
    let result, priceResult, batchResult, stockResult;

    if (hppCache[sku] && (now - hppCache[sku].timestamp) < HPP_CACHE_TTL) {
        const cached = hppCache[sku];
        result = cached.hppResult;
        priceResult = cached.priceResult;
        batchResult = cached.batchResult;
        stockResult = cached.stockResult;
    } else {
        [result, priceResult, batchResult, stockResult] = await Promise.all([
            callGAS('getHPP', { id_produk: sku }),
            callGAS('getPricelistPrice', { id_produk: sku }),
            callGAS('getBatchesForProduk', { id_produk: sku }),
            callGAS('getStock', { id_produk: sku })
        ]);
        hppCache[sku] = {
            hppResult: result,
            priceResult: priceResult,
            batchResult: batchResult,
            stockResult: stockResult,
            timestamp: now
        };
    }

    if (result.success && result.data) { 
        const hpp = result.data.hpp_per_unit || 0; 
        const hppInput = document.getElementById(`pen-hpp-${id}`); 
        if (hppInput) hppInput.value = hpp; 
    }

    const priceInput = document.getElementById(`pen-price-${id}`);
    if (priceInput && priceResult.success && priceResult.data && priceResult.data.harga_jual) {
        priceInput.value = priceResult.data.harga_jual;
        calculatePenjualanItemTotal(id);
    }

    const datalist = document.getElementById(`pen-batch-list-${id}`);
    const batchInput = document.getElementById(`pen-batch-${id}`);
    const batches = batchResult.success ? batchResult.data : [];
    if (datalist) {
        datalist.innerHTML = batches.map(b => `<option value="${b.batch_no}">${b.tanggal || ''} &mdash; sisa ${formatNumber(b.sisa)} dari ${formatNumber(b.jumlah_produksi)}</option>`).join('');
    }
    if (batchInput) batchInput.value = batches.length > 0 ? batches[0].batch_no : '';

    const stockLabel = document.getElementById(`pen-stock-${id}`);
    const saldo = stockResult.success && stockResult.data ? (parseFloat(stockResult.data.saldo) || 0) : 0;
    if (stockLabel) stockLabel.textContent = `Stok saat ini: ${formatNumber(saldo)}`;
    const qtyInputForMax = document.getElementById(`pen-qty-${id}`);
    if (qtyInputForMax) qtyInputForMax.max = saldo;

    const nostockBanner = document.getElementById(`pen-nostock-${id}`);
    const fieldsToToggle = ['pen-qty', 'pen-price', 'pen-diskon', 'pen-batch'].map(p => document.getElementById(`${p}-${id}`));
    if (saldo <= 0) {
        if (nostockBanner) { 
            nostockBanner.style.display = ''; 
            nostockBanner.textContent = `Stok kosong. Buat Assembly dulu sebelum menjual.`; 
        }
        fieldsToToggle.forEach(f => { if (f) { f.disabled = true; f.value = ''; } });
    } else {
        if (nostockBanner) nostockBanner.style.display = 'none';
        fieldsToToggle.forEach(f => { if (f) f.disabled = false; });
    }
}

function onPenTypeBayarChange() {
    const tipe = document.getElementById('penTypeBayar').value;
    const totalBayarGroup = document.getElementById('penTotalBayarGroup');
    if (tipe === 'Lunas Transfer' || tipe === 'Lunas Tunai') {
        totalBayarGroup.style.display = '';
        const totalBayarInput = document.getElementById('penTotalBayar');
        if (totalBayarInput && !totalBayarInput.value) {
            let totalTagihan = 0;
            penjualanDetails.forEach(id => { totalTagihan += parseFloat(document.getElementById(`pen-total-${id}`)?.value) || 0; });
            totalBayarInput.value = totalTagihan;
        }
    } else {
        totalBayarGroup.style.display = 'none';
    }
}

function validateQtyAgainstStock(id) {
    const barangInput = document.getElementById(`pen-barang-${id}`);
    const sku = barangInput?.dataset.value;
    const qtyInput = document.getElementById(`pen-qty-${id}`);
    if (!sku || !stockCache || !qtyInput) return;
    const maxStok = stockCache[sku] || 0;
    const entered = parseFloat(qtyInput.value) || 0;
    if (entered > maxStok) {
        qtyInput.value = maxStok;
        showAlert('warning', `Jumlah dibatasi ke ${formatNumber(maxStok)} - sisa stok untuk barang ini.`, 'penjualanAlert');
    }
}

function calculatePenjualanItemTotal(id) {
    const qty = parseFloat(document.getElementById(`pen-qty-${id}`)?.value) || 0;
    const price = parseFloat(document.getElementById(`pen-price-${id}`)?.value) || 0;
    const diskon = parseFloat(document.getElementById(`pen-diskon-${id}`)?.value) || 0;
    const total = (qty * price) - diskon;
    const totalInput = document.getElementById(`pen-total-${id}`); 
    if (totalInput) totalInput.value = total;
    calculatePenjualanSummary();
}

function calculatePenjualanSummary() {
    let totalTagihan = 0, totalHPP = 0;
    penjualanDetails.forEach(id => {
        const total = parseFloat(document.getElementById(`pen-total-${id}`)?.value) || 0;
        const qty = parseFloat(document.getElementById(`pen-qty-${id}`)?.value) || 0;
        const hpp = parseFloat(document.getElementById(`pen-hpp-${id}`)?.value) || 0;
        totalTagihan += total; 
        totalHPP += qty * hpp;
    });
    document.getElementById('penjualanSummary').style.display = 'block';
    document.getElementById('penTotalTagihan').textContent = 'Rp ' + formatNumber(totalTagihan);
    document.getElementById('penTotalHPP').textContent = 'Rp ' + formatNumber(totalHPP);
    document.getElementById('penMargin').textContent = 'Rp ' + formatNumber(totalTagihan - totalHPP);
}

async function submitPenjualan() {
    clearMandatoryErrors('tab-penjualan');
    if (!validateMandatory('tab-penjualan', 'penjualanAlert')) return;
    if (penjualanDetails.length === 0) {
        showAlert('danger', 'Tambahkan minimal 1 barang', 'penjualanAlert'); 
        return;
    }
    const details = penjualanDetails.map(id => ({
        nama_barang: document.getElementById(`pen-barang-${id}`)?.value || '',
        id_produk: document.getElementById(`pen-barang-${id}`)?.dataset.value || '',
        jumlah: parseFloat(document.getElementById(`pen-qty-${id}`)?.value) || 0,
        harga_satuan: parseFloat(document.getElementById(`pen-price-${id}`)?.value) || 0,
        total: parseFloat(document.getElementById(`pen-total-${id}`)?.value) || 0,
        diskon: parseFloat(document.getElementById(`pen-diskon-${id}`)?.value) || 0,
        kemasan: document.getElementById(`pen-kemasan-${id}`)?.value || '',
        jumlah_kemasan: parseFloat(document.getElementById(`pen-jumlah-kemasan-${id}`)?.value) || 0,
        batch_no: document.getElementById(`pen-batch-${id}`)?.value || ''
    })).filter(d => d.nama_barang);
    const totalTagihan = details.reduce((sum, d) => sum + (d.total - d.diskon), 0);
    const totalBayar = parseFloat(document.getElementById('penTotalBayar')?.value) || 0;
    const data = {
        tanggal: document.getElementById('penDate').value, 
        jatuh_tempo: '',
        cost_center: 'Q.Co', 
        salesman: document.getElementById('penSalesman').value,
        no_invoice: document.getElementById('penInvoice').value, 
        kode_transaksi: document.getElementById('penKodeTransaksi').value,
        customer: document.getElementById('penCustomer').value, 
        total_tagihan: totalTagihan,
        type_pembayaran: document.getElementById('penTypeBayar').value, 
        total_bayar: totalBayar,
        tanggal_pembayaran: totalBayar > 0 ? document.getElementById('penDate').value : '',
        status_bayar: (document.getElementById('penTypeBayar').value === 'Lunas Transfer' || document.getElementById('penTypeBayar').value === 'Lunas Tunai') ? 'LUNAS' : 'Piutang',
        details: details
    };
    const result = await callGAS('submitPenjualan', data);
    if (result.success) {
        let msg = 'Penjualan berhasil! ID: ' + result.id_penjualan;
        if (result.stock_warnings && result.stock_warnings.length > 0) {
            showAlert('warning', 'Tersimpan, tapi stok kurang untuk: ' + result.stock_warnings.join('; '), 'penjualanAlert');
        } else {
            showAlert('success', msg, 'penjualanAlert');
        }
        lastSubmittedSaleData = data;
        document.getElementById('btnPrintInvoice').style.display = '';
        printInvoice(data);
        clearPenjualanForm();
    } else {
        showAlert('danger', 'Gagal: ' + result.message, 'penjualanAlert');
    }
}

function printInvoice(saleData) {
    const customer = (masterData.customers || []).find(c => c.nama_customer === saleData.customer) || {};
    const items = saleData.details || [];
    const subTotal = items.reduce((sum, d) => sum + (d.total || 0), 0);
    const diskon = items.reduce((sum, d) => sum + (d.diskon || 0), 0);
    const ppn = 0;
    const totalInvoice = subTotal - diskon + ppn;
    const tglInv = saleData.tanggal ? new Date(saleData.tanggal).toLocaleDateString('id-ID') : '';
    const tglJatuhTempo = saleData.jatuh_tempo ? new Date(saleData.jatuh_tempo).toLocaleDateString('id-ID') : '';

    const rowsHtml = items.map((d, i) => `
        <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${d.nama_barang}${d.kemasan ? ' (' + d.kemasan + ')' : ''}</td>
            <td style="text-align:center;">${d.jumlah}</td>
            <td style="text-align:right;">${(d.harga_satuan || 0).toLocaleString('id-ID')}</td>
            <td style="text-align:right;">${(d.total || 0).toLocaleString('id-ID')}</td>
        </tr>`).join('');
    const emptyRowsNeeded = Math.max(0, 15 - items.length);
    const emptyRowsHtml = Array(emptyRowsNeeded).fill('<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>').join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${saleData.no_invoice}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #222; }
        .invoice-box { max-width: 900px; margin: 0 auto; border: 3px solid #2451a6; padding: 24px; }
        .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .company-name { color: #2451a6; font-size: 24px; font-weight: bold; margin: 0; }
        .company-address { font-size: 13px; margin: 4px 0 0; }
        .nomor-inv { font-weight: bold; font-size: 13px; }
        .invoice-title { text-align: center; color: #b5651d; font-size: 32px; font-weight: bold; font-style: italic; margin: 10px 0; }
        hr { border: none; border-top: 2px solid #2451a6; margin: 12px 0; }
        .info-row { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
        .info-box { border: 1px solid #999; border-radius: 8px; padding: 10px 14px; font-size: 13px; flex: 1; }
        .info-box div { margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #999; padding: 5px 8px; }
        th { background: #eef2fb; text-align: left; }
        .totals-table { width: 260px; margin-left: auto; margin-top: 10px; }
        .totals-table td { border: 1px solid #999; padding: 5px 8px; }
        .totals-table td:first-child { font-weight: bold; }
        .totals-table td:last-child { text-align: right; }
        .payment-info { font-size: 12px; margin-top: 16px; }
        .signature { text-align: right; margin-top: 60px; font-size: 13px; }
        .print-btn { margin: 16px auto; display: block; padding: 10px 24px; background: #2451a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
        @media print { .print-btn { display: none; } }
    </style></head><body>
    <button class="print-btn" onclick="window.print()">Cetak / Simpan sebagai PDF</button>
    <div class="invoice-box">
        <div class="header-row">
            <div>
                <p class="company-name">CV KEMARI SUKSES MAKMUR</p>
                <p class="company-address">Ruko CItralake Sawangan Blok E01 - 18 Bojongsari Depok</p>
            </div>
            <div class="nomor-inv">Nomor Inv : ${saleData.no_invoice || ''}</div>
        </div>
        <div class="invoice-title">INVOICE</div>
        <hr>
        <div class="info-row">
            <div class="info-box">
                <div><strong>Nama</strong> &nbsp; ${saleData.customer || ''}</div>
                <div><strong>Alamat</strong> &nbsp; ${customer.alamat || ''}</div>
                <div><strong>Tlp</strong> &nbsp;&nbsp;&nbsp; ${customer.telepon || ''}</div>
            </div>
            <div class="info-box">
                <div><strong>Tanggal Inv</strong> &nbsp; ${tglInv}</div>
                <div><strong>Tgl Jt Tempo</strong> &nbsp; ${tglJatuhTempo}</div>
                <div><strong>No PO</strong></div>
                <div><strong>No SJ</strong></div>
            </div>
        </div>
        <table>
            <thead><tr><th style="width:30px;">NO</th><th>Nama Barang</th><th style="width:60px;">QtY</th><th style="width:110px;">Harga / Unit</th><th style="width:120px;">TOTAL</th></tr></thead>
            <tbody>${rowsHtml}${emptyRowsHtml}</tbody>
        </table>
        <table class="totals-table">
            <tr><td>Sub Total</td><td>${subTotal.toLocaleString('id-ID', {minimumFractionDigits:2})}</td></tr>
            <tr><td>Diskon</td><td>${diskon.toLocaleString('id-ID', {minimumFractionDigits:2})}</td></tr>
            <tr><td>PPN</td><td>${ppn ? ppn.toLocaleString('id-ID', {minimumFractionDigits:2}) : ''}</td></tr>
            <tr><td>Total Invoice</td><td>${totalInvoice.toLocaleString('id-ID', {minimumFractionDigits:2})}</td></tr>
        </table>
        <div class="payment-info">
            Pembayaran hanya dilakukan transfer ke<br>
            <strong>Rekening BCA No: 8800983437</strong><br>
            atas nama: Ganjar Satyanagara
        </div>
        <div class="signature">Authorized Signature</div>
    </div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
}

function printLastInvoice() {
    if (lastSubmittedSaleData) printInvoice(lastSubmittedSaleData);
}

function clearPenjualanForm() {
    const penInvoice = document.getElementById('penInvoice');
    const penCustomer = document.getElementById('penCustomer');
    const penSalesman = document.getElementById('penSalesman');
    const penjualanDetailsEl = document.getElementById('penjualanDetails');
    const penKodeTransaksi = document.getElementById('penKodeTransaksi');
    const typeBayar = document.getElementById('penTypeBayar');
    const penTotalBayar = document.getElementById('penTotalBayar');
    const penTotalBayarGroup = document.getElementById('penTotalBayarGroup');
    const penPembayaranSection = document.getElementById('penPembayaranSection');
    const btnPrintInvoice = document.getElementById('btnPrintInvoice');
    const penjualanSummary = document.getElementById('penjualanSummary');

    if (penInvoice) penInvoice.value = ''; 
    if (penCustomer) penCustomer.value = '';
    if (penSalesman) penSalesman.value = ''; 
    if (penjualanDetailsEl) penjualanDetailsEl.innerHTML = '';
    if (penKodeTransaksi) penKodeTransaksi.value = 'Penjualan';
    if (typeBayar) typeBayar.value = '';
    if (penTotalBayar) penTotalBayar.value = '';
    if (penTotalBayarGroup) penTotalBayarGroup.style.display = 'none';
    if (penPembayaranSection) penPembayaranSection.style.display = 'none';
    if (btnPrintInvoice) btnPrintInvoice.style.display = 'none';
    lastSubmittedSaleData = null;
    penjualanDetails = []; 
    if (penjualanSummary) penjualanSummary.style.display = 'none';
    autoFillNextDoc('penInvoice', 'Penjualan_App', 'no_invoice');
}
