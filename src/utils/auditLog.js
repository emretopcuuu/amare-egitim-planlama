// Audit log helper — admin işlemlerini Firestore'a yazar
// Firestore: audit_log/{auto_id} = { kim, action, target, before, after, tarih }

import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Admin işlemini logla
 * @param {string} action — 'takvim_yarat', 'takvim_sil', 'egitmen_onay', 'video_kategori_degis', vb
 * @param {string} target — etkilenen doc ID (örn 'takvim/abc123')
 * @param {object} detay — opsiyonel ek bilgi (before/after değerleri vb)
 */
export async function auditLogYaz(action, target, detay = {}) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'audit_log'), {
      kim: user.uid,
      kimEmail: user.email || null,
      kimAd: user.displayName || null,
      action,
      target,
      detay: detay ? JSON.parse(JSON.stringify(detay).slice(0, 4000)) : null,
      tarih: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 200),
    });
  } catch (e) {
    console.warn('[audit] yaz err:', e.message);
  }
}
