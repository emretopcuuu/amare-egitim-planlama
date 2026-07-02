"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.bildirim;

// "Telefonuna kur" — özellikle masaüstünden girene: bildirimleri telefonundan
// da alabileceğini, uygulamayı ana ekrana nasıl ekleyeceğini anlatır. Üstüne
// basınca açılır; içinde telefonla okutulacak bir QR + platforma göre adımlar.
export default function TelefonaKur() {
  const [acik, setAcik] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const uretildi = useRef(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIos(/iphone|ipad|ipod/i.test(ua));
    setAndroid(/android/i.test(ua));
  }, []);

  // QR'ı yalnız panel ilk açıldığında, tarayıcıda üret (uygulamanın kök adresi).
  useEffect(() => {
    if (!acik || uretildi.current) return;
    uretildi.current = true;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(window.location.origin, {
          margin: 1,
          width: 220,
          color: { dark: "#0b1220", light: "#ffffff" },
        });
        setQr(url);
      } catch {
        // QR üretilemese de adımlar yine işe yarar — sessizce geç
      }
    })();
  }, [acik]);

  // iOS görsel rehber: emoji yok (eski cihazda □ riski), SVG ile her yerde birebir.
  // Paylaş ⃫ ikonu → Ana Ekrana Ekle ⊞; altta zıplayan ok "düğme aşağıda" der.
  function IosGorsel() {
    return (
      <div className="rounded-xl bg-black/25 p-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-gold-light ring-1 ring-gold/30">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 15V3" />
                <path d="M8 7l4-4 4 4" />
                <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
              </svg>
            </span>
            <span className="text-[11px] font-medium text-slate-400">{t.iosGorselPaylas}</span>
          </div>
          <span className="text-2xl text-gold-light/70" aria-hidden>→</span>
          <div className="flex flex-col items-center gap-1">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-gold-light ring-1 ring-gold/30">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </span>
            <span className="text-[11px] font-medium text-slate-400">{t.iosGorselEkle}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-gold-light">
          <span className="animate-bounce text-2xl leading-none" aria-hidden>↓</span>
          <span className="text-xs text-slate-300">{t.iosGorselAlt}</span>
        </div>
      </div>
    );
  }

  function Adimlar({ baslik, adimlar }: { baslik: string; adimlar: readonly string[] }) {
    return (
      <div className="rounded-xl bg-black/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/90">
          {baslik}
        </p>
        <ol className="mt-2 space-y-1.5 text-sm text-slate-300">
          {adimlar.map((adim, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-gold-light/80">{i + 1}.</span>
              <span>{adim}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (!acik) {
    return (
      <button
        onClick={() => setAcik(true)}
        className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-royal-light/30 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-gold/40 hover:bg-white/5"
      >
        <span className="text-sm font-semibold text-slate-200">{t.telefonAc}</span>
        <span className="text-slate-500" aria-hidden>
          ›
        </span>
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-gold/30 bg-white/[0.02] p-4">
      <p className="text-sm leading-relaxed text-slate-300">{t.telefonGiris}</p>

      {/* QR — masaüstünde telefonla okutulur; mobilde gizlenir (zaten telefondalar) */}
      {!ios && !android && (
        <div className="mt-4 flex flex-col items-center text-center">
          <p className="text-sm font-semibold text-gold-light">{t.telefonQrBaslik}</p>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt={t.telefonQrBaslik}
              width={176}
              height={176}
              className="mt-3 rounded-xl"
            />
          ) : (
            <p className="mt-3 text-xs text-slate-500">{t.telefonQrHazirlaniyor}</p>
          )}
          <p className="mt-2 max-w-xs text-xs text-slate-400">{t.telefonQrAlt}</p>
        </div>
      )}

      {/* Ana ekrana ekleme adımları — algılanan platform öne, diğeri de görünür */}
      <div className="mt-4 space-y-3">
        {!android && <IosGorsel />}
        {!android && (
          <Adimlar baslik={t.telefonIosBaslik} adimlar={t.telefonIosAdimlar} />
        )}
        {!ios && (
          <Adimlar baslik={t.telefonAndroidBaslik} adimlar={t.telefonAndroidAdimlar} />
        )}
      </div>

      <button
        onClick={() => setAcik(false)}
        className="mt-4 text-xs text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
      >
        {t.telefonKapat}
      </button>
    </div>
  );
}
