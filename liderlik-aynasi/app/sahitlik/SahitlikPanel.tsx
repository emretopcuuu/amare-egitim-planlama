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
  haftaGorusme: number;
  haftaKota: number | null;
};

export default function SahitlikPanel({ kisiler }: { kisiler: Kisi[] }) {
  const [gonderilen, setGonderilen] = useState<Record<string, boolean>>({});
  const [alkislanan, setAlkislanan] = useState<Record<string, boolean>>({});
  const [mesgul, setMesgul] = useState<string | null>(null);

  async function durt(sahibi: string, tip: string) {
    setMesgul(sahibi + tip);
    try {
      const res = await fetch("/api/sahitlik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sahibi, tip }),
      });
      if (!res.ok) return;
      if (tip === "alkis") setAlkislanan((g) => ({ ...g, [sahibi]: true }));
      else setGonderilen((g) => ({ ...g, [sahibi]: true }));
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
            const alkislandi = alkislanan[k.sahibiId];
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
                {/* [Faz 9] Şahit Karnesi — haftalık kota gerçekleşmesi. */}
                {k.haftaKota != null && (
                  <div className="mt-2 rounded-xl bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center justify-between text-[0.7rem] text-slate-400">
                      <span>📞 Bu hafta görüşme</span>
                      <span className="font-semibold text-slate-200">
                        {k.haftaGorusme} / {k.haftaKota}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{
                          width: `${Math.min(100, Math.round((k.haftaGorusme / k.haftaKota) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
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
                  {/* [Faz 10] Şahit Alkışı — dürtme değil, tek dokunuşluk takdir. */}
                  {alkislandi ? (
                    <span className="text-sm font-medium text-gold-light">👏 Alkışlandı</span>
                  ) : (
                    <button
                      onClick={() => durt(k.sahibiId, "alkis")}
                      disabled={mesgul !== null}
                      className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      👏 Alkışla
                    </button>
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
