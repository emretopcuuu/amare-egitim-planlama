// Şablonlu Afiş için KODLA çizilen hazır arka planlar (ücretsiz, YZ yok, anında).
// Saha geri bildirimi (13 Kas 2026): "çok mekanik" → düz zemin yerine katmanlı, ışıklı, derinlikli zeminler.
// Her stil aksan renginden türer; tema 'koyu' ise koyu/dramatik, 'acik' ise pastel/ferah.
// tohum: aynı stilde farklı varyasyon (şekillerin konumu/boyutu değişir).

export const DEKOR_STILLERI = [
  { id: 'isik', ad: 'Işık huzmesi' },
  { id: 'geometrik', ad: 'Geometrik' },
  { id: 'halka', ad: 'Halkalar' },
  { id: 'dalga', ad: 'Dalga' },
  { id: 'bokeh', ad: 'Bokeh' },
  { id: 'cerceve', ad: 'Çerçeve' },
];

const rgb = (hex) => {
  const m = String(hex || '').replace('#', '').match(/^([0-9a-f]{6})$/i);
  const n = m ? parseInt(m[1], 16) : 0xe8312f;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};
const al = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };

const rng = (seed) => { let t = (seed >>> 0) + 0x6D2B79F5; return () => { t += 0x6D2B79F5; let x = Math.imul(t ^ (t >>> 15), 1 | t); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };

// ctx 1080×1920 mantıksal koordinatta çizer (çağıran ölçekler).
export const dekorCiz = (ctx, W, H, { stil = 'isik', renk = '#e8312f', tema = 'koyu', tohum = 1 } = {}) => {
  const koyu = tema === 'koyu';
  const R = rng(tohum * 7919 + stil.length * 131);
  const tepe = koyu ? mix(renk, '#000000', 0.78) : mix(renk, '#ffffff', 0.9);
  const orta = koyu ? mix(renk, '#000000', 0.42) : mix(renk, '#ffffff', 0.78);
  const dip = koyu ? mix(renk, '#000000', 0.86) : mix(renk, '#ffffff', 0.93);
  const parla = koyu ? mix(renk, '#ffffff', 0.15) : renk;
  const beyaz = koyu ? '#ffffff' : renk;

  const taban = (a = tepe, b = orta, c = dip) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, a); g.addColorStop(0.5, b); g.addColorStop(1, c);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  const glow = (x, y, r, renkA, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, al(renkA, a)); g.addColorStop(1, al(renkA, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };

  if (stil === 'isik') {
    taban();
    glow(W / 2, H * 0.3, W * 1.05, parla, koyu ? 0.62 : 0.3);
    const n = 6 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const bx = W * (0.1 + 0.8 * (i / (n - 1))) + (R() - 0.5) * 80;
      const gen = 70 + R() * 120;
      const g = ctx.createLinearGradient(W / 2, 0, bx, H * 0.85);
      g.addColorStop(0, al(beyaz, koyu ? 0.26 : 0.16)); g.addColorStop(1, al(beyaz, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(W / 2 - 14, -20); ctx.lineTo(W / 2 + 14, -20); ctx.lineTo(bx + gen, H * 0.85); ctx.lineTo(bx - gen, H * 0.85); ctx.closePath(); ctx.fill();
    }
    glow(W / 2, -60, W * 0.55, '#ffffff', koyu ? 0.35 : 0.5);
  } else if (stil === 'geometrik') {
    taban(tepe, orta, dip);
    ctx.save();
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(R() * W, R() * H); ctx.rotate(-0.5 + R() * 0.3);
      const w = 260 + R() * 340, h = H * 1.4;
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, al(i % 2 ? parla : beyaz, koyu ? 0.22 : 0.16)); g.addColorStop(1, al(parla, 0.02));
      ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    for (let i = 0; i < 7; i++) {
      const x = R() * W, y = R() * H, s = 90 + R() * 220;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + R() * 0.0; const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath();
      ctx.strokeStyle = al(beyaz, koyu ? 0.18 : 0.14); ctx.lineWidth = 3; ctx.stroke();
      if (i % 3 === 0) { ctx.fillStyle = al(parla, koyu ? 0.14 : 0.1); ctx.fill(); }
    }
    ctx.restore();
    glow(W * (0.2 + R() * 0.6), H * 0.28, W * 0.9, parla, koyu ? 0.4 : 0.22);
  } else if (stil === 'halka') {
    taban();
    const cx = W * (0.35 + R() * 0.3), cy = H * (0.3 + R() * 0.14);
    glow(cx, cy, W * 1.0, parla, koyu ? 0.55 : 0.28);
    for (let r = 160, i = 0; r < 1700; r += 140 + R() * 40, i++) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = al(beyaz, Math.max(0.03, (koyu ? 0.3 : 0.22) - i * 0.022)); ctx.lineWidth = i % 3 === 0 ? 5 : 2.5; ctx.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const a = R() * Math.PI * 2, r = 250 + R() * 1100;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4 + R() * 8, 0, Math.PI * 2);
      ctx.fillStyle = al(beyaz, 0.3 + R() * 0.3); ctx.fill();
    }
  } else if (stil === 'dalga') {
    taban();
    glow(W * 0.7, H * 0.18, W * 0.9, parla, koyu ? 0.45 : 0.22);
    for (let k = 0; k < 6; k++) {
      const y0 = H * (0.28 + k * 0.12), A = 70 + R() * 90, f = 0.004 + R() * 0.004, ph = R() * 6;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y0 + Math.sin(x * f + ph) * A + Math.sin(x * f * 2.3 + ph) * A * 0.35);
      ctx.lineTo(W, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, y0 - A, 0, y0 + 500);
      g.addColorStop(0, al(k % 2 ? parla : beyaz, koyu ? 0.2 : 0.16)); g.addColorStop(1, al(parla, 0));
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = al(beyaz, 0.18); ctx.lineWidth = 2; ctx.stroke();
    }
  } else if (stil === 'bokeh') {
    taban();
    glow(W / 2, H * 0.35, W * 1.1, parla, koyu ? 0.5 : 0.25);
    for (let i = 0; i < 46; i++) {
      const x = R() * W, y = R() * H, r = 24 + R() * 120;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const c = R() > 0.5 ? beyaz : parla;
      g.addColorStop(0, al(c, 0.05 + R() * 0.2)); g.addColorStop(0.8, al(c, 0.07)); g.addColorStop(1, al(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  } else { // cerceve
    taban();
    glow(W / 2, H * 0.4, W * 1.0, parla, koyu ? 0.35 : 0.2);
    ctx.lineWidth = 4; ctx.strokeStyle = al(beyaz, koyu ? 0.55 : 0.4);
    ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.lineWidth = 2; ctx.strokeStyle = al(beyaz, koyu ? 0.22 : 0.18);
    ctx.strokeRect(62, 62, W - 124, H - 124);
    for (const [x, y, s] of [[0, 0, 1], [W, 0, 2], [W, H, 3], [0, H, 4]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2 * (s - 1));
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 420);
      g.addColorStop(0, al(parla, koyu ? 0.5 : 0.3)); g.addColorStop(1, al(parla, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 420, 0, Math.PI / 2); ctx.lineTo(0, 0); ctx.fill();
      ctx.restore();
    }
  }
  // Ortak vinyet: kenarlar hafif kararır → derinlik
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, koyu ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
};
