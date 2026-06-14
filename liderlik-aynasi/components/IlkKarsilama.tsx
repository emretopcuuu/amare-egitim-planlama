"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const ANAHTAR = "la_karsilama_v1";
const t = tr.karsilama;

// #1 İlk açılış mikro-turu: katılımcı ana sayfaya İLK kez geldiğinde AYNA
// kendini 3 ekranda tanıtır (tonu ilk saniyede kurar). Bir kez gösterilir
// (localStorage). Yalnız ana sayfada; admin/tam-ekran rotalarda çıkmaz.
export default function IlkKarsilama() {
  const pathname = usePathname();
  const [acik, setAcik] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (pathname !== "/") return;
    try {
      if (!localStorage.getItem(ANAHTAR)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAcik(true);
      }
    } catch {}
  }, [pathname]);

  function kapat() {
    try {
      localStorage.setItem(ANAHTAR, "1");
    } catch {}
    setAcik(false);
  }

  if (!acik) return null;
  const adim = t.adimlar[i];
  const son = i === t.adimlar.length - 1;
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-midnight/95 px-6 text-center backdrop-blur-md">
      <button
        onClick={kapat}
        className="absolute right-5 top-5 text-sm text-slate-500 hover:text-slate-300"
      >
        {t.atla}
      </button>
      <span className="text-6xl" aria-hidden>
        {adim.ikon}
      </span>
      <h2 className="prizma-serif ay-metin mt-5 text-3xl font-semibold">{adim.baslik}</h2>
      <p className="mt-3 max-w-sm text-base leading-relaxed text-slate-300">{adim.metin}</p>
      <div className="mt-6 flex gap-1.5">
        {t.adimlar.map((_, k) => (
          <span
            key={k}
            className={`h-2 rounded-full transition-all ${
              k === i ? "w-6 bg-gold" : "w-2 bg-white/25"
            }`}
          />
        ))}
      </div>
      <button
        onClick={() => {
          titret(10);
          if (son) kapat();
          else setI(i + 1);
        }}
        className="btn-kor parilti mt-8 h-14 w-full max-w-xs rounded-2xl text-lg font-bold"
      >
        {son ? t.basla : t.ileri}
      </button>
    </div>
  );
}
