"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.gorevler;

// D1 — PERDE PERDE AÇILIŞ. Görev gövdesi tek duvar metin olarak düşmesin:
// ilk 1-2 satır (hikâye/açılış) her zaman görünür; uzun devamı "Devamını gör"
// ile açılır. Kısa gövdelerde (≤4 dolu satır) katlama yok — olduğu gibi akar.
export default function GovdeAcilis({ metin }: { metin: string }) {
  const [acik, setAcik] = useState(false);

  const satirlar = metin.split("\n");
  const doluIndeksler: number[] = [];
  satirlar.forEach((s, i) => {
    if (s.trim()) doluIndeksler.push(i);
  });

  // Kısa gövde: katlamaya gerek yok.
  if (doluIndeksler.length <= 4) {
    return (
      <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-100">
        {metin}
      </p>
    );
  }

  // İlk 2 dolu satır açılış; gerisi perde arkasında bekler.
  const kesim = doluIndeksler[1] + 1;
  const acilis = satirlar.slice(0, kesim).join("\n");
  const kalan = satirlar.slice(kesim).join("\n").replace(/^\n+/, "");

  return (
    <div className="mt-3">
      <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-100">{acilis}</p>
      {acik && (
        <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-slate-100">
          {kalan}
        </p>
      )}
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        className="mt-1 flex min-h-[44px] w-full items-center justify-center gap-1 text-sm font-medium text-gold-light/90 transition-colors hover:text-gold-light"
      >
        {acik ? t.devaminiGizle : t.devaminiGor}
        <span className={`transition-transform ${acik ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
    </div>
  );
}
