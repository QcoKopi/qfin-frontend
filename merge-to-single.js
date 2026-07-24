#!/usr/bin/env node
/**
 * QFin Merge Script
 * Menggabungkan semua file modular JS + CSS + HTML jadi 1 file HTML utuh
 * Usage: node merge-to-single.js
 * Output: dist/qfin-single.html
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'dist';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'qfin-single.html');

// File yang akan di-merge (urutan penting!)
const JS_FILES = [
  'qfin-core.js',
  'qfin-ui.js',
  'qfin-auth.js',
  'qfin-assembly.js',
  'qfin-purchasing.js',
  'qfin-sales.js',
  'qfin-finance.js',
  'qfin-inventory.js',
  'qfin-masterdata.js',
  'qfin-pricelist.js',
  'qfin-reports.js',
  'qfin-init.js'
];

function readFile(filename) {
  try {
    return fs.readFileSync(filename, 'utf-8');
  } catch (e) {
    console.error(`❌ Error reading ${filename}:`, e.message);
    return '';
  }
}

function merge() {
  console.log('🔧 QFin Merge Script');
  console.log('====================');

  // Baca HTML shell
  let htmlContent = readFile('qfin.html');
  if (!htmlContent) {
    console.error('❌ qfin.html not found!');
    process.exit(1);
  }

  // Baca CSS
  const cssContent = readFile('qfin-style.css');

  // Merge semua JS
  let mergedJs = '';
  JS_FILES.forEach(file => {
    const content = readFile(file);
    if (content) {
      mergedJs += `\n/* ===== ${file} ===== */\n`;
      mergedJs += content;
      mergedJs += '\n';
      console.log(`✅ Merged: ${file}`);
    } else {
      console.log(`⚠️  Skipped: ${file} (not found)`);
    }
  });

  // Ganti <link rel="stylesheet"> dengan <style> inline
  htmlContent = htmlContent.replace(
    /<link rel="stylesheet" href="qfin-style.css">/,
    `<style>\n${cssContent}\n</style>`
  );

  // Ganti semua <script src="..."> dengan 1 <script> inline
  const scriptRegex = /<script src="[^"]+"><\/script>/g;
  const scripts = htmlContent.match(scriptRegex) || [];

  // Hapus semua script tags
  htmlContent = htmlContent.replace(scriptRegex, '');

  // Tambahkan merged JS sebelum </body>
  htmlContent = htmlContent.replace(
    '</body>',
    `  <script>\n${mergedJs}\n  </script>\n</body>`
  );

  // Buat output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Tulis output file
  fs.writeFileSync(OUTPUT_FILE, htmlContent);

  // Stats
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeKb = (stats.size / 1024).toFixed(2);

  console.log('');
  console.log('✅ Merge complete!');
  console.log(`📄 Output: ${OUTPUT_FILE}`);
  console.log(`📊 Size: ${sizeKb} KB`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   - File ini bisa di-upload langsung ke GAS sebagai Web App');
  console.log('   - Atau di-host di server statis mana saja');
  console.log('   - Untuk development, tetap gunakan file modular');
}

merge();
