"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.bildirim;

type Durum =
  | "yukleniyor"
  | "desteklenmiyor"
  | "ios-kurulum" // iOS'ta ana ekrana eklenmeden push olmaz
  | "izin-bekliyor"
  | "abone"
  | "reddedildi";

function base64ToUint8(base64: string): Uint8Array {
  const dolgu = "=".repeat((4 - (base64.length % 4)) % 4);
  const ham = atob((base64 + dolgu).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(ham, (c) => c.charCodeAt(0));
}

// PWA bildirim kurulumu: SW kaydı + push aboneliği. Check-in ritüelinin
// uygulamadaki yüzü — durum makinesi cihaza göre doğru yönergeyi gösterir.
export default function AynaKurulum() {
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [hata, setHata] = useState(false);

  useEffect(() => {
    async function kontrol() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // iOS Safari (tarayıcı modunda) push'u yalnızca ana ekran kurulumunda açar
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const kurulu = window.matchMedia("(display-mode: standalone)").matches;
        setDurum(ios && !kurulu ? "ios-kurulum" : "desteklenmiyor");
        return;
      }
      const kayit = await navigator.serviceWorker.register("/sw.js");
      if (Notification.permission === "denied") {
        setDurum("reddedildi");
        return;
      }
      const mevcut = await kayit.pushManager.getSubscription();
      setDurum(mevcut && Notification.permission === "granted" ? "abone" : "izin-bekliyor");
    }
    void kontrol().catch(() => setDurum("desteklenmiyor"));
  }, []);

  async function izinVer() {
    setHata(false);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setDurum("reddedildi");
        return;
      }
      const anahtar = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!anahtar) {
        setDurum("desteklenmiyor");
        return;
      }
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
      if (!res.ok) throw new Error();
      setDurum("abone");
    } catch {
      setHata(true);
    }
  }

  if (durum === "yukleniyor" || durum === "desteklenmiyor") return null;

  if (durum === "abone") {
    return (
      <p className="text-center text-xs font-medium text-emerald-400">
        {t.izinVerildi}
      </p>
    );
  }

  return (
    <div className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30 backdrop-blur">
      {durum === "ios-kurulum" ? (
        <>
          <p className="font-semibold text-gold-light">{t.kurBaslik}</p>
          <p className="mt-2 text-sm text-slate-300">{t.kurAciklamaIos}</p>
        </>
      ) : durum === "reddedildi" ? (
        <p className="text-sm text-slate-400">{t.izinReddedildi}</p>
      ) : (
        <>
          <p className="font-semibold text-gold-light">{t.izinBaslik}</p>
          <p className="mt-2 text-sm text-slate-300">{t.izinAciklama}</p>
          {hata && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-400">
              {t.hata}
            </p>
          )}
          <button
            onClick={izinVer}
            className="mt-4 w-full btn-3d rounded-xl bg-gold px-4 py-2.5 font-semibold text-midnight transition-colors hover:bg-gold-light"
          >
            {t.izinVer}
          </button>
        </>
      )}
    </div>
  );
}
