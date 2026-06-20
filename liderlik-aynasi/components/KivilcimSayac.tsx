"use client";

import { useEffect, useState } from "react";

// Kıvılcım (XP) kazanımını bir kutlama anına çevirir: rakam 0'dan kazanılan
// değere sayılarak büyür, altın bir parlama eşlik eder. Kütüphane yok — sayaç
// requestAnimationFrame. Hareket-azalt tercihinde anında son değeri gösterir.
// Yalnız görsel; titreşim/ses çağıran ekran (ör. görev teslimi) ayrıca tetikler.
export default function KivilcimSayac({ kazanim }: { kazanim: number }) {
  const [goster, setGoster] = useState(0);

  useEffect(() => {
    const azalt = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (azalt || kazanim <= 0) {
      setGoster(kazanim);
      return;
    }
    const sure = 700;
    const bas = performance.now();
    let raf = 0;
    function say(simdi: number) {
      const oran = Math.min(1, (simdi - bas) / sure);
      const yumusak = 1 - Math.pow(1 - oran, 3); // easeOutCubic
      setGoster(Math.round(yumusak * kazanim));
      if (oran < 1) raf = requestAnimationFrame(say);
    }
    raf = requestAnimationFrame(say);
    return () => cancelAnimationFrame(raf);
  }, [kazanim]);

  return (
    <p className="kivilcim-vurgu mt-1 text-lg font-bold text-gold-light">
      +{goster} Kıvılcım ⚡
    </p>
  );
}
