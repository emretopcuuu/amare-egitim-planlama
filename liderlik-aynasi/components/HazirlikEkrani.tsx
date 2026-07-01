"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import AynaIkon from "@/components/AynaIkon";

const t = tr.hazirlik;

// KUTSAL ALAN / HAZIRLIK — onboarding'in EN BAŞI. İki iş yapar:
// (1) tonu kurar: bu sıradan bir form değil; yalnız, sakin, ~1 saat ayrılan,
//     çok değerli bir koçluk/mentorluk seansı gibi bir öz-yolculuk.
// (2) KVKK rızasını kayıtla alır (consent_at) — rıza yoksa hiçbir veri toplayan
//     adım açılmaz. Onay verilince /api/hazirlik consent_at'i yazar.
export default function HazirlikEkrani({ ad }: { ad: string }) {
  const router = useRouter();
  const [onay, setOnay] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState(false);

  async function basla() {
    if (!onay || gonderiliyor) return;
    setGonderiliyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/hazirlik", { method: "POST" });
      if (!res.ok) {
        setHata(true);
        return;
      }
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setGonderiliyor(false);
    }
  }

  const ilkAd = ad.split(" ")[0];

  return (
    <main className="relative flex min-h-dvh flex-col overflow-y-auto bg-[#06121e]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
        {/* Marka anı — sakin, kutsal açılış */}
        <div className="mb-6 flex justify-center">
          <AynaIkon className="h-16 w-16 text-gold" />
        </div>

        <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
          {t.ust}
        </p>
        <h1 className="prizma-serif ay-metin mt-3 text-center text-3xl font-bold leading-tight sm:text-4xl">
          {t.baslik(ilkAd)}
        </h1>

        <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate-300">
          <p>{t.giris}</p>
          <p className="rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-base text-gold-light">
            {t.deger}
          </p>
        </div>

        {/* Hazırlık koşulları — tonu somutlaştırır */}
        <div className="mt-6 space-y-3">
          {t.kosullar.map((k) => (
            <div key={k.baslik} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4">
              <span className="text-2xl leading-none" aria-hidden>
                {k.ikon}
              </span>
              <div>
                <p className="font-semibold text-slate-100">{k.baslik}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{k.metin}</p>
              </div>
            </div>
          ))}
        </div>

        {/* KVKK rızası — kayıtlı, açık onay */}
        <div className="mt-7 rounded-2xl border border-royal/30 bg-white/[0.02] p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={onay}
              onChange={(e) => {
                setOnay(e.target.checked);
                setHata(false);
              }}
              className="mt-1 h-5 w-5 shrink-0 accent-gold"
            />
            <span className="text-sm leading-relaxed text-slate-300">
              {t.kvkkOnay}{" "}
              <Link href="/gizlilik" className="font-semibold text-gold-light underline underline-offset-2">
                {t.kvkkLink}
              </Link>
              {t.kvkkSon}
            </span>
          </label>
        </div>

        {hata && (
          <p role="alert" className="mt-3 text-center text-sm font-medium text-amber-300">
            {t.hata}
          </p>
        )}

        <button
          onClick={basla}
          disabled={!onay || gonderiliyor}
          className="btn-kor parilti mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold transition-opacity disabled:opacity-40"
        >
          {gonderiliyor ? t.basliyor : t.dugme}
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">{t.dipnot}</p>
      </div>
    </main>
  );
}
