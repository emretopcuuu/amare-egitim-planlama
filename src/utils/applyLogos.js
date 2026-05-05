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
 * Bir AI tarafından üretilen görselin üst köşelerine GERÇEK Amare + One Team
 * logolarını bindirir. Mor bant/overlay YOK — sadece logolar.
 *
 * Kullanım:
 *   - Gemini (gorselOlustur.js) ve OpenAI (gorselOlusturOpenAI.js) çağırır
 *   - Hibrit ve Canvas zaten kendi içlerinde logo bindirdiği için ÇAĞIRMAZ
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

    // Sol üst — gerçek Amare logo
    try {
      const amareLogo = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
      const amareW = W * 0.28;
      const amareH = (amareLogo.height / amareLogo.width) * amareW;
      ctx.drawImage(amareLogo, W * 0.05, H * 0.04, amareW, amareH);
    } catch {}

    // Sağ üst — gerçek One Team logo
    try {
      const otLogo = await urlToImage('/logos/oneteam logo.JPG');
      const otW = W * 0.10;
      const otH = (otLogo.height / otLogo.width) * otW;
      ctx.drawImage(otLogo, W - otW - W * 0.05, H * 0.04, otW, otH);
    } catch {}

    const newDataUrl = canvas.toDataURL('image/png');
    const newBase64 = newDataUrl.split(',')[1];
    return { base64: newBase64, mimeType: 'image/png' };
  } catch (err) {
    console.warn('[applyLogos]', err.message);
    return { base64, mimeType };
  }
};
