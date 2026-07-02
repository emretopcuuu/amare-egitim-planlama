"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.ux.tazelik;

// #2 Canlı tazelik göstergesi: admin ekrandaki rakamın taze mi bayat mı
// olduğunu bir bakışta bilsin. Otomatik yeniler ama "X sn önce güncellendi"
// gösterir, duraklatılabilir ve elle yenilenebilir. Sekme arka plandayken
// otomatik yenileme durur (gereksiz istek yok).
export default function OtoYenile({ saniye = 25 }: { saniye?: number }) {
  const router = useRouter();
  const [duraklat, setDuraklat] = useState(false);
  const [gecen, setGecen] = useState(0);
  const [atim, setAtim] = useState(false);
  const sonRef = useRef(0);

  const yenile = useCallback(() => {
    // eslint-disable-next-line react-hooks/purity
    sonRef.current = Date.now();
    setGecen(0);
    setAtim(true);
    setTimeout(() => setAtim(false), 600);
    router.refresh();
  }, [router]);

  // İlk yükleme anını mount'ta kaydet (render sırasında Date.now() çağırma)
  useEffect(() => {
    sonRef.current = Date.now();
  }, []);

  // Otomatik yenileme döngüsü (duraklatılmadıysa + sekme görünürken)
  useEffect(() => {
    if (duraklat) return;
    const i = setInterval(() => {
      if (document.visibilityState === "visible") yenile();
    }, saniye * 1000);
    return () => clearInterval(i);
  }, [duraklat, saniye, yenile]);

  // "X sn önce" sayacı: her saniye tazelenir
  useEffect(() => {
    const i = setInterval(() => {
      if (sonRef.current > 0) setGecen(Math.floor((Date.now() - sonRef.current) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const gecenMetin =
    gecen < 5 ? t.azOnce : gecen < 60 ? t.snOnce(gecen) : t.dkOnce(Math.floor(gecen / 60));

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`inline-flex items-center gap-1.5 font-medium ${
          duraklat ? "text-slate-400" : "text-emerald-400"
        }`}
        title={duraklat ? t.duraklatildi : t.canli}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            duraklat
              ? "bg-slate-500"
              : `bg-emerald-400 ${atim ? "scale-150" : "animate-pulse"} transition-transform`
          }`}
        />
        {/* [ADMIN-UX10] Tazelik etiketi mobilde de görünür — kamp anında "bu sayı şimdiki mi?" güvensizliği bitsin. */}
        <span>{duraklat ? t.duraklatildi : gecenMetin}</span>
      </span>
      <button
        onClick={yenile}
        className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-midnight-card hover:text-slate-200"
        title={t.yenile}
        aria-label={t.yenile}
      >
        ↻
      </button>
      <button
        onClick={() => setDuraklat((d) => !d)}
        className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-midnight-card hover:text-slate-200"
        title={duraklat ? t.surdur : t.duraklat}
        aria-label={duraklat ? t.surdur : t.duraklat}
      >
        {duraklat ? "▶" : "⏸"}
      </button>
    </div>
  );
}
