"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.grupOdev;

// İki buton: grup-içi / grup-birlikte ödev üret. Üretince listeyi tazeler.
export default function GrupOdevUret({ takim }: { takim: string }) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function uret(tip: "grup_ici" | "grup_birlikte") {
    if (mesgul) return;
    setMesgul(tip);
    setMesaj(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/grup-odev", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ takim, tip }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) return setHata(v?.hata ?? t.uretilemedi);
      setMesaj(t.basarili);
      router.refresh();
    } catch {
      setHata(t.uretilemedi);
    } finally {
      setMesgul(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => uret("grup_ici")}
          disabled={mesgul !== null}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-40"
        >
          {mesgul === "grup_ici" ? t.uretiliyor : t.grupIci}
        </button>
        <button
          onClick={() => uret("grup_birlikte")}
          disabled={mesgul !== null}
          className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-40"
        >
          {mesgul === "grup_birlikte" ? t.uretiliyor : t.grupBirlikte}
        </button>
      </div>
      {mesaj && <p className="mt-2 text-sm font-medium text-emerald-400">{mesaj}</p>}
      {hata && <p role="alert" className="mt-2 text-sm font-medium text-red-400">{hata}</p>}
    </div>
  );
}
