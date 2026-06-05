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
    // 3rd-party noise filter
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /^Loading chunk \d+ failed/, // Eski sekme yeniden deploy sonrası
      /^Failed to fetch dynamically imported module/,
    ],
    denyUrls: [
      /extensions?\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}

export { Sentry };
