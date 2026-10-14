// Görselleri gösterildikleri boyutta indir.
//
// Ölçüm (Eki 2026): sayfada 145 görsel var ve hiçbiri boyutlandırılmıyordu.
// Liste satırındaki 56px'lik önizleme için 1080px'lik afiş, 80px'lik eğitmen
// avatarı için 500px'lik fotoğraf iniyordu. Sahada mobil veriyle açan iş
// ortağı için bu doğrudan bekleme ve veri tüketimi demek.
//
// Netlify Image CDN (/.netlify/images) kaynağı sunucuda yeniden boyutlandırıp
// WebP/AVIF olarak veriyor. Yalnız üretimde çalışır; yerel geliştirmede ve
// tanımadığımız kaynaklarda URL olduğu gibi döner.

// netlify.toml -> [images] remote_images ile izin verilen kaynaklar.
const IZINLI = [
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
];

export const gorselBoyut = (url, genislik, { yukseklik, fit = 'cover' } = {}) => {
  const u = String(url || '');
  if (!u || !genislik) return u;
  if (!import.meta.env.PROD) return u;          // yerelde CDN yok
  if (u.startsWith('data:') || u.startsWith('blob:')) return u;

  let host = '';
  try { host = new URL(u, window.location.origin).host; } catch { return u; }
  if (!IZINLI.includes(host)) return u;

  // Retina ekranlar için iki kat genişlik istenir; dosya yine de orijinalden
  // çok küçük kalır (56px kutu -> 112px görsel, 1080px yerine).
  const p = new URLSearchParams({ url: u, w: String(Math.round(genislik * 2)), fit });
  if (yukseklik) p.set('h', String(Math.round(yukseklik * 2)));
  return `/.netlify/images?${p.toString()}`;
};

export default gorselBoyut;
