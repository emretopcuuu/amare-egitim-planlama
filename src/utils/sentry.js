// src/utils/sentry.js
// ─────────────────────────────────────────────────────────────────────────
// Sentry frontend init. VITE_SENTRY_DSN env yoksa NO-OP — yerel dev'de spam yok.
//
// Özellikler:
//   - Sadece production'da aktif (mode === 'production')
//   - Email/amareId/telefon PII redact (beforeSend hook)
//   - Source maps Vite plugin ile upload (sentry-cli config gerektirir)
//   - Sample rate %20 (kota koruma)
//   - Replay: %0 (gizlilik — kayıt yok)
// ─────────────────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN || '';
const ENVIRONMENT = import.meta.env.MODE || 'development';
const RELEASE = import.meta.env.VITE_APP_VERSION || 'dev';

// PII regex'leri — body/error içinde rastlayınca [REDACTED] ile değiştir
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // email
  /\b\+?\d{10,15}\b/g, // telefon
  /\b[A-Z]{2,4}-?\d{6,10}\b/g, // amareId pattern (genişlet)
];

function redactPii(s) {
  if (typeof s !== 'string') return s;
  let out = s;
  for (const pat of PII_PATTERNS) out = out.replace(pat, '[REDACTED]');
  return out;
}

function redactEvent(event) {
  try {
    if (event.message) event.message = redactPii(event.message);
    if (event.request?.url) event.request.url = redactPii(event.request.url);
    if (event.request?.query_string) event.request.query_string = redactPii(event.request.query_string);
    // breadcrumb'lardan PII temizle
    if (Array.isArray(event.breadcrumbs)) {
      for (const b of event.breadcrumbs) {
        if (b.message) b.message = redactPii(b.message);
        if (b.data?.url) b.data.url = redactPii(b.data.url);
      }
    }
    // exception value'larından PII temizle
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = redactPii(ex.value);
      }
    }
    // user.email gibi alanları kaldır
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
  } catch {}
  return event;
}

export function sentryBaslat() {
  if (!DSN) {
    if (typeof console !== 'undefined') {
      console.info('[Sentry] DSN yok, devre dışı (dev mode normal)');
    }
    return;
  }
  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    // Performance: %20 sample
    tracesSampleRate: 0.2,
    // Replay yok — privacy
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // PII gizleme
    sendDefaultPii: false,
    beforeSend: redactEvent,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data?.url) breadcrumb.data.url = redactPii(breadcrumb.data.url);
      if (breadcrumb.message) breadcrumb.message = redactPii(breadcrumb.message);
      return breadcrumb;
    },
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Production değilse hata yutma
    enabled: ENVIRONMENT === 'production',
    // 3rd-party noise filter — kullanıcı ortamı sorunları (bizim kod değil)
    ignoreErrors: [
      // ResizeObserver: tarayıcı internal, harmless
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Sentry SDK kendi gürültüsü
      'Non-Error promise rejection captured',
      // Eski sekme yeniden deploy sonrası chunk fail (zaten stale-bundle reload yapıyoruz)
      /^Loading chunk \d+ failed/,
      /^Failed to fetch dynamically imported module/,
      // ─── 2026-06-09 audit: Sentry log analizi sonrası eklenen noise filtreleri ───
      // IndexedDB connection lost — iOS Safari private mode, disk dolu, Firefox locked
      // Firebase Auth/Firestore IndexedDB kullanır, kopunca bu hata. Refresh çözer.
      /Indexed Database/i,
      /UnknownError.*Connection/i,
      // reCAPTCHA Timeout — script yüklenirken yavaş bağlantı / ad blocker
      // AppCheck reCAPTCHA v3 ya da Turnstile widget kaynaklı, kullanıcı etkisi yok
      /reCAPTCHA Timeout/i,
      /Could not load reCAPTCHA/i,
      // Android in-app browser WebView bridge hatası (WhatsApp, Instagram, Facebook)
      // Kullanıcının uygulamasının iç tarayıcı problemi, bizim site değil
      /Java bridge method/i,
      /Error invoking callWebView/i,
      // iOS Safari network değişimi (3G→WiFi geçiş) — generic load fail
      // Sıfır context veriyor, hiçbir teşhise yardımcı olmuyor
      /^TypeError: Load failed$/,
      /^TypeError: cancelled$/,
      // Network/Abort — kullanıcı sayfayı kapattı (interaction iptal)
      'AbortError',
      'NetworkError',
      /Network request failed/i,
      // Firebase Auth — kullanıcı popup'ı manuel kapadı, normal davranış
      /auth\/popup-closed-by-user/i,
      /auth\/cancelled-popup-request/i,
    ],
    denyUrls: [
      /extensions?\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      // Browser extension content scripts (ad blocker, password manager vs)
      /^safari-extension:\/\//i,
      /^edge-extension:\/\//i,
    ],
  });
}

export { Sentry };
