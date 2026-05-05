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
 * No-op — kullanıcı isteği üzerine üst kısma hiçbir overlay/fade/kutu
 * uygulanmaz. Görsel Gemini'den geldiği gibi döner. Üst köşelerdeki
 * AI logoları Gemini'nin doğal yerleşiminde kalır.
 */
export const applyLogos = async (base64, mimeType = 'image/png') => {
  return { base64, mimeType };
};
