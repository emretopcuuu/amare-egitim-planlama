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
 * Görseli alır, sağ üst köşedeki Gemini uydurma "ONE TEAM" kutusunu
 * yumuşak radial fade ile temizler. Logoları bindirmiyor — sadece
 * AI'nın o köşeye çizdiği yamayı eritiyor.
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

    // Sağ üst köşeye yumuşak radial mor fade — Gemini'nin oraya çizdiği siyah/koyu
    // ONE TEAM kutusunu eritir. Sınırlar yumuşak, çevreyi etkilemez.
    const cx = W * 0.92;
    const cy = H * 0.08;
    const r1 = 0;
    const r2 = Math.min(W, H) * 0.18;
    const radial = ctx.createRadialGradient(cx, cy, r1, cx, cy, r2);
    radial.addColorStop(0, 'rgba(95, 39, 86, 0.95)');
    radial.addColorStop(0.5, 'rgba(95, 39, 86, 0.70)');
    radial.addColorStop(0.85, 'rgba(95, 39, 86, 0.20)');
    radial.addColorStop(1, 'rgba(95, 39, 86, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(W * 0.7, 0, W * 0.3, H * 0.22);

    const newDataUrl = canvas.toDataURL('image/png');
    const newBase64 = newDataUrl.split(',')[1];
    return { base64: newBase64, mimeType: 'image/png' };
  } catch (err) {
    console.warn('[applyLogos]', err.message);
    return { base64, mimeType };
  }
};
