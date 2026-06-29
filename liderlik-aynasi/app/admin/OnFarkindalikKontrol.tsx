"use client";

import { useEffect, useState, useCallback } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.onFark;

// FAZ A admin: Ön Farkındalık tamamlanma istatistiği.
export default function OnFarkindalikKontrol() {
  const [toplam, setToplam] = useState(0);
  const [tamam, setTamam] = useState(0);
  const [yuklendi, setYuklendi] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/on-farkindalik");
      const v = await res.json().catch(() => null);
      if (res.ok && v) {
        setToplam(v.toplam ?? 0);
        setTamam(v.tamam ?? 0);
      }
    } finally {
      setYuklendi(true);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  if (!yuklendi) return <p className="text-sm text-slate-500">{tr.pusula.yukleniyor}</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{t.aciklama}</p>

      <div className="rounded-xl bg-midnight-soft p-3 text-center">
        <p className="text-2xl font-bold text-gold">
          {tamam}/{toplam}
        </p>
        <p className="mt-1 text-xs text-slate-400">{t.tamamlanma(tamam, toplam)}</p>
      </div>
    </div>
  );
}
