"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// EPIC MEANING katmanı: kampta verilen HER PUAN, salon perdesinde bir
// yıldız doğurur. Bireysel çaba → kolektif gökyüzü. Sayı arttıkça üst
// bölgede kısa ömürlü ✦ parçacıkları belirir; toplam sayaç hep görünür.

type Parcacik = { id: number; x: number; y: number; gecikmeMs: number };

export default function EpicYildizlar({ toplam }: { toplam: number }) {
  const onceki = useRef<number | null>(null);
  const sayac = useRef(0);
  const [parcaciklar, setParcaciklar] = useState<Parcacik[]>([]);

  useEffect(() => {
    if (onceki.current === null) {
      onceki.current = toplam; // ilk yüklemede patlama yok
      return;
    }
    const artis = toplam - onceki.current;
    onceki.current = toplam;
    if (artis <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const yeniler: Parcacik[] = Array.from(
      { length: Math.min(artis, 12) },
      (_, i) => ({
        id: ++sayac.current,
        x: 4 + Math.random() * 92,
        y: 4 + Math.random() * 38,
        gecikmeMs: i * 120,
      })
    );
    // yoklama döngüsünden gelen artış: kısa ömürlü parçacıklar eklenir,
    // animasyon bitince kendi kendini temizler
    setParcaciklar((eski) => [...eski.slice(-24), ...yeniler]);
  }, [toplam]);

  return (
    <>
      <p className="text-xl text-gold-light" aria-live="polite">
        🌌 {tr.ekran.yildizSatiri(toplam)}
      </p>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-10">
        {parcaciklar.map((p) => (
          <span
            key={p.id}
            onAnimationEnd={() =>
              setParcaciklar((eski) => eski.filter((e) => e.id !== p.id))
            }
            className="yildiz-dogus absolute text-3xl text-gold-light"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDelay: `${p.gecikmeMs}ms`,
            }}
          >
            ✦
          </span>
        ))}
      </div>
    </>
  );
}
