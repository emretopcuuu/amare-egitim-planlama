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

    // Yardımcı: bir köşeye yumuşak radial Plum fade uygula
    const fadeCorner = (cx, cy, areaX, areaY, areaW, areaH) => {
      const r2 = Math.min(W, H) * 0.20;
      const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, r2);
      radial.addColorStop(0, 'rgba(95, 39, 86, 0.95)');
      radial.addColorStop(0.55, 'rgba(95, 39, 86, 0.65)');
      radial.addColorStop(0.85, 'rgba(95, 39, 86, 0.18)');
      radial.addColorStop(1, 'rgba(95, 39, 86, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(areaX, areaY, areaW, areaH);
    };

    // Sol üst köşe — Amare logosu / kutusu varsa eritilir
    fadeCorner(W * 0.08, H * 0.08, 0, 0, W * 0.32, H * 0.22);

    // Sağ üst köşe — One Team logosu / siyah kutu varsa eritilir
    fadeCorner(W * 0.92, H * 0.08, W * 0.68, 0, W * 0.32, H * 0.22);

    const newDataUrl = canvas.toDataURL('image/png');
    const newBase64 = newDataUrl.split(',')[1];
    return { base64: newBase64, mimeType: 'image/png' };
  } catch (err) {
    console.warn('[applyLogos]', err.message);
    return { base64, mimeType };
  }
};
