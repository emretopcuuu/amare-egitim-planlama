"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.gorevler;

// A10 — "Bu görevi netleştir". Belirsiz görevde AYNA tek-iki cümlelik somut
// açıklama verir (görevi değiştirmez). Açıklama gelince buton yerine metin kalır.
export default function NetlestirButonu({ gorevId }: { gorevId: string }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [aciklama, setAciklama] = useState<string | null>(null);

  async function netlestir() {
    if (calisiyor) return;
    titret(8);
    setCalisiyor(true);
    try {
      const res = await fetch("/api/gorev-netlestir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId }),
      });
      const veri = await res.json().catch(() => null);
      if (res.ok && veri?.aciklama) {
        titret([8, 30]);
        setAciklama(veri.aciklama);
      } else {
        setCalisiyor(false);
      }
    } catch {
      setCalisiyor(false);
    }
  }

  if (aciklama) {
    return (
      <div className="mt-3 rounded-xl border border-royal-light/25 bg-midnight/40 p-3">
        <p className="text-xs font-semibold text-royal-light">🤖 AYNA açıklıyor</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-200">{aciklama}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={netlestir}
      disabled={calisiyor}
      className="mt-2 w-full text-center text-xs text-slate-500 underline-offset-4 transition-colors hover:text-royal-light disabled:opacity-50"
    >
      {calisiyor ? t.netlestiriliyor : t.netlestir}
    </button>
  );
}
