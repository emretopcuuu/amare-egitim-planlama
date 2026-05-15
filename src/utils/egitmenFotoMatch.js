// Eğitmen foto eşleştirme — kullanıcı adıyla konuşmacılar koleksiyonu match
// Profilde foto yüklenmemişse, kullanıcı listede eğitmen olarak varsa onun
// fotosunu otomatik kullanır.

import { makeCoreId } from '../context/DataContext';

/**
 * Verilen tam ad ile konuşmacılar listesinde match arar.
 * @param {string} fullName — "Murat Kaya", "Dr. Ahmet Yılmaz" vb.
 * @param {Array} konusmacilar — DataContext'ten gelen konuşmacılar array
 * @returns {string|null} — Bulunduysa fotoURL, yoksa null
 */
export function egitmenFotosuBul(fullName, konusmacilar) {
  if (!fullName || !Array.isArray(konusmacilar) || konusmacilar.length === 0) return null;
  const aramaCoreId = makeCoreId(fullName);
  if (!aramaCoreId) return null;

  for (const k of konusmacilar) {
    const cid = makeCoreId(k.ad || k.id);
    if (cid && cid === aramaCoreId) {
      return k.fotoURL || k.gorselUrl || null;
    }
  }
  return null;
}
