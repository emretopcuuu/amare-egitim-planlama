"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import { MINI360_IFADELER } from "@/lib/onFarkindalik";

const t = tr.mini360;

export default function Mini360Oz({
  hedefId,
  ozBaslangic,
  ekipOrt,
  disSayi,
}: {
  hedefId: string;
  ozBaslangic: Record<string, number>;
  ekipOrt: Record<string, number | null>;
  disSayi: number;
}) {
  const router = useRouter();
  const [puanlar, setPuanlar] = useState<Record<string, number>>({ ...ozBaslangic });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);

  const tamam = MINI360_IFADELER.every((i) => puanlar[i.kod]);
  const link = typeof window !== "undefined" ? `${window.location.origin}/mini360/d/${hedefId}` : "";

  // En büyük fark (sen yüksek, ekip düşük) — kör noktanın ölçülmüş hâli.
  const enBuyukFark = useMemo(() => {
    if (disSayi === 0) return null;
    let max: { ifade: string; fark: number } | null = null;
    for (const i of MINI360_IFADELER) {
      const sen = puanlar[i.kod] ?? ozBaslangic[i.kod];
      const ekip = ekipOrt[i.kod];
      if (sen === undefined || ekip === null) continue;
      const fark = sen - ekip;
      if (!max || fark > max.fark) max = { ifade: i.dis, fark };
    }
    return max && max.fark > 0 ? max : null;
  }, [puanlar, ekipOrt, disSayi, ozBaslangic]);

  async function kaydet() {
    if (!tamam || kaydediliyor) return;
    setKaydediliyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/mini360", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(puanlar),
      });
      if (!res.ok) {
        const v = await res.json().catch(() => null);
        setHata(v?.hata ?? t.hata);
        return;
      }
      setKaydedildi(true);
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setKaydediliyor(false);
    }
  }

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(link);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1800);
    } catch {
      /* pano kapalı: kullanıcı elle kopyalar */
    }
  }

  const sec = (kod: string, p: number) => {
    titret(8);
    setPuanlar((e) => ({ ...e, [kod]: p }));
    setKaydedildi(false);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.baslik}</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.aciklama}</p>
      </header>

      {/* Öz puanlama */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="text-base font-semibold text-gold-light">{t.ozBaslik}</h2>
        <div className="mt-4 space-y-4">
          {MINI360_IFADELER.map((i) => (
            <div key={i.kod}>
              <p className="text-sm text-slate-200">{i.oz}</p>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={puanlar[i.kod] === p}
                    onClick={() => sec(i.kod, p)}
                    className={`h-11 rounded-lg text-base font-bold transition-all ${
                      puanlar[i.kod] === p ? "btn-kor scale-105" : "border-2 border-white/20 text-slate-300 hover:border-gold/60"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">1 = {t.olcek[1]} · 5 = {t.olcek[5]}</p>
        <button
          onClick={kaydet}
          disabled={!tamam || kaydediliyor}
          className="btn-kor mt-4 flex h-12 w-full items-center justify-center rounded-xl text-base font-bold disabled:opacity-40"
        >
          {kaydediliyor ? t.gonderiliyor : kaydedildi ? t.kaydedildi : t.gonder}
        </button>
        {hata && <p role="alert" className="mt-2 text-sm font-medium text-red-400">{hata}</p>}
      </section>

      {/* Paylaşım */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="text-base font-semibold text-gold-light">{t.paylasBaslik}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.paylasMetin}</p>
        <div className="mt-3 flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="h-10 flex-1 rounded-lg border border-royal-light/30 bg-midnight-soft px-3 text-xs text-slate-300 outline-none"
          />
          <button
            onClick={kopyala}
            className="shrink-0 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-midnight transition-colors hover:bg-gold-light"
          >
            {kopyalandi ? t.kopyalandi : t.linkKopyala}
          </button>
        </div>
      </section>

      {/* Sonuç: sen vs ekip */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gold-light">{t.sonucBaslik}</h2>
          <span className="text-xs text-slate-400">{t.disSayi(disSayi)}</span>
        </div>
        {disSayi === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t.disYok}</p>
        ) : (
          <>
            {enBuyukFark && (
              <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-300">
                {t.enBuyukFark(enBuyukFark.ifade)}
              </p>
            )}
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1.5 text-left font-medium">İfade</th>
                  <th className="py-1.5 text-right font-medium">{t.senPuani}</th>
                  <th className="py-1.5 text-right font-medium">{t.ekipOrt}</th>
                  <th className="py-1.5 text-right font-medium">{t.fark}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-royal/20">
                {MINI360_IFADELER.map((i) => {
                  const sen = puanlar[i.kod] ?? ozBaslangic[i.kod] ?? null;
                  const ekip = ekipOrt[i.kod];
                  const fark = sen !== null && ekip !== null ? Math.round((sen - ekip) * 10) / 10 : null;
                  return (
                    <tr key={i.kod}>
                      <td className="py-2 pr-2 text-slate-300">{i.dis}</td>
                      <td className="py-2 text-right font-bold text-slate-100">{sen ?? "—"}</td>
                      <td className="py-2 text-right text-slate-300">{ekip ?? "—"}</td>
                      <td className={`py-2 text-right font-bold ${fark !== null && fark > 0 ? "text-amber-400" : "text-slate-400"}`}>
                        {fark === null ? "—" : fark > 0 ? `+${fark}` : fark}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
