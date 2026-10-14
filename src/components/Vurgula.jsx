// Arama sonucunda eşleşen kısmı işaretler.
//
// Ölçüm (Eki 2026): arama sonuçlarında hiç vurgulama yoktu (`mark` sayısı 0).
// "Ankara" arayan kişi sonucun neden çıktığını göremiyordu: başlıkta mı geçti,
// eğitmen adında mı, yerde mi?
//
// Türkçe duyarlı: "ISINMA" içinde "ısınma" aransa da eşleşir. Karşılaştırma
// sadeleştirilmiş metin üzerinden yapılır ama EKRANA ORİJİNAL metin basılır,
// yalnız eşleşen aralık işaretlenir.
import React from 'react';

const HARF = { 'ı': 'i', 'İ': 'i', 'I': 'i', 'i': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c' };

// Her karakteri tek karaktere eşler: indeksler korunur, aralık kayması olmaz.
export const sadelestir = (s) => String(s || '')
  .split('')
  .map((c) => HARF[c] || c.toLowerCase())
  .join('');

export const Vurgula = ({ metin, sorgu }) => {
  const ham = String(metin ?? '');
  const q = String(sorgu || '').trim();
  if (!q || q.length < 2 || !ham) return ham;

  const hedef = sadelestir(ham);
  const aranan = sadelestir(q);
  const parcalar = [];
  let i = 0;
  let bulundu = false;

  while (i < hedef.length) {
    const k = hedef.indexOf(aranan, i);
    if (k === -1) { parcalar.push(ham.slice(i)); break; }
    bulundu = true;
    if (k > i) parcalar.push(ham.slice(i, k));
    parcalar.push(
      <mark key={k} className="bg-amber-400/30 text-amber-100 rounded px-0.5">
        {ham.slice(k, k + aranan.length)}
      </mark>
    );
    i = k + aranan.length;
  }

  if (!bulundu) return ham;
  return <>{parcalar}</>;
};

export default Vurgula;
