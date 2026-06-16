"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import { MINI360_IFADELER } from "@/lib/onFarkindalik";

const t = tr.mini360;

export default function Mini360Dis({ hedefId, ad }: { hedefId: string; ad: string }) {
  const [puanlar, setPuanlar] = useState<Record<string, number>>({});
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [bitti, setBitti] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const tamam = MINI360_IFADELER.every((i) => puanlar[i.kod]);

  async function gonder() {
    if (!tamam || gonderiliyor) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/mini360/dis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetId: hedefId, ...puanlar }),
      });
      if (!res.ok) {
        const v = await res.json().catch(() => null);
        setHata(v?.hata ?? t.hata);
        return;
      }
      setBitti(true);
    } catch {
      setHata(t.hata);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (bitti) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
        <p className="text-6xl">🙏</p>
        <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold">{t.disTesekkurBaslik}</h1>
        <p className="mx-auto mt-4 max-w-sm text-lg leading-relaxed text-slate-300">{t.disTesekkurMetin}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-4">
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.disBaslik(ad)}</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.disAciklama}</p>
      </header>

      <div className="space-y-4">
        {MINI360_IFADELER.map((i) => (
          <div key={i.kod} className="kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-royal/30">
            <p className="text-sm text-slate-200">{i.dis}</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={puanlar[i.kod] === p}
                  onClick={() => {
                    titret(8);
                    setPuanlar((e) => ({ ...e, [i.kod]: p }));
                    setHata(null);
                  }}
                  className={`h-11 rounded-lg text-base font-bold transition-all ${
                    puanlar[i.kod] === p ? "btn-kor scale-105" : "border-2 border-white/20 text-slate-300 hover:border-gold/60"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">1 = {t.olcek[1]} · 5 = {t.olcek[5]}</p>

      {hata && <p role="alert" className="text-center text-sm font-medium text-red-400">{hata}</p>}

      <button
        onClick={gonder}
        disabled={!tamam || gonderiliyor}
        className="btn-kor parilti flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-40"
      >
        {gonderiliyor ? t.gonderiliyor : t.disGonder}
      </button>
    </div>
  );
}
