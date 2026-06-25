"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { ortuAc, ortuKapat } from "@/lib/ortu";

const t = tr.muhurTuru;
const DEPO = "la_muhur_turu_v1";

// B9 — Mühür açıldıktan sonra TEK seferlik kısa tur: alt çubuktaki ana hedefleri
// (görevler / koç / duvar) tanıtır. Görülünce cihazda işaretlenir, bir daha çıkmaz.
// Yalnız kamp açıldıysa (camp_unlocked) page.tsx tarafından render edilir.
export default function MuhurTuru() {
  const [goster, setGoster] = useState(false);
  const [adim, setAdim] = useState(0);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(DEPO)) setGoster(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (!goster) return;
    ortuAc();
    return () => ortuKapat();
  }, [goster]);

  function kapat() {
    try {
      localStorage.setItem(DEPO, "1");
    } catch {}
    setGoster(false);
  }

  if (!goster) return null;
  const kart = t.kartlar[adim];
  const sonuncu = adim === t.kartlar.length - 1;

  return (
    <div className="gece-ada fixed inset-0 z-[60] flex flex-col bg-black/95">
      <div className="flex justify-end p-5">
        <button
          onClick={kapat}
          className="rounded-xl px-4 py-2 text-base text-slate-400 hover:text-slate-200"
        >
          {t.gec}
        </button>
      </div>
      <div className="flex w-full flex-1 flex-col overflow-y-auto px-6 pb-8">
        <div className="mx-auto my-auto w-full max-w-md text-center">
          <p className="text-7xl">{kart.simge}</p>
          <h1 className="prizma-serif ay-metin mt-6 text-3xl font-semibold leading-tight">
            {kart.baslik}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{kart.metin}</p>
          <div className="mt-8 flex justify-center gap-2">
            {t.kartlar.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === adim ? "w-6 bg-gold" : "w-2 bg-white/25"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => (sonuncu ? kapat() : setAdim((a) => a + 1))}
            className="parilti btn-kor mt-8 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold"
          >
            {sonuncu ? t.basla : t.ileri}
          </button>
        </div>
      </div>
    </div>
  );
}
