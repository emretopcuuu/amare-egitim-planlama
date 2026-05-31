// Site içerik yönetimi — Firestore site_icerik/{key} doc'larına yazar/okur.
// Sadece SITE_ICERIK_ADMINS düzenleyebilir.
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const SITE_ICERIK_ADMINS = [
  's.emretopcu@gmail.com',
];

const norm = (e) => (e || '').toLowerCase().trim();

export const isSiteAdmin = (email) =>
  SITE_ICERIK_ADMINS.includes(norm(email));

export const getSiteIcerik = async (key) => {
  try {
    const snap = await getDoc(doc(db, 'site_icerik', key));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn(`[site_icerik:${key}]`, e.message);
    return null;
  }
};

export const saveSiteIcerik = async (key, data, userEmail) => {
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: norm(userEmail),
  };
  await setDoc(doc(db, 'site_icerik', key), payload, { merge: true });
};
