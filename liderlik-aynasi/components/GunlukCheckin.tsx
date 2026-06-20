"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.gunluk;

// #5 Günün Aynası: günde bir, "bugün hangi liderlik özelliğini yaşadın?" tek soru.
export default function GunlukCheckin({
  ozellikler,
  yapildi,
}: {
  ozellikler: { id: number; ad: string }[];
  yapildi: boolean;
}) {
  const router = useRouter();
  const [bitti, setBitti] = useState(yapildi);
  const [sec, setSec] = useState<number | null>(null);
  const [notu, setNotu] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  if (bitti) {
    return (
      <section className="kart-cam rounded-2xl p-4 text-center ring-1 ring-emerald-500/20">
        <p className="text-sm text-emerald-400">✓ {t.tamamMetin}</p>
      </section>
    );
  }

  async function gonder() {
    if (sec === null || mesgul) return;
    setMesgul(true);
    setHata(null);
    try {
      const res = await fetch("/api/gunluk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ traitId: sec, notu: notu.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      titret([10, 30, 10]);
      setBitti(true);
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setMesgul(false);
    }
  }

  return (
    <section className="kart-cam rounded-2xl p-5 ring-1 ring-gold/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-royal-light">
        🌅 {t.ust}
      </p>
      <h2 className="mt-1 text-lg font-bold text-gold-light">{t.soru}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {ozellikler.map((o) => (
          <button
            key={o.id}
            onClick={() => setSec(o.id)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              sec === o.id
                ? "bg-gold font-bold text-[#1a1206]"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {o.ad}
          </button>
        ))}
      </div>
      {sec !== null && (
        <>
          <input
            value={notu}
            onChange={(e) => setNotu(e.target.value)}
            maxLength={400}
            placeholder={t.notYer}
            className="mt-3 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
          />
          <button
            onClick={gonder}
            disabled={mesgul}
            className="btn-kor mt-3 h-11 w-full rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {mesgul ? t.gonderiliyor : t.gonder}
          </button>
        </>
      )}
      {hata && <p className="mt-2 text-sm text-red-400">{hata}</p>}
    </section>
  );
}
