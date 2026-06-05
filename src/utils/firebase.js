import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBEtQlumVPsS8paJ4rUnsSid_P6WW-1qUY",
    authDomain: "amare-egitim-planlama.firebaseapp.com",
    projectId: "amare-egitim-planlama",
    storageBucket: "amare-egitim-planlama.firebasestorage.app",
    messagingSenderId: "473830927218",
    appId: "1:473830927218:web:6e75bd232bf0be28994beb",
    measurementId: "G-9EMBZ0WKRD"
};

const app = initializeApp(firebaseConfig);

// 2026-06-05 audit (#4): AppCheck monitor mode.
// VITE_RECAPTCHA_V3_SITE_KEY env set ise init et — yoksa NO-OP (mevcut davranış)
// Firebase Console → App Check → reCAPTCHA v3 provider → site key oluştur → env'e ekle
// 7 gün monitor mode'da bırak → enforce'a çevir (Console'dan)
const RECAPTCHA_KEY = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY || '';
if (RECAPTCHA_KEY && typeof window !== 'undefined') {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[AppCheck] init başarısız:', e?.message);
    }
  }
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
