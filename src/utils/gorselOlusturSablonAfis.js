// "Şablonlu Afiş" — deterministik Canvas motoru (AI YOK), Marka Afiş motorundan BAĞIMSIZ.
//
// Saha isteği (13 Kas 2026): "Retorik Sanatı" gibi tek seferlik, farklı düzenli afişler gerekiyor.
// Fotoğraflar yüklenir, motor kırpar; renk serbest. Marka Afiş motoru (konuşmacı yuvarlakları)
// DEĞİŞMEDİ — bu dosya yalnız yeni "Şablonlu Afiş" yöntemini besler.
//
// Şablonlar tek bir iskeleti paylaşır (başlık → alt başlık → rozet → boy portre sütunları →
// isim bandı → tarih/saat/yer); fark: kişi sayısı ve fotoğraf kutusu geometrisi.
// Yeni şablon = SABLONLAR'a bir satır + (gerekirse) geometri dalı.
import { imgYukle } from './imgYukle';
import { afisFontYukle } from './afisFontlari';

export const SABLONLAR = [
  { id: 'soylesi', ad: 'Söyleşi', not: '2 kişi · boy portre', min: 2, max: 2 },
  { id: 'tek', ad: 'Tek konuşmacı', not: '1 kişi · ortada büyük', min: 1, max: 1 },
  { id: 'panel', ad: 'Panel', not: '3-4 kişi · yan yana', min: 3, max: 4 },
];

export const RENK_HAZIR = [
  { ad: 'Kırmızı', renk: '#e8312f' },
  { ad: 'Siyah', renk: '#161616' },
  { ad: 'Lacivert', renk: '#1b3a8a' },
  { ad: 'Yeşil', renk: '#12805c' },
  { ad: 'Altın', renk: '#b8862b' },
  { ad: 'Mor', renk: '#6a2c91' },
];

const W = 1080, H = 1920;
const FONT = 'Montserrat, "Trebuchet MS", Arial, sans-serif';

const hexRGB = (hex) => {
  const m = String(hex || '').replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return [232, 49, 47];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const parlak = (hex) => { const [r, g, b] = hexRGB(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

// "Oğuz Benlioğlu *ile* derin" → [{t, v:false}, {t:'ile', v:true}, ...]  (*…* = vurgu rengi)
const parcala = (satir) => {
  const out = [];
  String(satir || '').split('*').forEach((p, i) => { if (p) out.push({ t: p, v: i % 2 === 1 }); });
  return out;
};

// Yatay sıkıştırılmış (kondanse görünümlü) tek satır; vurgu parçaları farklı renkte.
// Genişlik maxW'yi aşarsa punto küçülür. Dönüş: çizilen satırın yüksekliği (px).
const kondanse = (ctx, satir, cx, baseY, { px, maxW, sx = 0.54, renk, vurgu, agirlik = 900 }) => {
  const parcalar = parcala(satir);
  if (!parcalar.length) return 0;
  let p = px;
  const olc = (pt) => {
    ctx.font = `${agirlik} ${pt}px ${FONT}`;
    return parcalar.reduce((s, x) => s + ctx.measureText(x.t).width, 0) * sx;
  };
  let w = olc(p);
  if (w > maxW) { p = Math.floor(p * maxW / w); w = olc(p); }
  ctx.save();
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = `${agirlik} ${p}px ${FONT}`;
  let x = cx - w / 2;
  for (const x1 of parcalar) {
    ctx.fillStyle = x1.v ? vurgu : renk;
    ctx.save(); ctx.translate(x, baseY); ctx.scale(sx, 1); ctx.fillText(x1.t, 0, 0); ctx.restore();
    x += ctx.measureText(x1.t).width * sx;
  }
  ctx.restore();
  return p;
};

// Normal (sıkıştırılmamış) metin, genişliğe sığdırılır.
const metin = (ctx, t, x, y, { px, agirlik = 600, renk, hiza = 'center', maxW = 9999, harf = 0 }) => {
  if (!t) return;
  let p = px;
  ctx.save();
  ctx.fillStyle = renk; ctx.textAlign = hiza; ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${harf}px`;
  ctx.font = `${agirlik} ${p}px ${FONT}`;
  const w = ctx.measureText(t).width;
  if (w > maxW) { p = Math.floor(p * maxW / w); ctx.font = `${agirlik} ${p}px ${FONT}`; }
  ctx.fillText(t, x, y);
  ctx.restore();
};

// Fotoğrafı kutuya "cover" kırp. odak = [x%, y%] (yüz merkezi), zoom ≥ 1, ox/oy = -1..1 kaydırma.
const fotoCiz = (ctx, im, x, y, w, h, { gri, zoom = 1, ox = 0, oy = 0, odak = [50, 25] }) => {
  const oc = document.createElement('canvas');
  oc.width = Math.round(w); oc.height = Math.round(h);
  const o = oc.getContext('2d');
  const kapla = Math.max(w / im.width, h / im.height) * Math.max(1, zoom);
  const dw = im.width * kapla, dh = im.height * kapla;
  let dx = w / 2 - (odak[0] / 100) * dw + ox * w * 0.3;
  let dy = h * 0.36 - (odak[1] / 100) * dh + oy * h * 0.3;
  dx = Math.min(0, Math.max(w - dw, dx));
  dy = Math.min(0, Math.max(h - dh, dy));
  o.drawImage(im, dx, dy, dw, dh);
  if (gri) {
    try {
      const d = o.getImageData(0, 0, oc.width, oc.height);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        p[i] = p[i + 1] = p[i + 2] = g;
      }
      o.putImageData(d, 0, 0);
    } catch { /* tuval kirli (CORS) → renkli kalır, afiş bozulmaz */ }
  }
  ctx.drawImage(oc, x, y, w, h);
};

const saatIkonu = (ctx, cx, cy, r, renk) => {
  ctx.save();
  ctx.strokeStyle = renk; ctx.lineWidth = Math.max(2, r * 0.13); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.62); ctx.lineTo(cx, cy); ctx.lineTo(cx + r * 0.45, cy + r * 0.3); ctx.stroke();
  ctx.restore();
};

// ayar: { sablon, renk, tema:'acik'|'koyu', baslik, altBaslik, rozet,
//         kisiler:[{ad, unvan, fotoURL|File, gri, zoom, ox, oy, odak}], tarih, saat, yer, sifre }
export const gorselOlusturSablonAfis = async (ayar) => {
  await afisFontYukle();
  const {
    sablon = 'soylesi', renk = '#e8312f', tema = 'acik',
    baslik = '', altBaslik = '', rozet = '', kisiler = [], tarih = '', saat = '', yer = '', sifre = '',
  } = ayar;
  const koyu = tema === 'koyu';
  const zemin = koyu ? '#121212' : '#eeeeee';
  const yazi = koyu ? '#f4f4f4' : '#111111';
  // Koyu temada çok koyu aksan (siyah vb.) zeminde kaybolur → başlık ve isim bandı açık renge döner.
  const aksanKayboldu = koyu && parlak(renk) < 0.28;
  const baslikRenk = aksanKayboldu ? '#ffffff' : renk;
  const bandRenk = aksanKayboldu ? '#f4f4f4' : renk;
  const bandYazi = parlak(bandRenk) > 0.62 ? '#161616' : '#ffffff';

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = zemin; ctx.fillRect(0, 0, W, H);

  // ── Başlık (aksan renkli, kondanse, çok satırlı) ──
  let y = H * 0.032;
  const bSatir = String(baslik).toLocaleUpperCase('tr-TR').split('\n').map(s => s.trim()).filter(Boolean);
  const bPx = bSatir.length > 1 ? H * 0.115 : H * 0.15;
  for (const s of bSatir) {
    const p = kondanse(ctx, s, W / 2, y + bPx * 0.74, { px: bPx, maxW: W * 0.9, sx: 0.4, renk: baslikRenk, vurgu: yazi });
    y += (p || bPx) * 0.95;
  }
  y += H * 0.022;

  // ── Alt başlık (siyah/beyaz, *vurgu* aksan renginde) ──
  const aSatir = String(altBaslik).split('\n').map(s => s.trim()).filter(Boolean);
  const aPx = H * 0.039;
  for (const s of aSatir) {
    const p = kondanse(ctx, s, W / 2, y + aPx * 0.78, { px: aPx, maxW: W * 0.9, sx: 0.5, renk: yazi, vurgu: baslikRenk, agirlik: 800 });
    y += (p || aPx) * 1.08;
  }
  y += H * 0.012;

  // ── Rozet (hafif eğik hap) ──
  if (rozet.trim()) {
    const t = rozet.trim().toLocaleUpperCase('tr-TR');
    const rp = H * 0.03;
    ctx.save();
    ctx.font = `900 ${rp}px ${FONT}`;
    const tw = ctx.measureText(t).width;
    const rw = tw + rp * 2.2, rh = rp * 2.1;
    const rcx = W / 2, rcy = y + rh / 2 + H * 0.006;
    ctx.translate(rcx, rcy); ctx.rotate(-0.04);
    ctx.fillStyle = koyu ? '#f4f4f4' : '#1a1a1a';
    ctx.beginPath(); ctx.roundRect(-rw / 2, -rh / 2, rw, rh, rh / 2); ctx.fill();
    ctx.fillStyle = koyu ? '#111' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t, 0, rp * 0.06);
    ctx.restore();
    y += rh + H * 0.03;
  } else y += H * 0.012;

  // ── Fotoğraf bölgesi ──
  const bandH = H * 0.064;
  const bandY = H * 0.772;
  const fotoY = Math.min(y, bandY - H * 0.2);
  const fotoH = bandY - fotoY;
  const n = Math.max(1, Math.min(kisiler.length, 4)) || 1;

  let kutular; // [{x, w}]
  if (sablon === 'tek') {
    const bw = W * 0.66;
    kutular = [{ x: (W - bw) / 2, w: bw }];
  } else {
    const kw = W / n;
    kutular = Array.from({ length: n }, (_, i) => ({ x: i * kw, w: kw }));
  }

  // Arkada hafif gri blok (derinlik hissi) — söyleşi/tek
  if (sablon !== 'panel') {
    ctx.fillStyle = koyu ? '#1d1d1d' : '#dcdcdc';
    ctx.fillRect(sablon === 'tek' ? W * 0.12 : W / 2, bandY - H * 0.1, sablon === 'tek' ? W * 0.76 : W / 2, H * 0.1 + bandH + H * 0.026);
  }

  for (let i = 0; i < kutular.length; i++) {
    const k = kisiler[i] || {};
    const b = kutular[i];
    const kutuY = fotoY, kutuH = fotoH;
    if (k.fotoURL) {
      try {
        const im = await imgYukle(k.fotoURL);
        fotoCiz(ctx, im, b.x, kutuY, b.w, kutuH, { gri: !!k.gri, zoom: k.zoom || 1, ox: k.ox || 0, oy: k.oy || 0, odak: k.odak || [50, 25] });
      } catch {
        ctx.fillStyle = koyu ? '#2a2a2a' : '#cfcfcf'; ctx.fillRect(b.x, kutuY, b.w, kutuH);
      }
    } else {
      ctx.fillStyle = koyu ? '#2a2a2a' : '#cfcfcf'; ctx.fillRect(b.x, kutuY, b.w, kutuH);
      metin(ctx, 'FOTOĞRAF', b.x + b.w / 2, kutuY + kutuH / 2, { px: H * 0.02, agirlik: 700, renk: koyu ? '#777' : '#999' });
    }
    // Panelde sütunlar arası ince ayraç
    if (sablon === 'panel' && i > 0) { ctx.fillStyle = zemin; ctx.fillRect(b.x - 3, kutuY, 6, kutuH); }
  }

  // ── İsim bandı ──
  ctx.fillStyle = bandRenk; ctx.fillRect(0, bandY, W, bandH);
  for (let i = 0; i < kutular.length; i++) {
    const k = kisiler[i] || {};
    const b = kutular[i];
    const cx = b.x + b.w / 2;
    const yaziMax = (sablon === 'tek' ? W * 0.8 : b.w) * 0.9;
    const adPx = n >= 3 ? H * 0.0185 : H * 0.0255;
    const adT = String(k.ad || '').toLocaleUpperCase('tr-TR');
    if (k.unvan) {
      metin(ctx, adT, cx, bandY + bandH * 0.47, { px: adPx, agirlik: 600, renk: bandYazi, maxW: yaziMax, harf: 1 });
      metin(ctx, String(k.unvan).toLocaleUpperCase('tr-TR'), cx, bandY + bandH * 0.82, { px: adPx * 0.62, agirlik: 500, renk: bandYazi, maxW: yaziMax, harf: 0.5 });
    } else {
      metin(ctx, adT, cx, bandY + bandH * 0.62, { px: adPx, agirlik: 600, renk: bandYazi, maxW: yaziMax, harf: 1 });
    }
  }

  // ── Alt bilgi: tarih · saat | yer · şifre ──
  const ciz = (yy) => { ctx.fillStyle = koyu ? '#555' : '#888'; ctx.fillRect(W * 0.165, yy, W * 0.67, 2); };
  ciz(H * 0.872);
  metin(ctx, tarih, W / 2, H * 0.9, { px: H * 0.0285, agirlik: 500, renk: yazi, maxW: W * 0.7 });
  const satirY = H * 0.935;
  const sp = H * 0.0235;
  if (saat && yer) {
    saatIkonu(ctx, W * 0.215, satirY - sp * 0.3, sp * 0.62, yazi);
    metin(ctx, saat, W * 0.245, satirY, { px: sp, agirlik: 500, renk: yazi, hiza: 'left' });
    ctx.fillStyle = koyu ? '#777' : '#555'; ctx.fillRect(W * 0.395, satirY - sp * 0.95, 2, sp * 1.25);
    metin(ctx, yer, W * 0.415, satirY, { px: sp, agirlik: 800, renk: yazi, hiza: 'left', maxW: W * 0.42 });
  } else if (saat) {
    const w = (() => { ctx.font = `500 ${sp}px ${FONT}`; return ctx.measureText(saat).width; })();
    saatIkonu(ctx, W / 2 - w / 2 - sp * 1.0, satirY - sp * 0.3, sp * 0.62, yazi);
    metin(ctx, saat, W / 2 + sp * 0.4, satirY, { px: sp, agirlik: 500, renk: yazi });
  } else if (yer) {
    metin(ctx, yer, W / 2, satirY, { px: sp, agirlik: 800, renk: yazi, maxW: W * 0.7 });
  }
  ciz(H * 0.954);
  if (sifre) metin(ctx, sifre, W * 0.835, H * 0.9685, { px: H * 0.0125, agirlik: 500, renk: koyu ? '#aaa' : '#555', hiza: 'right' });

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
};
