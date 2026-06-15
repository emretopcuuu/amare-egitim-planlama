"use client";

import { useEffect, useState } from "react";

// #1 Görev geri sayım halkası: teslim saatine canlı sayar; yaklaştıkça
// yeşil → amber → kırmızı. Kaygı yaratmadan nazik aciliyet.
export default function GorevSayac({
  baslangic,
  bitis,
}: {
  baslangic: string;
  bitis: string;
}) {
  const [simdi, setSimdi] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const bas = new Date(baslangic).getTime();
  const son = new Date(bitis).getTime();
  const kalan = son - simdi;
  const toplam = Math.max(1, son - bas);
  const oran = Math.max(0, Math.min(1, kalan / toplam)); // 1 → 0
  const gecti = kalan <= 0;

  const dk = Math.floor(kalan / 60000);
  const metin = gecti
    ? "Süre doldu"
    : dk >= 60
      ? `${Math.floor(dk / 60)}s ${dk % 60}dk`
      : `${Math.floor(kalan / 60000)}:${String(Math.floor((kalan % 60000) / 1000)).padStart(2, "0")}`;

  const renk = gecti ? "#ef4444" : oran < 0.25 ? "#f59e0b" : "#34d399";
  const r = 9;
  const cevre = 2 * Math.PI * r;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: renk }}>
      <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90" aria-hidden>
        <circle cx="11" cy="11" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
        <circle
          cx="11"
          cy="11"
          r={r}
          fill="none"
          stroke={renk}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={cevre}
          strokeDashoffset={cevre * (1 - oran)}
        />
      </svg>
      {metin}
    </span>
  );
}
