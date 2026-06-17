"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.pusula;
const GEC_DEPO = "la_hazirlik_gecilen_v1";

// Kamp öncesi hazırlık: hamleleri AYNI ANDA değil, TEK TEK gösterir. Sıradaki
// tek adım odakta; aday onu bitirir ya da "şimdilik geç" der (adımlar zorunlu
// değil). Hepsi bitince/geçilince sakin "kampta görüşürüz, dinlen" ekranı çıkar.
export type AdimVeri = {
  k: string;
  ikon: string;
  baslik: string;
  metin: string;
  tamam: boolean;
  aksiyon: React.ReactNode;
};

export default function HazirlikAkis({
  adimlar,
  bekleIcerik,
}: {
  adimlar: AdimVeri[];
  bekleIcerik: React.ReactNode;
}) {
  const [gecilen, setGecilen] = useState<string[]>([]);
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    try {
      const ham = localStorage.getItem(GEC_DEPO);
      if (ham) setGecilen(JSON.parse(ham) as string[]);
    } catch {}
    setYuklendi(true);
  }, []);
  useEffect(() => {
    if (yuklendi) {
      try {
        localStorage.setItem(GEC_DEPO, JSON.stringify(gecilen));
      } catch {}
    }
  }, [gecilen, yuklendi]);

  if (!yuklendi) return null; // localStorage okunana dek boş — yanıp sönme olmasın

  const toplam = adimlar.length;
  const tamamlanan = adimlar.filter((a) => a.tamam).length;
  // Sıradaki: tamamlanmamış VE şimdilik geçilmemiş ilk adım.
  const sonraki = adimlar.find((a) => !a.tamam && !gecilen.includes(a.k)) ?? null;

  // Hepsi bitti ya da geçildi → dinlenme ekranı.
  if (!sonraki) {
    const eksikVar = adimlar.some((a) => !a.tamam); // geçilmiş ama yapılmamış adım
    return (
      <div className="space-y-5">
        {bekleIcerik}
        {eksikVar && (
          <button
            onClick={() => setGecilen([])}
            className="mx-auto block text-xs text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
          >
            {t.hazirlikGeriDon}
          </button>
        )}
      </div>
    );
  }

  const sira = tamamlanan + 1;
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.hazirlikBaslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.hazirlikAltBaslik}</p>
      </div>

      <p className="text-center text-[0.7rem] font-semibold uppercase tracking-wide text-gold-light">
        {t.hazirlikAdimEtiket(sira, toplam)}
      </p>

      {/* Sıradaki TEK adım — tüm odak burada */}
      <div className="kart-cam parilti rounded-2xl p-5 ring-2 ring-gold/50">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>
            {sonraki.ikon}
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-gold-light">{sonraki.baslik}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{sonraki.metin}</p>
            <div className="mt-3">{sonraki.aksiyon}</div>
          </div>
        </div>
      </div>

      {/* Adımlar zorunlu değil — istersen kampta yap */}
      <button
        onClick={() => setGecilen((g) => (g.includes(sonraki.k) ? g : [...g, sonraki.k]))}
        className="mx-auto block text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
      >
        {t.hazirlikGec} →
      </button>
    </div>
  );
}
