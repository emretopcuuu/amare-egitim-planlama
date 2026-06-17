"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.elmas;

export default function Mini360TurBaslat({ tur }: { tur: number }) {
  const router = useRouter();
  const [calisan, setCalisan] = useState(false);
  const [onay, setOnay] = useState(false);

  async function basla() {
    if (calisan) return;
    setCalisan(true);
    try {
      const r = await fetch("/api/admin/mini360-tur", { method: "POST" });
      if (r.ok) router.refresh();
    } finally {
      setCalisan(false);
      setOnay(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-400">{t.turEtiket(tur)}</span>
      {onay ? (
        <>
          <button
            onClick={basla}
            disabled={calisan}
            className="rounded-lg bg-royal px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {calisan ? "…" : t.turOnay}
          </button>
          <button onClick={() => setOnay(false)} className="text-xs text-slate-500 hover:text-slate-300">
            {t.turVazgec}
          </button>
        </>
      ) : (
        <button
          onClick={() => setOnay(true)}
          className="rounded-lg border border-royal-light/30 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/5"
        >
          🔄 {t.turBaslat}
        </button>
      )}
    </div>
  );
}
