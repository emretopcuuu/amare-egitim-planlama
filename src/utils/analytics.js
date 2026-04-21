// Basit custom analytics — Firestore'a yazar, monitor dashboard okur
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Session ID — sekmeye özel
const getSessionId = () => {
  let id = sessionStorage.getItem('amr_session_id');
  if (!id) {
    id = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('amr_session_id', id);
  }
  return id;
};

// Visitor ID — kalıcı (localStorage)
const getVisitorId = () => {
  let id = localStorage.getItem('amr_visitor_id');
  if (!id) {
    id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('amr_visitor_id', id);
  }
  return id;
};

// Cihaz tipi
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  return 'desktop';
};

// Tarayıcı adı
const getBrowser = () => {
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome\//i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
  if (/firefox\//i.test(ua)) return 'Firefox';
  if (/safari\//i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  return 'Other';
};

// Ana fonksiyon
export async function trackEvent(type, data = {}) {
  try {
    await addDoc(collection(db, 'egitim_analytics'), {
      type,
      ...data,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      path: window.location.pathname,
      lang: localStorage.getItem('ot_lang') || 'tr',
      device: getDeviceType(),
      browser: getBrowser(),
      screen: `${window.innerWidth}x${window.innerHeight}`,
      ref: document.referrer || 'direct',
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    // Silent fail — analytics kullanıcıyı etkilemesin
  }
}

// Kısa yardımcılar
export const trackPageView = () => trackEvent('pageview');
export const trackLangChange = (from, to) => trackEvent('lang_change', { from, to });
export const trackReminderSignup = (egitimId, egitimAdi, zamanSayisi) =>
  trackEvent('reminder_signup', { egitimId, egitimAdi, zamanSayisi });
export const trackPdfDownload = () => trackEvent('pdf_download');
export const trackAdminLogin = () => trackEvent('admin_login');
export const trackBasvuruSubmit = (kariyer) => trackEvent('basvuru_submit', { kariyer });
