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
 * Görseli alır, ÜST İKİ KÖŞEDEKİ (sol Amare + sağ One Team) Gemini uydurma
 * logo/kutularını yumuşak radial fade ile temizler. Hiçbir logo bindirmez —
 * sadece AI'nın köşelere çizdiği yamaları eritir, üst kısım temiz kalır.
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

    // Yardımcı: bir köşeye TAM OPAK Plum kutu + dış kenarda yumuşak fade
    // Logo'lar tamamen örtülür, dış kenar görünmez geçişle çevreye karışır.
    const coverCorner = (areaX, areaY, areaW, areaH, isLeft) => {
      // Ana kutu — tam opak Plum (logo bölgesini tamamen kapat)
      const innerW = areaW * 0.85;
      const innerH = areaH * 0.85;
      const innerX = isLeft ? areaX : areaX + (areaW - innerW);
      ctx.fillStyle = 'rgb(95, 39, 86)';
      ctx.fillRect(innerX, areaY, innerW, innerH);

      // Sağ/sol kenarda yumuşak fade (dış sınır)
      const fadeW = areaW * 0.15;
      const fadeStartX = isLeft ? innerX + innerW : areaX;
      const fadeEndX = isLeft ? areaX + areaW : innerX;
      const sideGrad = ctx.createLinearGradient(
        isLeft ? fadeStartX : fadeEndX, 0,
        isLeft ? fadeEndX : fadeStartX, 0
      );
      sideGrad.addColorStop(0, 'rgb(95, 39, 86)');
      sideGrad.addColorStop(1, 'rgba(95, 39, 86, 0)');
      ctx.fillStyle = sideGrad;
      ctx.fillRect(isLeft ? fadeStartX : areaX, areaY, fadeW, innerH);

      // Alt kenarda da yumuşak fade
      const bottomGrad = ctx.createLinearGradient(0, innerH, 0, areaH);
      bottomGrad.addColorStop(0, 'rgb(95, 39, 86)');
      bottomGrad.addColorStop(1, 'rgba(95, 39, 86, 0)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(areaX, innerH, areaW, areaH - innerH);
    };

    // Sol üst köşe (logo alanı)
    coverCorner(0, 0, W * 0.35, H * 0.16, true);

    // Sağ üst köşe (logo alanı)
    coverCorner(W * 0.65, 0, W * 0.35, H * 0.16, false);

    const newDataUrl = canvas.toDataURL('image/png');
    const newBase64 = newDataUrl.split(',')[1];
    return { base64: newBase64, mimeType: 'image/png' };
  } catch (err) {
    console.warn('[applyLogos]', err.message);
    return { base64, mimeType };
  }
};
