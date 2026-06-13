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
  const [siluetUrl, setSiluetUrl] = useState<string | null>(null);
  // Berraklık: yolculuk ilerledikçe sudaki yansıma netleşir (başta hafif
  // bulanık/donuk). 1 = tamamen berrak. Oturumsuzsa berrak gösterilir.
  const [berraklik, setBerraklik] = useState(1);
  const { hazir, hareketli, webgl } = durum;

  // Giriş yapan katılımcının hayalet silüeti: varsa sudaki yansıma o olur.
  // Oturum yoksa 401 döner ve sessizce prosedürel silüet kullanılır.
  useEffect(() => {
    fetch("/api/siluet")
      .then((res) => (res.ok ? res.json() : null))
      .then((veri: { url?: string | null; berraklik?: number } | null) => {
        if (veri?.url) setSiluetUrl(veri.url);
        if (typeof veri?.berraklik === "number") {
          // hareket-azaltta defokus rahatsız edebilir → tam berrak
          const azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          setBerraklik(azalt ? 1 : veri.berraklik);
        }
      })
      .catch(() => {});
  }, []);

  // berraklik<1 iken hafif bulanık + donuk; 1'de hiç filtre yok (maliyet sıfır).
  const sahneFiltre =
    berraklik >= 0.99
      ? undefined
      : `blur(${((1 - berraklik) * 4).toFixed(2)}px) brightness(${(0.82 + berraklik * 0.18).toFixed(3)})`;

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
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 print:hidden">
      {/* Sahne katmanı: berraklığa göre netleşen filtre (perdeler net kalır) */}
      <div
        className="absolute inset-0"
        style={{ filter: sahneFiltre, transition: "filter 2.5s ease-out" }}
      >
        {hazir && webgl ? (
          <GolSahne hareketli={hareketli} siluetUrl={siluetUrl} />
        ) : (
          <div className="gol-zemin absolute inset-0" />
        )}
      </div>
      {/* Sakinleştirme perdesi: göl sahnesi geri çekilir, içerik öne çıkar.
          Radyal vinyet kenarları, alt gradyan ise sudaki silüet parıltısını
          ("ayak izi") koyulaştırır — zemin huzurlu ve elit kalır. */}
      <div className="absolute inset-0 bg-[radial-gradient(125%_95%_at_50%_28%,transparent_0%,rgba(5,16,28,0.45)_62%,rgba(3,10,18,0.82)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06121e]/30 via-[#06121e]/20 to-[#040e18]/80" />
    </div>
  );
}
