"use client";

import { useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

const t = tr.sahitlik;

type Kisi = {
  sahibiId: string;
  ad: string;
  telefon: string | null;
  seri: number;
  kacirilanGun: number;
  sonAdim: string | null;
};

export default function SahitlikPanel({ kisiler }: { kisiler: Kisi[] }) {
  const [gonderilen, setGonderilen] = useState<Record<string, boolean>>({});
  const [mesgul, setMesgul] = useState<string | null>(null);

  async function durt(sahibi: string, tip: string) {
    setMesgul(sahibi + tip);
    try {
      const res = await fetch("/api/sahitlik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sahibi, tip }),
      });
      if (res.ok) setGonderilen((g) => ({ ...g, [sahibi]: true }));
    } finally {
      setMesgul(null);
    }
  }

  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
      <header className="text-center">
        <p className="text-4xl">🤝</p>
        <h1 className="prizma-serif ay-metin mt-2 text-2xl font-semibold">{t.baslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.aciklama}</p>
      </header>

      {kisiler.length === 0 ? (
        <p className="rounded-2xl bg-midnight-soft/60 p-6 text-center text-sm text-slate-400">{t.bos}</p>
      ) : (
        <ul className="space-y-3">
          {kisiler.map((k) => {
            const takildi = k.kacirilanGun >= 2;
            const gonder = gonderilen[k.sahibiId];
            return (
              <li
                key={k.sahibiId}
                className={`rounded-2xl border p-4 ${
                  takildi ? "border-amber-400/40 bg-amber-500/[0.06]" : "border-royal/30 bg-midnight-card/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{k.ad}</p>
                    <p className={`text-xs ${takildi ? "text-amber-300" : "text-emerald-300"}`}>
                      {takildi ? t.kacirdi(k.kacirilanGun) : t.guncel} · {t.seri(k.seri)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {gonder ? (
                    <span className="text-sm font-medium text-emerald-300">{t.gonderildi}</span>
                  ) : (
                    <>
                      <button
                        onClick={() => durt(k.sahibiId, "hatirlatma")}
                        disabled={mesgul !== null}
                        className="rounded-lg bg-midnight-soft px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-royal/30 disabled:opacity-50"
                      >
                        {t.durt}
                      </button>
                      <button
                        onClick={() => durt(k.sahibiId, "tesvik")}
                        disabled={mesgul !== null}
                        className="rounded-lg bg-gold/15 px-3 py-1.5 text-sm font-medium text-gold-light hover:bg-gold/25 disabled:opacity-50"
                      >
                        {t.tesvik}
                      </button>
                    </>
                  )}
                  {k.telefon && (
                    <a
                      href={`tel:${k.telefon}`}
                      className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25"
                    >
                      {t.ara}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center">
        <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
          {t.anaSayfa}
        </Link>
      </p>
    </div>
  );
}
