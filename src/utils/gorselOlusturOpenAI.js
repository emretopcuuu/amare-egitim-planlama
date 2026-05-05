// OpenAI Hibrit-style poster üretimi:
// 1) OpenAI gpt-image-1 → SADECE dekoratif arka plan (text/logo/foto YOK)
// 2) Canvas → Gerçek fotoğrafları, isimleri, başlığı, tarihi yapıştırır
// Türkçe text rendering problemi çözüldü çünkü tüm yazıyı Canvas çiziyor.

const urlToImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Resim yüklenemedi'));
  if (src instanceof File) {
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    reader.readAsDataURL(src);
  } else {
    img.src = src;
  }
});

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

const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) => {
  const words = String(text || '').split(' ');
  let line = '';
  const lines = [];
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const finalLines = lines.slice(0, maxLines);
  let curY = y;
  for (const l of finalLines) {
    ctx.fillText(l, x, curY);
    curY += lineHeight;
  }
  return curY;
};

// OpenAI gpt-image-1'den DEKORATIF arka plan üret — text/logo/foto YOK
const arkaPlanUretOpenAI = async (apiKey, format = 'square') => {
  const prompt = `Abstract decorative poster background ONLY. NO text, NO letters, NO numbers, NO logos, NO faces, NO people, NO podiums, NO banners, NO frames, NO objects.

Style: luxurious gradient with deep plum #5F2756 as primary color, accents of dark purple #3D1734 and warm gold #F5D77A. Soft bokeh, gentle glow, silky abstract textures. Top section slightly darker, middle slightly lighter, bottom darker again. Premium event poster aesthetic.

CRITICAL EXCLUSIONS: Do NOT draw any "amare" text, "ONE TEAM" text, "Amare Global" text, or any brand names. Do NOT draw any logos, symbols, emblems, or icons. Do NOT draw any people or human figures. Do NOT draw any text whatsoever in any language. Pure abstract decorative background only.`;

  const sizeMap = { story: '1024x1536', landscape: '1536x1024', square: '1024x1024' };
  const size = sizeMap[format] || '1024x1024';

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      size,
      quality: 'medium',
      n: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI API Hatası: ${res.status}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI arka plan döndürmedi.');
  return b64;
};

export const gorselOlusturOpenAI = async ({ apiKey, egitim, egitmenler = [], sablonFile, ekPrompt = '', quality = 'medium', format = 'square' }) => {
  if (!apiKey) throw new Error('OpenAI API anahtarı girilmedi.');

  // Boyut belirle
  const dims = format === 'story' ? { W: 1080, H: 1920 } :
               format === 'landscape' ? { W: 1920, H: 1080 } :
               { W: 1080, H: 1080 };

  // 1. AŞAMA: OpenAI'dan dekoratif arka plan al
  const bgB64 = await arkaPlanUretOpenAI(apiKey, format);
  const arkaPlanImg = await urlToImage(`data:image/png;base64,${bgB64}`);

  // 2. AŞAMA: Canvas üzerine içerik bindir (Hibrit ile aynı layout)
  const W = dims.W;
  const H = dims.H;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Arka planı çiz (cover-fit)
  const ratio = Math.max(W / arkaPlanImg.width, H / arkaPlanImg.height);
  const bgW = arkaPlanImg.width * ratio;
  const bgH = arkaPlanImg.height * ratio;
  ctx.drawImage(arkaPlanImg, (W - bgW) / 2, (H - bgH) / 2, bgW, bgH);

  // Alt koyulaştırma
  const botGrad = ctx.createLinearGradient(0, H - 200, 0, H);
  botGrad.addColorStop(0, 'rgba(20, 8, 30, 0)');
  botGrad.addColorStop(1, 'rgba(20, 8, 30, 0.7)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 200, W, 200);

  // Köşe-only maske (sahte logoları örtmek için, normalde olmamalı ama garanti)
  const cornerW = Math.floor(W * 0.35);
  const cornerH = Math.floor(H * 0.12);
  const lg = ctx.createLinearGradient(0, 0, cornerW, cornerH);
  lg.addColorStop(0, 'rgba(61, 23, 52, 1)');
  lg.addColorStop(0.7, 'rgba(61, 23, 52, 0.95)');
  lg.addColorStop(1, 'rgba(61, 23, 52, 0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, cornerW, cornerH);
  const rg = ctx.createLinearGradient(W, 0, W - cornerW, cornerH);
  rg.addColorStop(0, 'rgba(61, 23, 52, 1)');
  rg.addColorStop(0.7, 'rgba(61, 23, 52, 0.95)');
  rg.addColorStop(1, 'rgba(61, 23, 52, 0)');
  ctx.fillStyle = rg;
  ctx.fillRect(W - cornerW, 0, cornerW, cornerH);

  // ─── BAŞLIK ───
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#FFFFFF';
  drawWrappedText(ctx, egitim.egitim || '', W / 2, 200, W - 100, 64, 3);
  ctx.shadowBlur = 14;
  const baslikY = drawWrappedText(ctx, egitim.egitim || '', W / 2, 200, W - 100, 64, 3);
  ctx.shadowBlur = 0;

  // ─── TARİH + SAAT ───
  const trSaat = egitim.saat || '';
  const trBitis = egitim.bitisSaati || '';
  const euSaat = trToEU(trSaat, egitim.tarih);
  const euBitis = trToEU(trBitis, egitim.tarih);

  let saatY = baslikY + 18;
  ctx.fillStyle = '#F5D77A';
  ctx.font = 'bold 32px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(`${egitim.tarih || ''} ${egitim.gun || ''}`.trim(), W / 2, saatY);
  saatY += 42;

  if (trSaat) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`TR ${trSaat}${trBitis ? ' - ' + trBitis : ''}`, W / 2, saatY);
    saatY += 32;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '24px Arial';
    ctx.fillText(`EU ${euSaat}${euBitis ? ' - ' + euBitis : ''}`, W / 2, saatY);
    saatY += 18;
  }
  ctx.shadowBlur = 0;

  // ─── KONUŞMACI KARTLARI ───
  const liste = (egitmenler || []);
  const titleEnd = saatY + 30;
  const footerStart = H - 200;
  const cardsAreaTop = titleEnd;
  const cardsAreaH = footerStart - cardsAreaTop;

  if (liste.length > 0) {
    const cols = Math.min(liste.length, 4);
    const rows = Math.ceil(liste.length / 4);
    const gap = 18;
    const sidePad = 50;
    const maxCardW = (W - sidePad * 2 - gap * (cols - 1)) / cols;
    const maxCardH = cardsAreaH / rows - 30;
    const cardSize = Math.min(maxCardW, maxCardH - 90);
    const cardW = cardSize;
    const fotoSize = cardSize * 0.92;
    const totalW = cardW * cols + gap * (cols - 1);
    const startX = (W - totalW) / 2;
    const rowH = cardSize + 100;
    const totalH = rowH * rows - 30;
    const cardsStartY = cardsAreaTop + (cardsAreaH - totalH) / 2;

    for (let i = 0; i < liste.length; i++) {
      const e = liste[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = cardsStartY + row * rowH;
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
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, fotoX, fotoY, fotoSize, fotoSize);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#F5D77A';
          ctx.lineWidth = 4;
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 0;
          ctx.stroke();
        } catch {
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const ad = (e.ad || '').toUpperCase();
      const nameSize = Math.max(15, Math.min(24, cardSize * 0.095));
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${nameSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      const lastY = drawWrappedText(ctx, ad, x + cardW / 2, fotoY + fotoSize + 32, cardW + 30, nameSize + 4, 2);

      if (e.unvan) {
        const unvanSize = nameSize - 4;
        ctx.fillStyle = '#F5D77A';
        ctx.font = `${unvanSize}px Arial`;
        drawWrappedText(ctx, e.unvan, x + cardW / 2, lastY + 4, cardW + 35, unvanSize + 2, 2);
      }
      ctx.shadowBlur = 0;
    }
  }

  // ─── ALT: Gradient + Yer + URL ───
  const botMaskGrad = ctx.createLinearGradient(0, H - 260, 0, H);
  botMaskGrad.addColorStop(0, 'rgba(20, 8, 30, 0)');
  botMaskGrad.addColorStop(0.3, 'rgba(20, 8, 30, 0.95)');
  botMaskGrad.addColorStop(1, 'rgba(20, 8, 30, 1)');
  ctx.fillStyle = botMaskGrad;
  ctx.fillRect(0, H - 260, W, 260);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8;
  if (egitim.yer) {
    const yer = egitim.yer.length > 55 ? egitim.yer.slice(0, 55) + '...' : egitim.yer;
    ctx.fillText(yer, W / 2, H - 130);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '16px Arial';
  ctx.fillText('egitimtakvimi.oneteamglobal.ai', W / 2, H - 25);

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  // applyLogos çağırılmaz — Canvas'ta her şey kontrol altında, Türkçe yazı problemsiz
  return { base64, mimeType: 'image/png' };
};
