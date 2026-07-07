"use client";

import { useEffect, useState } from "react";
import { sesCal } from "@/lib/sesEfekti";

// Kısa altın kıvılcım patlaması — bir başarı anında (hedef mühürlendi, görev
// tamam) ekran ortasından dışa saçılır ve söner. `tetik` her arttığında bir kez
// oynar. prefers-reduced-motion'da CSS tarafında sessizleşir.
export default function KivilcimPatlama({ tetik }: { tetik: number }) {
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    if (tetik === 0) return;
    setGorunur(true);
    sesCal("kivilcim");
    const z = setTimeout(() => setGorunur(false), 950);
    return () => clearTimeout(z);
  }, [tetik]);

  if (!gorunur) return null;
  const N = 14;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
    >
      {Array.from({ length: N }).map((_, i) => (
        <span
          key={i}
          className="kivilcim-parca"
          style={{
            // her parça farklı açıya saçılır
            ["--aci" as string]: `${(360 / N) * i}deg`,
            ["--uzaklik" as string]: `${90 + (i % 3) * 28}px`,
            animationDelay: `${i * 7}ms`,
          }}
        />
      ))}
    </div>
  );
}
