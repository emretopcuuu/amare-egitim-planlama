"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Bayrak = { key: string; ad: string; aciklama: string; acik: boolean };

export default function OyunBayrakPanel({ bayraklar }: { bayraklar: Bayrak[] }) {
  const router = useRouter();
  const [durum, setDurum] = useState<Record<string, boolean>>(
    Object.fromEntries(bayraklar.map((b) => [b.key, b.acik]))
  );
  const [mesgul, setMesgul] = useState<string | null>(null);

  async function degistir(key: string, acik: boolean) {
    setMesgul(key);
    try {
      const r = await fetch("/api/admin/oyunlastirma", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, acik }),
      });
      if (r.ok) {
        setDurum((d) => ({ ...d, [key]: acik }));
        router.refresh();
      }
    } finally {
      setMesgul(null);
    }
  }

  return (
    <div className="space-y-3">
      {bayraklar.map((b) => {
        const acik = durum[b.key];
        return (
          <div
            key={b.key}
            className="flex items-center justify-between gap-4 rounded-2xl border border-royal/30 bg-midnight-card/40 p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-100">
                {b.ad} <span className={`text-xs ${acik ? "text-emerald-400" : "text-slate-500"}`}>· {acik ? "AÇIK" : "kapalı"}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{b.aciklama}</p>
            </div>
            <button
              onClick={() => degistir(b.key, !acik)}
              disabled={mesgul === b.key}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                acik ? "border border-royal/40 text-slate-300" : "btn-kor"
              }`}
            >
              {acik ? "Kapat" : "Aç"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
