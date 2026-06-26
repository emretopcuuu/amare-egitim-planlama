// One Team — Offline Service Worker
// Cache: anasayfa shell + son ziyaret edilen sayfalar
// Strategy: network-first (her zaman fresh data dene, yoksa cache fallback)

const CACHE_VERSION = 'oneteam-v4';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logos/oneteam logo.JPG',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS).catch(e => console.warn('[sw-offline] shell cache err:', e)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !k.startsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Sadece kendi origin (cross-origin firebase, supabase vb. ellenmesin)
  if (url.origin !== self.location.origin) return;

  // Netlify Functions hiç cache'lenmesin (dinamik veri)
  if (url.pathname.startsWith('/.netlify/functions/')) return;

  // Vimeo iframe ve API istekleri ellenmesin
  if (url.hostname.includes('vimeo.com') || url.hostname.includes('vimeocdn.com')) return;

  // GET dışı (POST/PUT/DELETE) cache'lenmez
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Başarılıysa cache'e yaz
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // Network başarısız → cache'den dön
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Hiç yoksa offline sayfası
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
