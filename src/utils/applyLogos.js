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

    // Tüm logolar kaldırıldı — üst 18% TAM OPAK dark plum ile kapla,
    // sonra 8% yumuşak fade. AI'nın hayali logoları kesinlikle görünmez.
    const opaqueH = Math.floor(H * 0.18);
    const fadeH = Math.floor(H * 0.08);
    ctx.fillStyle = '#3D1734';
    ctx.fillRect(0, 0, W, opaqueH);
    const fade = ctx.createLinearGradient(0, opaqueH, 0, opaqueH + fadeH);
    fade.addColorStop(0, 'rgba(61, 23, 52, 1)');
    fade.addColorStop(1, 'rgba(61, 23, 52, 0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, opaqueH, W, fadeH);

    const newDataUrl = canvas.toDataURL('image/png');
    const newBase64 = newDataUrl.split(',')[1];
    return { base64: newBase64, mimeType: 'image/png' };
  } catch (err) {
    console.warn('[applyLogos]', err.message);
    return { base64, mimeType };
  }
};
