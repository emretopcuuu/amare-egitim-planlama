// Önbellekli görsel yükleyici — logolar + konuşmacı fotoları üretimler arası
// (özellikle "Varyasyon üret") yeniden indirilmesin diye paylaşımlı cache.
// File girdileri cache'lenmez (her seferinde okunur); URL/dataURL cache'lenir.
const cache = new Map();

export const imgYukle = (src) => {
  if (src instanceof File) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Resim yüklenemedi'));
      const r = new FileReader();
      r.onload = () => { img.src = r.result; };
      r.onerror = reject;
      r.readAsDataURL(src);
    });
  }
  if (cache.has(src)) return cache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => { cache.delete(src); reject(new Error('Resim yüklenemedi: ' + src)); };
    img.src = src;
  });
  cache.set(src, p);
  return p;
};
