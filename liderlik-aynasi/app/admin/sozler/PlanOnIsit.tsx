"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Bekle from "@/components/Bekle";

// PLAN ÖN-ISITMA butonu — admin sahne öncesi basar; her tık en fazla 4 plan
// üretir, kalanı gösterir. 0'a düşene dek basılabilir.
export default function PlanOnIsit({ eksik }: { eksik: number }) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);
  const [son, setSon] = useState<{ uretildi: number; kalan: number } | null>(null);
  const [hata, setHata] = useState(false);

  async function isit() {
    setCalisiyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/admin/plan-onisit", { method: "POST" });
      const veri = await res.json().catch(() => null);
      if (!res.ok || !veri?.ok) {
        setHata(true);
        return;
      }
      setSon({ uretildi: veri.uretildi, kalan: veri.kalan });
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setCalisiyor(false);
    }
  }

  const kalan = son?.kalan ?? eksik;

  return (
    <div>
      <p className="mb-3 text-sm text-slate-300">
        {kalan > 0
          ? `Planı henüz üretilmemiş ${kalan} kişi var. Sahne öncesi ısıtırsan bekleme olmaz (her tık en fazla 4).`
          : "Tüm uygun katılımcıların planı hazır. Ekstra ısıtmaya gerek yok."}
      </p>
      <button
        onClick={isit}
        disabled={calisiyor || kalan === 0}
        className="btn-3d rounded-xl bg-royal px-5 py-2.5 font-semibold text-white transition-colors hover:bg-royal-light disabled:opacity-50"
      >
        {calisiyor ? <Bekle /> : kalan > 0 ? `Planları ön-ısıt (${Math.min(4, kalan)})` : "Hazır ✓"}
      </button>
      {son && (
        <p className="mt-2 text-sm text-emerald-300">
          {son.uretildi} plan üretildi{son.kalan > 0 ? ` · ${son.kalan} kaldı, tekrar bas.` : " · tamam ✓"}
        </p>
      )}
      {hata && <p className="mt-2 text-sm font-medium text-red-400">Bir kısmı üretilemedi, tekrar dene.</p>}
    </div>
  );
}
