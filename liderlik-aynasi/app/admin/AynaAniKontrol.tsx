"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { tost } from "@/lib/tost";
import OnayliDugme from "./OnayliDugme";
import Bekle from "@/components/Bekle";

const t = tr.admin.aynaAni;

type Props = {
  acik: boolean;
  mektupHazir: number;
  mektupToplam: number;
};

export default function AynaAniKontrol({ acik, mektupHazir, mektupToplam }: Props) {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [uretiliyor, setUretiliyor] = useState(false);
  const [uretimDurumu, setUretimDurumu] = useState<string | null>(null);
  const [hazirSayisi, setHazirSayisi] = useState(mektupHazir);

  async function degistir(hedef: boolean, geriAlinabilir = true) {
    setBekliyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/admin/ayna", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acik: hedef }),
      });
      if (!res.ok) {
        const veri = await res.json().catch(() => null);
        setHata(veri?.hata ?? t.hata);
        return;
      }
      // Geri-al: hedefin tersine çevirir (zincir olmasın diye geriAlinabilir=false).
      tost(
        hedef ? tr.admin.tost.raporAcildi : tr.admin.tost.raporGizlendi,
        "basari",
        geriAlinabilir ? () => degistir(!hedef, false) : undefined
      );
      router.refresh();
    } catch {
      setHata(t.hata);
      tost(t.hata, "hata");
    } finally {
      setBekliyor(false);
    }
  }

  // Her çağrı bir mektup üretir; kalan 0 olana kadar döngü. Sekme açık kaldığı
  // sürece ilerleme canlı görünür.
  async function mektuplariUret() {
    if (uretiliyor) return;
    setUretiliyor(true);
    setHata(null);
    try {
      for (;;) {
        const res = await fetch("/api/admin/mektuplar", { method: "POST" });
        const veri = await res.json().catch(() => null);
        if (!res.ok) {
          setHata(veri?.hata ?? t.mektupHata);
          return;
        }
        if (veri.uretilen === null) break;
        setHazirSayisi(veri.toplam - veri.kalan);
        setUretimDurumu(veri.kalan > 0 ? t.mektupUretiliyor(veri.uretilen) : null);
        if (veri.kalan === 0) break;
      }
      setUretimDurumu(null);
      router.refresh();
    } catch {
      setHata(t.mektupHata);
    } finally {
      setUretiliyor(false);
    }
  }

  const tumHazir = hazirSayisi >= mektupToplam;

  return (
    <div className="mt-4 space-y-5">
      {/* Mektup üretimi */}
      <div className="rounded-xl bg-midnight-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-100">{t.mektupBaslik}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {tumHazir ? t.mektupTamam : t.mektupDurum(hazirSayisi, mektupToplam)}
            </p>
            {uretimDurumu && (
              <p className="mt-1 text-xs text-gold-light">{uretimDurumu}</p>
            )}
          </div>
          {!tumHazir && (
            <button
              onClick={mektuplariUret}
              disabled={uretiliyor}
              className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-card disabled:opacity-50"
            >
              {uretiliyor ? <Bekle /> : t.mektupUret}
            </button>
          )}
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-midnight">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{
              width: mektupToplam > 0 ? `${(hazirSayisi / mektupToplam) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      {/* Büyük düğme */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={`text-sm font-semibold ${acik ? "text-emerald-400" : "text-slate-400"}`}
        >
          {acik ? `● ${t.durumAcik}` : `○ ${t.durumKapali}`}
        </p>
        <OnayliDugme
          onayMetni={acik ? tr.admin.onay.raporKapat : tr.admin.onay.raporAc}
          onaylandi={() => degistir(!acik)}
          disabled={bekliyor}
          className={`rounded-xl px-6 py-3 font-bold transition-colors disabled:opacity-50 ${
            acik
              ? "border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
              : "bg-gold text-[#1a1206] shadow-lg shadow-gold/20 hover:bg-gold-light"
          }`}
        >
          {bekliyor ? <Bekle /> : acik ? t.kapat : `✨ ${t.ac}`}
        </OnayliDugme>
      </div>

      {hata && (
        <p role="alert" className="text-sm font-medium text-red-400">
          {hata}
        </p>
      )}
    </div>
  );
}
