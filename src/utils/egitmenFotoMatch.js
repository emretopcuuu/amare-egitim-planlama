// Eğitmen foto eşleştirme — kullanıcı adıyla konuşmacılar koleksiyonu match
// Profilde foto yüklenmemişse, kullanıcı listede eğitmen olarak varsa onun
// fotosunu otomatik kullanır.

import { makeCoreId } from '../context/DataContext';

/**
 * 2026-06-09: İki coreId "fuzzy" eşleşir mi?
 * Senaryo: "M.İLKER YILMAZ" (m_ilker_yilmaz) ↔ "MAHMUT İLKER YILMAZ" (mahmut_ilker_yilmaz)
 * Eğitimde isim kısaltılmış (M.), konuşmacı kaydında açık (MAHMUT) → tam coreId tutmuyor.
 *
 * Kural (güvenli — yanlış eşleşmeyi engeller):
 *   - Parça sayısı aynı olmalı (3 = 3)
 *   - Son parça (soyad) TAM eşit olmalı
 *   - Her pozisyonda: ya tam eşit, ya biri tek harf + diğerinin baş harfi (m↔mahmut)
 *   - En az 2 parça TAM eşit olmalı (sadece soyad eşleşmesi yetmez → "A.YILMAZ" rastgele eşleşmez)
 */
export function coreIdFuzzyEslesir(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const pa = a.split('_').filter(Boolean);
  const pb = b.split('_').filter(Boolean);
  if (pa.length !== pb.length || pa.length < 2) return false;
  if (pa[pa.length - 1] !== pb[pb.length - 1]) return false; // soyad tam eşit
  let tamEslesen = 0;
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] === pb[i]) { tamEslesen++; continue; }
    const kisa = pa[i].length === 1 ? pa[i] : (pb[i].length === 1 ? pb[i] : null);
    const uzun = pa[i].length === 1 ? pb[i] : (pb[i].length === 1 ? pa[i] : null);
    if (kisa && uzun && uzun[0] === kisa) continue; // kısaltma eşleşmesi
    return false;
  }
  return tamEslesen >= 2;
}

/**
 * 2026-06-09: Bu bir gerçek eğitmen adı mı, yoksa placeholder/marka/genel ifade mi?
 * Takvimdeki egitmen alanında "Eğitmenler belirlenecek", "AMARE", "Online" gibi
 * gerçek kişi olmayan değerler eğitmen kartı oluşturmamalı.
 */
// Türkçe-güvenli normalize (İ/I sorunu için): ASCII lowercase
function _trNorm(s) {
  return String(s || '').normalize('NFC')
    .replace(/[İIıi]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Şş]/g, 's')
    .replace(/[Üü]/g, 'u').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
    .toLowerCase().trim();
}
// Tam eşleşme kara listesi (normalize edilmiş)
const GECERSIZ_TAM = new Set([
  'amare', 'oneteam', 'one team', 'online', 'zoom', 'ekip', 'tbd',
  'egitmen', 'egitmenler', 'konusmaci', 'konusmacilar', 'misafir',
]);
// İçerik (substring) kara listesi
const GECERSIZ_ICERIK = ['belirlenece', 'yakinda', 'aciklanacak', 'duyurulacak', 'surpriz'];

export function gecerliEgitmenMi(ad) {
  if (!ad || typeof ad !== 'string') return false;
  const n = _trNorm(ad);
  if (n.length < 3) return false;
  if (GECERSIZ_TAM.has(n)) return false;
  if (GECERSIZ_ICERIK.some(p => n.includes(p))) return false;
  return true;
}

/**
 * Verilen tam ad ile konuşmacılar listesinde match arar.
 * Önce tam coreId, bulamazsa fuzzy (kısaltma toleranslı) dener.
 * @param {string} fullName — "Murat Kaya", "Dr. Ahmet Yılmaz" vb.
 * @param {Array} konusmacilar — DataContext'ten gelen konuşmacılar array
 * @returns {string|null} — Bulunduysa fotoURL, yoksa null
 */
export function egitmenFotosuBul(fullName, konusmacilar) {
  if (!fullName || !Array.isArray(konusmacilar) || konusmacilar.length === 0) return null;
  const aramaCoreId = makeCoreId(fullName);
  if (!aramaCoreId) return null;

  // 1. Tam eşleşme
  for (const k of konusmacilar) {
    const cid = makeCoreId(k.ad || k.id);
    if (cid && cid === aramaCoreId) {
      return k.fotoURL || k.gorselUrl || null;
    }
  }
  // 2. Fuzzy fallback — sadece fotolu kayıtlar
  for (const k of konusmacilar) {
    const foto = k.fotoURL || k.gorselUrl;
    if (!foto) continue;
    const cid = makeCoreId(k.ad || k.id);
    if (cid && coreIdFuzzyEslesir(cid, aramaCoreId)) return foto;
  }
  return null;
}
