"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret, cal } from "@/lib/his";
import { TRAIT_ADLARI, SORU_BANKASI } from "@/lib/aynaEsi";
import type { Gorusme } from "./page";

const t = tr.aynaEsi;

export default function AynaEsiKart({ gorusme }: { gorusme: Gorusme }) {
  const router = useRouter();
  const [tamam, setTamam] = useState(gorusme.benimTamam);
  const [mesgul, setMesgul] = useState(false);

  async function isaretle() {
    if (mesgul || tamam) return;
    setMesgul(true);
    setTamam(true); // optimistik
    titret([12, 40, 12]);
    cal("kazanim");
    try {
      const res = await fetch("/api/ayna-esi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: gorusme.id }),
      });
      if (!res.ok) {
        setTamam(false);
        return;
      }
      router.refresh();
    } catch {
      setTamam(false);
    } finally {
      setMesgul(false);
    }
  }

  const ogrenSorular = SORU_BANKASI[gorusme.ogrenTrait] ?? [];

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-royal-light">
          {t.turEtiket(gorusme.tur)}
        </span>
        <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold-light">
          {gorusme.slot}
        </span>
      </div>

      <h2 className="prizma-serif ay-metin mt-2 text-2xl font-semibold">{gorusme.esAd}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{t.farkliEkipNot}</p>

      {/* Ondan öğren: eşin güçlü olduğu konu + hazır sorular */}
      <div className="mt-4 rounded-xl border border-gold/25 bg-gold/[0.06] p-3">
        <p className="text-sm font-semibold text-gold-light">
          {t.ondanOgren(gorusme.esAd)} · {TRAIT_ADLARI[gorusme.ogrenTrait]}
        </p>
        <ul className="mt-2 space-y-1.5">
          {ogrenSorular.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-200">
              <span className="text-gold-light/70">—</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Sen anlat: senin güçlü olduğun konu (o sana soracak) */}
      <div className="mt-3 rounded-xl border border-royal-light/25 bg-white/[0.02] p-3">
        <p className="text-sm font-semibold text-slate-200">
          {t.sanaSoracak(gorusme.esAd)} · {TRAIT_ADLARI[gorusme.anlatTrait]}
        </p>
      </div>

      <p className="mt-3 text-xs text-slate-500">{t.yariMetin}</p>

      <button
        onClick={isaretle}
        disabled={tamam || mesgul}
        className={`mt-4 flex h-12 w-full items-center justify-center rounded-xl text-base font-bold transition-colors disabled:opacity-100 ${
          tamam ? "bg-emerald-500/15 text-emerald-300" : "btn-kor"
        }`}
      >
        {tamam ? t.konustuk : t.konustukYap}
      </button>
    </section>
  );
}
