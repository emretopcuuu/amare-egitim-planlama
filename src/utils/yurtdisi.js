// Yurtdışı etkinlik algılama — TakvimView'dan çıkarıldı (2026-07-12, ana sayfa
// Uluslararası Etkinlikler satırı da kullanıyor). Yeni ülke/şehir buraya eklenir.
export const YURTDISI_ULKELER = {
  'HOLLANDA': { bayrak: '🇳🇱', kisa: 'NL', renk: 'from-orange-500 to-orange-700' },
  'NEDERLAND': { bayrak: '🇳🇱', kisa: 'NL', renk: 'from-orange-500 to-orange-700' },
  'AMSTERDAM': { bayrak: '🇳🇱', kisa: 'NL', renk: 'from-orange-500 to-orange-700' },
  'AVUSTURYA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'AUSTRIA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'VİYANA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'VIYANA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'VIENNA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'WIEN': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'ALMANYA': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'GERMANY': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'BERLIN': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'MÜNİH': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'MUNIH': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'MÜNCHEN': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'FRANKFURT': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'HAMBURG': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'KÖLN': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'KOLN': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'BELÇİKA': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'BELGIUM': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'BRÜKSEL': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'BRUKSEL': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'BRUSSELS': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'FRANSA': { bayrak: '🇫🇷', kisa: 'FR', renk: 'from-blue-500 to-red-600' },
  'FRANCE': { bayrak: '🇫🇷', kisa: 'FR', renk: 'from-blue-500 to-red-600' },
  'PARİS': { bayrak: '🇫🇷', kisa: 'FR', renk: 'from-blue-500 to-red-600' },
  'PARIS': { bayrak: '🇫🇷', kisa: 'FR', renk: 'from-blue-500 to-red-600' },
  'İSVİÇRE': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'ISVICRE': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'SWITZERLAND': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'ZÜRİH': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'ZURICH': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'CENEVRE': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'GENEVA': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'İNGİLTERE': { bayrak: '🇬🇧', kisa: 'UK', renk: 'from-blue-700 to-red-700' },
  'INGILTERE': { bayrak: '🇬🇧', kisa: 'UK', renk: 'from-blue-700 to-red-700' },
  'LONDRA': { bayrak: '🇬🇧', kisa: 'UK', renk: 'from-blue-700 to-red-700' },
  'LONDON': { bayrak: '🇬🇧', kisa: 'UK', renk: 'from-blue-700 to-red-700' },
  'AVRUPA': { bayrak: '🇪🇺', kisa: 'EU', renk: 'from-blue-600 to-amber-500' },
  'EUROPE': { bayrak: '🇪🇺', kisa: 'EU', renk: 'from-blue-600 to-amber-500' },
  // USA / Amerika
  'ABD': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'AMERİKA': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'AMERIKA': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'USA': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'UNITED STATES': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'DALLAS': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'TEXAS': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'NEW YORK': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'MIAMI': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'LAS VEGAS': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'LOS ANGELES': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'CHICAGO': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'ORLANDO': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'HOUSTON': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'PHOENIX': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  // South Africa
  'GÜNEY AFRİKA': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'GUNEY AFRIKA': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'SOUTH AFRICA': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'CAPE TOWN': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'CAPETOWN': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'JOHANNESBURG': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  // UAE / BAE
  'BAE': { bayrak: '🇦🇪', kisa: 'AE', renk: 'from-emerald-700 to-red-700' },
  'DUBAI': { bayrak: '🇦🇪', kisa: 'AE', renk: 'from-emerald-700 to-red-700' },
  'ABU DHABI': { bayrak: '🇦🇪', kisa: 'AE', renk: 'from-emerald-700 to-red-700' },
  // Asya / Pasifik
  'BALİ': { bayrak: '🇮🇩', kisa: 'ID', renk: 'from-red-600 to-white' },
  'BALI': { bayrak: '🇮🇩', kisa: 'ID', renk: 'from-red-600 to-white' },
  'ENDONEZYA': { bayrak: '🇮🇩', kisa: 'ID', renk: 'from-red-600 to-white' },
  'INDONESIA': { bayrak: '🇮🇩', kisa: 'ID', renk: 'from-red-600 to-white' },
  'TAYLAND': { bayrak: '🇹🇭', kisa: 'TH', renk: 'from-blue-700 to-red-700' },
  'THAILAND': { bayrak: '🇹🇭', kisa: 'TH', renk: 'from-blue-700 to-red-700' },
  'BANGKOK': { bayrak: '🇹🇭', kisa: 'TH', renk: 'from-blue-700 to-red-700' },
  'SINGAPUR': { bayrak: '🇸🇬', kisa: 'SG', renk: 'from-red-700 to-white' },
  'SINGAPORE': { bayrak: '🇸🇬', kisa: 'SG', renk: 'from-red-700 to-white' },
  'JAPONYA': { bayrak: '🇯🇵', kisa: 'JP', renk: 'from-white to-red-700' },
  'JAPAN': { bayrak: '🇯🇵', kisa: 'JP', renk: 'from-white to-red-700' },
  'TOKYO': { bayrak: '🇯🇵', kisa: 'JP', renk: 'from-white to-red-700' },
  'AVUSTRALYA': { bayrak: '🇦🇺', kisa: 'AU', renk: 'from-blue-700 to-red-700' },
  'AUSTRALIA': { bayrak: '🇦🇺', kisa: 'AU', renk: 'from-blue-700 to-red-700' },
  'SYDNEY': { bayrak: '🇦🇺', kisa: 'AU', renk: 'from-blue-700 to-red-700' },
  // Kanada
  'KANADA': { bayrak: '🇨🇦', kisa: 'CA', renk: 'from-red-600 to-red-700' },
  'CANADA': { bayrak: '🇨🇦', kisa: 'CA', renk: 'from-red-600 to-red-700' },
  'TORONTO': { bayrak: '🇨🇦', kisa: 'CA', renk: 'from-red-600 to-red-700' },
  'VANCOUVER': { bayrak: '🇨🇦', kisa: 'CA', renk: 'from-red-600 to-red-700' },
  // Global event markers (başlıkta geçerse uluslararası say)
  'GLOBAL CONVENTION': { bayrak: '🌍', kisa: 'GLOBAL', renk: 'from-amber-500 to-purple-700' },
  'WORLD CONVENTION': { bayrak: '🌍', kisa: 'GLOBAL', renk: 'from-amber-500 to-purple-700' },
  'INTERNATIONAL CONVENTION': { bayrak: '🌍', kisa: 'INTL', renk: 'from-amber-500 to-purple-700' },
};

// Yurtdışı tespit — yer veya başlıkta ülke/şehir adı (ZOOM = online, yurtdışı sayılmaz)
// TÜRKÇE İ TUZAĞI (2026-07-12 Berlin vakası): toLocaleUpperCase('tr-TR') 'Berlin'i
// 'BERLİN' (noktalı İ) yapar, ASCII 'BERLIN' anahtarıyla EŞLEŞMEZ — Wien/Zurich/
// Miami/Singapore gibi i içeren tüm anahtarlar aynı sınıftı (Münih/Viyana çift
// varyantla elle yamalanmıştı). Çözüm: karşılaştırmada iki taraf da İ→I düzleşir.
const duzI = (s) => s.replace(/İ/g, 'I');
export const getYurtdisi = (egitim) => {
  if (!egitim) return null;
  const yer = (egitim.yer || '').normalize('NFC').toLocaleUpperCase('tr-TR');
  const baslik = (egitim.egitim || '').normalize('NFC').toLocaleUpperCase('tr-TR');
  // ZOOM ise yurtdışı sayma (genelde online)
  if (yer.includes('ZOOM')) return null;
  const arananMetin = duzI(yer + ' ' + baslik);
  for (const [anahtar, val] of Object.entries(YURTDISI_ULKELER)) {
    if (arananMetin.includes(duzI(anahtar))) return { ...val, anahtar };
  }
  return null;
};
