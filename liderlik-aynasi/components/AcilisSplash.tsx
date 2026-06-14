"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const DEPO = "la_marka_splash_v1";

// Tek seferlik marka açılışı: ilk açılışta ONE TEAM logo reveal'i tam ekran
// oynar, sonra bir daha çıkmaz. Sessiz + atlanabilir; otomatik oynatma
// engellenirse poster gösterilir ve güvenlik zamanlayıcısı kapatır.
export default function AcilisSplash() {
  const [goster, setGoster] = useState(false);
  const [kapaniyor, setKapaniyor] = useState(false);

  useEffect(() => {
    let acildi = false;
    try {
      if (!localStorage.getItem(DEPO)) {
        acildi = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGoster(true);
      }
    } catch {
      // depolama kapalı: splash'ı atla
    }
    if (!acildi) return;
    // Güvenlik ağı: video oynamasa/ended ateşlemese bile ~11 sn sonra kapat.
    const z = setTimeout(kapat, 11000);
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
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-[#040e18] transition-opacity duration-300 ${
        kapaniyor ? "opacity-0" : "opacity-100"
      }`}
    >
      <video
        autoPlay
        muted
        playsInline
        onEnded={kapat}
        poster="/marka-poster.jpg"
        className="h-full w-full object-contain"
      >
        <source src="/marka.mp4" type="video/mp4" />
      </video>
      <button
        onClick={kapat}
        className="absolute right-4 top-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur transition-colors hover:bg-white/20"
      >
        {tr.tanitim.gec}
      </button>
    </div>
  );
}
