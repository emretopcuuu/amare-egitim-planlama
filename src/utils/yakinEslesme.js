// Arama sonuç vermediğinde "şunu mu demek istediniz?" için yazım toleranslı
// eşleştirme. Çıkmaz sokak yerine bir çıkış yolu verir.
//
// Dice katsayısı (harf ikilileri) kullanılır: Levenshtein'dan daha iyi çalışır
// çünkü harf eksik/fazla/yer değiştirmiş yazımları da yakalar ve kelime
// sırasından etkilenmez. "bodrm" -> "Bodrum", "giriimcilik" -> "Girişimcilik".

const HARF = { 'ı': 'i', 'İ': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c' };

// Türkçe duyarlı sadeleştirme: aksan kalkar, noktalama boşluğa döner.
export const duzle = (s) => String(s || '')
  .toLocaleLowerCase('tr-TR')
  .replace(/[ıİşğüöç]/g, (m) => HARF[m] || m)
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const ikililer = (s) => {
  const t = ` ${duzle(s)} `;
  const k = new Set();
  for (let i = 0; i < t.length - 1; i++) k.add(t.slice(i, i + 2));
  return k;
};

export const benzerlik = (a, b) => {
  const A = ikililer(a), B = ikililer(b);
  if (!A.size || !B.size) return 0;
  let ortak = 0;
  A.forEach((x) => { if (B.has(x)) ortak += 1; });
  return (2 * ortak) / (A.size + B.size);
};

// Havuzdaki en yakın adayları döndürür. Alt dize eşleşmesi tam puan sayılır
// ("ankara" -> "Ankara Liderlik Günü" kullanıcının aradığı şeydir).
export const yakinEslesmeler = (sorgu, havuz, { adet = 3, esik = 0.34 } = {}) => {
  const q = duzle(sorgu);
  if (q.length < 2) return [];
  const gorulen = new Set();
  const sonuc = [];
  for (const ham of havuz) {
    const metin = String(ham || '').trim();
    if (!metin) continue;
    const anahtar = duzle(metin);
    if (!anahtar || gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    // Hem tam metinle hem tek tek kelimelerle karşılaştır: uzun bir başlıkta
    // ("Bodrum Sağlıklı Yaşam ve Girişimcilik Semineri") tek kelimelik yazım
    // hatası tam metin benzerliğinde kaybolur, kelime bazında yakalanır.
    const puan = anahtar.includes(q) || q.includes(anahtar)
      ? 1
      : Math.max(
          benzerlik(q, anahtar),
          ...anahtar.split(' ').filter((k) => k.length > 2).map((k) => benzerlik(q, k)),
        );
    if (puan >= esik) sonuc.push({ metin, puan });
  }
  return sonuc.sort((a, b) => b.puan - a.puan).slice(0, adet).map((x) => x.metin);
};

export default yakinEslesmeler;
