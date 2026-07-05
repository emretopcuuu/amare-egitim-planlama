"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret, cal } from "@/lib/his";

const t = tr.gorevler;

// Özellik 2 — KİMLİK YÜZLEŞMESİ: kişinin her 10. puanlı görevinde, yanıt-sonrası
// ekranda özel kart: kendini sınırlayan cümlesi (tırnak içinde, büyük) + AYNA'nın
// biriktirdiği karşı-kanıtlar + "Bunu hâlâ söyleyebilir misin?". "Artık söyleyemem"
// → POST /api/kimlik-birak, cümle mühürlenir ve kart kapanır (lib/kimlik.ts).
export default function KimlikYuzlesme({
  veri,
}: {
  veri: { id: string; cumle: string; kanitlar: string[] };
}) {
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [birakildi, setBirakildi] = useState(false);

  async function birak() {
    if (gonderiliyor || birakildi) return;
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/kimlik-birak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: veri.id }),
      });
      if (res.ok) {
        titret([15, 40, 15, 40, 30]);
        cal("kazanim");
        setBirakildi(true);
      }
    } catch {
      /* sessiz — kart açık kalır, tekrar denenebilir */
    } finally {
      setGonderiliyor(false);
    }
  }

  if (birakildi) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3 text-center text-sm text-emerald-300">
        {t.kimlikBirakildi}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-gold/25 bg-gold/[0.05] p-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">
        {t.kimlikUst}
      </p>
      <p className="mt-2 text-lg font-semibold leading-snug text-slate-100">
        “{veri.cumle}”
      </p>
      <p className="mt-3 text-xs font-medium text-slate-400">{t.kimlikKanitBaslik}</p>
      <ul className="mt-1.5 space-y-1.5">
        {veri.kanitlar.map((kanit, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-emerald-200/90">
            <span aria-hidden className="mt-0.5">✓</span>
            <span>{kanit}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-medium text-slate-200">{t.kimlikSoru}</p>
      <button
        type="button"
        onClick={() => void birak()}
        disabled={gonderiliyor}
        className="bas-his mt-2.5 flex h-11 w-full items-center justify-center btn-3d rounded-xl bg-gold font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
      >
        {gonderiliyor ? t.kimlikBirakiliyor : t.kimlikBirak}
      </button>
    </div>
  );
}
