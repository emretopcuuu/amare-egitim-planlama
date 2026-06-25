"use client";

import { useState } from "react";

// Aday UX #4 — Yapıcı yorum koçu. 6 altı puanda yorum zorunlu; bu kart
// "nasıl yazılır?" sorusunu yanıtlar: kişiyi değil davranışı, somut bir an,
// bir gelişim önerisi. Geri bildirim kırıcı değil yapıcı olsun.
const IPUCLARI = [
  "Kişiyi değil davranışı yaz — “sen böylesin” değil, “şu anda şöyle oldu”.",
  "Somut bir an ver — ne zaman, nerede gözlemledin?",
  "Bir gelişim önerisi ekle — “şöyle yaparsan daha da güçlü olur”.",
];

export default function YorumKocu() {
  const [acik, setAcik] = useState(false);

  return (
    <div className="mt-2 rounded-xl border border-royal-light/25 bg-royal/10 p-3">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-royal-light"
      >
        <span>💡 Yapıcı nasıl yazılır?</span>
        <span aria-hidden className={`transition-transform ${acik ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {acik && (
        <ul className="mt-2 space-y-1.5">
          {IPUCLARI.map((m) => (
            <li key={m} className="flex gap-2 text-sm leading-relaxed text-slate-200">
              <span aria-hidden className="mt-[0.15rem] text-royal-light">
                •
              </span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
