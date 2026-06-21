"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// KONUŞAN YANSIMA: "1 video + anlık ses" hilesi. Kişinin suda beliren
// yansıma videosu (sessiz, döngülü) o anki senaryonun taze sesiyle birlikte
// oynar — aynı video sınırsız farklı cümle söyler. Su estetiği dudak
// senkronu beklentisini ortadan kaldırır. Video yoksa yalnız ses çalar.
export default function KonusanYansima({
  videoUrl,
  sesUrl,
  etiket,
}: {
  videoUrl: string | null;
  sesUrl: string;
  etiket?: string;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const ses = useRef<HTMLAudioElement | null>(null);
  const [caliyor, setCaliyor] = useState(false);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    const v = video.current;
    return () => {
      ses.current?.pause();
      v?.pause();
    };
  }, []);

  function durdur() {
    ses.current?.pause();
    if (ses.current) ses.current.currentTime = 0;
    video.current?.pause();
    if (video.current) video.current.currentTime = 0;
    setCaliyor(false);
  }

  function tikla() {
    if (caliyor) {
      durdur();
      return;
    }
    if (!ses.current) {
      ses.current = new Audio(sesUrl);
      ses.current.onended = durdur;
      // Dosya yüklenemezse (404/ağ) sessizce yutma — kullanıcıya bildir.
      ses.current.onerror = () => {
        setHata(true);
        setCaliyor(false);
      };
    }
    setHata(false);
    // Ses anlatıcıdır; video onun altında sessizce döner
    void video.current?.play().catch(() => {});
    void ses.current
      .play()
      .then(() => setCaliyor(true))
      .catch(() => {
        setHata(true);
        setCaliyor(false);
      });
  }

  return (
    <div className="mt-3">
      {videoUrl && (
        <button
          onClick={tikla}
          aria-label={etiket ?? tr.yansiman.izle}
          className="relative block w-full overflow-hidden rounded-2xl ring-1 ring-white/15"
        >
          <video
            ref={video}
            src={videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="block w-full"
          />
          {!caliyor && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-[#1a1206] shadow-xl">
                ▶
              </span>
            </span>
          )}
        </button>
      )}
      <button
        onClick={tikla}
        className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-base font-semibold transition-colors ${
          caliyor
            ? "border-gold/50 bg-gold/15 text-gold-light"
            : "border-white/15 text-slate-200 hover:bg-white/[0.06]"
        }`}
      >
        {caliyor ? tr.gorevler.durdur : (etiket ?? tr.yansiman.izle)}
      </button>
      {hata && (
        <p role="alert" className="mt-2 text-center text-sm font-medium text-amber-300">
          {tr.yansiman.sesHata}
        </p>
      )}
    </div>
  );
}
