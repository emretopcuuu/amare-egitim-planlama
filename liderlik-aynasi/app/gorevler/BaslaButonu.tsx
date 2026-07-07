"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import { sesCal } from "@/lib/sesEfekti";

const t = tr.gorevler;

// FAZ 6.1 — gorevId tohumlu cesaret fısıltısı seçimi (deterministik).
function fisiltiSec(gorevId: string): string {
  const havuz = t.cesaretFisiltilari;
  let h = 0;
  for (const ch of gorevId) h = (h * 31 + ch.charCodeAt(0)) % havuz.length;
  return havuz[h];
}

// UX #1 — "Başladım". Saha görevi gerçek zaman alır; kişi başladığını işaretler,
// sayaç sakinleşir. Başlanmışsa buton yerine "üzerinde çalışıyorsun" rozeti.
// FAZ 6.1 — başlayınca 60-90 sn sonra tek cümlelik cesaret fısıltısı belirir.
export default function BaslaButonu({
  gorevId,
  basladiMi,
}: {
  gorevId: string;
  basladiMi: boolean;
}) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);
  const [fisilti, setFisilti] = useState<string | null>(null);

  // FAZ 6.1 — "başladım" işaretlendiyse (bu oturumda ya da önceden) 75 sn sonra
  // cesaret fısıltısını göster. gorevId'ye göre deterministik gecikme 60-90 sn.
  useEffect(() => {
    if (!basladiMi || fisilti) return;
    let h = 0;
    for (const ch of gorevId) h = (h * 31 + ch.charCodeAt(0)) % 31;
    const gecikmeMs = (60 + h) * 1000;
    const zaman = setTimeout(() => {
      setFisilti(fisiltiSec(gorevId));
      titret([8, 30, 8]);
    }, gecikmeMs);
    return () => clearTimeout(zaman);
  }, [basladiMi, gorevId, fisilti]);

  if (basladiMi) {
    return (
      <>
        <p className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 py-2 text-sm font-medium text-emerald-300">
          {t.basladimRozet}
        </p>
        {fisilti && (
          <p className="gorev-giris mt-2 rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-center text-sm italic text-gold-light">
            🕯 {fisilti}
          </p>
        )}
      </>
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
        sesCal("gorev-basla");
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
