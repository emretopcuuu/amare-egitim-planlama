// AI-üretilen görselin (Gemini / OpenAI Pro) alt kısmına OneTeam + Amare
// logolarını overlay eder. Tüm generator'lar bu helper'ı kullansın diye
// merkezi tek nokta.
//
// Kural: AI çıktısının ALTI'na, URL üstüne (varsa) yumuşak bir şekilde bindir.
// URL/yer text'leri varsa onlarla çakışmayacak şekilde Y konumu belirlenir.

import { imgYukle as urlToImage } from './imgYukle';

/**
 * AI çıktısı base64 alır, alta logolar bindirir, yeni base64 döndürür.
 * @param {{ base64: string, mimeType?: string }} aiCikti
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
export async function logolariEkle(aiCikti, { qrDataUrl } = {}) {
  if (!aiCikti?.base64) return aiCikti;

  try {
    // 1. Base64'ten Image yükle
    const dataUrl = `data:${aiCikti.mimeType || 'image/png'};base64,${aiCikti.base64}`;
    const aiImg = await urlToImage(dataUrl);
    const W = aiImg.naturalWidth || aiImg.width;
    const H = aiImg.naturalHeight || aiImg.height;

    // 2. Canvas oluştur, AI görseli çiz
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(aiImg, 0, 0, W, H);

    // 3. Logoları yükle ve alta bindir
    const oneTeamLogo = await urlToImage('/logos/oneteam-logo.png');
    const amareLogo = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');

    // Boyut: görselin boyutuna göre orantılı (~%3.5 yükseklik)
    const logoH = Math.max(28, Math.floor(H * 0.035));
    const oneTeamW = logoH * (oneTeamLogo.width / oneTeamLogo.height);
    const amareW = logoH * (amareLogo.width / amareLogo.height);
    const gap = Math.floor(logoH * 0.7);
    const toplamW = oneTeamW + gap + amareW;
    const startX = (W - toplamW) / 2;

    // Y konumu: en alttan yukarı %5 boşluk + logo yüksekliği
    // URL/yer text genelde H-30 ila H-70 arası → logoları H-100 civarında konumlandır
    const altBosluk = Math.max(70, Math.floor(H * 0.07));
    const logoY = H - altBosluk - logoH;

    // 4. Yumuşak overlay: arka plana hafif koyu pad ekle (URL ile karışmasın)
    // Sadece logo altında değil — direkt logoları çiz
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.drawImage(oneTeamLogo, startX, logoY, oneTeamW, logoH);
    ctx.drawImage(amareLogo, startX + oneTeamW + gap, logoY, amareW, logoH);
    ctx.restore();

    // İnce gold ayraç iki logo arasında
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 215, 122, 0.5)';
    ctx.lineWidth = Math.max(1, Math.floor(H / 800));
    ctx.beginPath();
    ctx.moveTo(startX + oneTeamW + gap / 2, logoY + 6);
    ctx.lineTo(startX + oneTeamW + gap / 2, logoY + logoH - 6);
    ctx.stroke();
    ctx.restore();

    // 4.5 QR kod (varsa) — sağ alt köşe, gerçek (AI değil), logoların üstünde
    if (qrDataUrl) {
      try {
        const qrImg = await urlToImage(qrDataUrl);
        const qrSize = Math.max(90, Math.floor(W * 0.11));
        const pad = Math.floor(W * 0.03);
        const qrX = W - qrSize - pad;
        const qrY = H - qrSize - pad;
        const b = Math.floor(qrSize * 0.06);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - b, qrY - b, qrSize + 2 * b, qrSize + 2 * b);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(qrSize * 0.12)}px Arial`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText('Yol tarifi için okut', qrX + qrSize / 2, qrY - b - 6);
        ctx.restore();
      } catch (e) {
        console.warn('[logo-ekle] QR eklenemedi:', e.message);
      }
    }

    // 5. Yeni base64
    const yeniDataUrl = canvas.toDataURL('image/png');
    return {
      base64: yeniDataUrl.split(',')[1],
      mimeType: 'image/png',
    };
  } catch (e) {
    console.warn('[logo-ekle] AI çıktısına logo eklenemedi:', e.message);
    return aiCikti; // hata durumunda orijinali döndür
  }
}
