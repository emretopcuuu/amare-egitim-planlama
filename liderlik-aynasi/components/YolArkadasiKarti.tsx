"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Aday = { id: string; ad: string };

// [B#19] YOL ARKADAŞI — kişi şahitleri arasından bir arkadaş seçer; ikisi de
// aynı gün adım atınca ortak alev büyür.
export default function YolArkadasiKarti({
  arkadas,
  alev,
  adaylar,
}: {
  arkadas: { id: string; ad: string } | null;
  alev: number;
  adaylar: Aday[];
}) {
  const router = useRouter();
  const [secim, setSecim] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  async function sec(id: string) {
    if (mesgul) return;
    setMesgul(true);
    try {
      const res = await fetch("/api/yol-arkadasi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ arkadasId: id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setMesgul(false);
      setSecim(false);
    }
  }

  async function kaldir() {
    if (mesgul) return;
    setMesgul(true);
    try {
      const res = await fetch("/api/yol-arkadasi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kaldir: true }),
      });
      if (res.ok) router.refresh();
    } finally {
      setMesgul(false);
    }
  }

  // Ne arkadaş var ne aday → gösterme.
  if (!arkadas && adaylar.length === 0) return null;

  const ilkAd = arkadas?.ad.split(" ")[0] ?? "";

  return (
    <section className="rounded-2xl border border-orange-400/25 bg-orange-500/[0.06] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-orange-300">🔥 Yol Arkadaşın</p>

      {arkadas && !secim ? (
        <>
          <p className="mt-1.5 text-sm text-slate-200">
            <span className="font-semibold text-orange-200">{ilkAd}</span> ile ortak aleviniz:{" "}
            <span className="font-bold text-orange-300">{alev} gün</span> {alev > 0 ? "🔥" : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {alev > 0
              ? "Aynı gün ikiniz de adım attıkça büyür. Birbirinizi taşıyın."
              : "İkiniz de bugün işaretleyince alev yanmaya başlar."}
          </p>
          <div className="mt-2 flex gap-3 text-xs">
            <button onClick={() => setSecim(true)} className="text-slate-400 hover:text-slate-200">
              Değiştir
            </button>
            <button onClick={() => void kaldir()} disabled={mesgul} className="text-slate-500 hover:text-rose-300">
              Kaldır
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-400">
            Şahitlerinden birini yol arkadaşı seç — beraber yürümek daha kolay.
          </p>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
            {adaylar.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => void sec(a.id)}
                  disabled={mesgul}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-slate-100 transition-colors hover:border-orange-400/40 disabled:opacity-50"
                >
                  <span>{a.ad}</span>
                  <span className="text-xs font-semibold text-orange-300">Seç</span>
                </button>
              </li>
            ))}
          </ul>
          {arkadas && (
            <button onClick={() => setSecim(false)} className="mt-2 text-xs text-slate-500 hover:text-slate-300">
              Vazgeç
            </button>
          )}
        </>
      )}
    </section>
  );
}
