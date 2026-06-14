"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { tost } from "@/lib/tost";
import OnayliDugme from "./OnayliDugme";

type Dalga = { id: number; ad: string; acik: boolean };

export default function DalgaKontrol({ dalgalar }: { dalgalar: Dalga[] }) {
  const router = useRouter();
  const [bekleyen, setBekleyen] = useState<number | null>(null);
  const [hata, setHata] = useState<string | null>(null);

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
        return;
      }
      // Geri-al: aynı dalgayı tersine çevirir (zincir olmasın diye geriAlinabilir=false).
      tost(
        acik ? tr.admin.tost.dalgaAcildi : tr.admin.tost.dalgaKapatildi,
        "basari",
        geriAlinabilir ? () => degistir(dalgaId, !acik, false) : undefined
      );
      router.refresh();
    } catch {
      setHata(tr.admin.dalga.hata);
      tost(tr.admin.dalga.hata, "hata");
    } finally {
      setBekleyen(null);
    }
  }

  return (
    <div className="mt-4">
      {hata && (
        <p role="alert" className="mb-3 text-sm font-medium text-red-400">
          {hata}
        </p>
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
            </div>
            {d.acik ? (
              // Dalgayı kapatmak akışı durdurur → güvenli geri-alma onayı
              <OnayliDugme
                onayMetni={tr.admin.onay.dalgaKapat}
                onaylandi={() => degistir(d.id, false)}
                disabled={bekleyen !== null}
                className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-midnight-soft disabled:opacity-50"
              >
                {bekleyen === d.id ? "…" : tr.admin.dalga.kapat}
              </OnayliDugme>
            ) : (
              <button
                onClick={() => degistir(d.id, true)}
                disabled={bekleyen !== null}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-50"
              >
                {bekleyen === d.id ? "…" : tr.admin.dalga.ac}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
