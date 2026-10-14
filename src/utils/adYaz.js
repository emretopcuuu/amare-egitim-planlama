// Eğitmen/lider adları veritabanında BÜYÜK HARF duruyor ("ZİYA ŞAKİR YILMAZ").
// Ekranda hepsi büyük harf olunca hiyerarşi düzleşiyor ve sayfa bağırıyor.
// Türkçe duyarlı baş-harf yazımına çevirir. Veriye DOKUNMAZ, yalnız görüntü.
export const adYaz = (s) => String(s || '')
  .toLocaleLowerCase('tr-TR')
  .replace(/(^|[\s\-'’./(])(\p{L})/gu, (_, onek, harf) => onek + harf.toLocaleUpperCase('tr-TR'));
