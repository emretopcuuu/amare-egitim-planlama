"use client";

import { useEffect, useState } from "react";

const DEPO = "la_admin_turu_v1";

// UX #7 — Panele ilk giren yönetici için tek seferlik kısa tur. Panelin
// haritasını verir: nerede ne var, nereden başlanır. Görülünce bir daha çıkmaz.
const KARTLAR = [
  {
    simge: "🧭",
    baslik: "Yönetim paneline hoş geldin",
    metin: "Burayı hiç bilmesen de yöneteceksin. Sana 4 adımda haritayı çıkarayım.",
  },
  {
    simge: "👉",
    baslik: "Önce: 'Şimdi ne yapmalıyım?'",
    metin: "Sayfanın en üstündeki altın kart her zaman sıradaki tek adımı söyler. Şüphedeysen ona bas.",
  },
  {
    simge: "🪜",
    baslik: "Sıra: Kamp Aşamaları",
    metin: "Üstteki şerit kampın neresinde olduğunu gösterir: Hazırlık → Katılım → Canlı → Final. Soldan sağa ilerlersin.",
  },
  {
    simge: "🗂",
    baslik: "Menüler: Hazırlık · Canlı · Final · Sistem",
    metin: "Üstteki 4 menü kampın aşamalarına göre bölünmüş. Hangi aşamadaysan o menüde çalış; soldan sağa ilerlersin.",
  },
];

export default function AdminTuru() {
  const [goster, setGoster] = useState(false);
  const [adim, setAdim] = useState(0);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(DEPO)) setGoster(true);
    } catch {}
  }, []);

  function kapat() {
    try {
      localStorage.setItem(DEPO, "1");
    } catch {}
    setGoster(false);
  }

  if (!goster) return null;
  const kart = KARTLAR[adim];
  const sonuncu = adim === KARTLAR.length - 1;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black/95">
      <div className="flex justify-end p-5">
        <button
          onClick={kapat}
          className="rounded-xl px-4 py-2 text-base text-slate-400 hover:text-slate-200"
        >
          Geç
        </button>
      </div>
      <div className="flex w-full flex-1 flex-col overflow-y-auto px-6 pb-8">
        <div className="mx-auto my-auto w-full max-w-md text-center">
          <p className="text-7xl">{kart.simge}</p>
          <h1 className="mt-6 text-3xl font-bold leading-tight text-gold">{kart.baslik}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{kart.metin}</p>
          <div className="mt-8 flex justify-center gap-2">
            {KARTLAR.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === adim ? "w-6 bg-gold" : "w-2 bg-white/25"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => (sonuncu ? kapat() : setAdim((a) => a + 1))}
            className="btn-kor mt-8 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold"
          >
            {sonuncu ? "Başlayalım" : "İleri"}
          </button>
        </div>
      </div>
    </div>
  );
}
