"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret, cal } from "@/lib/his";
import { MINI360_IFADELER } from "@/lib/onFarkindalik";

const t = tr.mini360;

type EkipUye = { id: string; ad: string; istiyor: boolean; degerlendirdim: boolean };

export default function Mini360Oz({
  ozBaslangic,
  ekipOrt,
  disSayi,
  ozTamam,
  oylanmaIstiyor,
  ekip,
}: {
  ozBaslangic: Record<string, number>;
  ekipOrt: Record<string, number | null>;
  disSayi: number;
  ozTamam: boolean;
  oylanmaIstiyor: boolean;
  ekip: EkipUye[];
}) {
  const router = useRouter();
  const [puanlar, setPuanlar] = useState<Record<string, number>>({ ...ozBaslangic });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [istiyor, setIstiyor] = useState(oylanmaIstiyor);
  const [istekMesgul, setIstekMesgul] = useState(false);

  const tamam = MINI360_IFADELER.every((i) => puanlar[i.kod]);
  // Öz-puan kaydedildiyse (sunucudan ya da bu oturumda) ekip listesi açılır.
  const kilitsiz = ozTamam || (kaydedildi && tamam);

  // En büyük fark (sen yüksek, ekip düşük) — kör noktanın ölçülmüş hâli.
  const enBuyukFark = useMemo(() => {
    if (disSayi === 0) return null;
    let max: { ifade: string; fark: number } | null = null;
    for (const i of MINI360_IFADELER) {
      const sen = puanlar[i.kod] ?? ozBaslangic[i.kod];
      const ekipP = ekipOrt[i.kod];
      if (sen === undefined || ekipP === null) continue;
      const fark = sen - ekipP;
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
      titret([12, 40, 12]);
      cal("kazanim");
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setKaydediliyor(false);
    }
  }

  async function istekDegistir() {
    if (istekMesgul) return;
    const yeni = !istiyor;
    setIstekMesgul(true);
    setIstiyor(yeni); // optimistik
    titret(10);
    try {
      const res = await fetch("/api/mini360/istek", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ istiyor: yeni }),
      });
      if (!res.ok) {
        setIstiyor(!yeni); // geri al
        setHata(t.hata);
        return;
      }
      router.refresh();
    } catch {
      setIstiyor(!yeni);
      setHata(t.hata);
    } finally {
      setIstekMesgul(false);
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

      {/* 1) Öz puanlama — ekip değerlendirmesinin kapısı */}
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

      {/* 2) Ekibini değerlendir — öz-puan kapısı */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="text-base font-semibold text-gold-light">{t.ekipBaslik}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.ekipMetin}</p>

        {!kilitsiz ? (
          <div className="mt-4 rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-4 text-center">
            <p className="text-sm font-semibold text-gold-light">🔒 {t.kilitBaslik}</p>
            <p className="mt-1.5 text-sm text-slate-300">{t.kilitMetin}</p>
          </div>
        ) : ekip.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{t.ekipBos}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {ekip.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/mini360/d/${u.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-royal-light/25 bg-midnight-soft/60 px-4 py-3 transition-colors hover:border-gold/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-100">{u.ad}</span>
                    {u.istiyor && !u.degerlendirdim && (
                      <span className="mt-0.5 block text-xs font-medium text-amber-300">★ {t.istekRozet}</span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${
                      u.degerlendirdim
                        ? "text-emerald-300"
                        : "bg-gold text-[#1a1206]"
                    }`}
                  >
                    {u.degerlendirdim ? t.degerlendirdin : t.degerlendir}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3) Ekibinden değerlendirme iste */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="text-base font-semibold text-gold-light">{t.istekBaslik}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.istekMetin}</p>
        {istiyor && (
          <p className="mt-3 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300">
            {t.istekAcildi}
          </p>
        )}
        <button
          onClick={istekDegistir}
          disabled={istekMesgul}
          className={`mt-3 flex h-12 w-full items-center justify-center rounded-xl text-base font-bold transition-colors disabled:opacity-50 ${
            istiyor
              ? "border-2 border-white/20 text-slate-300 hover:border-gold/60"
              : "btn-kor"
          }`}
        >
          {istiyor ? t.istekKapat : t.istekAc}
        </button>
      </section>

      {/* 4) Sonuç: sen vs ekip */}
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
                  const ekipP = ekipOrt[i.kod];
                  const fark = sen !== null && ekipP !== null ? Math.round((sen - ekipP) * 10) / 10 : null;
                  return (
                    <tr key={i.kod}>
                      <td className="py-2 pr-2 text-slate-300">{i.dis}</td>
                      <td className="py-2 text-right font-bold text-slate-100">{sen ?? "—"}</td>
                      <td className="py-2 text-right text-slate-300">{ekipP ?? "—"}</td>
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
