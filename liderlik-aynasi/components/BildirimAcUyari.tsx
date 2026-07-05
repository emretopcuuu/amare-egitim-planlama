"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.bildirim;

// [KURULUM] KURULU AMA BİLDİRİM KAPALI uyarısı — ana sayfanın ÜSTÜNDE, büyük.
// Kişi uygulamayı ana ekrana eklemiş (standalone) ama push aboneliği YOK ise
// belirgin bir "Bildirimleri Aç" kartı gösterir. Kampın kalbi push olduğu için
// bu kişiyi altta küçük kartla değil, tepede net bir çağrıyla yakalarız.
// Abone olunca / desteklenmeyen ortamda / henüz kurulmamışsa gizlenir
// (kurulum çağrısını zaten AynaKurulum + PwaKur yapıyor).

function base64ToUint8(base64: string): Uint8Array {
  const dolgu = "=".repeat((4 - (base64.length % 4)) % 4);
  const ham = atob((base64 + dolgu).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(ham, (c) => c.charCodeAt(0));
}

type Durum = "gizli" | "gorunur" | "reddedildi";

export default function BildirimAcUyari() {
  const [durum, setDurum] = useState<Durum>("gizli");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        // YALNIZ ana ekrana eklenmiş (standalone) kişide göster — tarayıcı
        // sekmesindekine "önce ana ekrana ekle" mesajını PwaKur zaten veriyor.
        const kurulu =
          window.matchMedia?.("(display-mode: standalone)").matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        if (!kurulu) return;
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

        const kayit = await navigator.serviceWorker.register("/sw.js");
        if (Notification.permission === "denied") {
          setDurum("reddedildi");
          return;
        }
        const abone = await kayit.pushManager.getSubscription();
        if (abone && Notification.permission === "granted") return; // zaten açık — gizle
        setDurum("gorunur");
      } catch {
        /* sessiz */
      }
    })();
  }, []);

  async function ac() {
    if (mesgul) return;
    setMesgul(true);
    setHata(false);
    try {
      const anahtar = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setDurum("reddedildi");
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
      setDurum("gizli"); // başarı → kart kaybolur
    } catch {
      setHata(true);
    } finally {
      setMesgul(false);
    }
  }

  if (durum === "gizli") return null;

  return (
    <div className="kart-cerceve rounded-2xl border-2 border-gold/45 bg-gradient-to-b from-gold/12 to-midnight-card/70 p-5 text-center shadow-xl">
      <p className="text-4xl" aria-hidden>🔔</p>
      <p className="prizma-serif ay-metin mt-2 text-xl font-bold leading-snug">{t.izinBaslik}</p>
      {durum === "reddedildi" ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.izinReddedildi}</p>
          <ol className="mx-auto mt-3 max-w-xs space-y-1.5 text-left text-sm text-slate-400">
            {t.izinAcmaAdimlar.map((adim, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold text-gold-light/80">{i + 1}.</span>
                <span>{adim}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.izinAciklama}</p>
          {hata && <p role="alert" className="mt-2 text-sm font-medium text-red-400">{t.hata}</p>}
          <button
            onClick={() => void ac()}
            disabled={mesgul}
            className="btn-kor parilti mt-4 flex h-13 w-full items-center justify-center rounded-2xl py-3 text-base font-bold disabled:opacity-60"
          >
            {mesgul ? "Açılıyor…" : t.izinVer}
          </button>
        </>
      )}
    </div>
  );
}
