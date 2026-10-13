// "Program İçeriği" afişi — deterministik Canvas (AI YOK).
// Dikey zaman çizelgesi: her satır = saat + aktivite + (atanmış) konuşmacı foto/ad/rol + alt notlar.
// Temalı: Marka Afiş ile aynı palet/font/ayar mantığını kullanır (ekPrompt → varyasyon).
import { imgYukle as urlToImage } from './imgYukle';
import { paletKoyu, paletAdla, fontSec, gunCevir, ayarCikar, euSaatCevir, euBayrakCiz, dalgaliBayrakCiz } from './gorselOlusturMarkaAfis';
import { afisFontYukle } from './afisFontlari';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const tarihYaz = (tarih, gun) => {
  const m = String(tarih || '').split('.');
  if (m.length >= 2) {
    const g = parseInt(m[0], 10), ay = parseInt(m[1], 10);
    if (g && ay >= 1 && ay <= 12) return `${g} ${AYLAR[ay - 1]}${gun ? ' ' + gun : ''}`;
  }
  return `${tarih || ''}${gun ? ' ' + gun : ''}`.trim();
};
const renkAyarla = (hex, f) => {
  const n = (hex || '#000000').replace('#', '');
  const c = (i) => Math.max(0, Math.min(255, Math.round(parseInt(n.slice(i, i + 2), 16) * f)));
  return `#${[c(0), c(2), c(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};
const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr);
  else { ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr); ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath(); }
};
const cizYol = (ctx, cx, cy, half, sekil) => {
  ctx.beginPath();
  if (sekil === 'kare') { const r = half * 0.3, x = cx - half, y = cy - half, w = half * 2, h = half * 2; if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  else if (sekil === 'altigen') { for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 90); const px = cx + half * Math.cos(a), py = cy + half * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
  else ctx.arc(cx, cy, half, 0, Math.PI * 2);
};
// Uzun TEK kelime (ör. "LİSTE-REKLAM-DAVET(UYGULAMALI)") sarmalanamayıp sütunu
// taşırıyordu. Boşluk yoksa tireden, o da yetmezse harften böl.
const kelimeBol = (ctx, kelime, maxW) => {
  if (ctx.measureText(kelime).width <= maxW) return [kelime];
  const parcalar = [];
  let kalan = kelime;
  while (kalan && ctx.measureText(kalan).width > maxW) {
    let kes = kalan.length;
    while (kes > 1 && ctx.measureText(kalan.slice(0, kes)).width > maxW) kes--;
    // mümkünse tireden böl (okunurluk)
    const tire = kalan.lastIndexOf('-', kes);
    if (tire > Math.floor(kes * 0.5)) kes = tire + 1;
    parcalar.push(kalan.slice(0, kes));
    kalan = kalan.slice(kes);
  }
  if (kalan) parcalar.push(kalan);
  return parcalar;
};
const wrapText = (ctx, text, x, y, maxW, lh, maxLines = 3) => {
  const words = String(text || '').split(/\s+/).flatMap(w => kelimeBol(ctx, w, maxW));
  let line = '', yy = y, n = 0;
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

export const gorselOlusturProgramAfis = async ({ egitim, programSatirlari = [], ekPrompt = '', baslik = '', haftalik = false }) => {
  const W = 1080;
  await afisFontYukle(); // paket fontlar ölçümden önce hazır olsun (fail-open)
  const ayar = ayarCikar(ekPrompt);
  let palet = (ayar.tema && paletAdla(ayar.tema)) ? paletAdla(ayar.tema)() : paletKoyu();
  if (ayar.zemin !== 1) { palet.bg1 = renkAyarla(palet.bg1, ayar.zemin); palet.bg2 = renkAyarla(palet.bg2, ayar.zemin); }
  const FF = fontSec(ayar.font);
  const ys = ayar.yazi || 1;
  const sekil = ayar.fotoSekil || 'yuvarlak';

  const rows = (programSatirlari || []).filter(r => r && (r.tip === 'gun' ? r.metin : (r.baslik || r.saat || r.konusmaci)));
  const n = Math.max(rows.length, 1);
  const M = Math.round(W * 0.06);
  // Haftalık afişte 11-17 satır olabiliyor → satırlar sıkışır, başlık bloğu kısalır,
  // yoksa afiş 1:2.6 orana çıkıp WhatsApp'ta okunamaz hale geliyor.
  const headerH = Math.round(W * (haftalik ? 0.34 : 0.62));
  const rowH = Math.round(W * (haftalik ? 0.10 : 0.135));
  const gunH = Math.round(W * 0.058);   // gün başlığı bandı (yalnız haftalık)
  const footerH = Math.round(W * 0.11);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = 10;   // geçici — ölçüm için
  const ctx = canvas.getContext('2d');

  // Haftalık afişte bir satırda birden çok eğitmen olabiliyor ("Panellerde
  // isimler tam çıkmamış" — saha geri bildirimi). İsimleri kesmek yerine
  // SATIRI BÜYÜTÜYORUZ: kaç satır gerektiğini şimdi ölçüp yüksekliğe ekliyoruz.
  const solW0 = Math.round(W * (haftalik ? 0.40 : 0.34));
  const fotoCap0 = Math.round(rowH * (haftalik ? 0.46 : 0.5));
  const sagGenislik = W - (M + solW0 + fotoCap0 + Math.round(W * 0.025)) - M;
  const unvanFont0 = Math.round((haftalik ? rowH * 0.185 : W * 0.021) * ys);
  const satirSay = (metin, font, maxW) => {
    if (!metin) return 0;
    ctx.font = font;
    const kelimeler = String(metin).split(/\s+/);
    let satir = '', adet = 1;
    for (const k of kelimeler) {
      const dene = satir ? satir + ' ' + k : k;
      if (ctx.measureText(dene).width > maxW && satir) { adet++; satir = k; } else satir = dene;
    }
    return adet;
  };
  const UNVAN_CAP = 3;  // en çok 3 satır isim — daha fazlası afişi şişirir
  for (const r of rows) {
    if (r.tip === 'gun' || !haftalik) { r._unvanSatir = 1; continue; }
    const n2 = satirSay(r.konusmaci?.unvan, `500 ${unvanFont0}px ${FF.govde}`, sagGenislik);
    r._unvanSatir = Math.max(1, Math.min(UNVAN_CAP, n2));
  }

  const satirH = (r) => (r.tip === 'gun'
    ? gunH
    : rowH + (haftalik ? Math.round(((r._unvanSatir || 1) - 1) * unvanFont0 * 1.35) : 0));
  const satirlarH = rows.reduce((t, r) => t + satirH(r), 0) || rowH;
  const H = Math.max(1350, headerH + satirlarH + footerH);

  canvas.height = H;   // ctx durumu sıfırlanır; çizim bundan sonra

  // ── ZEMİN ──
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, palet.bg1); g.addColorStop(1, palet.bg2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // filigran amblem (yoğunluk ayarlı)
  const fBaz = palet.acik ? 0.05 : 0.08;
  const fAlpha = ayar.filigran === 'yok' ? 0 : ayar.filigran === 'soluk' ? fBaz * 0.5 : ayar.filigran === 'belirgin' ? Math.min(fBaz * 2.2, 0.2) : fBaz;
  if (fAlpha > 0) {
    try { const wm = await urlToImage('/logos/oneteam-logo.png'); const lw = W * 0.7, lh = lw * (wm.height / wm.width);
      ctx.save(); ctx.globalAlpha = fAlpha; ctx.drawImage(wm, (W - lw) / 2, H * 0.05, lw, lh); ctx.restore(); } catch {}
  }

  const metin = palet.metin, alt = palet.alt, gold = palet.gold;

  // ── ÜST: logo + başlık ──
  let y = Math.round(W * 0.04);
  try { const logo = await urlToImage('/logos/oneteam-logo.png'); const lh = Math.round(W * 0.075), lw = lh * (logo.width / logo.height); ctx.drawImage(logo, (W - lw) / 2, y, lw, lh); y += lh + Math.round(W * 0.03); } catch { y += Math.round(W * 0.07); }

  ctx.textAlign = 'center'; ctx.fillStyle = gold;
  const tSize = Math.round(W * 0.058 * ys);
  ctx.font = `800 ${tSize}px ${FF.baslik}`;
  ctx.shadowColor = palet.acik ? 'rgba(120,90,30,0.18)' : 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8;
  const baslikMetni = (baslik && baslik.trim())
    ? baslik.trim().toLocaleUpperCase('tr-TR')
    : `${(egitim.etkinlikTuru || '').toLocaleUpperCase('tr-TR')} PROGRAM İÇERİĞİ`.trim();
  y = wrapText(ctx, baslikMetni, W / 2, y + tSize, W - M * 2, tSize * 1.12, 2) + Math.round(W * 0.012);
  ctx.shadowBlur = 0;

  // şehir rozeti + tarih + saat (ortalı, çakışmasız)
  const sehir = (egitim.sehir || '').toLocaleUpperCase('tr-TR');
  const tarihTxt = tarihYaz(egitim.tarih, gunCevir(egitim.gun, ayar.dil));
  let saatTxt = `${egitim.saat || ''}${egitim.bitisSaati ? ' - ' + egitim.bitisSaati : ''}`.trim();
  // EU saati seçeneği: "20:00 - 22:00 TR · 19:00 - 21:00 EU"
  const euS = ayar.euSaat ? euSaatCevir(egitim.saat, egitim.tarih) : '';
  if (saatTxt && euS) {
    const euB = egitim.bitisSaati ? euSaatCevir(egitim.bitisSaati, egitim.tarih) : '';
    saatTxt += ` TR · ${euS}${euB ? ' - ' + euB : ''} EU`;
  }
  const rozetH = Math.round(W * 0.05 * ys);
  const pillFont = `800 ${Math.round(W * 0.03 * ys)}px ${FF.govde}`;
  const tarihFont = `700 ${Math.round(W * 0.03 * ys)}px ${FF.govde}`;
  const saatFont = `500 ${Math.round(W * 0.026 * ys)}px ${FF.govde}`;
  const bosluk = Math.round(W * 0.02);
  ctx.font = pillFont; const rw = sehir ? ctx.measureText(sehir).width + Math.round(W * 0.05) : 0;
  ctx.font = tarihFont; const tw = ctx.measureText(tarihTxt).width;
  ctx.font = saatFont; const sw = saatTxt ? ctx.measureText('  ' + saatTxt).width : 0;
  const grupW = (rw ? rw + bosluk : 0) + tw + sw;
  let gx = Math.round((W - grupW) / 2);
  ctx.textBaseline = 'middle';
  if (sehir) {
    ctx.fillStyle = gold; roundRect(ctx, gx, y, rw, rozetH, rozetH / 2); ctx.fill();
    ctx.fillStyle = palet.pillText; ctx.font = pillFont; ctx.textAlign = 'center';
    ctx.fillText(sehir, gx + rw / 2, y + rozetH / 2);
    gx += rw + bosluk;
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = metin; ctx.font = tarihFont;
  ctx.fillText(tarihTxt, gx, y + rozetH / 2);
  if (saatTxt) { ctx.fillStyle = alt; ctx.font = saatFont; ctx.fillText('  ' + saatTxt, gx + tw, y + rozetH / 2); }
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  y += rozetH + Math.round(W * 0.028);

  // başlık altı altın çizgi
  ctx.fillStyle = gold; ctx.fillRect(M, y, W - M * 2, 2);
  y += Math.round(W * 0.012);

  // ── SATIRLAR ──
  const rowsTop = y;
  const kullanilabilir = H - footerH - rowsTop;
  // Az satırda afiş 1350'ye yuvarlandığı için satırlar gerekirse kısalır (eski davranış).
  const sikistir = !haftalik && satirlarH > kullanilabilir ? kullanilabilir / satirlarH : 1;
  const solW = Math.round(W * (haftalik ? 0.40 : 0.34));
  const fotoCap = Math.round(rowH * (haftalik ? 0.46 : 0.5) * sikistir);
  const zebra = palet.acik ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.04)';
  const ayrac = `rgba(${palet.goldRGB},0.18)`;

  // dikey altın ayraç (sol kolon ile içerik arası)
  ctx.fillStyle = `rgba(${palet.goldRGB},0.25)`;
  ctx.fillRect(M + solW - Math.round(W * 0.015), rowsTop, 1, Math.round(satirlarH * sikistir));

  let ry = rowsTop;
  let zebraSira = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const gercekRowH = Math.round(satirH(r) * sikistir);

    // ── GÜN BAŞLIĞI BANDI (haftalık) ──
    if (r.tip === 'gun') {
      ctx.fillStyle = `rgba(${palet.goldRGB},0.14)`;
      ctx.fillRect(0, ry, W, gercekRowH);
      ctx.fillStyle = gold;
      ctx.fillRect(M, ry, Math.round(W * 0.012), gercekRowH);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(W * 0.027 * ys)}px ${FF.govde}`;
      ctx.fillText(String(r.metin || '').toLocaleUpperCase('tr-TR'), M + Math.round(W * 0.032), ry + gercekRowH / 2);
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ry += gercekRowH;
      zebraSira = 0;
      continue;
    }

    if (zebraSira % 2 === 1) { ctx.fillStyle = zebra; ctx.fillRect(0, ry, W, gercekRowH); }
    zebraSira++;
    ctx.fillStyle = ayrac; ctx.fillRect(M, ry, W - M * 2, 1);
    const cy = ry + gercekRowH / 2;

    // SOL: saat + başlık — ritim satır yüksekliğine ORANTILI, yoksa iki satırlık
    // başlık kompakt satırı aşıp alttaki gün bandının üstüne taşıyor.
    const satirFont = Math.round((haftalik ? gercekRowH * 0.235 : W * 0.026) * ys);
    let sy = ry + gercekRowH * (haftalik ? 0.33 : 0.36);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (r.saat) {
      ctx.fillStyle = gold; ctx.font = `700 ${satirFont}px ${FF.govde}`;
      ctx.fillText(r.saat, M, sy);
      sy += Math.round(haftalik ? gercekRowH * 0.30 : W * 0.034 * ys);
    }
    ctx.fillStyle = metin; ctx.font = `700 ${satirFont}px ${FF.govde}`;
    wrapText(ctx, r.baslik || '', M, r.saat ? sy : cy + Math.round(W * 0.01),
      solW - Math.round(W * 0.03), Math.round(haftalik ? gercekRowH * 0.28 : W * 0.031 * ys), 2);

    // SAĞ: konuşmacı veya (konuşmacısız) düz aktivite metni
    const k = r.konusmaci;
    const sagX = M + solW;
    if (k && (k.ad || k.fotoURL)) {
      const fx = sagX + fotoCap / 2, fcy = cy;
      cizYol(ctx, fx, fcy, fotoCap / 2 + 4, sekil); ctx.fillStyle = gold; ctx.fill();
      cizYol(ctx, fx, fcy, fotoCap / 2 + 1, sekil); ctx.fillStyle = palet.bg2; ctx.fill();
      ctx.save(); cizYol(ctx, fx, fcy, fotoCap / 2, sekil); ctx.clip();
      if (k.fotoURL) { try { const im = await urlToImage(k.fotoURL); const md = Math.min(im.width, im.height);
        ctx.drawImage(im, (im.width - md) / 2, Math.max(0, (im.height - md) * 0.2), md, md, fx - fotoCap / 2, fcy - fotoCap / 2, fotoCap, fotoCap); }
        catch { ctx.fillStyle = '#777'; ctx.fillRect(fx - fotoCap / 2, fcy - fotoCap / 2, fotoCap, fotoCap); } }
      else { ctx.fillStyle = '#777'; ctx.fillRect(fx - fotoCap / 2, fcy - fotoCap / 2, fotoCap, fotoCap); }
      ctx.restore();
      const tx = sagX + fotoCap + Math.round(W * 0.025);
      const notlar = (k.notlar || []).filter(Boolean).slice(0, 3);
      const adY = notlar.length ? cy - Math.round(W * 0.014) : cy - Math.round(W * 0.004);
      ctx.fillStyle = metin; ctx.font = `700 ${satirFont}px ${FF.govde}`;
      ctx.fillText((k.ad || '').toLocaleUpperCase('tr-TR'), tx, adY, W - tx - M);
      if (k.unvan) {
        ctx.fillStyle = gold;
        const uf = Math.round((haftalik ? rowH * 0.185 : W * 0.021) * ys);
        ctx.font = `500 ${uf}px ${FF.govde}`;
        const uy = adY + Math.round(haftalik ? rowH * 0.26 : W * 0.028 * ys);
        if (haftalik) {
          // İsimler KESİLMEZ — gerekirse alt satıra iner (satır zaten büyütüldü)
          wrapText(ctx, k.unvan, tx, uy, W - tx - M, Math.round(uf * 1.35), r._unvanSatir || 1);
        } else {
          ctx.fillText(k.unvan, tx, uy, W - tx - M);
        }
      }
      if (notlar.length) { ctx.fillStyle = alt; ctx.font = `500 ${Math.round(W * 0.02 * ys)}px ${FF.govde}`; notlar.forEach((nm, j) => ctx.fillText('• ' + nm, tx, adY + Math.round(W * 0.052 * ys) + j * Math.round(W * 0.026 * ys), W - tx - M)); }
    } else if (r.baslik) {
      // konuşmacısız satır → başlığı sağ alanda da göster (Sunum Arası, Soru/Cevap)
      ctx.fillStyle = alt; ctx.font = `500 ${Math.round(W * 0.024 * ys)}px ${FF.govde}`;
      wrapText(ctx, r.baslik, sagX, cy + Math.round(W * 0.008), W - sagX - M, Math.round(W * 0.03 * ys), 2);
    }
    ry += gercekRowH;
  }

  // ── ALT: amare logosu ──
  try {
    const amare = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
    const ah = Math.round(W * 0.032), aw = Math.round(ah * (amare.width / amare.height));
    const ax = Math.round((W - aw) / 2), ayy = H - ah - Math.round(W * 0.025);
    if (palet.acik) {
      const oc = document.createElement('canvas'); oc.width = aw; oc.height = ah;
      const octx = oc.getContext('2d'); octx.drawImage(amare, 0, 0, aw, ah);
      octx.globalCompositeOperation = 'source-in'; octx.fillStyle = palet.metin; octx.fillRect(0, 0, aw, ah);
      ctx.drawImage(oc, ax, ayy, aw, ah);
    } else ctx.drawImage(amare, ax, ayy, aw, ah);
  } catch {}

  // ── AB BAYRAĞI (sol üst) — dalgalı direkli veya düz rozet, en üstte ──
  if (ayar.euBayrak) {
    if (ayar.bayrakDalgali) dalgaliBayrakCiz(ctx, Math.round(W * 0.05), Math.round(W * 0.03), Math.round(W * 0.19), palet); // saha isteği: büyük + sapsız
    else euBayrakCiz(ctx, Math.round(W * 0.04), Math.round(W * 0.04), Math.round(W * 0.09), true);
  }

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
};
