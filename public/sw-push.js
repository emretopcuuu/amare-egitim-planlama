// Service Worker — Web Push notification handler
// Push event geldiğinde browser bildirim gösterir

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'One Team Eğitim', body: event.data ? event.data.text() : 'Yeni bildirim' };
  }

  const title = data.title || 'One Team Eğitim';
  const options = {
    body: data.body || '',
    icon: data.icon || '/logos/oneteam logo.JPG',
    badge: '/logos/oneteam logo.JPG',
    tag: data.tag || 'one-team-bildirim',
    data: {
      url: data.url || '/takvim',
      ...data.data,
    },
    requireInteraction: !!data.requireInteraction,
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/takvim';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Açık tab varsa odaklan
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Yoksa yeni tab aç
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
