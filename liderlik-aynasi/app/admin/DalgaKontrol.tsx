"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { tost } from "@/lib/tost";
import OnayliDugme from "./OnayliDugme";
import Bekle from "@/components/Bekle";

type Dalga = { id: number; ad: string; acik: boolean; otomatik?: string | null };

export default function DalgaKontrol({
  dalgalar,
  puanlamayan = 0,
}: {
  dalgalar: Dalga[];
  puanlamayan?: number;
}) {
  const router = useRouter();
  const [bekleyen, setBekleyen] = useState<number | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  // Hata sonrası "Yeniden Dene" için son denenen eylemi sakla.
  const [sonDeneme, setSonDeneme] = useState<{ dalgaId: number; acik: boolean } | null>(null);

  async function degistir(dalgaId: number, acik: boolean, geriAlinabilir = true) {
    setBekleyen(dalgaId);
    setHata(null);
    try {
      const res = await fetch("/api/admin/dalga", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dalgaId, acik }),
      });
      if (!res.ok) {
        const veri = await res.json().catch(() => null);
        setHata(veri?.hata ?? tr.admin.dalga.hata);
        setSonDeneme({ dalgaId, acik });
        return;
      }
      setSonDeneme(null);
      // Geri-al: aynı dalgayı tersine çevirir (zincir olmasın diye geriAlinabilir=false).
      tost(
        acik ? tr.admin.tost.dalgaAcildi : tr.admin.tost.dalgaKapatildi,
        "basari",
        geriAlinabilir ? () => degistir(dalgaId, !acik, false) : undefined
      );
      router.refresh();
    } catch {
      setHata(tr.admin.dalga.hata);
      setSonDeneme({ dalgaId, acik });
      tost(tr.admin.dalga.hata, "hata");
    } finally {
      setBekleyen(null);
    }
  }

  return (
    <div className="mt-4">
      {hata && (
        <div
          role="alert"
          className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2.5"
        >
          <p className="text-sm font-medium text-red-400">{hata}</p>
          {sonDeneme && (
            <button
              onClick={() => degistir(sonDeneme.dalgaId, sonDeneme.acik)}
              disabled={bekleyen !== null}
              className="shrink-0 rounded-lg border border-red-400/40 px-3 py-1 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              {tr.admin.ux.yenidenDene}
            </button>
          )}
        </div>
      )}
      <ul className="divide-y divide-royal/20">
        {dalgalar.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="font-medium text-slate-100">{d.ad}</p>
              <p
                className={`mt-0.5 text-xs font-medium ${
                  d.acik ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {d.acik ? `● ${tr.admin.dalga.acik}` : `○ ${tr.admin.dalga.kapali}`}
              </p>
              {/* #2 Kapanış sayacı: açık dalgada henüz puanlamamış kişi sayısı */}
              {d.acik && puanlamayan > 0 && (
                <p className="mt-1 text-xs font-medium text-amber-300">
                  {tr.admin.dalga.puanlamayan(puanlamayan)}
                </p>
              )}
              {/* Otomatik açılış bilgisi — kapalıysa ne zaman kendiliğinden açılacağı */}
              {!d.acik && d.otomatik && (
                <p className="mt-1 text-xs font-medium text-emerald-300/90">{d.otomatik}</p>
              )}
            </div>
            {d.acik ? (
              // Dalgayı kapatmak akışı durdurur → güvenli geri-alma onayı
              <OnayliDugme
                onayMetni={
                  puanlamayan > 0
                    ? tr.admin.dalga.kapatUyari(puanlamayan)
                    : tr.admin.onay.dalgaKapat
                }
                onaylandi={() => degistir(d.id, false)}
                disabled={bekleyen !== null}
                className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-midnight-soft disabled:opacity-50"
              >
                {bekleyen === d.id ? <Bekle /> : tr.admin.dalga.kapat}
              </OnayliDugme>
            ) : (
              <button
                onClick={() => degistir(d.id, true)}
                disabled={bekleyen !== null}
                title={d.otomatik ? "Zamanı gelince kendi açılır; bu yalnızca erken açmak için." : undefined}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  d.otomatik
                    ? "border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
                    : "bg-gold text-[#1a1206] hover:bg-gold-light"
                }`}
              >
                {bekleyen === d.id ? <Bekle /> : d.otomatik ? "Erken aç" : tr.admin.dalga.ac}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
