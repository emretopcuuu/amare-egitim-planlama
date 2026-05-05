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
    const H = img.height;

    // Üst gradient — Gemini'nin orta üst uydurma yazılarını örter, alt kısım açık
    const topGrad = ctx.createLinearGradient(0, 0, 0, Math.floor(H * 0.18));
    topGrad.addColorStop(0, 'rgba(20, 8, 30, 0.85)');   // logo bandı tam örtülü
    topGrad.addColorStop(0.5, 'rgba(20, 8, 30, 0.7)');
    topGrad.addColorStop(1, 'rgba(20, 8, 30, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, Math.floor(H * 0.18));

    // Logoların ARASINDA orta üst — Gemini'nin "ONE TEAM" yazısını lokal olarak da örter
    // Sol logoyu sonrası, sağ logodan önce: %35-65 yatay arası
    const midGrad = ctx.createLinearGradient(0, 0, 0, Math.floor(H * 0.13));
    midGrad.addColorStop(0, 'rgba(20, 8, 30, 0.92)');
    midGrad.addColorStop(1, 'rgba(20, 8, 30, 0)');
    ctx.fillStyle = midGrad;
    ctx.fillRect(Math.floor(W * 0.32), 0, Math.floor(W * 0.36), Math.floor(H * 0.13));

    // Amare logo — sol üst (logo arkasına lokal soft koyu kutu, Gemini uydurmaları örtülür)
    try {
      const amareLogo = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
      const amareW = Math.floor(W * 0.28);
      const amareH = (amareLogo.height / amareLogo.width) * amareW;
      const amareX = Math.floor(W * 0.05);
      const amareY = Math.floor(H * 0.04);
      // Logo arkası lokal Plum kutu (soft) — Gemini'nin orta yazılarını lokal kapatır
      ctx.fillStyle = 'rgba(95, 39, 86, 0.65)';
      ctx.fillRect(amareX - 12, amareY - 8, amareW + 24, amareH + 16);
      ctx.drawImage(amareLogo, amareX, amareY, amareW, amareH);
    } catch {}

    // One Team logo — sağ üst (logo arkasına lokal koyu kutu)
    try {
      const otLogo = await urlToImage('/logos/oneteam logo.JPG');
      const otW = Math.floor(W * 0.12);
      const otH = (otLogo.height / otLogo.width) * otW;
      const otX = W - otW - Math.floor(W * 0.05);
      const otY = Math.floor(H * 0.04);
      // JPG için ince Plum çerçeve
      ctx.fillStyle = 'rgba(95, 39, 86, 0.85)';
      ctx.fillRect(otX - 8, otY - 8, otW + 16, otH + 16);
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
