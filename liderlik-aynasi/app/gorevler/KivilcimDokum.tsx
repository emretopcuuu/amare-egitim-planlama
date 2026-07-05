"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

export type KivilcimDokumVeri = {
  kalemler: { etiket: string; deger: number }[];
  toplam: number;
};

// D6 — KIVILCIM DÖKÜMÜ ANİMASYONU. Puanlama sonucunda toplam tek sayı yerine
// kalemler sırayla belirir (taban → AYNA puanı → zamanında → seri → çarpanlar)
// ve alttaki toplam her kalemle birlikte sayarak büyür. Kütüphane yok — basit
// aralıklı sayaç; hareket-azalt tercihinde her şey anında görünür.
export default function KivilcimDokum({ veri }: { veri: KivilcimDokumVeri }) {
  const [adim, setAdim] = useState(0); // kaç kalem göründü

  useEffect(() => {
    const azalt = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (azalt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdim(veri.kalemler.length);
      return;
    }
    if (adim >= veri.kalemler.length) return;
    const id = setTimeout(() => setAdim((a) => a + 1), adim === 0 ? 350 : 550);
    return () => clearTimeout(id);
  }, [adim, veri.kalemler.length]);

  const araToplam = veri.kalemler
    .slice(0, adim)
    .reduce((toplam, k) => toplam + k.deger, 0);

  return (
    <div className="mx-auto mt-2 w-full max-w-xs" aria-live="polite">
      <div className="text-left">
        {veri.kalemler.map((k, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-0.5 text-sm transition-opacity duration-300 ${
              i < adim ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={i >= adim}
          >
            <span className="text-slate-300">{k.etiket}</span>
            <span
              className={`font-semibold ${k.deger >= 0 ? "text-gold-light" : "text-amber-300"}`}
            >
              {k.deger >= 0 ? `+${k.deger}` : `−${Math.abs(k.deger)}`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1.5">
        <span className="text-sm font-medium text-slate-300">{tr.gorevler.dokum.toplam}</span>
        {/* key=araToplam: her kalemde vurgu animasyonu yeniden oynar */}
        <span key={araToplam} className="kivilcim-vurgu text-lg font-bold text-gold-light">
          +{araToplam} ⚡
        </span>
      </div>
    </div>
  );
}
