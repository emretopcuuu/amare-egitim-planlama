"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.dusunuyor;

// UX #7 (2.tur): "AYNA düşünüyor" bekleme anı. Uzun yapay zekâ üretimlerinde
// (mektup, rapor) aday boş bir "Hazırlanıyor…" yerine canlı, gizemli bir an
// görür: dönen ayna halkası + sırayla beliren bağlamsal cümleler. Bekleyişi
// kampın atmosferinin bir parçasına çevirir.
export default function AynaDusunuyor({ satirlar }: { satirlar?: readonly string[] }) {
  const liste = satirlar && satirlar.length ? satirlar : t.satirlar;
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % liste.length), 2600);
    return () => clearInterval(id);
  }, [liste.length]);

  return (
    <div
      className="flex flex-col items-center gap-4 py-6 text-center"
      role="status"
      aria-live="polite"
    >
      {/* Dönen ayna halkası */}
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-gold border-r-gold/40 [animation-duration:2.4s]" />
        <div className="absolute inset-1.5 rounded-full bg-gold/10 blur-[6px]" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">👁</div>
      </div>
      <p className="text-sm font-semibold text-gold-light">{t.baslik}</p>
      <p key={i} className="dusunuyor-satir min-h-[1rem] text-xs text-slate-400">
        {liste[i]}
      </p>
    </div>
  );
}
