"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.gorevler;

// UX #1 — "Başladım". Saha görevi gerçek zaman alır; kişi başladığını işaretler,
// sayaç sakinleşir. Başlanmışsa buton yerine "üzerinde çalışıyorsun" rozeti.
export default function BaslaButonu({
  gorevId,
  basladiMi,
}: {
  gorevId: string;
  basladiMi: boolean;
}) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);

  if (basladiMi) {
    return (
      <p className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 py-2 text-sm font-medium text-emerald-300">
        {t.basladimRozet}
      </p>
    );
  }

  async function basla() {
    if (calisiyor) return;
    titret(8);
    setCalisiyor(true);
    try {
      const res = await fetch("/api/gorev-basla", {
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
      onClick={basla}
      disabled={calisiyor}
      className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-emerald-400/40 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
    >
      {t.basladim}
    </button>
  );
}
