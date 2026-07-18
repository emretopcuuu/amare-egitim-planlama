"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret, cal } from "@/lib/his";

const t = tr.takdir;

// A8 — Zarf açılışı: /takdir?zarf=1 ile gelindiğinde (akşam push'u) günün
// takdirlerini mühürlü bir zarf olarak sunar; dokununca açılır ve "bugün N kişi
// seni gördü" ortaya çıkar. Param yoksa ya da bugün takdir yoksa hiç görünmez.
export default function ZarfAcilis({ sayi }: { sayi: number }) {
  const params = useSearchParams();
  const [acik, setAcik] = useState(false);
  const [goster, setGoster] = useState(false);

  useEffect(() => {
    setGoster(params.get("zarf") === "1" && sayi > 0);
  }, [params, sayi]);

  if (!goster) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (acik) return;
        titret([14, 40, 14]);
        cal("kazanim");
        setAcik(true);
      }}
      className={`w-full rounded-3xl border border-gold/40 bg-gradient-to-b from-gold/[0.12] to-transparent p-6 text-center transition-all ${
        acik ? "cursor-default" : "cursor-pointer hover:from-gold/20"
      }`}
    >
      {acik ? (
        <div className="space-y-1">
          <p className="text-4xl">💌</p>
          <p className="text-lg font-semibold text-gold-light">{t.zarfOzet(sayi)}</p>
          <p className="text-sm text-slate-300">{t.zarfBaslik}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-4xl">✉️</p>
          <p className="text-base font-semibold text-gold-light">{t.zarfBaslik}</p>
          <p className="text-sm text-slate-300">{t.zarfAc}</p>
        </div>
      )}
    </button>
  );
}
