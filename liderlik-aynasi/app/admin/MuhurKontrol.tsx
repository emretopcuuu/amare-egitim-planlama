"use client";

import { useEffect, useState, useCallback } from "react";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.muhur;

// A2 admin: Mühür Açılışı penceresi + "kaç kişi söz mühürledi" panosu.
export default function MuhurKontrol() {
  const [acik, setAcik] = useState(false);
  const [toplam, setToplam] = useState(0);
  const [muhurlu, setMuhurlu] = useState(0);
  const [yuklendi, setYuklendi] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/muhur");
      const v = await res.json().catch(() => null);
      if (res.ok && v) {
        setAcik(!!v.acik);
        setToplam(v.toplam ?? 0);
        setMuhurlu(v.muhurlu ?? 0);
      }
    } finally {
      setYuklendi(true);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function cevir() {
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/muhur", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acik: !acik }),
      });
      if (!res.ok) {
        tost(t.hata, "hata");
        return;
      }
      await yukle();
    } catch {
      tost(t.hata, "hata");
    } finally {
      setMesgul(false);
    }
  }

  if (!yuklendi) return <p className="text-sm text-slate-500">{tr.pusula.yukleniyor}</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{t.aciklama}</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm font-semibold ${acik ? "text-emerald-400" : "text-slate-400"}`}>
          {acik ? t.pencereAcik : t.pencereKapali}
        </p>
        <button
          onClick={() => void cevir()}
          disabled={mesgul}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
            acik
              ? "border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
              : "bg-gold text-[#1a1206] hover:bg-gold-light"
          }`}
        >
          {acik ? t.pencereKapat : t.pencereAc}
        </button>
      </div>

      <p
        className={`rounded-xl px-4 py-2.5 text-center text-sm font-medium ${
          muhurlu < toplam ? "bg-amber-900/20 text-amber-300" : "bg-emerald-500/10 text-emerald-300"
        }`}
      >
        {t.muhurluUyari(muhurlu, toplam)}
      </p>
    </div>
  );
}
