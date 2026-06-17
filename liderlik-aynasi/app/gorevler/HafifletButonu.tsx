"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.gorevler;

// GELİŞTİRME #8 — "Bu bana ağır geldi". Aday görevi fazla bulduğunda yargısız
// bir çıkış: AYNA daha küçük, güvenli bir varyant kurar; görev yerinde yumuşar.
export default function HafifletButonu({ gorevId }: { gorevId: string }) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);

  async function hafiflet() {
    if (calisiyor) return;
    setCalisiyor(true);
    try {
      const res = await fetch("/api/gorev-hafiflet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId }),
      });
      if (res.ok) {
        titret([8, 30]);
        router.refresh();
      } else {
        setCalisiyor(false);
      }
    } catch {
      setCalisiyor(false);
    }
  }

  return (
    <button
      type="button"
      onClick={hafiflet}
      disabled={calisiyor}
      className="mt-2 w-full text-center text-xs text-slate-500 underline-offset-4 transition-colors hover:text-slate-300 disabled:opacity-50"
    >
      {calisiyor ? t.hafifletiliyor : t.hafiflet}
    </button>
  );
}
