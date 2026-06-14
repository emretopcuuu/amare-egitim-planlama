"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.gunesModu;
const DEPO = "la_gunes_modu";

// #8 Güneş modu: kamp açık alanda; güneş altında ekran zor okunur. Tek
// dokunuşla yüksek kontrast — soluk metinler parlar, kartlar katılaşır.
// Seçim cihazda saklanır; layout'taki inline script açılışta anında uygular.
function uygula(acik: boolean) {
  try {
    document.body.classList.toggle("gunes-modu", acik);
    localStorage.setItem(DEPO, acik ? "1" : "0");
  } catch {
    // depolama kapalı: yalnız bu oturum
    document.body.classList.toggle("gunes-modu", acik);
  }
}

export default function GunesModu() {
  const [acik, setAcik] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(DEPO) === "1") setAcik(true);
    } catch {
      // yok say
    }
  }, []);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <div>
        <p className="text-sm font-semibold text-slate-200">☀️ {t.baslik}</p>
        <p className="mt-0.5 text-xs text-slate-400">{t.aciklama}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={acik}
        onClick={() => {
          const yeni = !acik;
          setAcik(yeni);
          uygula(yeni);
        }}
        className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${
          acik ? "bg-gold" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${
            acik ? "left-8" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
