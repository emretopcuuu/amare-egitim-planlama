"use client";

import { useEffect, useState, useCallback } from "react";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.fazSifir;

// FAZ 0 admin kontrolü: hazırlık tamamlanma sayısını izle + hatırlatma gönder.
export default function FazSifirKontrol() {
  const [tamam, setTamam] = useState(0);
  const [toplam, setToplam] = useState(0);
  const [yuklendi, setYuklendi] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pusula");
      const v = await res.json().catch(() => null);
      if (res.ok && v) {
        setTamam(v.tamam ?? 0);
        setToplam(v.toplam ?? 0);
      }
    } finally {
      setYuklendi(true);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function hatirlat() {
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/hazirlik-hatirlat", { method: "POST" });
      const v = await res.json().catch(() => null);
      if (res.ok && v) tost(t.hatirlatSonuc(v.gonderildi ?? 0), "basari");
      else tost(t.hata, "hata");
    } catch {
      tost(t.hata, "hata");
    } finally {
      setMesgul(false);
    }
  }

  if (!yuklendi) {
    return <p className="text-sm text-slate-500">{tr.pusula.yukleniyor}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{t.aciklama}</p>

      <div className="rounded-xl bg-midnight-soft p-3 text-center">
        <p className="text-2xl font-bold text-gold">
          {tamam}/{toplam}
        </p>
        <p className="mt-1 text-xs text-slate-400">{t.tamamlanma(tamam, toplam)}</p>
      </div>

      <button
        onClick={() => void hatirlat()}
        disabled={mesgul}
        className="w-full rounded-xl border border-royal-light/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-50"
      >
        {t.hatirlatDugme}
      </button>
    </div>
  );
}
