"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Admin: oyun seçimi giriş kapısı aç/kapa düğmesi.
export default function OyunSecimiToggle({ acik }: { acik: boolean }) {
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function degistir() {
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/admin/oyun-secimi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acik: !acik }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setHata(d?.hata ?? "Hata");
        return;
      }
      router.refresh();
    } catch {
      setHata("Bağlantı hatası");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={degistir}
        disabled={yukleniyor}
        aria-pressed={acik}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          acik ? "bg-emerald-500" : "bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
            acik ? "translate-x-[1.35rem]" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-sm font-medium text-slate-200">
        {acik ? "Açık — kişiler girişte oyun seçip gruba atanıyor" : "Kapalı"}
      </span>
      {hata && <span className="text-xs text-red-300">{hata}</span>}
    </div>
  );
}
