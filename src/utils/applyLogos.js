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

    // KÖŞE-ONLY maske — sadece sol üst + sağ üst (logoların oluştuğu bölge)
    // Orta kısım dokunulmaz → AI'nın başlık/tasarımı korunur
    const cornerW = Math.floor(W * 0.35);
    const cornerH = Math.floor(H * 0.12);

    // Sol üst köşe — radial-like fade
    const lg = ctx.createLinearGradient(0, 0, cornerW, cornerH);
    lg.addColorStop(0, 'rgba(61, 23, 52, 1)');
    lg.addColorStop(0.7, 'rgba(61, 23, 52, 0.95)');
    lg.addColorStop(1, 'rgba(61, 23, 52, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, cornerW, cornerH);

    // Sağ üst köşe
    const rg = ctx.createLinearGradient(W, 0, W - cornerW, cornerH);
    rg.addColorStop(0, 'rgba(61, 23, 52, 1)');
    rg.addColorStop(0.7, 'rgba(61, 23, 52, 0.95)');
    rg.addColorStop(1, 'rgba(61, 23, 52, 0)');
    ctx.fillStyle = rg;
    ctx.fillRect(W - cornerW, 0, cornerW, cornerH);

    const newDataUrl = canvas.toDataURL('image/png');
    const newBase64 = newDataUrl.split(',')[1];
    return { base64: newBase64, mimeType: 'image/png' };
  } catch (err) {
    console.warn('[applyLogos]', err.message);
    return { base64, mimeType };
  }
};
