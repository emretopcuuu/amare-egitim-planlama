"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { tost } from "@/lib/tost";

const t = tr.admin.aynaAniTetik;

// #3 Ayna Anı manuel tetik: kamp içi "gördün mü?" anına hazır adayları gösterir;
// admin tek tıkla hepsi için üretir. Üretim adayları tek tek dolaşır (her biri
// bir Opus çağrısı) — sekme açık kaldıkça ilerleme canlı görünür.
export default function AynaAniTetik({
  adaylar,
}: {
  adaylar: { id: string; ad: string }[];
}) {
  const router = useRouter();
  const [uretiliyor, setUretiliyor] = useState(false);
  const [yapilan, setYapilan] = useState(0);
  const [hata, setHata] = useState<string | null>(null);

  async function tumunuUret() {
    if (uretiliyor || adaylar.length === 0) return;
    setUretiliyor(true);
    setYapilan(0);
    setHata(null);
    let basarili = 0;
    try {
      for (const aday of adaylar) {
        const res = await fetch("/api/admin/ayna-ani-tetik", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ participantId: aday.id }),
        });
        if (res.ok) {
          const v = (await res.json().catch(() => null)) as { uretildi?: boolean } | null;
          if (v?.uretildi) basarili++;
        }
        setYapilan((n) => n + 1);
      }
      tost(t.bitti(basarili), "basari");
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setUretiliyor(false);
    }
  }

  if (adaylar.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-5 text-center">
        <p className="text-sm text-slate-400">{t.bosDurum}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">{t.hazir(adaylar.length)}</p>
      <ul className="flex flex-wrap gap-2">
        {adaylar.slice(0, 24).map((a) => (
          <li
            key={a.id}
            className="rounded-full bg-midnight-soft px-3 py-1 text-xs text-slate-300"
          >
            {a.ad.split(" ")[0]}
          </li>
        ))}
        {adaylar.length > 24 && (
          <li className="rounded-full bg-midnight-soft px-3 py-1 text-xs text-slate-500">
            +{adaylar.length - 24}
          </li>
        )}
      </ul>
      <button
        onClick={tumunuUret}
        disabled={uretiliyor}
        className="btn-kor flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold disabled:opacity-50"
      >
        {uretiliyor ? t.uretiliyor(yapilan, adaylar.length) : `✨ ${t.uret(adaylar.length)}`}
      </button>
      {hata && <p className="text-sm font-medium text-red-400">{hata}</p>}
    </div>
  );
}
