"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { type TemaMod, type EtkinTema, temaModOku, etkinTema } from "@/lib/tema";

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
  // Tema (gece/gündüz) — perdeleri ve göl göğünü buna göre ayarla.
  const [tema, setTema] = useState<{ mod: TemaMod; etkin: EtkinTema }>({
    mod: "otomatik",
    etkin: "gece",
  });
  const { hazir, hareketli, webgl } = durum;

  // Tema modunu oku + değişimini dinle (TemaSecimi "ayna-tema" yayar).
  useEffect(() => {
    const m = temaModOku();
    setTema({ mod: m, etkin: etkinTema(m) });
    function dinle(e: Event) {
      const d = (e as CustomEvent<{ mod: TemaMod; etkin: EtkinTema }>).detail;
      if (d) setTema({ mod: d.mod, etkin: d.etkin });
    }
    window.addEventListener("ayna-tema", dinle);
    return () => window.removeEventListener("ayna-tema", dinle);
  }, []);

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

  const gunduz = tema.etkin === "gunduz";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 print:hidden">
      {gunduz ? (
        <>
          {/* GÜNDÜZ: tan vakti göl manzarası (üretilmiş fotoğraf). Üstte bol
              boş gökyüzü olduğu için içerik/kartlar net okunur. */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/gunduz-gol.webp)" }}
          />
          {/* Çok hafif aydınlatma perdesi: cam kartların kenarları otursun,
              fotoğrafı yıkamadan içerik biraz öne çıksın. */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/25" />
        </>
      ) : (
        <>
          {/* GECE: canlı WebGL göl sahnesi + sakinleştirici koyu perdeler. */}
          <div
            className="absolute inset-0"
            style={{ filter: sahneFiltre, transition: "filter 2.5s ease-out" }}
          >
            {hazir && webgl ? (
              <GolSahne
                hareketli={hareketli}
                siluetUrl={siluetUrl}
                temaMod={tema.mod}
                etkinTema={tema.etkin}
              />
            ) : (
              <div className="gol-zemin absolute inset-0" />
            )}
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(125%_95%_at_50%_28%,transparent_0%,rgba(5,16,28,0.45)_62%,rgba(3,10,18,0.82)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06121e]/30 via-[#06121e]/20 to-[#040e18]/80" />
        </>
      )}
    </div>
  );
}
