"use client";

import { useEffect, useState } from "react";

// Aday UX #9 — İlk kez değerlendirme mini-turu. Wizard'ın başında bir kez
// çıkan 3 maddelik kart: nasıl puanlanır, yorum ne zaman gerekir, neye bak.
// Kapatılınca bir daha çıkmaz (localStorage).
const ANAHTAR = "la_puanlama_turu_v1";

const ADIMLAR = [
  { ikon: "👆", ad: "Büyük butonlarla 1–10 arası puan ver — seçince kendiliğinden sıradakine geçer." },
  { ikon: "✍️", ad: "6’nın altında puan verirsen kısa bir yorum istenir (yapıcı, davranışa dair)." },
  { ikon: "🔎", ad: "Her özellikte “ne gözlemle” ipucu var — puanı ona göre düşün." },
];

export default function PuanlamaTuru() {
  const [goster, setGoster] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(ANAHTAR)) setGoster(true);
    } catch {}
  }, []);

  if (!goster) return null;

  return (
    <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
      <p className="text-sm font-bold text-gold-light">👋 İlk kez mi puanlıyorsun? 3 adımda:</p>
      <ul className="mt-2 space-y-1.5">
        {ADIMLAR.map((a) => (
          <li key={a.ad} className="flex gap-2 text-sm leading-relaxed text-slate-200">
            <span aria-hidden>{a.ikon}</span>
            <span>{a.ad}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          try {
            localStorage.setItem(ANAHTAR, "1");
          } catch {}
          setGoster(false);
        }}
        className="mt-3 w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light"
      >
        Anladım, başlayalım
      </button>
    </div>
  );
}
