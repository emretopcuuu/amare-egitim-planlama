"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// FAZ 9.4 — KUMANDA kontrolleri: bekleyen satırlar için "şimdi ateşle" / "atla";
// üstte tüm bekleyenleri öteleyen "+15 dk" ve DURDUR/DEVAM.
export function SenaryoUstKontrol({ durduruldu, kaydirmaDk }: { durduruldu: boolean; kaydirmaDk: number }) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState(false);

  async function gonder(islem: string, dakika?: number) {
    if (mesgul) return;
    setMesgul(true);
    try {
      await fetch("/api/admin/senaryo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ islem, dakika }),
      });
      router.refresh();
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => void gonder(durduruldu ? "devam" : "durdur")}
        disabled={mesgul}
        className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40 ${
          durduruldu ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
        }`}
      >
        {durduruldu ? "▶ Devam" : "⏸ Durdur"}
      </button>
      <button
        onClick={() => void gonder("kaydir", 15)}
        disabled={mesgul}
        className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 disabled:opacity-40"
      >
        +15 dk kaydır
      </button>
      {kaydirmaDk !== 0 && (
        <span className="text-xs text-amber-300">Toplam öteleme: {kaydirmaDk} dk</span>
      )}
      {durduruldu && <span className="text-xs text-rose-300">Orkestratör durduruldu</span>}
    </div>
  );
}

export function SenaryoSatirKontrol({ id, yenidenDene = false }: { id: string; yenidenDene?: boolean }) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState(false);

  async function gonder(islem: string) {
    if (mesgul) return;
    setMesgul(true);
    setHata(false);
    try {
      const r = await fetch("/api/admin/senaryo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ islem, id }),
      });
      if (!r.ok) setHata(true);
      router.refresh();
    } finally {
      setMesgul(false);
    }
  }

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {hata && <span className="text-xs font-medium text-rose-300">tekrar başarısız</span>}
      <button
        onClick={() => void gonder("atesle")}
        disabled={mesgul}
        className={`rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-40 ${
          yenidenDene ? "bg-rose-500/20 text-rose-200" : "bg-gold/20 text-gold-light"
        }`}
      >
        {yenidenDene ? "↻ yeniden dene" : "şimdi ateşle"}
      </button>
      {!yenidenDene && (
        <button
          onClick={() => void gonder("atla")}
          disabled={mesgul}
          className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-300 disabled:opacity-40"
        >
          atla
        </button>
      )}
    </span>
  );
}
