"use client";

import { useState } from "react";

// FAZ 7.2 — süresi dolan görevin altında tek-dokunuş "neden?" — suçlama değil,
// bir sonraki görevi kişiye göre biçimlemek için. Cevap sessizce kaydedilir.
const SECENEKLER: { kod: string; etiket: string }[] = [
  { kod: "vakit", etiket: "⏰ Vakit yoktu" },
  { kod: "anlamadim", etiket: "🤔 Anlamadım" },
  { kod: "cekindim", etiket: "😬 Çekindim" },
  { kod: "ilgi_yok", etiket: "😐 İlgimi çekmedi" },
];

export default function NedenButonlari({ gorevId }: { gorevId: string }) {
  const [secilen, setSecilen] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function sec(kod: string) {
    if (gonderiliyor || secilen) return;
    setGonderiliyor(true);
    setSecilen(kod);
    try {
      await fetch("/api/gorev-neden", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId, sebep: kod }),
      });
    } catch {
      /* sessiz — yönlendirme sinyali, kritik değil */
    } finally {
      setGonderiliyor(false);
    }
  }

  if (secilen) {
    return (
      <p className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3 text-center text-sm text-emerald-300">
        Anladım — bir sonrakini sana göre ayarlayacağım.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-slate-400">Ne oldu? (tek dokunuş — sonrakini sana göre ayarlarım)</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {SECENEKLER.map((s) => (
          <button
            key={s.kod}
            onClick={() => void sec(s.kod)}
            disabled={gonderiliyor}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/[0.07] disabled:opacity-40"
          >
            {s.etiket}
          </button>
        ))}
      </div>
    </div>
  );
}
