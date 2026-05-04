// Bir görselin (base64 veya Image) üst kısmına gerçek Amare + One Team
// logolarını bindiren post-process. Tüm üretim modlarının (Gemini, OpenAI,
// Hibrit, Canvas) sonunda çağırılır — AI'nın uydurma logoları örtülür.

const urlToImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Resim yüklenemedi: ' + src));
  img.src = src;
});

/**
 * Bir base64 görselini canvas'a yükler, üst kısma logoları bindirir,
 * yeni base64 olarak döner.
 *
 * @param {string} base64 - input görselin base64'ü (data: prefix yok)
 * @param {string} mimeType - "image/png" vb.
 * @returns {Promise<{base64, mimeType}>}
 */
export const applyLogos = async (base64, mimeType = 'image/png') => {
  try {
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const img = await urlToImage(dataUrl);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const W = img.width;
    const topBandH = Math.floor(W * 0.16); // üst %16'lık band

    // Üst güçlü Plum gradient overlay — Gemini/OpenAI'nin uydurma logolarını kapat
    const topGrad = ctx.createLinearGradient(0, 0, 0, topBandH);
    topGrad.addColorStop(0, 'rgba(95, 39, 86, 0.97)');
    topGrad.addColorStop(0.7, 'rgba(95, 39, 86, 0.85)');
    topGrad.addColorStop(1, 'rgba(95, 39, 86, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, topBandH + 40);

    // Amare logo — sol orta üst
    let amareDrawn = false;
    try {
      const amareLogo = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
      const amareW = Math.floor(W * 0.30);
      const amareH = (amareLogo.height / amareLogo.width) * amareW;
      const amareX = Math.floor(W * 0.05);
      const amareY = Math.floor(topBandH * 0.25);
      ctx.drawImage(amareLogo, amareX, amareY, amareW, amareH);
      amareDrawn = true;
    } catch {}

    // One Team logo — sağ üst köşe
    try {
      const otLogo = await urlToImage('/logos/oneteam logo.JPG');
      const otW = Math.floor(W * 0.13);
      const otH = (otLogo.height / otLogo.width) * otW;
      const otX = W - otW - Math.floor(W * 0.05);
      const otY = Math.floor(topBandH * 0.18);
      // One Team logosu JPG olduğu için arkasına şeffaf değil — ince Plum çerçeve
      ctx.fillStyle = 'rgba(95, 39, 86, 0.8)';
      ctx.fillRect(otX - 5, otY - 5, otW + 10, otH + 10);
      ctx.drawImage(otLogo, otX, otY, otW, otH);
    } catch {}

    const newDataUrl = canvas.toDataURL('image/png');
    const newBase64 = newDataUrl.split(',')[1];
    return { base64: newBase64, mimeType: 'image/png' };
  } catch (err) {
    // Sorun olursa orijinali döndür
    console.warn('[applyLogos] Logo bindirme başarısız:', err.message);
    return { base64, mimeType };
  }
};
