"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { tr } from "@/lib/i18n/tr";
import { useEsc } from "@/lib/useEsc";

const t = tr.ayna;
const SURE = 6000;

export type Slayt = {
  ikon: string;
  ust: string;
  baslik: string;
  metin: string;
  liste?: string[];
  tema?: "gold" | "emerald" | "amber" | "royal";
};

const TEMA: Record<string, string> = {
  gold: "text-gold-light",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  royal: "text-royal-light",
};

// #3 Ayna Raporu "story" katmanı: kişinin en kritik içgörülerini tam-ekran,
// kaydırmalı/otomatik akan slaytlar olarak gösterir — kör nokta doruk noktası.
// #2 Rapor Anı sinematiği: otomatikAnahtar verilirse rapor İLK açıldığında
// (kişi başına bir kez, localStorage) sinema kendiliğinden başlar — düz veri
// yığını değil, rehberli törensel açılış.
export default function AynaHikaye({
  slaytlar,
  etiket,
  otomatikAnahtar,
  muhurAktif = false,
}: {
  slaytlar: Slayt[];
  etiket?: string;
  otomatikAnahtar?: string;
  muhurAktif?: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const [i, setI] = useState(0);
  useEsc(acik, () => setAcik(false));

  // İlk açılışta sinemayı kendiliğinden başlat (kişi başına bir kez).
  // Kamp sonu Mühür Açılışı aktifse, o tören zaten sinematik açılış görevini
  // görür (z-70 tam ekran) — sinema onun üstüne binmesin; buton hep elde kalır.
  useEffect(() => {
    if (!otomatikAnahtar || slaytlar.length === 0 || muhurAktif) return;
    try {
      if (localStorage.getItem(otomatikAnahtar)) return;
      localStorage.setItem(otomatikAnahtar, "1");
    } catch {
      return; // localStorage yoksa otomatik açma; buton hep elde
    }
    // Kısa gecikme: sayfa oturup perde geçişi yumuşak başlasın
    const id = setTimeout(() => {
      setI(0);
      setAcik(true);
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!acik || i >= slaytlar.length - 1) return;
    const id = setTimeout(() => setI((x) => Math.min(slaytlar.length - 1, x + 1)), SURE);
    return () => clearTimeout(id);
  }, [acik, i, slaytlar.length]);

  if (slaytlar.length === 0) return null;
  const s = slaytlar[i];

  function ileri() {
    if (i >= slaytlar.length - 1) {
      setAcik(false);
      return;
    }
    setI(i + 1);
  }

  return (
    <>
      <button
        onClick={() => {
          setI(0);
          setAcik(true);
        }}
        className="btn-kor parilti flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold"
      >
        {etiket ?? `▶ ${t.hikayeIzle}`}
      </button>

      {acik &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[80] flex flex-col bg-midnight"
          >
            {/* İlerleme çubukları */}
            <div className="flex gap-1 p-3">
              {slaytlar.map((_, k) => (
                <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className={`h-full bg-white ${k < i ? "w-full" : k > i ? "w-0" : ""}`}
                    style={
                      k === i
                        ? { animation: `hikayeIlerle ${SURE}ms linear forwards` }
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => setAcik(false)}
              className="absolute right-3 top-6 z-10 text-2xl text-slate-300"
              aria-label="Kapat"
            >
              ✕
            </button>
            {/* Dokunma bölgeleri: sol → geri, sağ → ileri */}
            <button
              aria-label="geri"
              onClick={() => setI((x) => Math.max(0, x - 1))}
              className="absolute bottom-0 left-0 top-12 z-[5] w-1/3"
            />
            <button
              aria-label="ileri"
              onClick={ileri}
              className="absolute bottom-0 right-0 top-12 z-[5] w-2/3"
            />

            <div
              key={i}
              className="sahne-giris flex flex-1 flex-col items-center justify-center px-8 text-center"
            >
              <span className="text-7xl" aria-hidden>
                {s.ikon}
              </span>
              {s.ust && (
                <p
                  className={`mt-6 text-xs font-semibold uppercase tracking-[0.3em] ${
                    TEMA[s.tema ?? "gold"]
                  }`}
                >
                  {s.ust}
                </p>
              )}
              <h2 className="prizma-serif ay-metin mt-2 text-4xl font-semibold leading-tight">
                {s.baslik}
              </h2>
              <p className="mt-4 max-w-sm text-lg leading-relaxed text-slate-200">{s.metin}</p>
              {s.liste && s.liste.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {s.liste.map((l, k) => (
                    <li key={k} className="text-base text-slate-300">
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="pb-6 text-center text-xs text-slate-500">
              {i + 1} / {slaytlar.length}
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
