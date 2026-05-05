import { applyLogos } from './applyLogos';

// Tamamen yerel Canvas-only poster üretimi.
// AI'a HİÇ veri gönderilmez — yüzler ve isimler %100 garantili korunur.
// Şablon arka plan olarak kullanılır, üzerine layout çizilir.

const urlToImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Resim yüklenemedi: ' + src));
  if (src instanceof File) {
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    reader.readAsDataURL(src);
  } else {
    img.src = src;
  }
});

// TR / EU saat dönüşümü
const isEUSummer = (tarihStr) => {
  if (!tarihStr) return true;
  const [d, m, y] = String(tarihStr).split('.').map(Number);
  if (!y || !m || !d) return true;
  const dt = new Date(y, m - 1, d);
  const marLast = new Date(y, 2, 31);
  while (marLast.getDay() !== 0) marLast.setDate(marLast.getDate() - 1);
  const octLast = new Date(y, 9, 31);
  while (octLast.getDay() !== 0) octLast.setDate(octLast.getDate() - 1);
  return dt >= marLast && dt < octLast;
};
const trToEU = (saat, tarih) => {
  if (!saat || !saat.includes(':')) return saat;
  const [h, mn] = saat.split(':').map(Number);
  const offset = isEUSummer(tarih) ? 1 : 2;
  let euH = h - offset;
  if (euH < 0) euH += 24;
  return `${String(euH).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
};

// Çok satırlı metin çiz (kelime kelime sar)
const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight) => {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  const lines = [];
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    const w = ctx.measureText(test).width;
    if (w > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  for (const l of lines) {
    ctx.fillText(l, x, lineY);
    lineY += lineHeight;
  }
  return lineY;
};

export const gorselOlusturCanvas = async ({ egitim, egitmenler = [], sablonFile, ekPrompt = '', width = 1080, height = 1080 }) => {
  const W = width;
  const H = height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ─── ARKA PLAN: Plum gradient ───
  // Şablonu kullanmıyoruz çünkü hazır posterler içlerinde eski tarih/foto/isim
  // taşıyor — Canvas overlay'i düzgünce kapatamıyor. Onun yerine temiz Amare Plum
  // gradient arka plan + isteğe bağlı şablon "doku" (yoğun blur + düşük opacity)
  const baseGrad = ctx.createLinearGradient(0, 0, 0, H);
  baseGrad.addColorStop(0, '#7A2F6D');   // üst — biraz açık Plum
  baseGrad.addColorStop(0.5, '#5F2756'); // orta — tam Amare Deep Plum
  baseGrad.addColorStop(1, '#3D1734');   // alt — koyulaşıyor
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  // Şablon dokusu — çok düşük opacity + heavy blur ile arka plan dokusu olarak
  // (eski içerik tamamen kaybolur, sadece renk hareketi kalır)
  try {
    const sablonImg = await urlToImage(sablonFile);
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.filter = 'blur(40px) saturate(1.5)';
    const ratio = Math.max(W / sablonImg.width, H / sablonImg.height);
    const bgW = sablonImg.width * ratio;
    const bgH = sablonImg.height * ratio;
    ctx.drawImage(sablonImg, (W - bgW) / 2, (H - bgH) / 2, bgW, bgH);
    ctx.restore();
  } catch {}

  // İnce dekoratif çizgi (üst ve alt)
  ctx.fillStyle = 'rgba(245, 215, 122, 0.7)'; // altın
  ctx.fillRect(60, 22, W - 120, 3);
  ctx.fillRect(60, H - 25, W - 120, 3);

  // ─── ÜST: gerçek Amare (sol) + One Team (sağ) logoları ───
  try {
    const amareLogo = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
    const amareW = W * 0.28;
    const amareH = (amareLogo.height / amareLogo.width) * amareW;
    ctx.drawImage(amareLogo, W * 0.05, H * 0.04, amareW, amareH);
  } catch {}
  try {
    const otLogo = await urlToImage('/logos/oneteam logo.JPG');
    const otW = W * 0.10;
    const otH = (otLogo.height / otLogo.width) * otW;
    ctx.drawImage(otLogo, W - otW - W * 0.05, H * 0.04, otW, otH);
  } catch {}

  // ─── BAŞLIK ───
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 60px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  const baslikY = drawWrappedText(ctx, egitim.egitim || '', W / 2, 170, W - 100, 70);
  ctx.shadowBlur = 0;

  // ─── TARİH + SAAT (TR/EU) ───
  const trSaat = egitim.saat || '';
  const trBitis = egitim.bitisSaati || '';
  const euSaat = trToEU(trSaat, egitim.tarih);
  const euBitis = trToEU(trBitis, egitim.tarih);

  let saatY = baslikY + 30;
  ctx.fillStyle = '#F5D77A';
  ctx.font = 'bold 36px Arial';
  ctx.fillText(`${egitim.tarih || ''} ${egitim.gun || ''}`.trim(), W / 2, saatY);
  saatY += 50;

  if (trSaat) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`TR ${trSaat}${trBitis ? ' - ' + trBitis : ''}`, W / 2, saatY);
    saatY += 38;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '28px Arial';
    ctx.fillText(`EU ${euSaat}${euBitis ? ' - ' + euBitis : ''}`, W / 2, saatY);
    saatY += 30;
  }

  // ─── KONUŞMACI KARTLARI ───
  const fotoluListe = egitmenler.filter(e => true); // hepsi (foto olmasa da)
  const cardsStartY = saatY + 50;
  const cardsAreaH = H - cardsStartY - 200;

  if (fotoluListe.length > 0) {
    const cols = Math.min(fotoluListe.length, 4);
    const rows = Math.ceil(fotoluListe.length / 4);
    const gap = 25;
    const maxCardW = (W - 80 - gap * (cols - 1)) / cols;
    const cardSize = Math.min(maxCardW, cardsAreaH / rows - 80);
    const cardW = cardSize;
    const fotoSize = cardSize * 0.9;
    const totalW = cardW * cols + gap * (cols - 1);
    const startX = (W - totalW) / 2;
    const rowH = cardSize + 80;

    for (let i = 0; i < fotoluListe.length; i++) {
      const e = fotoluListe[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = cardsStartY + row * rowH;

      // Yuvarlak foto
      const fotoX = x + (cardW - fotoSize) / 2;
      const fotoY = y;

      if (e.fotoURL) {
        try {
          const img = await urlToImage(e.fotoURL);
          ctx.save();
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          // cover-fit yap (kare kırp)
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, fotoX, fotoY, fotoSize, fotoSize);
          ctx.restore();
          // Beyaz çerçeve
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 5;
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } catch {
          // foto yüklenemezse placeholder
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // foto yok — silüet
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // İsim
      const textY = fotoY + fotoSize + 30;
      const ad = (e.ad || '').toUpperCase();
      const nameSize = Math.max(16, Math.min(26, cardSize * 0.1));
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${nameSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 6;
      drawWrappedText(ctx, ad, x + cardW / 2, textY, cardW + 10, nameSize + 4);
      ctx.shadowBlur = 0;

      // Unvan
      if (e.unvan) {
        const unvanSize = nameSize - 4;
        const unvanY = textY + (ad.split(' ').length > 2 ? (nameSize + 4) * 2 : nameSize + 8);
        ctx.fillStyle = '#F5D77A';
        ctx.font = `${unvanSize}px Arial`;
        drawWrappedText(ctx, e.unvan, x + cardW / 2, unvanY, cardW + 20, unvanSize + 2);
      }
    }
  }

  // ─── ALT: Yer/Zoom + Site URL ───
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  if (egitim.yer) {
    ctx.fillText(egitim.yer.length > 50 ? egitim.yer.slice(0, 50) + '...' : egitim.yer, W / 2, H - 90);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '20px Arial';
  ctx.fillText('egitimtakvimi.oneteamglobal.ai', W / 2, H - 40);

  // PNG base64 olarak döndür (Gemini sonucu ile uyumlu format)
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  // Post-process: tek noktadan gerçek logolar bindirilir
  return await applyLogos(base64, 'image/png');
};
