"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import SesCal from "@/components/SesCal";
import Konfeti from "@/components/Konfeti";

const t = tr.kapanisSoz;

function Cubuk({
  etiket,
  yapilan,
  hedef,
  tamamMetin,
}: {
  etiket: string;
  yapilan: number;
  hedef: number;
  tamamMetin: string;
}) {
  const oran = hedef > 0 ? Math.min(100, (yapilan / hedef) * 100) : 0;
  const tamam = yapilan >= hedef;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-slate-300">{etiket}</span>
        <span className="font-mono text-base font-bold text-gold">
          {yapilan} / {hedef}
        </span>
      </div>
      <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-midnight-soft">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-700"
          style={{ width: `${Math.max(3, oran)}%` }}
        />
      </div>
      {tamam && <p className="mt-1 text-xs font-semibold text-emerald-300">{tamamMetin}</p>}
    </div>
  );
}

export default function SozDurum({
  temmuz,
  agustos,
  kayitYapilan,
  gorusmeYapilan,
  sesUrl,
}: {
  temmuz: number;
  agustos: number;
  kayitYapilan: number;
  gorusmeYapilan: number;
  sesUrl: string | null;
}) {
  const router = useRouter();
  const [kayit, setKayit] = useState(String(kayitYapilan));
  const [gorusme, setGorusme] = useState(String(gorusmeYapilan));
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [hata, setHata] = useState(false);

  async function guncelle() {
    if (kaydediliyor) return;
    setKaydediliyor(true);
    setHata(false);
    setKaydedildi(false);
    try {
      const res = await fetch("/api/soz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kayit: Math.max(0, Math.floor(Number(kayit) || 0)),
          gorusme: Math.max(0, Math.floor(Number(gorusme) || 0)),
        }),
      });
      if (!res.ok) {
        setHata(true);
        return;
      }
      titret(12);
      setKaydedildi(true);
      setTimeout(() => setKaydedildi(false), 3000);
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <>
      <Konfeti anahtar="kapanis-soz-muhur" />

      {/* Sözün */}
      <section className="kart-cam relative overflow-hidden rounded-3xl bg-gradient-to-br from-gold/10 to-midnight-card/60 p-5 text-center ring-1 ring-gold/30">
        <p className="prizma-serif text-xs uppercase tracking-[0.35em] text-emerald-300">
          {t.verildiBaslik}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.04] p-4">
            <p className="font-mono text-4xl font-bold text-gold">{temmuz}</p>
            <p className="mt-1 text-xs text-slate-300">{t.temmuzKart}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-4">
            <p className="font-mono text-4xl font-bold text-gold">{agustos}</p>
            <p className="mt-1 text-xs text-slate-300">{t.agustosKart}</p>
          </div>
        </div>
        {sesUrl && <SesCal url={sesUrl} etiket={t.sesDinleEtiket} />}
      </section>

      {/* İlerleme */}
      <section className="kart-cam rounded-3xl p-5">
        <h2 className="font-semibold text-gold-light">{t.ilerlemeBaslik}</h2>
        <div className="mt-4 space-y-4">
          <Cubuk
            etiket={t.temmuzKart}
            yapilan={kayitYapilan}
            hedef={temmuz}
            tamamMetin={t.kayitTamam}
          />
          <Cubuk
            etiket={t.agustosKart}
            yapilan={gorusmeYapilan}
            hedef={agustos}
            tamamMetin={t.gorusmeTamam}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-300">
            {t.kayitYapilan}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={kayit}
              onChange={(e) => setKayit(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 text-lg font-bold text-slate-100 outline-none focus:border-gold"
            />
          </label>
          <label className="text-sm text-slate-300">
            {t.gorusmeYapilan}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={gorusme}
              onChange={(e) => setGorusme(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 text-lg font-bold text-slate-100 outline-none focus:border-gold"
            />
          </label>
        </div>
        <button
          onClick={guncelle}
          disabled={kaydediliyor}
          className="mt-4 w-full btn-3d rounded-xl bg-gold px-4 py-3 font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-50"
        >
          {kaydediliyor ? t.gonderiliyor : t.ilerlemeGuncelle}
        </button>
        {kaydedildi && (
          <p className="mt-2 text-center text-sm font-semibold text-emerald-300">
            {t.ilerlemeKaydedildi}
          </p>
        )}
        {hata && <p className="mt-2 text-center text-sm font-medium text-red-400">{t.hata}</p>}
      </section>
    </>
  );
}
