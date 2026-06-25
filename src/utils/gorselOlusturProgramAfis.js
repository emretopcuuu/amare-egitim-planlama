// "Program İçeriği" afişi — deterministik Canvas (AI YOK).
// Dikey zaman çizelgesi: her satır = saat + aktivite başlığı + (atanmış) konuşmacı foto/ad/rol + alt notlar.
// Siyah & altın marka dili. Yükseklik satır sayısına göre dinamik.
import { imgYukle as urlToImage } from './imgYukle';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const tarihYaz = (tarih, gun) => {
  const m = String(tarih || '').split('.');
  if (m.length >= 2) {
    const g = parseInt(m[0], 10), ay = parseInt(m[1], 10);
    if (g && ay >= 1 && ay <= 12) return `${g} ${AYLAR[ay - 1]}${gun ? ' ' + gun : ''}`;
  }
  return `${tarih || ''}${gun ? ' ' + gun : ''}`.trim();
};

const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr);
  else { ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr); ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath(); }
};
const wrapText = (ctx, text, x, y, maxW, lh, maxLines = 3) => {
  const words = String(text || '').split(/\s+/); let line = '', yy = y, n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy); yy += lh; line = words[i]; n++;
      if (n >= maxLines - 1) { line = words.slice(i).join(' '); break; }
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, yy); yy += lh; }
  return yy;
};

export const gorselOlusturProgramAfis = async ({ egitim, programSatirlari = [] }) => {
  const W = 1080;
  const gold = '#d8b15a', goldRGB = '216,177,90', metin = '#ffffff', alt = '#cbc4b5';
  const rows = (programSatirlari || []).filter(r => r && (r.baslik || r.saat || r.konusmaci));
  const n = Math.max(rows.length, 1);

  // dinamik yükseklik
  const M = Math.round(W * 0.06);
  const headerH = Math.round(W * 0.62);
  const rowH = Math.round(W * 0.135);
  const footerH = Math.round(W * 0.11);
  const H = Math.max(1350, headerH + n * rowH + footerH);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── ZEMİN (siyah & altın) ──
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0b0d'); g.addColorStop(1, '#15110a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soluk One Team amblemi (üst)
  try {
    const wm = await urlToImage('/logos/oneteam-logo.png');
    const lw = W * 0.7, lh = lw * (wm.height / wm.width);
    ctx.save(); ctx.globalAlpha = 0.07; ctx.drawImage(wm, (W - lw) / 2, H * 0.04, lw, lh); ctx.restore();
  } catch {}

  // ── ÜST: logo + başlık ──
  let y = Math.round(W * 0.04);
  try {
    const logo = await urlToImage('/logos/oneteam-logo.png');
    const lh = Math.round(W * 0.075), lw = lh * (logo.width / logo.height);
    ctx.drawImage(logo, (W - lw) / 2, y, lw, lh);
    y += lh + Math.round(W * 0.03);
  } catch { y += Math.round(W * 0.07); }

  ctx.textAlign = 'center'; ctx.fillStyle = gold;
  const tSize = Math.round(W * 0.058);
  ctx.font = `800 ${tSize}px Georgia, serif`;
  const baslik = `${(egitim.etkinlikTuru || '').toLocaleUpperCase('tr-TR')} PROGRAM İÇERİĞİ`.trim().replace(/^PROGRAM/, 'PROGRAM');
  y = wrapText(ctx, baslik, W / 2, y + tSize, W - M * 2, tSize * 1.12, 2) + Math.round(W * 0.01);

  // şehir rozeti (gold pill) + tarih
  const sehir = (egitim.sehir || '').toLocaleUpperCase('tr-TR');
  ctx.font = `800 ${Math.round(W * 0.03)}px Arial`;
  const tarihTxt = tarihYaz(egitim.tarih, egitim.gun);
  const saatTxt = `${egitim.saat || ''}${egitim.bitisSaati ? ' - ' + egitim.bitisSaati : ''}`.trim();
  const rozetH = Math.round(W * 0.05);
  if (sehir) {
    const rw = ctx.measureText(sehir).width + Math.round(W * 0.05);
    const grup = rw + Math.round(W * 0.02) + ctx.measureText(`${tarihTxt}  ${saatTxt}`).width;
    let gx = (W - grup) / 2;
    ctx.fillStyle = gold; roundRect(ctx, gx, y, rw, rozetH, rozetH / 2); ctx.fill();
    ctx.fillStyle = '#2a1c06'; ctx.textBaseline = 'middle'; ctx.fillText(sehir, gx + rw / 2, y + rozetH / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; ctx.fillStyle = metin; ctx.font = `700 ${Math.round(W * 0.03)}px Arial`;
    ctx.fillText(tarihTxt, gx + rw + Math.round(W * 0.02), y + rozetH * 0.7);
    ctx.fillStyle = alt; ctx.font = `500 ${Math.round(W * 0.024)}px Arial`;
    ctx.fillText('  ' + saatTxt, gx + rw + Math.round(W * 0.02) + ctx.measureText(tarihTxt).width, y + rozetH * 0.7);
    ctx.textAlign = 'center';
  } else {
    ctx.fillStyle = metin; ctx.font = `700 ${Math.round(W * 0.03)}px Arial`;
    ctx.fillText(`${tarihTxt}  ${saatTxt}`, W / 2, y + rozetH * 0.7);
  }
  y += rozetH + Math.round(W * 0.03);

  // başlık altı altın çizgi
  ctx.fillStyle = gold; ctx.fillRect(M, y, W - M * 2, 2);
  y += Math.round(W * 0.015);

  // ── SATIRLAR (zaman çizelgesi) ──
  const rowsTop = y;
  const kullanilabilir = H - footerH - rowsTop;
  const gercekRowH = Math.min(rowH, Math.floor(kullanilabilir / n));
  const solW = Math.round(W * 0.36); // sol kolon (saat + başlık)
  const fotoCap = Math.round(gercekRowH * 0.5);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ry = rowsTop + i * gercekRowH;
    // zebra
    if (i % 2 === 1) { ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(0, ry, W, gercekRowH); }
    // ince ayraç
    ctx.fillStyle = 'rgba(216,177,90,0.18)'; ctx.fillRect(M, ry, W - M * 2, 1);

    const cy = ry + gercekRowH / 2;
    // SOL: saat + başlık
    let sy = ry + gercekRowH * 0.34;
    if (r.saat) {
      ctx.textAlign = 'left'; ctx.fillStyle = gold; ctx.font = `700 ${Math.round(W * 0.026)}px Arial`;
      ctx.fillText(r.saat, M, sy); sy += Math.round(W * 0.034);
    }
    ctx.fillStyle = metin; ctx.font = `700 ${Math.round(W * 0.027)}px Arial`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    wrapText(ctx, r.baslik || '', M, r.saat ? sy : cy + Math.round(W * 0.01), solW - Math.round(W * 0.02), Math.round(W * 0.032), 2);

    // SAĞ: konuşmacı foto + ad + rol (+ notlar)
    const k = r.konusmaci;
    const sagX = M + solW;
    if (k && (k.ad || k.fotoURL)) {
      const fx = sagX + fotoCap / 2, fcy = cy;
      // altın halka + foto
      ctx.beginPath(); ctx.arc(fx, fcy, fotoCap / 2 + 4, 0, Math.PI * 2); ctx.fillStyle = gold; ctx.fill();
      ctx.beginPath(); ctx.arc(fx, fcy, fotoCap / 2 + 1, 0, Math.PI * 2); ctx.fillStyle = '#15110a'; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(fx, fcy, fotoCap / 2, 0, Math.PI * 2); ctx.clip();
      if (k.fotoURL) {
        try { const im = await urlToImage(k.fotoURL); const md = Math.min(im.width, im.height);
          ctx.drawImage(im, (im.width - md) / 2, Math.max(0, (im.height - md) * 0.2), md, md, fx - fotoCap / 2, fcy - fotoCap / 2, fotoCap, fotoCap);
        } catch { ctx.fillStyle = '#555'; ctx.fillRect(fx - fotoCap / 2, fcy - fotoCap / 2, fotoCap, fotoCap); }
      } else { ctx.fillStyle = '#555'; ctx.fillRect(fx - fotoCap / 2, fcy - fotoCap / 2, fotoCap, fotoCap); }
      ctx.restore();
      // ad + rol
      const tx = sagX + fotoCap + Math.round(W * 0.025);
      const notlar = (k.notlar || []).filter(Boolean);
      const adY = notlar.length ? cy - Math.round(W * 0.012) : cy - Math.round(W * 0.004);
      ctx.textAlign = 'left'; ctx.fillStyle = metin; ctx.font = `700 ${Math.round(W * 0.026)}px Arial`;
      ctx.fillText((k.ad || '').toLocaleUpperCase('tr-TR'), tx, adY, W - tx - M);
      if (k.unvan) { ctx.fillStyle = gold; ctx.font = `500 ${Math.round(W * 0.021)}px Arial`; ctx.fillText(k.unvan, tx, adY + Math.round(W * 0.028), W - tx - M); }
      // alt notlar (panelist isimleri)
      if (notlar.length) {
        ctx.fillStyle = alt; ctx.font = `500 ${Math.round(W * 0.02)}px Arial`;
        notlar.slice(0, 3).forEach((nm, j) => ctx.fillText('• ' + nm, tx, adY + Math.round(W * 0.052) + j * Math.round(W * 0.026), W - tx - M));
      }
    } else {
      // konuşmacısız satır (Sunum Arası, Soru/Cevap vb.) — başlığı sağda da gösterme; sol başlık yeter
    }
  }

  // ── ALT: amare logosu ──
  try {
    const amare = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
    const ah = Math.round(W * 0.032), aw = Math.round(ah * (amare.width / amare.height));
    ctx.drawImage(amare, (W - aw) / 2, H - ah - Math.round(W * 0.025), aw, ah);
  } catch {}

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
};
