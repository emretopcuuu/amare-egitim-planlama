"use client";

import { useState } from "react";

// FAZ 1.3 — eşleşme dengeleyici: isimli/eşleşmeli bir görevi teslim eden
// kişiye tek dokunuşluk "Bu konuşma gerçek miydi?" 1-5 sorusu. Cevap eşleşme
// kalitesini ölçer ve FAZ 2+'da önceliklendirmeyi besler.
export default function GercekMiydiSoru({ gorevId }: { gorevId: string }) {
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [secilen, setSecilen] = useState<number | null>(null);

  async function gonder(puan: number) {
    if (gonderiliyor || secilen) return;
    setGonderiliyor(true);
    setSecilen(puan);
    try {
      await fetch("/api/gorev-eslesme-geri-bildirim", {
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
        Teşekkürler — not ettim.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-center text-sm font-medium text-slate-300">Bu konuşma gerçek miydi?</p>
      <div className="mt-2 flex items-center justify-center gap-2">
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
    </div>
  );
}
