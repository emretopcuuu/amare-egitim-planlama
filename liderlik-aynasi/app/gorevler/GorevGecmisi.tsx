"use client";

import { useMemo, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.gorevler;

const TUR_RENK: Record<string, string> = {
  gozlem: "bg-royal/30 text-royal-light",
  cesaret: "bg-orange-500/20 text-orange-300",
  yansima: "bg-emerald-500/20 text-emerald-300",
  gizli: "bg-fuchsia-500/20 text-fuchsia-300",
  tahmin: "bg-sky-500/20 text-sky-300",
  simulasyon: "bg-rose-500/20 text-rose-300",
  bag: "bg-teal-500/20 text-teal-300",
  soz: "bg-gold/20 text-gold-light",
};

export type GecmisGorev = {
  id: string;
  kind: string;
  title: string;
  status: string;
  ai_score: number | null;
  spark_points: number;
  ai_comment: string | null;
  scored_at: string | null;
  issued_at: string;
  trait_id: number | null;
  gozlem: string | null;
};

type Filtre = "tum" | "yuksek" | "kacan";

// A8 (filtre + özet) + A2 (liderlik kası) — görev geçmişi: gün gruplu zaman
// çizelgesi, üstte toplam/ortalama özet ve tümü/yüksek/kaçan filtresi.
export default function GorevGecmisi({
  gorevler,
  ozellikAd,
}: {
  gorevler: GecmisGorev[];
  ozellikAd: Record<number, string>;
}) {
  const [filtre, setFiltre] = useState<Filtre>("tum");

  // Özet: tamamlanan (scored) sayısı + ortalama puan + kaçan sayısı.
  const ozet = useMemo(() => {
    const scored = gorevler.filter((g) => g.status === "scored");
    const puanli = scored.filter((g) => typeof g.ai_score === "number");
    const ort =
      puanli.length > 0
        ? puanli.reduce((s, g) => s + (g.ai_score ?? 0), 0) / puanli.length
        : null;
    const kacan = gorevler.filter((g) => g.status === "expired").length;
    return { tamam: scored.length, ort, kacan };
  }, [gorevler]);

  const suzulmus = useMemo(() => {
    if (filtre === "yuksek")
      return gorevler.filter((g) => g.status === "scored" && (g.ai_score ?? 0) >= 8);
    if (filtre === "kacan") return gorevler.filter((g) => g.status === "expired");
    return gorevler;
  }, [gorevler, filtre]);

  const gruplar = useMemo(() => {
    const gunEtiket = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const gunAnahtar = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" });
    const out: { anahtar: string; etiket: string; gorevler: GecmisGorev[] }[] = [];
    for (const g of suzulmus) {
      const zaman = new Date(g.scored_at ?? g.issued_at);
      const anahtar = gunAnahtar.format(zaman);
      let grup = out.find((x) => x.anahtar === anahtar);
      if (!grup) {
        grup = { anahtar, etiket: gunEtiket.format(zaman), gorevler: [] };
        out.push(grup);
      }
      grup.gorevler.push(g);
    }
    return out;
  }, [suzulmus]);

  const cipler: { ad: Filtre; etiket: string }[] = [
    { ad: "tum", etiket: t.filtreTum },
    { ad: "yuksek", etiket: t.filtreYuksek },
    { ad: "kacan", etiket: t.filtreKacan },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gold-light">{t.gecmisBaslik}</h2>
        {ozet.tamam > 0 && (
          <p className="text-xs text-slate-400">
            {t.gecmisOzet(ozet.tamam, ozet.ort, ozet.kacan)}
          </p>
        )}
      </div>

      {gorevler.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{t.gecmisYok}</p>
      ) : (
        <>
          {/* Filtre çipleri */}
          <div className="mt-3 flex gap-1.5">
            {cipler.map((c) => (
              <button
                key={c.ad}
                type="button"
                onClick={() => setFiltre(c.ad)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filtre === c.ad
                    ? "border-gold/50 bg-gold/15 text-gold-light"
                    : "border-royal-light/25 text-slate-400 hover:text-slate-200"
                }`}
              >
                {c.etiket}
              </button>
            ))}
          </div>

          {gruplar.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t.filtreBos}</p>
          ) : (
            <div className="mt-4 space-y-6">
              {gruplar.map((grup) => (
                <div key={grup.anahtar}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {grup.etiket}
                  </p>
                  <ul className="relative space-y-3 border-l border-royal/25 pl-5">
                    {grup.gorevler.map((g) => (
                      <li key={g.id} className="relative">
                        <span
                          className={`absolute -left-[1.46rem] top-3 h-2.5 w-2.5 rounded-full ring-2 ring-midnight ${
                            g.status === "expired"
                              ? "bg-slate-600"
                              : (g.ai_score ?? 0) >= 8
                                ? "bg-gold"
                                : "bg-royal-light"
                          }`}
                          aria-hidden
                        />
                        <div
                          className={`kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 backdrop-blur ${
                            g.status === "expired" ? "opacity-60 ring-royal/20" : "ring-royal/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span
                              className={`rounded-md px-2 py-0.5 font-medium ${TUR_RENK[g.kind] ?? "text-slate-400"}`}
                            >
                              {t.turler[g.kind as keyof typeof t.turler] ?? g.kind}
                            </span>
                            {g.status === "scored" && g.ai_score !== null ? (
                              <span className="font-bold text-gold">
                                {t.puanin(g.ai_score)} · +{g.spark_points} ⚡
                              </span>
                            ) : g.status === "scored" ? (
                              <span className="font-bold text-gold">+{g.spark_points} ⚡</span>
                            ) : (
                              <span className="text-slate-500">
                                {t.durumlar[g.status as keyof typeof t.durumlar]}
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-slate-100">{g.title}</p>
                          {/* A2: çalıştırılan liderlik kası */}
                          {g.trait_id != null && ozellikAd[g.trait_id] && (
                            <p className="mt-1 text-xs text-royal-light/80">
                              💪 {ozellikAd[g.trait_id]}
                            </p>
                          )}
                          {g.ai_comment && (
                            <p className="mt-2 rounded-xl bg-midnight-soft p-3 text-sm italic text-slate-300">
                              “{g.ai_comment}”
                            </p>
                          )}
                          {g.gozlem && (
                            <p className="mt-2 rounded-xl border border-royal-light/25 bg-midnight/40 p-3 text-sm text-slate-200">
                              <span className="mr-1 text-xs font-semibold text-royal-light">
                                {t.tanikGelenEtiket}
                              </span>
                              “{g.gozlem}”
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
