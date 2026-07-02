"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Kisi = { id: string; ad: string; onay: boolean; secili: boolean };

// [1.4] Canlı Yolculuk sahne kişisi seçici. Önce onay (mahremiyet), sonra seç.
export default function SahneKisiSecici({ kisiler }: { kisiler: Kisi[] }) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState(false);

  async function gonder(govde: object) {
    if (mesgul) return;
    setMesgul(true);
    try {
      await fetch("/api/admin/sahne-kisi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(govde),
      });
      router.refresh();
    } finally {
      setMesgul(false);
    }
  }

  return (
    <ul className="space-y-2">
      {kisiler.map((k) => (
        <li
          key={k.id}
          className={`flex items-center gap-3 rounded-xl border p-3 ${
            k.secili ? "border-gold/50 bg-gold/[0.08]" : "border-white/10 bg-midnight-card/50"
          }`}
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
            {k.ad} {k.secili && <span className="text-gold-light">· sahnede</span>}
          </span>
          <button
            onClick={() => void gonder({ islem: "onay", id: k.id, deger: !k.onay })}
            disabled={mesgul}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-40 ${
              k.onay ? "bg-emerald-500/20 text-emerald-300" : "border border-white/15 text-slate-400"
            }`}
          >
            {k.onay ? "✓ onaylı" : "onayla"}
          </button>
          <button
            onClick={() => void gonder(k.secili ? { islem: "temizle" } : { islem: "sec", id: k.id })}
            disabled={mesgul || !k.onay}
            className="rounded-lg bg-gold/20 px-2.5 py-1 text-xs font-bold text-gold-light disabled:opacity-30"
          >
            {k.secili ? "kaldır" : "sahneye al"}
          </button>
        </li>
      ))}
    </ul>
  );
}
