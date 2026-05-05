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
 * Eskiden üst kısma logo bindiriyordu — kullanıcı tasarımı bozduğu için kaldırıldı.
 * Şimdi sadece input görseli olduğu gibi döner. Gemini'nin kendi logo
 * yerleşimi korunur. Eğer Gemini uydurma logo çizerse, prompt yasaklarıyla
 * (gorselOlustur.js, gorselOlusturHibrit.js içinde) önlenmeye çalışılır.
 */
export const applyLogos = async (base64, mimeType = 'image/png') => {
  return { base64, mimeType };
};
