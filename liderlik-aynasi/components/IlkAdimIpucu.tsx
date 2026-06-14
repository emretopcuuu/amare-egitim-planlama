"use client";

import { useEffect, useState } from "react";

// #3 İlk 60 saniye — rehberli ilk akış: aday henüz hiç kendini puanlamadıysa,
// birincil eyleme doğru nazik bir "👆 buradan başla" canlı işareti gösterir.
// İlk öz-puandan sonra (la_oz_puan_verildi) bir daha asla çıkmaz; yani yalnız
// gerçekten ilk adımda yol gösterir, sonra ortadan kaybolur (gürültü yok).
export default function IlkAdimIpucu({ etiket }: { etiket: string }) {
  const [goster, setGoster] = useState(false);

  useEffect(() => {
    try {
      // localStorage yalnız istemcide; ilk-adım kararı mount'ta bir kez verilir.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem("la_oz_puan_verildi") !== "1") setGoster(true);
    } catch {
      // depolama kapalı: işareti atla
    }
  }, []);

  if (!goster) return null;

  return (
    <p className="flex items-center justify-center gap-2 text-base font-semibold text-gold-light">
      <span className="rehber-el text-2xl" aria-hidden>
        👆
      </span>
      {etiket}
    </p>
  );
}
