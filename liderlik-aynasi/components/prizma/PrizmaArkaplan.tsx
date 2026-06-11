"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// PrizmaSahne'nin güvenli sarmalayıcısı: three.js paketi yalnızca istemcide
// ve tembel yüklenir; hareket-azalt tercihi sahneyi dondurur; WebGL yoksa
// CSS tayf zemine düşülür (görsel dil korunur, etkileşim gider).
const PrizmaSahne = dynamic(() => import("./PrizmaSahne"), {
  ssr: false,
  loading: () => null,
});

export default function PrizmaArkaplan({
  adet = 22,
  sinif = "",
}: {
  adet?: number;
  sinif?: string;
}) {
  const [durum, setDurum] = useState({
    hazir: false,
    hareketli: true,
    webgl: true,
  });
  const { hazir, hareketli, webgl } = durum;

  useEffect(() => {
    const azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let destek = false;
    try {
      const tuval = document.createElement("canvas");
      destek = !!(tuval.getContext("webgl2") ?? tuval.getContext("webgl"));
    } catch {
      destek = false;
    }
    // Tarayıcı yetenekleri ancak istemcide ölçülür — tek seferlik kurulum.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDurum({ hazir: true, hareketli: !azalt, webgl: destek });
  }, []);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 ${sinif}`}
    >
      {hazir && webgl ? (
        <PrizmaSahne adet={adet} hareketli={hareketli} />
      ) : (
        <div className="tayf-zemin absolute inset-0" />
      )}
    </div>
  );
}
