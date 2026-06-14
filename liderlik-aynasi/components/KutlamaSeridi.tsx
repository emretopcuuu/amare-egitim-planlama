"use client";

import { useEffect, useState } from "react";
import Konfeti from "@/components/Konfeti";

// #7 Kutlama mikro-anı: konfeti + kişiye İSİMLE seslenen kısa bir kutlama
// şeridi. Tamamlama anlarını tutarlı, sıcak ve kişisel kılar. Banner ~3.2 sn
// sonra kendiliğinden solar; konfeti zaten kendini temizler. `anahtar` ile
// oturumda yalnız bir kez patlar.
export default function KutlamaSeridi({
  ad,
  mesaj,
  anahtar,
}: {
  ad: string;
  mesaj: string;
  anahtar?: string;
}) {
  const [gorunur, setGorunur] = useState(true);
  const ilkAd = ad.split(" ")[0];

  useEffect(() => {
    const z = setTimeout(() => setGorunur(false), 3200);
    return () => clearTimeout(z);
  }, []);

  return (
    <>
      <Konfeti anahtar={anahtar} />
      {gorunur && (
        <div
          role="status"
          aria-live="polite"
          className="kutlama-serit pointer-events-none fixed inset-x-0 top-4 z-[56] flex justify-center px-4"
        >
          <p className="rounded-2xl border border-gold/40 bg-midnight-card/95 px-5 py-3 text-center text-lg font-bold text-gold-light shadow-xl backdrop-blur">
            🎉 {`Aferin, ${ilkAd}!`} <span className="text-slate-200">{mesaj}</span>
          </p>
        </div>
      )}
    </>
  );
}
