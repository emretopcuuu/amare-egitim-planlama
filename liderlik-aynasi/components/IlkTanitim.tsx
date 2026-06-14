"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.tanitim;
const DEPO = "la_tanitim_v1";

// İlk açılışta tek seferlik 30 saniyelik tanıtım: kişiye uygulamada ne
// yaşayacağını teker teker, büyük yazı/az yazıyla anlatır. Görüldüğünde
// cihazda işaretlenir ve bir daha çıkmaz. Mobil öncelikli tam ekran katman.
export default function IlkTanitim() {
  // Sunucuda ve ilk render'da gösterme (hydration uyumu); mount'ta karar ver.
  const [goster, setGoster] = useState(false);
  const [adim, setAdim] = useState(0);
  // Video yüklenmez/oynamazsa ilk kart yine de anlamlı görünsün (simgeye düş).
  const [videoOk, setVideoOk] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // autoplay'i garantiye al: kart açılınca açıkça play() dene (iOS bazen ister).
  useEffect(() => {
    if (adim !== 0 || !videoOk || !goster) return;
    videoRef.current?.play().catch(() => {
      /* autoplay engellendiyse poster (logo) kalır; dokununca oynar */
    });
  }, [adim, videoOk, goster]);

  useEffect(() => {
    try {
      // localStorage yalnızca istemcide okunur; mount'ta tek seferlik karar.
      // Test için ?intro=1 ile localStorage'a bakmadan yeniden gösterilir.
      const zorla = new URLSearchParams(window.location.search).has("intro");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (zorla || !localStorage.getItem(DEPO)) setGoster(true);
    } catch {
      // depolama kapalı: tanıtımı atla
    }
  }, []);

  function kapat() {
    try {
      localStorage.setItem(DEPO, "1");
    } catch {
      // yok say
    }
    setGoster(false);
  }

  if (!goster) return null;

  const kart = t.kartlar[adim];
  const sonuncu = adim === t.kartlar.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex justify-end p-5">
        <button
          onClick={kapat}
          className="rounded-xl px-4 py-2 text-base text-slate-400 hover:text-slate-200"
        >
          {t.gec}
        </button>
      </div>

      <div className="flex w-full flex-1 flex-col overflow-y-auto px-6 pb-8">
        <div className="mx-auto my-auto w-full max-w-md text-center">
          {adim === 0 && videoOk ? (
            // İlk kart ONE TEAM marka videosuyla açılır (sessiz, döngüsüz).
            // Sabit en-boy + object-cover: yavaş/uzun videoda bile düzeni bozmaz.
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              preload="auto"
              poster="/marka-poster.jpg"
              onError={() => setVideoOk(false)}
              onClick={() => {
                // Dokununca sesi aç (autoplay sessiz başlar — tarayıcı kuralı).
                const v = videoRef.current;
                if (v) {
                  v.muted = false;
                  v.play().catch(() => {});
                }
              }}
              style={{ aspectRatio: "16 / 9" }}
              className="mx-auto w-full max-w-xs cursor-pointer rounded-2xl object-cover"
            >
              <source src="/marka.mp4" type="video/mp4" />
            </video>
          ) : (
            <p className="text-7xl">{kart.simge}</p>
          )}
          <h1 className="prizma-serif ay-metin mt-6 text-3xl font-semibold leading-tight">
            {kart.baslik}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{kart.metin}</p>

          <div className="mt-8 flex justify-center gap-2">
            {t.kartlar.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === adim ? "w-6 bg-gold" : "w-2 bg-white/25"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => (sonuncu ? kapat() : setAdim((a) => a + 1))}
            className="parilti btn-kor mt-8 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold"
          >
            {sonuncu ? t.basla : t.ileri}
          </button>
        </div>
      </div>
    </div>
  );
}
