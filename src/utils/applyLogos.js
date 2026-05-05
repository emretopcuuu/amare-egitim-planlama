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

    // Kullanıcı isteği: tüm logolar kaldırıldı — sadece üst köşelerdeki AI'nın
    // hayalettiği sahte logoları opak maske ile kapat (gerçek logo basmıyoruz)
    const topMaskGrad = ctx.createLinearGradient(0, 0, 0, H * 0.18);
    topMaskGrad.addColorStop(0, 'rgba(20, 8, 30, 0.95)');
    topMaskGrad.addColorStop(0.6, 'rgba(20, 8, 30, 0.85)');
    topMaskGrad.addColorStop(1, 'rgba(20, 8, 30, 0)');
    ctx.fillStyle = topMaskGrad;
    ctx.fillRect(0, 0, W, H * 0.18);

    const newDataUrl = canvas.toDataURL('image/png');
    const newBase64 = newDataUrl.split(',')[1];
    return { base64: newBase64, mimeType: 'image/png' };
  } catch (err) {
    console.warn('[applyLogos]', err.message);
    return { base64, mimeType };
  }
};
