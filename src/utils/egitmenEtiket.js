// Afiş türü tespiti + eğitmen etiket seçimi + kısa adres. Saf fonksiyonlar.

// Fiziki etkinlik mi? (online/Zoom değil) — mevcut sistemle aynı tanım.
export const isFiziki = (egitim) => {
  const sehir = egitim?.sehir || '';
  const yer = egitim?.yer || '';
  return sehir !== 'Online' && !yer.toLocaleUpperCase('tr-TR').includes('ZOOM');
};

// Afiş türü: 'brans' | 'meslek' | 'amare'. Panel ÖNCE kontrol edilir
// (Sağlıklı Yaşam Paneli hem fiziki hem panel olabilir).
export const afisTuru = (egitim) => {
  const kategori = egitim?.kategori || '';
  const metin = `${egitim?.etkinlikTuru || ''} ${egitim?.egitim || ''}`.toLocaleLowerCase('tr-TR');
  if (kategori === 'Panel' || /sağlıklı yaşam|panel/.test(metin)) return 'brans';
  if (kategori === 'Vizyon Günü' || isFiziki(egitim)) return 'meslek';
  return 'amare';
};

// Eğitmen için doğru etiketi seç + fallback zinciri.
export const etiketSec = (speaker, tur) => {
  if (!speaker) return '';
  const map = { brans: 'doktorBrans', meslek: 'meslek', amare: 'amareKariyer' };
  const birincil = (speaker[map[tur]] || '').trim();
  if (birincil) return birincil;
  const fallbacks = [speaker.unvan, speaker.meslek, speaker.amareKariyer, speaker.doktorBrans];
  for (const f of fallbacks) { if ((f || '').trim()) return f.trim(); }
  return '';
};

// acikAdres'ten ilçe/şehir ayıkla; olmazsa sehir.
export const ilceSehirAyikla = (egitim) => {
  const sehir = (egitim?.sehir || '').trim();
  const adres = (egitim?.acikAdres || '').trim();
  if (!adres) return sehir;
  const sonParca = adres.split(/[\n,]/).map(s => s.trim()).filter(Boolean).pop() || '';
  return sonParca || sehir;
};

// Afişte yazılacak kısa adres (fiziki) veya Zoom (online).
export const afisAdresKisa = (egitim) => {
  if (!isFiziki(egitim)) return egitim?.yer || '';
  const mekan = (egitim?.mekanAdi || '').trim();
  return [mekan, ilceSehirAyikla(egitim)].filter(Boolean).join(' · ');
};

// Modal bilgi satırı için insan-okur tür açıklaması.
export const afisTuruLabel = (tur) => ({
  brans: 'Sağlıklı Yaşam Paneli → doktor branşı',
  meslek: 'Vizyon Günü / fiziki → Amare-dışı meslek',
  amare: 'Online eğitim → Amare kariyeri',
}[tur] || '');
