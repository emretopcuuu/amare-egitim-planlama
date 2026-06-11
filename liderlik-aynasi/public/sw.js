/* AYNA service worker: push bildirimlerini gösterir, tıklamada uygulamayı açar. */

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
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((acik) => {
      for (const pencere of acik) {
        if ("focus" in pencere) {
          pencere.navigate(url);
          return pencere.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
