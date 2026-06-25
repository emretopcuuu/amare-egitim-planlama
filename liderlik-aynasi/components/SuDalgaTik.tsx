"use client";

import { useEffect } from "react";

// #5 — Su/ayna marka hareketi. Birincil etkileşimlerde (buton/link) dokunulan
// noktada hafif bir SU DALGASI halkası açılır — markanın "ayna/su" metaforunu
// etkileşime taşır. Saf CSS animasyon + tek geçici eleman; hareket-azalt
// tercihinde tamamen susar. Performans: yalnız ilgili öğelerde, kendini temizler.
export default function SuDalgaTik() {
  useEffect(() => {
    const azalt = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (azalt) return;

    function dokun(e: PointerEvent) {
      const hedef = (e.target as HTMLElement | null)?.closest(
        "button, a, [role='button'], summary"
      );
      if (!hedef) return;
      // Devre dışı / tam-ekran sahne öğelerinde dalga yapma.
      if ((hedef as HTMLButtonElement).disabled) return;

      const dalga = document.createElement("span");
      dalga.className = "su-dalga-tik";
      const boyut = 18;
      dalga.style.left = `${e.clientX - boyut / 2}px`;
      dalga.style.top = `${e.clientY - boyut / 2}px`;
      dalga.style.width = `${boyut}px`;
      dalga.style.height = `${boyut}px`;
      document.body.appendChild(dalga);
      dalga.addEventListener("animationend", () => dalga.remove(), { once: true });
      // Güvenlik ağı: animasyon olayı kaçarsa da temizle.
      window.setTimeout(() => dalga.remove(), 900);
    }

    document.addEventListener("pointerdown", dokun, { passive: true });
    return () => document.removeEventListener("pointerdown", dokun);
  }, []);

  return null;
}
