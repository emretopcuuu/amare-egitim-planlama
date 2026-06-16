"use client";

import { useMemo, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import type { ElmasSonuc, AltSkor } from "@/lib/elmasSkoru";

const t = tr.admin.elmas;

const ALT_ETIKET: { kod: keyof AltSkor; ad: string }[] = [
  { kod: "k3", ad: t.altK3 },
  { kod: "mini360", ad: t.altMini360 },
  { kod: "k5", ad: t.altK5 },
  { kod: "k2", ad: t.altK2 },
  { kod: "k1", ad: t.altK1 },
];

const RITIM_AD: Record<string, string> = { duzenli: "düzenli", patlayan: "patlayan", belirsiz: "belirsiz" };

function AltBar({ ad, deger }: { ad: string; deger: number | null }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate text-[0.6rem] uppercase tracking-wide text-slate-500">{ad}</span>
        <span className="text-[0.65rem] font-semibold text-slate-300">{deger === null ? "—" : Math.round(deger)}</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        {deger !== null && (
          <div
            className="h-full rounded-full bg-gradient-to-r from-royal to-gold"
            style={{ width: `${Math.max(2, deger)}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default function ElmasListe({ sonuclar, takimlar }: { sonuclar: ElmasSonuc[]; takimlar: string[] }) {
  const [takim, setTakim] = useState<string>("");
  const [yalnizAday, setYalnizAday] = useState(false);

  const gosterilen = useMemo(
    () =>
      sonuclar.filter(
        (s) => (!takim || s.takim === takim) && (!yalnizAday || s.aday)
      ),
    [sonuclar, takim, yalnizAday]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={takim}
          onChange={(e) => setTakim(e.target.value)}
          className="rounded-lg border border-white/15 bg-midnight-card px-3 py-2 text-sm text-slate-200"
        >
          <option value="">{t.tumTakimlar}</option>
          {takimlar.map((tk) => (
            <option key={tk} value={tk}>
              {tk}
            </option>
          ))}
        </select>
        <button
          onClick={() => setYalnizAday((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            yalnizAday
              ? "border-gold/50 bg-gold/15 text-gold-light"
              : "border-white/15 text-slate-300 hover:bg-white/[0.05]"
          }`}
        >
          💎 {t.yalnizAday}
        </button>
        <span className="ml-auto text-xs text-slate-500">{t.kayitSayisi(gosterilen.length)}</span>
      </div>

      <ol className="space-y-2.5">
        {gosterilen.map((s, i) => (
          <li
            key={s.pid}
            className={`rounded-2xl border p-4 ${
              s.aday ? "border-gold/40 bg-gold/[0.05]" : "border-white/10 bg-midnight-card/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 shrink-0 text-center text-sm font-bold text-slate-500">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate font-semibold text-slate-100">{s.ad}</span>
                  {s.takim && <span className="text-xs text-slate-500">{s.takim}</span>}
                  {s.aday && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-gold-light">
                      💎 {t.adayRozet}
                    </span>
                  )}
                  {!s.puanlandi && (
                    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[0.6rem] font-medium text-slate-400">
                      {t.veriYokRozet}
                    </span>
                  )}
                  {s.korNoktaFarki !== null && s.korNoktaFarki > 1 && (
                    <span
                      className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6rem] font-medium text-amber-300"
                      title={t.korNoktaIpucu}
                    >
                      ⚠️ {t.korNoktaRozet(s.korNoktaFarki)}
                    </span>
                  )}
                </div>
                {s.puanlandi && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.65rem] text-slate-500">
                    {s.ritim && <span>ritim: {RITIM_AD[s.ritim] ?? s.ritim}</span>}
                    <span>{t.disEtiket(s.disSayi)}</span>
                    <span>{t.tamlikEtiket(Math.round(s.veriTamlik * 100))}</span>
                    {s.carpan < 1 && <span className="text-amber-400/80">×{s.carpan.toFixed(2)}</span>}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className={`text-2xl font-bold ${s.aday ? "text-gold-light" : "text-slate-200"}`}>
                  {s.puanlandi ? s.elmas : "—"}
                </span>
                {s.puanlandi && s.carpan < 1 && (
                  <span className="block text-[0.6rem] text-slate-500">{t.hamEtiket(s.ham)}</span>
                )}
              </div>
            </div>

            {s.puanlandi && (
              <div className="mt-3 grid grid-cols-5 gap-2 pl-10">
                {ALT_ETIKET.map((a) => (
                  <AltBar key={a.kod} ad={a.ad} deger={s.alt[a.kod]} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
