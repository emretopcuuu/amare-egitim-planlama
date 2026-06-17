"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.gorevler;

// GELİŞTİRME #6 — "Daha ileri git". Aday görevi kendi isteğiyle zorlaştırır;
// AYNA cesur bir varyant kurar ve görev yerinde güncellenir.
export default function ZorlastirButonu({ gorevId }: { gorevId: string }) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);

  async function zorlastir() {
    if (calisiyor) return;
    setCalisiyor(true);
    try {
      const res = await fetch("/api/gorev-zorlastir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId }),
      });
      if (res.ok) {
        titret([12, 40, 12, 40, 20]);
        router.refresh();
      } else {
        setCalisiyor(false);
      }
    } catch {
      setCalisiyor(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={zorlastir}
        disabled={calisiyor}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-orange-400/40 text-sm font-semibold text-orange-300 transition-colors hover:bg-orange-400/10 disabled:opacity-50"
      >
        {calisiyor ? t.zorlastiriliyor : t.zorlastir}
      </button>
      {!calisiyor && <p className="mt-1 text-center text-[0.65rem] text-slate-500">{t.zorlastirIpucu}</p>}
    </div>
  );
}
