"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { titret } from "@/lib/his";
import { tr } from "@/lib/i18n/tr";

const t = tr.sahitDavet;

export type Davet = {
  sahibiId: string;
  ad: string;
  sozMetni: string | null;
  ilkAksiyon: string | null;
};

// BENİ ŞAHİT GÖSTERENLER — bir söz sahibi seni şahit gösterince (davet), burada
// KABUL/RET edersin. Kabul → gerçek şahit olursun; reddedersen sahibi yerine
// başka birini seçer. Neyi kabul ettiğini açıklayan kart + söz önizlemesi ile.
export default function SahitDavetleri({ davetler }: { davetler: Davet[] }) {
  const router = useRouter();
  const [liste, setListe] = useState<Davet[]>(davetler);
  const [mesgul, setMesgul] = useState<string | null>(null);
  // Reddet'te kaza olmasın: önce "emin misin?" adımı.
  const [retOnay, setRetOnay] = useState<string | null>(null);

  if (liste.length === 0) return null;

  async function yanitla(sahibiId: string, karar: "kabul" | "ret") {
    if (mesgul) return;
    setMesgul(sahibiId);
    try {
      const res = await fetch("/api/soz-v2", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(karar === "kabul" ? { kabul: sahibiId } : { ret: sahibiId }),
      });
      if (res.ok) {
        titret(karar === "kabul" ? [12, 40, 12] : 8);
        setListe((l) => l.filter((d) => d.sahibiId !== sahibiId));
        router.refresh();
      }
    } catch {
      // sessiz — kart kalır, tekrar denenebilir
    } finally {
      setMesgul(null);
      setRetOnay(null);
    }
  }

  return (
    <section className="space-y-3">
      <p className="px-1 text-sm font-bold text-gold-light">
        🤝 {t.baslik}
        <span className="ml-1.5 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold-light">
          {liste.length}
        </span>
      </p>
      {liste.map((d) => {
        const ilkAd = d.ad.split(" ")[0];
        const bu = mesgul === d.sahibiId;
        return (
          <div
            key={d.sahibiId}
            className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.10] to-midnight-card/60 p-5 shadow-lg"
          >
            <p className="text-base font-semibold text-slate-100">
              <span className="text-gold-light">{d.ad}</span> {t.gosterdi}
            </p>

            {/* NEYİ KABUL EDİYORSUN — açıklama kartı */}
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t.aciklamaBaslik}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{t.aciklama(ilkAd)}</p>
            </div>

            {/* Söz önizlemesi — neye şahit olduğunu göster */}
            {d.sozMetni && (
              <div className="mt-2.5 rounded-xl border border-royal-light/20 bg-midnight-soft/60 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-royal-light">
                  {t.sozBaslik(ilkAd)}
                </p>
                <p className="mt-1.5 line-clamp-4 font-serif text-sm italic leading-relaxed text-slate-200">
                  &ldquo;{d.sozMetni}&rdquo;
                </p>
              </div>
            )}

            {retOnay === d.sahibiId ? (
              <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/[0.08] p-3.5">
                <p className="text-sm text-amber-200">{t.retOnay(ilkAd)}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => void yanitla(d.sahibiId, "ret")}
                    disabled={bu}
                    className="flex-1 rounded-xl border border-amber-400/50 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
                  >
                    {bu ? "…" : t.retEvet}
                  </button>
                  <button
                    onClick={() => setRetOnay(null)}
                    disabled={bu}
                    className="flex-1 rounded-xl bg-white/[0.06] py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
                  >
                    {t.retVazgec}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => void yanitla(d.sahibiId, "kabul")}
                  disabled={bu}
                  className="btn-kor parilti flex h-12 flex-1 items-center justify-center rounded-2xl text-base font-bold disabled:opacity-50"
                >
                  {bu ? t.gonderiliyor : t.kabul}
                </button>
                <button
                  onClick={() => setRetOnay(d.sahibiId)}
                  disabled={bu}
                  className="h-12 shrink-0 rounded-2xl border border-white/15 px-5 text-sm font-semibold text-slate-400 transition-colors hover:border-white/30 hover:text-slate-200 disabled:opacity-50"
                >
                  {t.reddet}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
