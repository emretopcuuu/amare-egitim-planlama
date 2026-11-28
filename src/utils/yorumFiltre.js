// Yorum moderasyonu — istemci tarafı (mağaza O3, Apple 1.2).
//   1. Küçük yasaklı kelime süzgeci: yazarken açık küfür/hakaret gönderilmez.
//   2. Engelleme: kullanıcı bir yazarı engeller → o yazarın yorumları YALNIZ
//      bu cihazda gizlenir (localStorage). Sunucuya gitmez, kimse görmez.
// Bildirim (yöneticiye giden kayıt) netlify/functions/yorum-bildir.mjs'te.

// Kısa ve bilinçli dar liste: yanlış pozitif (masum kelimeyi engelleme) zararı
// büyük. Kelime sınırıyla eşleşir; Türkçe büyük/küçük harf duyarsız.
const YASAKLI = [
  'amk', 'aq', 'orospu', 'oç', 'piç', 'siktir', 'sikerim', 'sikeyim', 'yarrak',
  'yavşak', 'pezevenk', 'kahpe', 'göt', 'ibne', 'gavat',
  'fuck', 'fucking', 'motherfucker', 'shit', 'bitch', 'cunt', 'nigger', 'faggot',
  'scheiße', 'scheisse', 'hurensohn', 'fotze', 'kanker', 'tering',
];

const HARF = 'a-zA-ZçğıöşüÇĞİÖŞÜäëïöüßÄËÏÖÜ0-9';
const DESEN = new RegExp(`(^|[^${HARF}])(${YASAKLI.join('|')})(?=$|[^${HARF}])`, 'iu');

export function uygunsuzMu(metin) {
  if (!metin) return false;
  const s = String(metin);
  // Ham metin (i bayrağı) + Türkçe küçük harf (İ→i, I→ı) — ikisi birlikte
  return DESEN.test(s) || DESEN.test(s.toLocaleLowerCase('tr'));
}

const ENGEL_ANAHTAR = 'ot_yorum_engelli';

export function engelliYazarlar() {
  try {
    const v = JSON.parse(localStorage.getItem(ENGEL_ANAHTAR) || '[]');
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
  } catch { return []; }
}

export function yazariEngelle(uid) {
  if (!uid) return engelliYazarlar();
  const liste = Array.from(new Set([...engelliYazarlar(), uid])).slice(-500);
  try { localStorage.setItem(ENGEL_ANAHTAR, JSON.stringify(liste)); } catch { /* yoksay */ }
  return liste;
}

export function engelleriKaldir() {
  try { localStorage.removeItem(ENGEL_ANAHTAR); } catch { /* yoksay */ }
  return [];
}
