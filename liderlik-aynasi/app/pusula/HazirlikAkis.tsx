"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import AsamaRayi, { SiradakiOnizleme, type RayAsama } from "@/components/AsamaRayi";

const t = tr.pusula;
const GEC_DEPO = "la_hazirlik_gecilen_v1";

// Kamp öncesi hazırlık: hamleleri AYNI ANDA değil, TEK TEK gösterir. Üstte
// AŞAMA RAYI tüm adımları (sıradakini adıyla) gösterir; aday her an bir önceki
// adıma DÖNÜP düzeltebilir; altta "sıradaki" önizlenir. Adımlar zorunlu değil.
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
  // Aday elle bir adıma döndüyse (düzeltme) bu indeks sabitlenir; null = otomatik
  // (sıradaki tamamlanmamış adım).
  const [bakilan, setBakilan] = useState<number | null>(null);

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
  // Otomatik odak: tamamlanmamış VE şimdilik geçilmemiş ilk adımın indeksi.
  const otoIdx = adimlar.findIndex((a) => !a.tamam && !gecilen.includes(a.k));
  // Gösterilen adım: elle dönülen varsa o, yoksa otomatik. -1 → hepsi bitti/geçildi.
  const odakIdx = bakilan ?? otoIdx;
  const dinlenme = odakIdx < 0;

  // Ray: her adımın durumu (tamam / şu an / bekliyor).
  const ray: RayAsama[] = adimlar.map((a, i) => ({
    ad: a.baslik,
    durum: a.tamam ? "tamam" : !dinlenme && i === odakIdx ? "simdi" : "bekliyor",
  }));

  // Hepsi bitti ya da geçildi → dinlenme ekranı (ray + geri dön ile).
  if (dinlenme) {
    const eksikVar = adimlar.some((a) => !a.tamam); // geçilmiş ama yapılmamış adım
    return (
      <div className="space-y-5">
        <AsamaRayi asamalar={ray} />
        {bekleIcerik}
        {eksikVar && (
          <button
            onClick={() => {
              setGecilen([]);
              setBakilan(null);
            }}
            className="mx-auto block text-xs text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
          >
            {t.hazirlikGeriDon}
          </button>
        )}
      </div>
    );
  }

  const odak = adimlar[odakIdx];
  const sira = odakIdx + 1;
  // Sıradaki adım (önizleme için): odaktan sonraki ilk adım.
  const siradakiAdim = adimlar[odakIdx + 1] ?? null;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.hazirlikBaslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.hazirlikAltBaslik}</p>
      </div>

      {/* AŞAMA RAYI — tüm adımlar, sıradaki adıyla görünür */}
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t.hazirlikAdimlarBaslik}
      </p>
      <AsamaRayi asamalar={ray} />

      <p className="text-center text-[0.7rem] font-semibold uppercase tracking-wide text-gold-light">
        {t.hazirlikAdimEtiket(sira, toplam)}
      </p>

      {/* Odaktaki TEK adım — tüm dikkat burada */}
      <div className="kart-cam parilti rounded-2xl p-5 ring-2 ring-gold/50">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>
            {odak.ikon}
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-gold-light">{odak.baslik}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{odak.metin}</p>
            <div className="mt-3">{odak.aksiyon}</div>
          </div>
        </div>
      </div>

      {/* Sıradaki önizleme — sonraki adımı (varsa) adıyla göster */}
      {siradakiAdim && <SiradakiOnizleme ad={siradakiAdim.baslik} />}

      <div className="flex items-center justify-between gap-3">
        {/* Geri (düzelt): bir önceki adıma dön */}
        {odakIdx > 0 ? (
          <button
            onClick={() => setBakilan(odakIdx - 1)}
            className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            {tr.asama.onceki}
          </button>
        ) : (
          <span />
        )}

        {/* Adımlar zorunlu değil — istersen kampta yap */}
        <button
          onClick={() => {
            setGecilen((g) => (g.includes(odak.k) ? g : [...g, odak.k]));
            setBakilan(null); // otomatik odağa dön (sıradaki tamamlanmamış)
          }}
          className="text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
        >
          {t.hazirlikGec} →
        </button>
      </div>
    </div>
  );
}
