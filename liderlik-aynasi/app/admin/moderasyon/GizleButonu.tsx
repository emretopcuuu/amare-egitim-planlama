"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.moderasyon;

export default function GizleButonu({
  puanId,
  gizli,
}: {
  puanId: string;
  gizli: boolean;
}) {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState(false);

  async function degistir() {
    setBekliyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/admin/moderasyon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ puanId, gizli: !gizli }),
      });
      if (!res.ok) {
        setHata(true);
        return;
      }
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <span className="flex items-center gap-3">
      <button
        onClick={degistir}
        disabled={bekliyor}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
          gizli
            ? "border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
            : "bg-red-500/80 text-white hover:bg-red-500"
        }`}
      >
        {bekliyor ? "…" : gizli ? t.goster : t.gizle}
      </button>
      {hata && <span className="text-xs text-red-400">{t.hata}</span>}
    </span>
  );
}
