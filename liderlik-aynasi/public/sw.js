/* AYNA service worker: push bildirimlerini gösterir, tıklamada tam o işe açar. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const LOG_ANAHTAR = "la_bildirim_log";

// Geliştirme 1 — Bildirim Merkezi: gelen push'u localStorage log'una yaz.
// Açık sekme varsa postMessage ile anlık güncelleme tetiklenir.
function logYaz(baslik, govde, url) {
  try {
    const acik = self.clients.matchAll({ type: "window" });
    acik.then((pencereler) => {
      for (const p of pencereler) {
        p.postMessage({ tip: "la_bildirim_geldi", baslik, govde, url });
      }
    });
  } catch {}
}

self.addEventListener("push", (event) => {
  let veri = { baslik: "AYNA", govde: "", url: "/gorevler" };
  try {
    veri = { ...veri, ...event.data.json() };
  } catch {
    /* yük çözülemezse varsayılanlar */
  }
  logYaz(veri.baslik, veri.govde, veri.url);
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
