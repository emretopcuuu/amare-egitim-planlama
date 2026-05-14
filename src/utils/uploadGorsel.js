// Görsel yükleme yardımcısı — dataUrl/blob'u Firebase Storage'a yükler,
// public URL döndürür. Firestore'a base64 yazma (1MB limit) yerine bunu kullan.

import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * dataUrl veya blob/file'ı Firebase Storage'a yükler.
 * @param {string} eventId - Eğitim ID'si (dosya adında kullanılır)
 * @param {string|Blob|File} kaynak - Base64 dataUrl, Blob veya File
 * @returns {Promise<string>} Public Storage URL
 */
export async function uploadGorsel(eventId, kaynak) {
  if (!kaynak) throw new Error('Görsel boş');
  let blob;
  if (typeof kaynak === 'string') {
    // dataUrl
    if (!kaynak.startsWith('data:')) {
      // Zaten URL ise (https://) olduğu gibi dön
      return kaynak;
    }
    const res = await fetch(kaynak);
    blob = await res.blob();
  } else if (kaynak instanceof Blob) {
    blob = kaynak;
  } else {
    throw new Error('Desteklenmeyen görsel formatı');
  }

  const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').split(';')[0];
  const safeId = String(eventId || 'unknown').replace(/[^a-z0-9_-]/gi, '_');
  const filename = `posters/${safeId}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return await getDownloadURL(storageRef);
}
