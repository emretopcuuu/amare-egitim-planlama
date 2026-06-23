// Tamamen yerel Canvas-only poster üretimi.
// AI'a HİÇ veri gönderilmez — yüzler ve isimler %100 garantili korunur.
// Şablon arka plan olarak kullanılır, üzerine layout çizilir.

import { afisAdresKisa, isFiziki } from './egitmenEtiket';
import { qrOlustur } from './qrOlustur';
import { fotoYerlesim } from './fotoYerlesim';

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

// Çok satırlı metin çiz (kelime kelime sar) — kaç satır çizdiğini döner
const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) => {
  if (!text) return 0;
  const words = String(text).split(' ');
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
  // Max satır sayısını aş (sonuncuda "..." ekle)
  if (lines.length > maxLines) {
    const lastLine = lines[maxLines - 1];
    let trimmed = lastLine;
    while (ctx.measureText(trimmed + '…').width > maxWidth && trimmed.length > 1) {
      trimmed = trimmed.slice(0, -1);
    }
    lines.length = maxLines;
    lines[maxLines - 1] = trimmed + '…';
  }
  for (const l of lines) {
    ctx.fillText(l, x, lineY);
    lineY += lineHeight;
  }
  return lineY;
};

// ekPrompt'tan isim + unvan blokları çıkar — modal'da kullanıcı edit ettiyse onu kullan
// Beklenen format:
//   1. AD SOYAD
//      Unvan
//
//   2. AD2
//      Unvan2
const parseEkPromptEgitmenler = (ekPrompt, fallback = []) => {
  if (!ekPrompt || typeof ekPrompt !== 'string') return fallback;
  const lines = ekPrompt.split('\n').map(l => l.replace(/ /g, ' '));
  const out = [];
  let i = 0;
  while (i < lines.length) {
    // "1. AD" satırını yakala
    const m = lines[i].match(/^\s*(\d+)\.\s*(.+?)\s*$/);
    if (m) {
      const ad = m[2].trim();
      // Sonraki satır → unvan (eğer "(boş)" veya "—" değilse)
      let unvan = '';
      const ny = (lines[i + 1] || '').trim();
      if (ny && !/^\d+\./.test(ny) && !/^\s*$/.test(ny) && !/\(unvan girilmemiş/i.test(ny) && !/\(boş\)/i.test(ny)) {
        unvan = ny;
      }
      // Eski egitmenler array'inden fotoyu eşleştir (sıra + ad yakınlığı)
      const eski = fallback[out.length] || fallback.find(x => x?.ad && x.ad.toLocaleUpperCase('tr-TR') === ad.toLocaleUpperCase('tr-TR'));
      out.push({
        ad,
        unvan,
        fotoURL: eski?.fotoURL || null,
        biyografi: eski?.biyografi || '',
      });
    }
    i++;
  }
  return out.length > 0 ? out : fallback;
};

export const gorselOlusturCanvas = async ({ egitim, egitmenler = [], sablonFile, ekPrompt = '', width = 1080, height = 1080 }) => {
  // ekPrompt'taki düzenleme varsa egitmenleri ondan al
  egitmenler = parseEkPromptEgitmenler(ekPrompt, egitmenler);
  const W = width;
  const H = height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ─── ARKA PLAN: Şablon dominant ───
  // Şablon arka plan olarak %100 görünür, üstüne foto+text overlay yapılır
  // Eski içerikleri kapatmak için üst ve alt bölgeler koyulaştırılır (mask)
  let sablonOk = false;
  try {
    const sablonImg = await urlToImage(sablonFile);
    const ratio = Math.max(W / sablonImg.width, H / sablonImg.height);
    const bgW = sablonImg.width * ratio;
    const bgH = sablonImg.height * ratio;
    ctx.drawImage(sablonImg, (W - bgW) / 2, (H - bgH) / 2, bgW, bgH);
    sablonOk = true;
  } catch {}

  // Şablon yüklenemezse fallback gradient
  if (!sablonOk) {
    const baseGrad = ctx.createLinearGradient(0, 0, 0, H);
    baseGrad.addColorStop(0, '#7A2F6D');
    baseGrad.addColorStop(0.5, '#5F2756');
    baseGrad.addColorStop(1, '#3D1734');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // Üst maske — şablonun eski başlık/logo bölgesini kapat (yeni başlık için yer)
  const topMaskH = Math.floor(H * 0.22);
  const topMask = ctx.createLinearGradient(0, 0, 0, topMaskH);
  topMask.addColorStop(0, 'rgba(61, 23, 52, 0.95)');
  topMask.addColorStop(0.7, 'rgba(61, 23, 52, 0.85)');
  topMask.addColorStop(1, 'rgba(61, 23, 52, 0)');
  ctx.fillStyle = topMask;
  ctx.fillRect(0, 0, W, topMaskH);

  // Alt maske — şablonun eski tarih/zoom bölgesini kapat
  const botMaskH = Math.floor(H * 0.20);
  const botMask = ctx.createLinearGradient(0, H - botMaskH, 0, H);
  botMask.addColorStop(0, 'rgba(20, 8, 30, 0)');
  botMask.addColorStop(0.4, 'rgba(20, 8, 30, 0.85)');
  botMask.addColorStop(1, 'rgba(20, 8, 30, 0.97)');
  ctx.fillStyle = botMask;
  ctx.fillRect(0, H - botMaskH, W, botMaskH);

  // İnce dekoratif çizgi (üst ve alt)
  ctx.fillStyle = 'rgba(245, 215, 122, 0.7)'; // altın
  ctx.fillRect(60, 22, W - 120, 3);
  ctx.fillRect(60, H - 25, W - 120, 3);

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
    // Metin alanı: 3 satır isim + 2 satır unvan + boşluklar ≈ 130-150px
    const textAreaH = 150;
    const rowGap = 30;
    const availableHPerRow = (cardsAreaH - rowGap * (rows - 1)) / rows;
    const maxFotoFromH = availableHPerRow - textAreaH;
    const maxCardW = (W - 80 - gap * (cols - 1)) / cols;
    // Foto çapı: width-limit VEYA height-limit'den küçük olanı
    const fotoSize = Math.max(140, Math.min(maxCardW * 0.95, maxFotoFromH, 280));
    const cardW = Math.max(fotoSize, maxCardW); // text alan'ı için kart en az foto kadar genis
    const cardH = fotoSize + textAreaH;
    const totalW = cardW * cols + gap * (cols - 1);
    const startX = (W - totalW) / 2;
    const rowH = cardH + rowGap;

    for (let i = 0; i < fotoluListe.length; i++) {
      const e = fotoluListe[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = cardsStartY + row * rowH;

      // Yuvarlak foto
      const fotoX = x + (cardW - fotoSize) / 2;
      const fotoY = y;

      // Initial harfleri (foto yüklenmezse fallback için)
      const initials = (e.ad || '?').trim().split(/\s+/).filter(Boolean)
        .map(p => p[0]).join('').slice(0, 2).toUpperCase();

      // Premium fallback placeholder — altın gradient + initials
      const placeholderCiz = () => {
        const cx = fotoX + fotoSize / 2;
        const cy = fotoY + fotoSize / 2;
        // Altın gradient daire
        const grad = ctx.createRadialGradient(cx, cy - fotoSize * 0.2, fotoSize * 0.1, cx, cy, fotoSize / 2);
        grad.addColorStop(0, 'rgba(251, 215, 122, 0.95)');
        grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.85)');
        grad.addColorStop(1, 'rgba(124, 58, 237, 0.5)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, fotoSize / 2, 0, Math.PI * 2);
        ctx.fill();
        // Initials
        const fs = Math.floor(fotoSize * 0.4);
        ctx.fillStyle = '#3F1D6B';
        ctx.font = `bold ${fs}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255,255,255,0.4)';
        ctx.shadowBlur = 4;
        ctx.fillText(initials, cx, cy + 2);
        ctx.shadowBlur = 0;
        ctx.textBaseline = 'alphabetic';
      };

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
        } catch (err) {
          console.warn(`[gorselCanvas] Foto yüklenemedi: ${e.ad} (${e.fotoURL?.slice(0, 80)}) — ${err.message}`);
          placeholderCiz();
        }
      } else {
        placeholderCiz();
      }

      // Beyaz çerçeve (foto/placeholder farketmez)
      ctx.beginPath();
      ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // İsim
      const textY = fotoY + fotoSize + 30;
      const ad = (e.ad || '').toUpperCase();
      // İsim font boyutu — fotoSize'a orantılı, min 18 max 30
      const nameSize = Math.max(18, Math.min(30, fotoSize * 0.13));
      const nameLineHeight = nameSize + 4;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${nameSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 6;
      // drawWrappedText artık sonraki Y'i döner — overlap yok
      const adSonY = drawWrappedText(ctx, ad, x + cardW / 2, textY, cardW * 0.95, nameLineHeight, 2);
      ctx.shadowBlur = 0;

      // Unvan — isim'den hemen sonra (lineY return'ı kullan)
      if (e.unvan) {
        const unvanSize = Math.max(14, nameSize - 6);
        const unvanLineHeight = unvanSize + 2;
        const unvanY = adSonY + 6; // isim bitince 6px boşluk
        ctx.fillStyle = '#F5D77A';
        ctx.font = `${unvanSize}px Arial`;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        drawWrappedText(ctx, e.unvan, x + cardW / 2, unvanY, cardW * 0.95, unvanLineHeight, 2);
        ctx.shadowBlur = 0;
      }
    }
  }

  // ─── ALT: Yer/Zoom + Site URL ───
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  const adresMetni = afisAdresKisa(egitim);
  if (adresMetni) {
    drawWrappedText(ctx, adresMetni, W / 2, H - 175, W * 0.82, 32, 2);
  }
  ctx.shadowBlur = 0;

  // ─── KÜÇÜK LOGOLAR (alt orta, URL üstü) ───
  // OneTeam (sol) + Amare (sağ) — subtle, küçük, tasarımı bozmaz
  try {
    const logoH = Math.floor(H * 0.038); // 1080 için ~41px
    const logoY = H - 120; // URL ile arasına 40px boşluk

    const oneTeamLogo = await urlToImage('/logos/oneteam-logo.png');
    const oneTeamRatio = oneTeamLogo.width / oneTeamLogo.height;
    const oneTeamW = logoH * oneTeamRatio;

    const amareLogo = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
    const amareRatio = amareLogo.width / amareLogo.height;
    const amareW = logoH * amareRatio;

    // Logolar arası ayraç + boşluk
    const gap = 30;
    const toplamW = oneTeamW + gap + amareW;
    const startX = (W - toplamW) / 2;

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(oneTeamLogo, startX, logoY, oneTeamW, logoH);
    ctx.drawImage(amareLogo, startX + oneTeamW + gap, logoY, amareW, logoH);
    ctx.restore();

    // Ayraç: ince dikey çizgi logolar arası
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 215, 122, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX + oneTeamW + gap / 2, logoY + 8);
    ctx.lineTo(startX + oneTeamW + gap / 2, logoY + logoH - 8);
    ctx.stroke();
    ctx.restore();
  } catch (e) {
    console.warn('[gorsel-uret] logo yuklenemedi:', e.message);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '20px Arial';
  ctx.fillText('egitimtakvimi.oneteamglobal.ai', W / 2, H - 40);

  // QR kod (fiziki etkinlik) — sağ alt köşe, /e/:id detay sayfası
  if (isFiziki(egitim)) {
    const qrDataUrl = await qrOlustur(`${typeof window !== 'undefined' ? window.location.origin : ''}/e/${egitim.id || ''}`);
    if (qrDataUrl) {
      try {
        const qrImg = await urlToImage(qrDataUrl);
        const qrSize = Math.floor(W * 0.12);
        const pad = Math.floor(W * 0.03);
        const qrX = W - qrSize - pad, qrY = H - qrSize - pad;
        const b = Math.floor(qrSize * 0.06);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - b, qrY - b, qrSize + 2 * b, qrSize + 2 * b);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(qrSize * 0.12)}px Arial`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
        ctx.fillText('Yol tarifi için okut', qrX + qrSize / 2, qrY - b - 6);
        ctx.shadowBlur = 0;
      } catch (e) { console.warn('[gorselCanvas] QR eklenemedi:', e.message); }
    }
  }

  // PNG base64 olarak döndür (Gemini sonucu ile uyumlu format)
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  // Logolar zaten yukarıda Canvas üst köşelerine bindirildi — applyLogos çağırılmaz
  return { base64, mimeType: 'image/png' };
};
