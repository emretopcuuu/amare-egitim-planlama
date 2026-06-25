// "Marka Afiş" — deterministik Canvas afiş motoru (AI YOK).
// One Team / Amare etkinlik posterlerinin marka dilini kod olarak üretir:
// koyu/mor zemin + soluk One Team amblemi, kocaman başlık, altın şehir rozeti,
// altın-hap isim etiketli konuşmacılar, altın program bandı, adres/ZOOM bandı,
// amare logosu. Gerçek fotoğraflar Canvas'a yapıştırılır → yüz/yazı birebir.
import { imgYukle as urlToImage } from './imgYukle';
import { isFiziki } from './egitmenEtiket';
import { qrOlustur } from './qrOlustur';
import { fotoYerlesim } from './fotoYerlesim';

const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr);
  else {
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
};

const wrapText = (ctx, text, x, y, maxW, lh, maxLines = 6) => {
  const words = String(text || '').split(/\s+/);
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

// Tema paleti (kategori/başlığa göre)
const paletSec = (egitim) => {
  const k = `${egitim?.kategori || ''} ${egitim?.egitim || ''} ${egitim?.etkinlikTuru || ''}`.toLocaleLowerCase('tr-TR');
  const gold = '#d8b15a', goldKoyu = '#b8923f', pillText = '#2a1c06';
  if (/vizyon|diamond|liderlik|kapan|strateji/.test(k))
    return { ad: 'siyah', bg1: '#0b0b0d', bg2: '#17120a', gold, goldKoyu, pillText, metin: '#ffffff', alt: '#d9d6cf', elmas: true };
  // seminer / panel / sağlık / toplantı → mor
  return { ad: 'mor', bg1: '#3a2b54', bg2: '#211633', gold, goldKoyu, pillText, metin: '#ffffff', alt: '#e7e0f0', elmas: false };
};

// Koyu zemin + soluk One Team amblemi + (siyah temada) altın elmas serpiştir
const zeminCiz = async (ctx, W, H, palet) => {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, palet.bg1); g.addColorStop(1, palet.bg2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // mor temada üstte yumuşak ışık
  if (palet.ad === 'mor') {
    const r = ctx.createRadialGradient(W / 2, H * 0.12, 40, W / 2, H * 0.12, W * 0.7);
    r.addColorStop(0, 'rgba(255,255,255,0.10)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H * 0.5);
  }
  // siyah temada altın elmas/parıltı serpiştir (üst bölge)
  if (palet.elmas) {
    ctx.save();
    const noktalar = [[0.08,0.06],[0.2,0.03],[0.32,0.08],[0.7,0.04],[0.84,0.09],[0.92,0.05],[0.14,0.13],[0.88,0.16],[0.05,0.2],[0.95,0.24]];
    noktalar.forEach(([px, py], i) => {
      const cx = px * W, cy = py * H, s = (i % 3 === 0 ? 10 : 6);
      ctx.fillStyle = `rgba(216,177,90,${0.5 - (i % 4) * 0.08})`;
      ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.rotate(-Math.PI / 4); ctx.translate(-cx, -cy);
    });
    ctx.restore();
  }
  // büyük soluk One Team amblemi (orta-üst watermark)
  try {
    const logo = await urlToImage('/logos/oneteam-logo.png');
    const lw = W * 0.62, lh = lw * (logo.height / logo.width);
    ctx.save(); ctx.globalAlpha = palet.ad === 'siyah' ? 0.10 : 0.08;
    ctx.drawImage(logo, (W - lw) / 2, H * 0.30, lw, lh);
    ctx.restore();
  } catch {}
};

// Altın hap içinde metin (referanslardaki isim etiketi). Dönüş: alt Y.
const altinHap = (ctx, cx, y, text, fontSize, palet) => {
  ctx.font = `800 ${fontSize}px Arial`;
  const tw = ctx.measureText((text || '').toLocaleUpperCase('tr-TR')).width;
  const h = Math.round(fontSize * 1.7), padX = Math.round(fontSize * 0.7);
  const w = tw + padX * 2;
  ctx.fillStyle = palet.gold;
  roundRect(ctx, cx - w / 2, y, w, h, Math.round(h * 0.28)); ctx.fill();
  ctx.fillStyle = palet.pillText;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((text || '').toLocaleUpperCase('tr-TR'), cx, y + h / 2);
  ctx.textBaseline = 'alphabetic';
  return y + h;
};

export const gorselOlusturMarkaAfis = async ({ egitim, egitmenler = [], format = 'portrait' }) => {
  const W = 1080, H = format === 'square' ? 1080 : 1350;
  const palet = paletSec(egitim);
  const fiziki = isFiziki(egitim);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const M = Math.round(W * 0.07);

  await zeminCiz(ctx, W, H, palet);

  // ── ÜST: One Team logosu ──
  let y = Math.round(H * 0.02);
  try {
    const logo = await urlToImage('/logos/oneteam-logo.png');
    const lh = Math.round(H * 0.055), lw = lh * (logo.width / logo.height);
    ctx.drawImage(logo, (W - lw) / 2, y, lw, lh);
    y += lh + Math.round(H * 0.025);
  } catch { y += Math.round(H * 0.05); }

  // ── BAŞLIK ──
  ctx.textAlign = 'center';
  ctx.fillStyle = palet.metin;
  const tSize = Math.round(W * 0.072);
  ctx.font = `800 ${tSize}px Arial`;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
  y = wrapText(ctx, (egitim.egitim || '').toLocaleUpperCase('tr-TR'), W / 2, y + tSize, W - M * 2, tSize * 1.05, 4);
  ctx.shadowBlur = 0;

  // ── Altın şehir rozeti (fiziki) ──
  if (fiziki && egitim.sehir) {
    y += Math.round(H * 0.005);
    y = altinHap(ctx, W / 2, y, egitim.sehir, Math.round(W * 0.034), palet) + Math.round(H * 0.012);
  } else {
    y += Math.round(H * 0.018);
  }

  // ── Tarih + Saat ──
  ctx.fillStyle = palet.gold;
  ctx.font = `700 ${Math.round(W * 0.038)}px Arial`;
  const tarihTxt = `${egitim.tarih || ''} ${egitim.gun || ''}`.trim();
  ctx.fillText(tarihTxt, W / 2, y + Math.round(W * 0.036));
  y += Math.round(W * 0.055);
  if (egitim.saat) {
    ctx.fillStyle = palet.metin;
    ctx.font = `600 ${Math.round(W * 0.032)}px Arial`;
    ctx.fillText(`${egitim.saat}${egitim.bitisSaati ? ' - ' + egitim.bitisSaati : ''}`, W / 2, y + Math.round(W * 0.03));
    y += Math.round(W * 0.05);
  }

  // ── ZONE: program bandı + footer rezervi ──
  const prog = (Array.isArray(egitim.programAkisi) ? egitim.programAkisi : []).filter(p => p && (p.baslik || p.baslangic));
  const footerH = Math.round(H * 0.135);
  const footerTop = H - footerH;
  const bandH = (fiziki && prog.length) ? Math.round(H * 0.085) : 0;
  const bandTop = bandH ? footerTop - bandH - Math.round(H * 0.02) : footerTop;
  const speakersTop = y + Math.round(H * 0.01);
  const speakersBottom = bandTop - Math.round(H * 0.02);

  // ── KONUŞMACILAR (altın halkalı foto + altın hap isim + rol) ──
  const liste = (egitmenler || []).slice(0, 6);
  if (liste.length) {
    const dagilim = fotoYerlesim(liste.length);
    const rows = dagilim.length;
    const areaH = speakersBottom - speakersTop;
    const perRowH = areaH / rows;
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const adet = dagilim[r];
      const cellW = (W - M * 2) / adet;
      const rowY = speakersTop + r * perRowH;
      const foto = Math.min(Math.round(cellW * 0.5), Math.round(perRowH * 0.5), Math.round(W * 0.22));
      for (let c = 0; c < adet; c++, idx++) {
        const e = liste[idx];
        const cx = M + cellW * c + cellW / 2;
        const fy = rowY + foto / 2 + Math.round(perRowH * 0.04);
        // altın halka + foto
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, fy, foto / 2 + 6, 0, Math.PI * 2);
        ctx.fillStyle = palet.gold; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, fy, foto / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = palet.bg2; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, fy, foto / 2, 0, Math.PI * 2); ctx.clip();
        if (e.fotoURL) {
          try {
            const im = await urlToImage(e.fotoURL);
            const md = Math.min(im.width, im.height);
            ctx.drawImage(im, (im.width - md) / 2, (im.height - md) / 2, md, md, cx - foto / 2, fy - foto / 2, foto, foto);
          } catch { ctx.fillStyle = '#888'; ctx.fillRect(cx - foto / 2, fy - foto / 2, foto, foto); }
        } else { ctx.fillStyle = '#888'; ctx.fillRect(cx - foto / 2, fy - foto / 2, foto, foto); }
        ctx.restore();
        // isim — altın hap
        const hapY = fy + foto / 2 + Math.round(perRowH * 0.08);
        const nameSize = Math.round(cellW * 0.062);
        const hapBottom = altinHap(ctx, cx, hapY, e.ad || '', nameSize, palet);
        // rol — hapın altında
        if (e.unvan) {
          ctx.fillStyle = palet.alt;
          ctx.font = `500 ${Math.round(cellW * 0.05)}px Arial`;
          ctx.textAlign = 'center';
          ctx.fillText(e.unvan, cx, hapBottom + Math.round(cellW * 0.06), cellW * 0.96);
        }
      }
    }
  }

  // ── PROGRAM BANDI (altın saat hapları) ──
  if (bandH) {
    const n = Math.min(prog.length, 3);
    const cellW = (W - M * 2) / n;
    for (let i = 0; i < n; i++) {
      const p = prog[i];
      const cx = M + cellW * i + cellW / 2;
      const saat = [p.baslangic, p.bitis].filter(Boolean).join(' - ');
      // saat hapı (altın çerçeve)
      ctx.font = `700 ${Math.round(W * 0.026)}px Arial`;
      const sw = ctx.measureText(saat).width + Math.round(W * 0.04);
      const sh = Math.round(H * 0.035);
      ctx.strokeStyle = palet.gold; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(216,177,90,0.12)';
      roundRect(ctx, cx - sw / 2, bandTop, sw, sh, sh / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = palet.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(saat, cx, bandTop + sh / 2); ctx.textBaseline = 'alphabetic';
      // aktivite
      ctx.fillStyle = palet.metin;
      ctx.font = `600 ${Math.round(W * 0.022)}px Arial`;
      wrapText(ctx, (p.baslik || '').toLocaleUpperCase('tr-TR'), cx, bandTop + sh + Math.round(W * 0.028), cellW * 0.92, Math.round(W * 0.026), 2);
    }
  }

  // ── ALT: adres (fiziki) / ZOOM (online) + amare logosu ──
  ctx.textAlign = 'center';
  if (fiziki) {
    const mekan = (egitim.mekanAdi || egitim.sehir || '').toLocaleUpperCase('tr-TR');
    if (mekan) {
      ctx.fillStyle = palet.gold; ctx.font = `800 ${Math.round(W * 0.03)}px Arial`;
      ctx.fillText(mekan, W / 2, footerTop + Math.round(H * 0.028), W - M * 2);
    }
    if (egitim.acikAdres) {
      ctx.fillStyle = palet.alt; ctx.font = `400 ${Math.round(W * 0.021)}px Arial`;
      wrapText(ctx, egitim.acikAdres, W / 2, footerTop + Math.round(H * 0.052), W - M * 2, Math.round(W * 0.026), 2);
    }
  } else {
    const zoom = (egitim.yer || '').replace(/zoom\s*salon\s*id[:\s]*/i, '').trim();
    const zPill = `ZOOM SALON ID: ${zoom || egitim.yer || ''}`;
    ctx.font = `800 ${Math.round(W * 0.03)}px Arial`;
    const zw = ctx.measureText(zPill).width + Math.round(W * 0.06);
    const zh = Math.round(H * 0.05);
    ctx.fillStyle = palet.gold;
    roundRect(ctx, (W - zw) / 2, footerTop + Math.round(H * 0.01), zw, zh, zh / 2); ctx.fill();
    ctx.fillStyle = palet.pillText; ctx.textBaseline = 'middle';
    ctx.fillText(zPill, W / 2, footerTop + Math.round(H * 0.01) + zh / 2);
    ctx.textBaseline = 'alphabetic';
  }
  // amare logosu (en alt orta)
  try {
    const amare = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
    const ah = Math.round(H * 0.03), aw = ah * (amare.width / amare.height);
    ctx.drawImage(amare, (W - aw) / 2, H - ah - Math.round(H * 0.018), aw, ah);
  } catch {}

  // QR (fiziki) sağ alt
  if (fiziki) {
    const qr = await qrOlustur(`${typeof window !== 'undefined' ? window.location.origin : ''}/e/${egitim.id || ''}`);
    if (qr) {
      try {
        const qi = await urlToImage(qr);
        const qs = Math.round(W * 0.1), pad = Math.round(W * 0.03);
        const qx = W - qs - pad, qy = H - qs - pad, b = Math.round(qs * 0.06);
        ctx.fillStyle = '#fff'; ctx.fillRect(qx - b, qy - b, qs + 2 * b, qs + 2 * b);
        ctx.drawImage(qi, qx, qy, qs, qs);
      } catch {}
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
};
