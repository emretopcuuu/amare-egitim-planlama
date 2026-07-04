"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.gorevler;

// Özellik 6 — ÇEKİRDEK NEDEN NABZI: her 5. puanlanan görevden sonra, görev
// sonucu ekranında tek dokunuşluk soru: "Bu görev seni '<çekirdek nedenin>'
// hedefine yaklaştırdı mı?" (1-5). Cevap /api/neden-nabiz ile göreve yazılır;
// düşen trend görev motorunu yön değiştirmeye zorlar (lib/ayna.ts).
export default function NedenNabzi({ gorevId, neden }: { gorevId: string; neden: string }) {
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [secilen, setSecilen] = useState<number | null>(null);

  async function gonder(puan: number) {
    if (gonderiliyor || secilen) return;
    setGonderiliyor(true);
    setSecilen(puan);
    try {
      await fetch("/api/neden-nabiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ missionId: gorevId, puan }),
      });
    } catch {
      /* sessiz — ölçüm kritik değil */
    } finally {
      setGonderiliyor(false);
    }
  }

  if (secilen) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3 text-center text-sm text-emerald-300">
        {t.nabizTesekkur}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-gold/25 bg-gold/[0.05] p-3 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">
        {t.nabizUst}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-200">{t.nabizSoru(neden)}</p>
      <div className="mt-2.5 flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => void gonder(n)}
            disabled={gonderiliyor}
            aria-label={`${n}/5`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-slate-200 transition-colors hover:bg-gold/30 disabled:opacity-40"
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1.5 flex justify-between text-[0.65rem] text-slate-500">
        <span>{t.nabizUzak}</span>
        <span>{t.nabizYakin}</span>
      </p>
    </div>
  );
}
