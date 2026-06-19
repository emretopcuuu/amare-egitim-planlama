"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const DEPO = "la_marka_splash_v1";

// Tek seferlik marka açılışı: ilk açılışta ONE TEAM amblemi şık bir reveal'le
// belirir, sonra bir daha çıkmaz. Eski siyah-kutu marka videosu yerine şeffaf
// logo (ton uyuşmazlığı yok); atlanabilir + güvenlik zamanlayıcısı kapatır.
// Test için: URL'ye ?intro=1 eklenirse localStorage'a bakmadan yeniden gösterir.
export default function AcilisSplash() {
  const [goster, setGoster] = useState(false);
  const [kapaniyor, setKapaniyor] = useState(false);

  useEffect(() => {
    let acildi = false;
    try {
      const zorla = new URLSearchParams(window.location.search).has("intro");
      if (zorla || !localStorage.getItem(DEPO)) {
        acildi = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGoster(true);
      }
    } catch {
      // depolama kapalı: splash'ı atla
    }
    if (!acildi) return;
    const z = setTimeout(kapat, 2600);
    return () => clearTimeout(z);
  }, []);

  function kapat() {
    try {
      localStorage.setItem(DEPO, "1");
    } catch {
      // yok say
    }
    setKapaniyor(true);
    setTimeout(() => setGoster(false), 350);
  }

  if (!goster) return null;

  return (
    <div
      onClick={kapat}
      className={`gece-ada fixed inset-0 z-[70] flex items-center justify-center transition-opacity duration-300 ${
        kapaniyor ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "radial-gradient(circle at 50% 42%, #0a2036 0%, #04101c 72%)" }}
    >
      <img
        src="/oneteam-logo.png"
        alt="ONE TEAM"
        className="marka-reveal w-60 max-w-[70%] drop-shadow-[0_12px_44px_rgba(212,175,55,0.35)]"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          kapat();
        }}
        className="absolute right-4 top-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur transition-colors hover:bg-white/20"
      >
        {tr.tanitim.gec}
      </button>

      <style jsx>{`
        .marka-reveal {
          animation: markaReveal 2.4s ease-out both;
        }
        @keyframes markaReveal {
          0% {
            opacity: 0;
            transform: scale(0.82);
            filter: brightness(1.4);
          }
          24% {
            opacity: 1;
            transform: scale(1);
            filter: brightness(1);
          }
          80% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.03);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .marka-reveal {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
