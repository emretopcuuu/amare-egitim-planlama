/* AYNA service worker: push bildirimlerini gösterir, tıklamada tam o işe açar. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const LOG_ANAHTAR = "la_bildirim_log";

// [E1-c] REVEAL VARLIK ÖNBELLEĞİ: kapanışta 29 telefon aynı anda rapor+ses
// açtığında API/storage yükünü sıfıra indirmek için, istemci reveal ÖNCESİ
// kişinin kendi mektup sesini SW'ye önbelletir. Reveal anında ses ağdan değil
// önbellekten çalar. Yalnız açık uçlu küçük bir varlık listesi cache'lenir.
const VARLIK_ONBELLEK = "la-varlik-v1";
const ONBELLEK_YOLLARI = ["/api/mektup-ses"];

self.addEventListener("message", (event) => {
  const veri = event.data || {};
  if (veri.tip === "la-onbellek" && typeof veri.url === "string") {
    // Yalnız izinli yollar önbelleklenir; ?u=pid sorgu parametresi önbellek
    // anahtarını KİŞİYE ÖZEL yapar (kullanıcı değişiminde yanlış ses çalınmaz).
    const url = new URL(veri.url, self.location.origin);
    if (!ONBELLEK_YOLLARI.includes(url.pathname)) return;
    event.waitUntil(
      caches
        .open(VARLIK_ONBELLEK)
        .then((c) => c.add(new Request(url.href, { credentials: "include" })))
        .catch(() => {}) // ses yoksa (404) sessiz geç
    );
  }
});

// Önbelletilmiş reveal varlıkları için önce-önbellek (stale-while-revalidate değil;
// varlık değişmez). Diğer istekler dokunulmadan ağa gider.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (!ONBELLEK_YOLLARI.some((y) => url.pathname === y)) return;
  event.respondWith(
    caches.open(VARLIK_ONBELLEK).then((c) =>
      c.match(event.request).then((v) => v || fetch(event.request))
    )
  );
});

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
