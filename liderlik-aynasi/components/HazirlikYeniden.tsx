"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Hazırlık checklist'inde Ses ritüeli / Nedenler (Pusula) için "Yeniden yap":
// dokun → onay (geri dönüşü yok uyarısı) → sıfırla → ilgili akışa git.
export default function HazirlikYeniden({
  ne,
  uyari,
}: {
  ne: "ses" | "nedenler";
  uyari: string;
}) {
  const router = useRouter();
  const [sor, setSor] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  async function yap() {
    if (mesgul) return;
    setMesgul(true);
    try {
      const r = await fetch("/api/hazirlik-sifirla", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ne }),
      });
      const d = await r.json().catch(() => null);
      if (d?.ok) {
        router.push(d.yol || "/");
        router.refresh();
        return;
      }
    } catch {}
    setMesgul(false);
    setSor(false);
  }

  if (sor) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => setSor(false)}
          disabled={mesgul}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          Vazgeç
        </button>
        <button
          onClick={yap}
          disabled={mesgul}
          className="rounded-md bg-red-500/80 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          title={uyari}
        >
          {mesgul ? "…" : "Sıfırla & yap"}
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setSor(true)}
      className="shrink-0 text-xs font-semibold text-gold-light underline-offset-4 hover:underline"
    >
      Yeniden yap →
    </button>
  );
}
