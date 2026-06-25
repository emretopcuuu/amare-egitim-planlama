"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import TelefonaKur from "./TelefonaKur";

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
  const [masaustu, setMasaustu] = useState(false);

  // Masaüstü mü? (telefona taşıma yönergesini öne çıkarmak için)
  useEffect(() => {
    const ua = navigator.userAgent;
    const mobil =
      /iphone|ipad|ipod|android/i.test(ua) ||
      window.matchMedia?.("(pointer: coarse)").matches;
    setMasaustu(!mobil);
  }, []);

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

  useEffect(() => {
    void kontrol().catch(() => setDurum("desteklenmiyor"));
  }, []);

  // Tarayıcı izni verildikten sonra push aboneliğini kur ve sunucuya kaydet.
  async function aboneOl(): Promise<boolean> {
    const anahtar = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!anahtar) {
      setDurum("desteklenmiyor");
      return false;
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
    return true;
  }

  async function izinVer() {
    setHata(false);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setDurum("reddedildi");
        return;
      }
      await aboneOl();
    } catch {
      setHata(true);
    }
  }

  // "Yanlışlıkla hayır" kurtarma: kişi tarayıcı ayarından izni açıp tekrar
  // dener. İzin yeniden 'default' olduysa istem yine çıkar; 'granted' ise
  // doğrudan abone olur; hâlâ 'denied' ise yönerge gösterilmeye devam eder.
  async function tekrarDene() {
    setHata(false);
    try {
      if (Notification.permission === "granted") {
        await aboneOl();
      } else if (Notification.permission === "default") {
        await izinVer();
      } else {
        setHata(true); // hâlâ kapalı — ayarlardan açması gerekiyor
      }
    } catch {
      setHata(true);
    }
  }

  if (durum === "yukleniyor") return null;

  // Bu tarayıcı push desteklemiyor (ör. masaüstü gizli mod). Masaüstündeyse yine
  // de telefona taşıma yolunu göster; mobil/desteksizse sessizce gizlen.
  if (durum === "desteklenmiyor") {
    if (!masaustu) return null;
    return (
      <div className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30 backdrop-blur">
        <p className="font-semibold text-gold-light">🔔 {t.izinBaslik}</p>
        <p className="mt-2 text-sm text-slate-300">{t.masaustuNot}</p>
        <TelefonaKur />
      </div>
    );
  }

  if (durum === "abone") {
    // B4: bildirim zaten açıksa kart gürültü yapmasın — mobilde tamamen gizlen.
    // Masaüstünde yine de telefona kurma önerisi anlamlı olduğu için kalır.
    if (!masaustu) return null;
    return (
      <div className="mt-3 rounded-2xl border border-royal-light/30 bg-white/[0.02] p-4">
        <p className="text-sm text-slate-300">{t.masaustuNot}</p>
        <TelefonaKur />
      </div>
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
        <>
          <p className="font-semibold text-gold-light">{t.izinTekrarBaslik}</p>
          <p className="mt-2 text-sm text-slate-300">{t.izinReddedildi}</p>
          <ol className="mt-3 space-y-1.5 text-sm text-slate-400">
            {t.izinAcmaAdimlar.map((adim, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold text-gold-light/80">{i + 1}.</span>
                <span>{adim}</span>
              </li>
            ))}
          </ol>
          {hata && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-400">
              {t.izinHalaKapali}
            </p>
          )}
          <button
            onClick={tekrarDene}
            className="mt-4 w-full btn-3d rounded-xl bg-gold px-4 py-2.5 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light"
          >
            {t.izinTekrarDene}
          </button>
        </>
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
            className="mt-4 w-full btn-3d rounded-xl bg-gold px-4 py-2.5 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light"
          >
            {t.izinVer}
          </button>
        </>
      )}

      {/* Masaüstünde: "telefonundan da alabilirsin" + ana ekrana ekleme yolu.
          iOS-kurulum durumu zaten ana ekrana eklemeyi anlatıyor — orada tekrar etme. */}
      {masaustu && <p className="mt-4 text-sm text-slate-300">{t.masaustuNot}</p>}
      {durum !== "ios-kurulum" && <TelefonaKur />}
    </div>
  );
}
