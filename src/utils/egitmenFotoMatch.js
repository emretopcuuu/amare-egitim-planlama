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
