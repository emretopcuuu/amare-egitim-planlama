"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// #9 Canlı panel: admin sayfayı elle yenilemesin. Sekme görünürken belirli
// aralıkla router.refresh() ile sunucu verisini (sayaçlar, ilerleme, eksikler)
// sessizce tazeler. Sekme arka plandayken duraklar (gereksiz istek yok).
export default function OtoYenile({ saniye = 25 }: { saniye?: number }) {
  const router = useRouter();

  useEffect(() => {
    const i = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, saniye * 1000);
    return () => clearInterval(i);
  }, [router, saniye]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      Canlı · otomatik güncelleniyor
    </span>
  );
}
