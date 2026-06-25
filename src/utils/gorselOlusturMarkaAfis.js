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

// Serbest tasarım isteğini ("Tasarıma ek istek") deterministik ayarlara çevirir.
// Marka Afiş AI değil → metni anahtar kelimelerle yorumlayıp piksel ayarına döker.
const renkAyarla = (hex, f) => {
  const n = (hex || '#000000').replace('#', '');
  const c = (i) => Math.max(0, Math.min(255, Math.round(parseInt(n.slice(i, i + 2), 16) * f)));
  return `#${[c(0), c(2), c(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};
const ayarCikar = (ek) => {
  const t = (ek || '').toLocaleLowerCase('tr-TR');
  const a = { yazi: 1, foto: 1, tema: null, zemin: 1, sade: false };
  const has = (...ws) => ws.some(w => t.includes(w));
  // metin boyutu
  if (has('yazı büyüt', 'yazıları büyüt', 'yazılar büyük', 'büyük yazı', 'başlığı büyüt', 'başlık büyüt', 'metni büyüt')) a.yazi = 1.18;
  if (has('yazı küçült', 'yazıları küçült', 'yazılar küçük', 'küçük yazı', 'başlığı küçült', 'metni küçült')) a.yazi = 0.82;
  if (has('çok küçült', 'çok küçük', 'iyice küçült', 'daha da küçült')) a.yazi = 0.7;
  if (has('çok büyüt', 'iyice büyüt', 'daha da büyüt')) a.yazi = 1.32;
  // foto
  if (has('foto büyüt', 'fotoğraf büyüt', 'fotoları büyüt', 'büyük foto', 'fotolar büyük', 'fotoğrafları büyüt')) a.foto = 1.15;
  if (has('foto küçült', 'fotoğraf küçült', 'fotoları küçült', 'küçük foto', 'fotoğrafları küçült')) a.foto = 0.85;
  // tema
  if (has('siyah tema', 'altın siyah', 'koyu tema', 'siyah zemin', 'lüks tema')) a.tema = 'siyah';
  if (has('mor tema', 'mor zemin')) a.tema = 'mor';
  // zemin tonu
  if (has('arka planı koyulaştır', 'daha koyu', 'koyulaştır', 'koyu arka')) a.zemin = 0.75;
  if (has('arka planı aç', 'aydınlat', 'daha açık', 'açık arka', 'arka plan açık')) a.zemin = 1.28;
  // sade mod (süsleri kaldır)
  if (has('sade', 'minimal', 'süsleri kaldır', 'çerçeveyi kaldır', 'süssüz', 'düz')) a.sade = true;
  return a;
};

// Koyu zemin + soluk One Team amblemi + (siyah temada) altın elmas serpiştir
const zeminCiz = async (ctx, W, H, palet, sade = false) => {
  // DİKEY ve simetrik gradient (çapraz değil → sol/sağ eşit, "yarısı koyu yarısı açık" olmaz)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, palet.bg1); g.addColorStop(1, palet.bg2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // üstte yumuşak, ORTALI ışık (her iki temada simetrik)
  const r = ctx.createRadialGradient(W / 2, H * 0.16, 40, W / 2, H * 0.16, W * 0.85);
  r.addColorStop(0, 'rgba(255,255,255,0.08)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H * 0.6);
  // LÜKS: diyagonal altın ışık huzmesi (dinamizm) — sade modda atla
  if (!sade) {
    ctx.save();
    ctx.translate(W * 0.5, H * 0.30); ctx.rotate(-0.34);
    const ray = ctx.createLinearGradient(-W, 0, W, 0);
    ray.addColorStop(0, 'rgba(216,177,90,0)');
    ray.addColorStop(0.5, 'rgba(216,177,90,0.12)');
    ray.addColorStop(1, 'rgba(216,177,90,0)');
    ctx.fillStyle = ray; ctx.fillRect(-W, -H * 0.16, W * 2, H * 0.32);
    ctx.restore();
  }
  // kenar vinyet (derinlik)
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  // siyah temada altın elmas/parıltı serpiştir (üst bölge)
  if (palet.elmas && !sade) {
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
  // LÜKS: köşe altın çerçeve aksanları (premium his) — sade modda atla
  if (!sade) {
    ctx.strokeStyle = palet.gold; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
    const cm = Math.round(W * 0.045), cl = Math.round(W * 0.075);
    const kose = (x, y, dx, dy) => { ctx.beginPath(); ctx.moveTo(x + dx * cl, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * cl); ctx.stroke(); };
    kose(cm, cm, 1, 1); kose(W - cm, cm, -1, 1); kose(cm, H - cm, 1, -1); kose(W - cm, H - cm, -1, -1);
    ctx.globalAlpha = 1;
  }
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

export const gorselOlusturMarkaAfis = async ({ egitim, egitmenler = [], format = 'portrait', ekPrompt = '' }) => {
  // Marka Afiş HER ZAMAN dikey (kare/story selektöründen bağımsız) — referanslar dikey,
  // kare alan fotoları sıkıştırıyordu.
  const W = 1080, H = 1350;
  const ayar = ayarCikar(ekPrompt); // "Tasarıma ek istek" → deterministik ayar
  const palet = paletSec(egitim);
  // tema zorlaması (ek istek)
  if (ayar.tema === 'siyah' && palet.ad !== 'siyah') {
    palet.ad = 'siyah'; palet.bg1 = '#0b0b0d'; palet.bg2 = '#17120a'; palet.elmas = true;
  } else if (ayar.tema === 'mor' && palet.ad !== 'mor') {
    palet.ad = 'mor'; palet.bg1 = '#3a2b54'; palet.bg2 = '#211633'; palet.elmas = false;
  }
  // zemin tonu (koyulaştır / aç)
  if (ayar.zemin !== 1) {
    palet.bg1 = renkAyarla(palet.bg1, ayar.zemin);
    palet.bg2 = renkAyarla(palet.bg2, ayar.zemin);
  }
  const fiziki = isFiziki(egitim);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const M = Math.round(W * 0.07);

  await zeminCiz(ctx, W, H, palet, ayar.sade);

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
  const tSize = Math.round(W * 0.072 * ayar.yazi);
  ctx.font = `800 ${tSize}px Arial`;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
  y = wrapText(ctx, (egitim.egitim || '').toLocaleUpperCase('tr-TR'), W / 2, y + tSize, W - M * 2, tSize * 1.05, 4);
  ctx.shadowBlur = 0;
  // başlık altı altın aksan çizgisi (parıltılı uçlar) — modern dokunuş
  y += Math.round(H * 0.006);
  const akcW = Math.round(W * 0.16);
  const akc = ctx.createLinearGradient(W / 2 - akcW, 0, W / 2 + akcW, 0);
  akc.addColorStop(0, 'rgba(216,177,90,0)'); akc.addColorStop(0.5, palet.gold); akc.addColorStop(1, 'rgba(216,177,90,0)');
  ctx.fillStyle = akc; ctx.fillRect(W / 2 - akcW, y, akcW * 2, 3);
  y += Math.round(H * 0.012);

  // ── Altın şehir rozeti (fiziki) ──
  if (fiziki && egitim.sehir) {
    y += Math.round(H * 0.005);
    y = altinHap(ctx, W / 2, y, egitim.sehir, Math.round(W * 0.034 * ayar.yazi), palet) + Math.round(H * 0.012);
  } else {
    y += Math.round(H * 0.018);
  }

  // ── Tarih + Saat ──
  ctx.fillStyle = palet.gold;
  ctx.font = `700 ${Math.round(W * 0.038 * ayar.yazi)}px Arial`;
  const tarihTxt = `${egitim.tarih || ''} ${egitim.gun || ''}`.trim();
  ctx.fillText(tarihTxt, W / 2, y + Math.round(W * 0.036));
  y += Math.round(W * 0.055);
  if (egitim.saat) {
    ctx.fillStyle = palet.metin;
    ctx.font = `600 ${Math.round(W * 0.032 * ayar.yazi)}px Arial`;
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
      const sidePad = Math.round(W * 0.035);
      const cellW = (W - sidePad * 2) / adet;
      const rowY = speakersTop + r * perRowH;
      // ORANLAMA (bütçe-bazlı): satır = topPad + foto + g1 + isim hapı + g2 + rol.
      // foto kalan yere göre hesaplanır → asla çakışmaz, foto mümkün olduğunca büyük.
      const nameSize = Math.round(Math.max(15, Math.min(Math.round(cellW * 0.048), 26)) * ayar.yazi);
      const roleSize = Math.round(Math.max(12, Math.min(Math.round(cellW * 0.038), 18)) * ayar.yazi);
      const pillH = Math.round(nameSize * 1.7);
      const topPad = Math.round(perRowH * 0.04);
      const g1 = Math.round(perRowH * 0.035);
      const g2 = Math.round(perRowH * 0.02);
      let foto = Math.round(perRowH * 0.93) - topPad - g1 - pillH - g2 - roleSize;
      foto = Math.round(foto * ayar.foto);
      foto = Math.max(90, Math.min(foto, Math.round(cellW * 0.86), Math.round(W * 0.46)));
      for (let c = 0; c < adet; c++, idx++) {
        const e = liste[idx];
        const cx = sidePad + cellW * c + cellW / 2;
        const fy = rowY + topPad + foto / 2;
        // yumuşak altın ışıltı (derinlik / modern his)
        const gl = ctx.createRadialGradient(cx, fy, foto * 0.32, cx, fy, foto * 0.88);
        gl.addColorStop(0, 'rgba(216,177,90,0.32)'); gl.addColorStop(1, 'rgba(216,177,90,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(cx, fy, foto * 0.88, 0, Math.PI * 2); ctx.fill();
        // altın halka + foto (gölgeli → ön plan hissi)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = Math.round(foto * 0.12);
        ctx.shadowOffsetY = Math.round(foto * 0.04);
        ctx.beginPath(); ctx.arc(cx, fy, foto / 2 + 7, 0, Math.PI * 2);
        ctx.fillStyle = palet.gold; ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
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
        // isim — altın hap, fotonun ALTINDA (çakışma yok)
        const hapBottom = altinHap(ctx, cx, fy + foto / 2 + g1, e.ad || '', nameSize, palet);
        // rol — hapın altında
        if (e.unvan) {
          ctx.fillStyle = palet.alt;
          ctx.font = `500 ${roleSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.fillText(e.unvan, cx, hapBottom + g2 + roleSize, cellW * 0.98);
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
