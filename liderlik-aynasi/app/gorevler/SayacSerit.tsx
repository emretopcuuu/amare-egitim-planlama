"use client";

import { useEffect, useState } from "react";

// UX #6 — Sayaç entegrasyonu. Köşedeki halka yerine kartın ÜST KENARINDA boşalan
// ince şerit: kaygı değil, nazik bir "zaman akıyor" hissi. Başlanmışsa (sakin)
// amber, son çeyrekte uyarı tonu, süre dolunca soluk.
export default function SayacSerit({
  baslangic,
  bitis,
  sakin = false,
}: {
  baslangic: string;
  bitis: string;
  sakin?: boolean;
}) {
  // GorevSayac ile aynı desen: lazy init + saniyelik interval.
  const [simdi, setSimdi] = useState(() => new Date().getTime());
  useEffect(() => {
    const id = setInterval(() => setSimdi(new Date().getTime()), 1000);
    return () => clearInterval(id);
  }, []);

  const bas = new Date(baslangic).getTime();
  const son = new Date(bitis).getTime();
  const toplam = Math.max(1, son - bas);
  const kalan = son - simdi;
  const oran = Math.max(0, Math.min(1, kalan / toplam));
  const gecti = kalan <= 0;

  const renk = gecti
    ? "bg-slate-600"
    : sakin
      ? "bg-amber-400/80"
      : oran < 0.25
        ? "bg-amber-400"
        : "bg-emerald-400/80";

  return (
    <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl bg-white/5" aria-hidden>
      <div
        className={`h-full rounded-t-2xl transition-[width] duration-1000 ease-linear ${renk}`}
        style={{ width: `${oran * 100}%` }}
      />
    </div>
  );
}
