"use client";

import { useState } from "react";

// KAMP PROVA SİMÜLATÖRÜ — gözlem ızgarası.
// Her sanal karakterin anlık durumu: persona, takım/grup, aldığı puan ortalaması,
// pusula sloganı, görevleri (başlık + yanıt + AYNA puanı). "Bu kişi olarak gir"
// → /giris?kod ile o karakterin gerçek ekranlarını yeni sekmede gezdirir.

export type SimGorev = {
  baslik: string;
  govde: string;
  durum: string;
  tur: string;
  puan: number | null;
  yorum: string | null;
  yanit: string | null;
  tarih: string;
};

export type SimKisiGozlem = {
  id: string;
  ad: string;
  takim: string | null;
  sehir: string | null;
  kod: string;
  kampAcik: boolean;
  personaKod: string | null;
  personaEtiket: string | null;
  slogan: string | null;
  ortalama: number | null;
  gorevler: SimGorev[];
};

const PERSONA_RENK: Record<string, string> = {
  A: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  "A+": "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  B: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  C: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
};

function saat(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function SimGozlem({ kisiler }: { kisiler: SimKisiGozlem[] }) {
  const [acik, setAcik] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-gold-light">👥 Karakterler ({kisiler.length})</h2>
        <span className="text-xs text-slate-500">Bir karta tıkla → görevlerini ve detayını gör</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {kisiler.map((k) => {
          const secili = acik === k.id;
          const renk = k.personaKod ? PERSONA_RENK[k.personaKod] ?? "" : "";
          const puanli = k.gorevler.filter((g) => g.puan !== null).length;
          return (
            <div
              key={k.id}
              className={`rounded-2xl bg-midnight-card/60 p-4 ring-1 backdrop-blur transition-colors ${
                secili ? "ring-gold/50" : "ring-royal/25"
              }`}
            >
              <button
                onClick={() => setAcik(secili ? null : k.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-slate-100">
                    {k.ad}
                    {k.personaKod && (
                      <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ring-1 ${renk}`}>
                        {k.personaKod}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {k.takim ?? "—"} · {k.sehir ?? "—"}
                    {k.kampAcik && <span className="ml-1 text-emerald-400">· kamp açık</span>}
                  </p>
                  {k.personaEtiket && (
                    <p className="mt-0.5 text-[0.7rem] text-slate-500">{k.personaEtiket}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {k.ortalama !== null && (
                    <p className="text-sm font-bold tabular-nums text-gold-light">{k.ortalama}</p>
                  )}
                  <p className="text-[0.65rem] text-slate-500">{puanli} görev</p>
                </div>
              </button>

              {k.slogan && (
                <p className="mt-2 truncate text-xs italic text-slate-400">“{k.slogan}”</p>
              )}

              <div className="mt-2 flex items-center gap-2">
                <a
                  href={`/giris?kod=${k.kod}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-royal/30 px-2.5 py-1 text-xs font-medium text-gold-light transition-colors hover:bg-royal/50"
                >
                  Bu kişi olarak gir →
                </a>
                <span className="font-mono text-xs tracking-widest text-slate-500">{k.kod}</span>
              </div>

              {secili && (
                <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                  {k.gorevler.length === 0 ? (
                    <p className="text-xs text-slate-500">Henüz görev üretilmedi.</p>
                  ) : (
                    k.gorevler.map((g, i) => (
                      <div key={i} className="rounded-lg bg-midnight-soft/50 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-200">{g.baslik}</p>
                          <span className="shrink-0 text-[0.65rem] text-slate-500">
                            {saat(g.tarih)} · {g.tur}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{g.govde}</p>
                        {g.yanit && (
                          <p className="mt-1.5 text-xs italic text-slate-300">↳ {g.yanit}</p>
                        )}
                        {g.puan !== null && (
                          <p className="mt-1 text-xs text-emerald-300">
                            AYNA: {g.puan}/10{g.yorum ? ` — ${g.yorum}` : ""}
                          </p>
                        )}
                        {g.puan === null && (
                          <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-amber-400/80">
                            {g.durum}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
