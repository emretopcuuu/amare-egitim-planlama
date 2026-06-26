// Amare kariyer basamakları (en alttan en üste) — sıra = ışıltı/seviye kaynağı.
// Sıra değişirse yalnız bu listeyi güncelle; grafik & ışıltı otomatik uyarlanır.
export const KARIYER_BASAMAKLARI = [
  'BRAND PARTNER',
  'BRAND BUILDER',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'LEADER',
  'SENIOR LEADER',
  'EXECUTIVE LEADER',
  'DIAMOND',
  '1 STAR DIAMOND',
  '2 STAR DIAMOND',
  '3 STAR DIAMOND',
  'PRESIDENTIAL DIAMOND',
];

export const KARIYER_SAYISI = KARIYER_BASAMAKLARI.length;

// Eş anlamlı / yazım varyantları → standart ada normalize
const _norm = (s) => String(s || '')
  .normalize('NFC')
  .toLocaleUpperCase('tr-TR')
  .replace(/İ/g, 'I')
  .replace(/YILDIZ/g, 'STAR')
  .replace(/PRESIDENTAL/g, 'PRESIDENTIAL')
  .replace(/PRESİDENTİAL/g, 'PRESIDENTIAL')
  .replace(/\s+/g, ' ')
  .trim();

const _basamakNorm = KARIYER_BASAMAKLARI.map(_norm);

// Kariyer adından sıra index'i (0-tabanlı). Bulunamazsa -1.
export const kariyerSira = (ad) => {
  const n = _norm(ad);
  if (!n) return -1;
  let i = _basamakNorm.indexOf(n);
  if (i !== -1) return i;
  // gevşek: "DIAMOND" içeren ama yıldızsız → DIAMOND; "1 STAR" → 1 STAR DIAMOND vb.
  i = _basamakNorm.findIndex(b => b === n || n === b);
  if (i !== -1) return i;
  // kısmi: tam kelime eşleşmesi dene
  i = _basamakNorm.findIndex(b => n.includes(b));
  return i;
};

// Işıltı seviyesi 0..1 (üst rütbe → daha parlak). Bulunamazsa 0.
export const kariyerIsilti = (ad) => {
  const i = kariyerSira(ad);
  if (i < 0) return 0;
  return i / (KARIYER_SAYISI - 1);
};

// İki tarih (Date) arası ay farkı (yaklaşık) — "kaç ayda" için.
export const ayFarki = (a, b) => {
  if (!a || !b) return null;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
};

// "X ay" / "Y yıl Z ay" insanca metin
export const sureMetni = (ay) => {
  if (ay == null || ay < 0) return '';
  if (ay === 0) return 'aynı ay';
  const yil = Math.floor(ay / 12), kalan = ay % 12;
  if (yil === 0) return `${kalan} ay`;
  if (kalan === 0) return `${yil} yıl`;
  return `${yil} yıl ${kalan} ay`;
};

// 'MM.YYYY' veya 'YYYY-MM' veya 'dd.MM.YYYY' → Date (ayın 1'i). Geçersizse null.
export const kariyerTarih = (t) => {
  if (!t) return null;
  const s = String(t).trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) return new Date(+m[1], +m[2] - 1, 1);            // YYYY-MM
  if ((m = s.match(/^(\d{1,2})[.\/](\d{4})$/))) return new Date(+m[2], +m[1] - 1, 1);          // MM.YYYY
  if ((m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/))) return new Date(+m[3], +m[2] - 1, +m[1]); // dd.MM.YYYY
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};
