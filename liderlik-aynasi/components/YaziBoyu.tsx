"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.yaziBoyu;

// Kök font-size px değerleri: tüm rem ölçeği buna göre büyür.
// layout.tsx'teki FOUC önleyici inline script ile aynı eşleme kullanılır.
const BOYUTLAR = {
  kucuk: "15.5px",
  normal: "17.5px",
  buyuk: "19.5px",
} as const;

// Eski "cokBuyuk" değerini "buyuk"a düşür, yoksa "normal" kullan.
function normalizeBoyu(v: string | null): Boyu {
  if (v === "cokBuyuk") return "buyuk";
  if (v && v in BOYUTLAR) return v as Boyu;
  return "normal";
}

type Boyu = keyof typeof BOYUTLAR;
const DEPO = "la_yazi_boyu";

function uygula(boyu: Boyu) {
  try {
    document.documentElement.style.fontSize = BOYUTLAR[boyu];
    localStorage.setItem(DEPO, boyu);
  } catch {
    // depolama kapalı: yalnızca bu oturum için uygula
  }
}

export default function YaziBoyu() {
  const [boyu, setBoyu] = useState<Boyu>("normal");

  useEffect(() => {
    try {
      const kayitli = localStorage.getItem(DEPO);
      const normalized = normalizeBoyu(kayitli);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBoyu(normalized);
      // Eski "cokBuyuk" kayıtlı olanların fontunu da hemen düzelt
      document.documentElement.style.fontSize = BOYUTLAR[normalized];
    } catch {
      // yok say
    }
  }, []);

  const secenekler: { deger: Boyu; etiket: string; sinif: string }[] = [
    { deger: "kucuk",  etiket: t.kucuk,  sinif: "text-sm" },
    { deger: "normal", etiket: t.normal, sinif: "text-base" },
    { deger: "buyuk",  etiket: t.buyuk,  sinif: "text-lg" },
  ];

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <p className="text-center text-sm font-medium uppercase tracking-wide text-slate-400">
        {t.baslik}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {secenekler.map((s) => (
          <button
            key={s.deger}
            type="button"
            onClick={() => {
              setBoyu(s.deger);
              uygula(s.deger);
            }}
            aria-pressed={boyu === s.deger}
            className={`flex h-14 items-center justify-center rounded-xl font-bold transition-all ${s.sinif} ${
              boyu === s.deger
                ? "btn-kor scale-105"
                : "border-2 border-white/20 text-slate-200 hover:border-gold/60"
            }`}
          >
            A
          </button>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
        {secenekler.map((s) => (
          <span key={s.deger}>{s.etiket}</span>
        ))}
      </div>
    </div>
  );
}
