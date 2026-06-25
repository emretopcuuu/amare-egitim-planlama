"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.gorevler;

// UX #2 — "Şimdi uygun değilim → ertele". Görevi 2 saat öteler (en fazla 2 kez).
// Sahnedeyken/meşgulken kaçan görevleri kurtarır.
export default function ErteleButonu({
  gorevId,
  kalanHak,
}: {
  gorevId: string;
  kalanHak: number;
}) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  if (kalanHak <= 0) return null; // erteleme hakkı kalmadı → buton gösterme

  async function ertele() {
    if (calisiyor) return;
    titret(8);
    setCalisiyor(true);
    setMesaj(null);
    try {
      const res = await fetch("/api/gorev-ertele", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId }),
      });
      const veri = await res.json().catch(() => null);
      if (res.ok) {
        titret([8, 30]);
        setMesaj(t.erteleNot);
        setTimeout(() => router.refresh(), 1100);
      } else {
        setMesaj(veri?.hata ?? t.erteleBitti);
        setCalisiyor(false);
      }
    } catch {
      setCalisiyor(false);
    }
  }

  if (mesaj) {
    return <p className="mt-2 text-center text-xs font-medium text-slate-400">{mesaj}</p>;
  }

  return (
    <button
      type="button"
      onClick={ertele}
      disabled={calisiyor}
      className="mt-2 w-full text-center text-xs text-slate-500 underline-offset-4 transition-colors hover:text-slate-300 disabled:opacity-50"
    >
      {calisiyor ? t.erteleniyor : t.ertele}
    </button>
  );
}
