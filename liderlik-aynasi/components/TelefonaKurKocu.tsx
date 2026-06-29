"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { IosKurulumGorsel, AndroidKurulumGorsel } from "@/components/KurulumGorseli";

const t = tr.bildirim;

// KURULUM KOÇU — telefona ekleme:
//  A) Uygulama-içi tarayıcı (WhatsApp/Instagram mini-tarayıcısı): ana ekrana
//     ekleme yok → "linki kopyala, Safari ya da Chrome'da aç" + görsel.
//  B) iOS gerçek tarayıcı (Safari VEYA Chrome — iOS 16.4+ ikisinde de çalışır):
//     Paylaş → "Ana Ekrana Ekle" görsel adım adım rehber.
//  C) Android: yakalanan yerel istemle TEK DOKUNUŞ yükle; istem yoksa ⋮ menü
//     talimatı + görsel.
// Kurulu (standalone) ya da masaüstündeyse kendini gizler.

type Ortam =
  | "yukleniyor"
  | "kurulu"
  | "masaustu"
  | "ios-kur" // iOS gerçek tarayıcı (Safari VEYA Chrome) → görsel koç
  | "android-yukle" // yerel istem yakalandı → tek dokunuş
  | "android-talimat" // istem yok → menü talimatı
  | "inapp"; // uygulama içi tarayıcı (WhatsApp/Instagram…)

// Bilinen uygulama-içi tarayıcı (WKWebView/Custom Tab) imzaları.
const INAPP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|WhatsApp|Snapchat|Pinterest|MicroMessenger|GSA\/|; ?wv\)/i;

export default function TelefonaKurKocu() {
  const [ortam, setOrtam] = useState<Ortam>("yukleniyor");
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [istem, setIstem] = useState<Event | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return setOrtam("kurulu");

    const ios = /iphone|ipad|ipod/i.test(ua);
    const android = /android/i.test(ua);
    if (!ios && !android) return setOrtam("masaustu");
    setPlatform(ios ? "ios" : "android");

    if (ios) {
      if (INAPP.test(ua)) return setOrtam("inapp");
      // iOS 16.4+ ile ana ekrana ekleme Safari VE Chrome'da çalışır → ikisinde de koç.
      return setOrtam("ios-kur");
    }
    // android
    if (INAPP.test(ua)) return setOrtam("inapp");
    setOrtam("android-talimat"); // istem gelirse aşağıda "android-yukle"ye yükselir
  }, []);

  // Android Chrome yerel kurulum istemi: yakala, tek dokunuşa çevir.
  useEffect(() => {
    function yakala(e: Event) {
      e.preventDefault();
      setIstem(e);
      setOrtam((o) => (o === "android-talimat" || o === "yukleniyor" ? "android-yukle" : o));
    }
    window.addEventListener("beforeinstallprompt", yakala);
    return () => window.removeEventListener("beforeinstallprompt", yakala);
  }, []);

  async function linkKopyala() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2500);
    } catch {
      /* pano erişimi yoksa kullanıcı adres çubuğundan elle kopyalar */
    }
  }

  async function yukle() {
    const e = istem as unknown as { prompt: () => void; userChoice: Promise<unknown> } | null;
    if (!e) return;
    e.prompt();
    try {
      await e.userChoice;
    } finally {
      setIstem(null);
    }
  }

  if (ortam === "yukleniyor" || ortam === "kurulu" || ortam === "masaustu") return null;

  // Kopyala butonu (yanlış-tarayıcı durumları için ortak)
  const KopyaBtn = (
    <button
      onClick={linkKopyala}
      className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-gold font-semibold text-[#1a1206] transition-colors hover:bg-gold-light active:scale-[0.99]"
    >
      {kopyalandi ? t.kocKopyalandi : t.kocLinkKopyala}
    </button>
  );

  return (
    <div className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-gold/30 backdrop-blur">
      <p className="font-semibold text-gold-light">{t.kocBaslik}</p>
      <p className="mt-1 text-sm text-slate-300">{t.kocAlt}</p>

      {/* A) Uygulama içi tarayıcı (WhatsApp/Instagram) → gerçek tarayıcıda aç + görsel */}
      {ortam === "inapp" && (
        <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
          <p className="text-sm font-semibold text-amber-300">⚠️ {t.kocInappBaslik}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">{t.kocInappMetin}</p>
          {KopyaBtn}
          {/* Doğru tarayıcıda yapacağın adımların görseli */}
          <div className="mt-3 rounded-xl bg-black/25 p-3">
            {platform === "android" ? <AndroidKurulumGorsel /> : <IosKurulumGorsel />}
          </div>
        </div>
      )}

      {/* B) iOS gerçek tarayıcı (Safari VEYA Chrome) → görsel adım adım koç */}
      {ortam === "ios-kur" && (
        <div className="mt-3 space-y-2.5">
          <p className="text-center text-xs font-medium text-gold-light/90">{t.kocIosTarayici}</p>
          {/* Ekran mockup'ı — Paylaş → Ana Ekrana Ekle */}
          <div className="rounded-xl bg-black/25 p-3">
            <IosKurulumGorsel />
          </div>
          <Adim no={1}>
            {t.kocIosAdim1}{" "}
            <IosPaylasIkon /> <b className="text-gold-light">{t.kocIosAdim1b}</b>{" "}
            {t.kocIosAdim1c}
          </Adim>
          <Adim no={2}>
            {t.kocIosAdim2}{" "}
            <b className="text-gold-light">{t.kocIosAdim2b}</b> {t.kocIosAdim2c}
          </Adim>
          <p className="pt-1 text-center text-xs text-slate-400">{t.kocIosTekrar}</p>
          <p className="text-center text-xs font-semibold text-gold-light">{t.kocIosOk}</p>
        </div>
      )}

      {/* B) Android: yerel istem yakalandı → tek dokunuş yükle */}
      {ortam === "android-yukle" && (
        <button
          onClick={yukle}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-gold font-semibold text-[#1a1206] transition-colors hover:bg-gold-light active:scale-[0.99]"
        >
          {t.kocAndroidYukle}
        </button>
      )}

      {/* B) Android: istem yok → menü talimatı + ekran mockup'ı */}
      {ortam === "android-talimat" && (
        <div className="mt-3 rounded-xl bg-black/20 p-3">
          <p className="text-sm font-semibold text-gold-light">{t.kocAndroidTalimatBaslik}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {t.kocAndroidTalimatMetin}
          </p>
          <div className="mt-3">
            <AndroidKurulumGorsel />
          </div>
        </div>
      )}
    </div>
  );
}

function Adim({ no, children }: { no: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-black/20 px-3 py-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold-light">
        {no}
      </span>
      <span className="text-sm leading-relaxed text-slate-200">{children}</span>
    </div>
  );
}

// iOS Safari "Paylaş" ikonu (kare + yukarı ok) — tanınır görsel ipucu.
function IosPaylasIkon() {
  return (
    <span className="inline-flex h-5 w-5 -translate-y-0.5 items-center justify-center align-middle text-sky-300">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden>
        <path d="M12 3v12M12 3l-3.5 3.5M12 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
