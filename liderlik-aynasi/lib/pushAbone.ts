// İstemci push aboneliği yardımcıları — tek kaynak. (server-only DEĞİL; yalnız
// tarayıcıda çağrılır.) Yeni "nazik bildirim şeridi" bunları kullanır; mevcut
// BildirimAcUyari/BildirimAnahtari kendi kopyalarını korur (canlıda dokunulmadı).

export type PushDurum =
  | "yukleniyor"
  | "desteklenmiyor"
  | "ios-kurulum" // iOS: ana ekrana eklenmeden push olmaz
  | "kapali" // desteklenir ama abone değil → açılabilir
  | "abone"
  | "reddedildi";

function base64ToUint8(base64: string): Uint8Array {
  const dolgu = "=".repeat((4 - (base64.length % 4)) % 4);
  const ham = atob((base64 + dolgu).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(ham, (c) => c.charCodeAt(0));
}

// Mevcut push durumunu oku (abone mi, açılabilir mi, iOS kurulum mu…).
export async function pushDurumOku(): Promise<PushDurum> {
  if (typeof window === "undefined") return "yukleniyor";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const kurulu = window.matchMedia?.("(display-mode: standalone)").matches === true;
    return ios && !kurulu ? "ios-kurulum" : "desteklenmiyor";
  }
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "desteklenmiyor";
  try {
    const kayit = await navigator.serviceWorker.register("/sw.js");
    if (Notification.permission === "denied") return "reddedildi";
    const abone = await kayit.pushManager.getSubscription();
    return abone && Notification.permission === "granted" ? "abone" : "kapali";
  } catch {
    return "desteklenmiyor";
  }
}

// İzin iste + abone ol + sunucuya kaydet. Başarılıysa true.
export async function pushAboneOl(): Promise<boolean> {
  const anahtar = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!anahtar) return false;
  const izin = await Notification.requestPermission();
  if (izin !== "granted") return false;
  const kayit = await navigator.serviceWorker.ready;
  const abonelik = await kayit.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8(anahtar) as BufferSource,
  });
  const res = await fetch("/api/bildirim-abone", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(abonelik.toJSON()),
  });
  return res.ok;
}
