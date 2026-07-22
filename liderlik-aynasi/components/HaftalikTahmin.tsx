"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// [C#27] HAFTALIK TAHMİN — Pazartesi hedefini gir, hafta boyunca ilerlemeni gör,
// Pazar gerçekle yüzleş. Baskı değil; kendi sözünle nazik bir hesaplaşma.
export default function HaftalikTahmin({
  tahmin,
  gorusme,
  pazarMi,
}: {
  tahmin: number | null;
  gorusme: number;
  pazarMi: boolean;
}) {
  const router = useRouter();
  const [deger, setDeger] = useState("");
  const [mesgul, setMesgul] = useState(false);

  async function kaydet() {
    const n = Number(deger);
    if (!Number.isFinite(n) || n < 0 || mesgul) return;
    setMesgul(true);
    try {
      const res = await fetch("/api/haftalik-tahmin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tahmin: n }),
      });
      if (res.ok) router.refresh();
    } finally {
      setMesgul(false);
    }
  }

  // Henüz tahmin yok → gir.
  if (tahmin == null) {
    return (
      <section className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-4">
        <p className="text-sm font-semibold text-gold-light">🎯 Bu haftanın tahmini</p>
        <p className="mt-1 text-xs text-slate-400">
          Bu hafta kaç görüşme yapacaksın? Kendi sözün — Pazar günü yüzleşeceğiz.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            inputMode="numeric"
            value={deger}
            onChange={(e) => setDeger(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Örn: 10"
            className="w-24 rounded-xl border border-white/15 bg-midnight-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-gold"
          />
          <button
            onClick={() => void kaydet()}
            disabled={mesgul || !deger}
            className="btn-kor flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {mesgul ? "…" : "Tahminimi ver"}
          </button>
        </div>
      </section>
    );
  }

  // Tahmin var → ilerleme / yüzleşme.
  const oran = tahmin > 0 ? Math.min(100, Math.round((gorusme / tahmin) * 100)) : 100;
  const tuttu = gorusme >= tahmin;
  return (
    <section className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-gold-light">🎯 Bu haftanın hedefi</span>
        <span className="text-slate-300">
          {gorusme} / {tahmin} görüşme
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-royal-light to-gold transition-all duration-700"
          style={{ width: `${oran}%` }}
        />
      </div>
      {pazarMi && (
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          {tuttu
            ? `🔥 Tahminin ${tahmin}'di, ${gorusme} yaptın — sözünü tuttun. İşte bu.`
            : `Tahminin ${tahmin}'di, ${gorusme} oldu. Yargılama yok — gelecek hafta sözünü biraz daha net tut.`}
        </p>
      )}
    </section>
  );
}
