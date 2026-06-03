// Browser canvas simülasyonu — gerçek görsel üretim akışını test eder
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

const URLS = {
  furkan: 'https://storage.googleapis.com/amare-egitim-planlama.firebasestorage.app/konusmaci-fotolari/furkan_cite.jpg',
  senay: 'https://storage.googleapis.com/amare-egitim-planlama.firebasestorage.app/konusmaci-fotolari/senay_citim.jpg',
  ersel: 'https://storage.googleapis.com/amare-egitim-planlama.firebasestorage.app/konusmaci-fotolari/ersel_arican.jpg',
  arda: 'https://storage.googleapis.com/amare-egitim-planlama.firebasestorage.app/konusmaci-fotolari/arda_cakir.jpg',
};

console.log('═══ Foto yükleme + Canvas çizim testi ═══\n');

const results = {};
for (const [isim, url] of Object.entries(URLS)) {
  process.stdout.write(`  ${isim.padEnd(10)} `);
  try {
    const t0 = Date.now();
    const img = await loadImage(url);
    const tLoad = Date.now() - t0;
    process.stdout.write(`✓ yüklendi (${tLoad}ms, ${img.width}x${img.height}) `);

    // Canvas'a çizim testi
    const canvas = createCanvas(300, 300);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 300, 300);
    // toDataURL ile tainted-check yapabilir miyiz? Tainted ise hata atar
    try {
      const dataUrl = canvas.toDataURL();
      process.stdout.write(`✓ canvas çizim OK (${Math.round(dataUrl.length/1024)}KB)\n`);
      results[isim] = 'OK';
    } catch (e) {
      process.stdout.write(`✗ canvas TAINTED: ${e.message}\n`);
      results[isim] = 'TAINTED';
    }
  } catch (e) {
    process.stdout.write(`✗ HATA: ${e.message}\n`);
    results[isim] = 'FAIL: ' + e.message;
  }
}

console.log('\n═══ ÖZET ═══');
for (const [k, v] of Object.entries(results)) {
  console.log(`  ${k}: ${v}`);
}

// Şimdi tam görsel oluştur — kompozit test
console.log('\n═══ TAM AFIŞ ÜRETİMİ (mini) ═══');
try {
  const W = 1080, H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  // Mor arka plan
  ctx.fillStyle = '#3F1D6B';
  ctx.fillRect(0, 0, W, H);
  // Başlık
  ctx.fillStyle = '#F5D77A';
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('ONE TEAM İZMİR VİZYON GÜNÜ', W/2, 200);
  // 4 yuvarlak foto
  const fotoSize = 200;
  const startX = 100;
  const startY = 400;
  const gap = 30;
  for (let i = 0; i < Object.keys(URLS).length; i++) {
    const isim = Object.keys(URLS)[i];
    const url = URLS[isim];
    const x = startX + i * (fotoSize + gap);
    const y = startY;
    try {
      const img = await loadImage(url);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + fotoSize/2, y + fotoSize/2, fotoSize/2, 0, Math.PI*2);
      ctx.clip();
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim)/2;
      const sy = (img.height - minDim)/2;
      ctx.drawImage(img, sx, sy, minDim, minDim, x, y, fotoSize, fotoSize);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(x + fotoSize/2, y + fotoSize/2, fotoSize/2, 0, Math.PI*2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;
      ctx.stroke();
    } catch (e) {
      console.log(`    Foto ${isim} çizilemedi: ${e.message}`);
    }
  }
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync('test-afis.png', buf);
  console.log(`✓ Test afişi kaydedildi: scripts/test-afis.png (${Math.round(buf.length/1024)}KB)`);
} catch (e) {
  console.log(`✗ Kompozit hata: ${e.message}`);
}
