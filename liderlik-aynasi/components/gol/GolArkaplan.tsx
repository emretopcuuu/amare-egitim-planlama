"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// GolSahne'nin güvenli sarmalayıcısı: tembel yükleme (ssr:false),
// hareket-azalt tercihinde donuk tek kare, WebGL yoksa CSS gece zemini.
const GolSahne = dynamic(() => import("./GolSahne"), {
  ssr: false,
  loading: () => null,
});

export default function GolArkaplan() {
  const [durum, setDurum] = useState({ hazir: false, hareketli: true, webgl: true });
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
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {hazir && webgl ? (
        <GolSahne hareketli={hareketli} />
      ) : (
        <div className="gol-zemin absolute inset-0" />
      )}
    </div>
  );
}
