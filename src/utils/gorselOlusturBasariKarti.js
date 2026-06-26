// "Amare Başarı Kartı" — deterministik Canvas PNG (AI YOK).
// Liderin kariyer yolculuğunu (foto + güncel kariyer + kaç ayda hangi basamak)
// ışıltılı bir kartta gösterir. Rütbe yükseldikçe daha çok altın parıltı.
import { imgYukle as urlToImage } from './imgYukle';

const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2); ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr);
  else { ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr); ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath(); }
};

export const gorselOlusturBasariKarti = async ({ ad, fotoURL, guncelKariyer = '', toplamMetni = '', isilti = 0, adimlar = [] }) => {
  const W = 1080;
  const adimlar0 = (adimlar || []).slice(0, 10);
  const n = adimlar0.length;
  const adimH = Math.round(W * 0.085);
  const ust = Math.round(W * 0.86);   // logo+foto+isim+kariyer+süre alanı
  const alt = Math.round(W * 0.10);
  const H = Math.max(1080, ust + (n ? Math.round(W * 0.05) + n * adimH : 0) + alt);
  const gold = '#d8b15a', goldRGB = '216,177,90', goldKoyu = '#b8923f';

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // zemin
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0b0d'); g.addColorStop(1, '#17120a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // üst ışık (rütbeye göre güçlenir)
  const r = ctx.createRadialGradient(W / 2, H * 0.22, 40, W / 2, H * 0.22, W * 0.9);
  r.addColorStop(0, `rgba(${goldRGB},${0.1 + isilti * 0.35})`); r.addColorStop(1, `rgba(${goldRGB},0)`);
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H * 0.6);
  // altın elmas serpiştir (rütbe arttıkça daha çok)
  const adet = Math.round(6 + isilti * 18);
  const seed = (ad || '').length;
  for (let i = 0; i < adet; i++) {
    const px = ((i * 73 + seed * 17) % 100) / 100, py = ((i * 137 + seed * 31) % 60) / 100;
    const cx = px * W, cy = py * H, s = (i % 3 === 0 ? 9 : 5);
    ctx.save(); ctx.fillStyle = `rgba(${goldRGB},${0.45 - (i % 4) * 0.08})`;
    ctx.translate(cx, cy); ctx.rotate(Math.PI / 4); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
  }
  // köşe altın çerçeve
  ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
  const cm = Math.round(W * 0.04), cl = Math.round(W * 0.07);
  const kose = (x, y, dx, dy) => { ctx.beginPath(); ctx.moveTo(x + dx * cl, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * cl); ctx.stroke(); };
  kose(cm, cm, 1, 1); kose(W - cm, cm, -1, 1); kose(cm, H - cm, 1, -1); kose(W - cm, H - cm, -1, -1);
  ctx.globalAlpha = 1;

  let y = Math.round(W * 0.05);
  // One Team logo
  try { const logo = await urlToImage('/logos/oneteam-logo.png'); const lh = Math.round(W * 0.07), lw = lh * (logo.width / logo.height); ctx.drawImage(logo, (W - lw) / 2, y, lw, lh); y += lh + Math.round(W * 0.03); } catch { y += Math.round(W * 0.06); }

  // foto (altın halka + glow)
  const foto = Math.round(W * 0.30), fcx = W / 2, fcy = y + foto / 2;
  const gl = ctx.createRadialGradient(fcx, fcy, foto * 0.4, fcx, fcy, foto * 0.95);
  gl.addColorStop(0, `rgba(${goldRGB},${0.25 + isilti * 0.4})`); gl.addColorStop(1, `rgba(${goldRGB},0)`);
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(fcx, fcy, foto * 0.95, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.shadowColor = `rgba(${goldRGB},${0.4 + isilti * 0.6})`; ctx.shadowBlur = 20 + isilti * 40;
  ctx.beginPath(); ctx.arc(fcx, fcy, foto / 2 + 8, 0, Math.PI * 2); ctx.fillStyle = gold; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(fcx, fcy, foto / 2 + 2, 0, Math.PI * 2); ctx.fillStyle = '#17120a'; ctx.fill();
  ctx.beginPath(); ctx.arc(fcx, fcy, foto / 2, 0, Math.PI * 2); ctx.clip();
  if (fotoURL) { try { const im = await urlToImage(fotoURL); const md = Math.min(im.width, im.height); ctx.drawImage(im, (im.width - md) / 2, Math.max(0, (im.height - md) * 0.2), md, md, fcx - foto / 2, fcy - foto / 2, foto, foto); } catch { ctx.fillStyle = '#555'; ctx.fillRect(fcx - foto / 2, fcy - foto / 2, foto, foto); } }
  else { ctx.fillStyle = '#555'; ctx.fillRect(fcx - foto / 2, fcy - foto / 2, foto, foto); }
  ctx.restore();
  y = fcy + foto / 2 + Math.round(W * 0.04);

  // isim
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(W * 0.055)}px Arial`;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
  ctx.fillText((ad || '').toLocaleUpperCase('tr-TR'), W / 2, y, W - Math.round(W * 0.12));
  ctx.shadowBlur = 0; y += Math.round(W * 0.05);
  // güncel kariyer (gold pill)
  if (guncelKariyer) {
    ctx.font = `800 ${Math.round(W * 0.034)}px Arial`;
    const tw = ctx.measureText(guncelKariyer.toLocaleUpperCase('tr-TR')).width, ph = Math.round(W * 0.058), pw = tw + Math.round(W * 0.07);
    ctx.fillStyle = gold; roundRect(ctx, (W - pw) / 2, y, pw, ph, ph / 2); ctx.fill();
    ctx.fillStyle = '#2a1c06'; ctx.textBaseline = 'middle'; ctx.fillText(guncelKariyer.toLocaleUpperCase('tr-TR'), W / 2, y + ph / 2); ctx.textBaseline = 'alphabetic';
    y += ph + Math.round(W * 0.025);
  }
  if (toplamMetni) { ctx.fillStyle = '#d9d6cf'; ctx.font = `500 ${Math.round(W * 0.028)}px Arial`; ctx.fillText(`Amare'de ${toplamMetni}`, W / 2, y); y += Math.round(W * 0.04); }

  // başlık çizgisi
  if (n) {
    ctx.fillStyle = gold; ctx.font = `700 ${Math.round(W * 0.026)}px Arial`;
    ctx.fillText('KARİYER YOLCULUĞU', W / 2, y); y += Math.round(W * 0.02);
    const lw = Math.round(W * 0.14);
    const lg = ctx.createLinearGradient(W / 2 - lw, 0, W / 2 + lw, 0);
    lg.addColorStop(0, `rgba(${goldRGB},0)`); lg.addColorStop(0.5, gold); lg.addColorStop(1, `rgba(${goldRGB},0)`);
    ctx.fillStyle = lg; ctx.fillRect(W / 2 - lw, y, lw * 2, 2); y += Math.round(W * 0.025);
  }

  // adımlar
  const M = Math.round(W * 0.08);
  const cizgiX = M + Math.round(W * 0.03);
  if (n) { ctx.strokeStyle = `rgba(${goldRGB},0.35)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cizgiX, y + adimH * 0.5); ctx.lineTo(cizgiX, y + (n - 0.5) * adimH); ctx.stroke(); }
  adimlar0.forEach((a, i) => {
    const ry = y + i * adimH, cy = ry + adimH / 2;
    const sv = (i + 1) / Math.max(1, n);
    // numara
    ctx.beginPath(); ctx.arc(cizgiX, cy, Math.round(W * 0.028), 0, Math.PI * 2);
    ctx.fillStyle = gold; ctx.fill();
    ctx.fillStyle = '#2a1c06'; ctx.font = `800 ${Math.round(W * 0.026)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), cizgiX, cy); ctx.textBaseline = 'alphabetic';
    // kariyer + tarih
    const tx = cizgiX + Math.round(W * 0.06);
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.font = `800 ${Math.round(W * 0.03)}px Arial`;
    ctx.fillText((a.kariyer || '').toLocaleUpperCase('tr-TR'), tx, cy - Math.round(W * 0.004), W - tx - M - Math.round(W * 0.16));
    ctx.fillStyle = '#bdb6a6'; ctx.font = `500 ${Math.round(W * 0.021)}px Arial`;
    ctx.fillText(a.tarih || '', tx, cy + Math.round(W * 0.026));
    // süre (sağ)
    if (a.sure) { ctx.textAlign = 'right'; ctx.fillStyle = gold; ctx.font = `700 ${Math.round(W * 0.026)}px Arial`; ctx.fillText(a.sure, W - M, cy + Math.round(W * 0.008)); ctx.textAlign = 'left'; }
  });
  if (n) y += n * adimH;

  // amare logo
  try { const amare = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png'); const ah = Math.round(W * 0.03), aw = ah * (amare.width / amare.height); ctx.drawImage(amare, (W - aw) / 2, H - ah - Math.round(W * 0.025), aw, ah); } catch {}

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
};
