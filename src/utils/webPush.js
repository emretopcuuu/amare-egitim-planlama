// Web Push helper — Service Worker register + subscribe + Firestore save
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

// VAPID public key (production'da env var olarak set edilecek)
// Generate: npx web-push generate-vapid-keys
// VITE_VAPID_PUBLIC_KEY env variable'ından okur
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

const urlBase64ToUint8Array = (b64) => {
  const padding = '='.repeat((4 - b64.length % 4) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

export const webPushDestekli = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const webPushIzinDurumu = () => {
  if (!('Notification' in window)) return 'desteklenmiyor';
  return Notification.permission; // 'granted' | 'denied' | 'default'
};

export const webPushKaydolu = async ({ konusmaciAd = null, egitimId = null } = {}) => {
  if (!webPushDestekli()) throw new Error('Web Push bu tarayıcıda desteklenmiyor');
  if (!VAPID_PUBLIC_KEY) throw new Error('VAPID public key tanımlı değil');

  // 1. Service Worker register
  const sw = await navigator.serviceWorker.register('/sw-push.js');
  await navigator.serviceWorker.ready;

  // 2. Notification permission
  const izin = await Notification.requestPermission();
  if (izin !== 'granted') throw new Error('Bildirim izni reddedildi');

  // 3. Push subscribe
  const sub = await sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // 4. Subscription'ı Firestore'a kaydet
  const subJson = sub.toJSON();
  await addDoc(collection(db, 'web_push_aboneleri'), {
    endpoint: subJson.endpoint,
    keys: subJson.keys || {},
    konusmaciAd: konusmaciAd || null,
    egitimId: egitimId || null,
    userAgent: navigator.userAgent.slice(0, 200),
    kayitZamani: Timestamp.now(),
    aktif: true,
  });

  return sub;
};

export const webPushIptal = async () => {
  if (!webPushDestekli()) return;
  const sw = await navigator.serviceWorker.getRegistration('/sw-push.js');
  if (!sw) return;
  const sub = await sw.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    // TODO: Firestore'dan da sil (endpoint match)
  }
};
