"use client";

import { useEffect, useState } from "react";

// UX #5 — Canlı süre rozeti. Aktif aşamanın açılışından bu yana geçen süre
// ("Dalga açılalı 25 dk") ya da kampa kalan süre ("Kampa 2g 4sa"). Operatör
// tempoyu hisseder. Her 30 sn'de bir kendini tazeler.
function bicim(ms: number): string {
  const dk = Math.floor(ms / 60000);
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dk`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa ${dk % 60} dk`;
  const gun = Math.floor(sa / 24);
  return `${gun}g ${sa % 24}sa`;
}

export default function CanliSayac({
  ts,
  etiket,
  mod,
}: {
  ts: string; // ISO referans zaman
  etiket: string; // "Dalga açılalı" / "Kampa"
  mod: "gecen" | "kalan";
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date().getTime());
    const i = setInterval(() => setNow(new Date().getTime()), 30000);
    return () => clearInterval(i);
  }, []);

  if (now === null) return null; // SSR/ilk render: hidrasyon uyumu
  const hedef = new Date(ts).getTime();
  const fark = mod === "gecen" ? now - hedef : hedef - now;
  if (fark < 0 && mod === "kalan") return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-royal-light/30 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-slate-300 tabular-nums">
      <span aria-hidden>⏱</span>
      {etiket} {bicim(Math.max(0, fark))}
    </span>
  );
}
