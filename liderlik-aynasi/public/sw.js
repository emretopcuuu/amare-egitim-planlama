/* AYNA service worker: push bildirimlerini gösterir, tıklamada tam o işe açar. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let veri = { baslik: "AYNA", govde: "", url: "/gorevler" };
  try {
    veri = { ...veri, ...event.data.json() };
  } catch {
    /* yük çözülemezse varsayılanlar */
  }
  event.waitUntil(
    self.registration.showNotification(veri.baslik, {
      body: veri.govde,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: veri.url },
      tag: "ayna",
      renotify: true,
      // Aday kaçırmasın: dokunana dek ekranda kalsın (tek dokunuşla o işe).
      requireInteraction: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((acik) => {
        // Açık bir sekme varsa onu tam o işe götür ve öne getir.
        for (const pencere of acik) {
          if ("focus" in pencere) {
            try {
              if ("navigate" in pencere) pencere.navigate(url);
            } catch {
              /* navigate desteklenmiyorsa yalnız odakla */
            }
            return pencere.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
