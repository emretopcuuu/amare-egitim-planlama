"use client";

import { useEffect, useState, useCallback } from "react";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.fazBir;

// FAZ 1 admin: Boşluk Anı penceresi + derinlik panosu ("kim kanıtsız?").
export default function BoslukKontrol() {
  const [acik, setAcik] = useState(false);
  const [toplam, setToplam] = useState(0);
  const [tamam, setTamam] = useState(0);
  const [kanitsiz, setKanitsiz] = useState(0);
  const [yuklendi, setYuklendi] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bosluk");
      const v = await res.json().catch(() => null);
      if (res.ok && v) {
        setAcik(!!v.acik);
        setToplam(v.toplam ?? 0);
        setTamam(v.tamam ?? 0);
        setKanitsiz(v.kanitsiz ?? 0);
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
      const res = await fetch("/api/admin/bosluk", {
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

      <div className="rounded-xl bg-midnight-soft p-3 text-center">
        <p className="text-2xl font-bold text-gold">
          {tamam}/{toplam}
        </p>
        <p className="mt-1 text-xs text-slate-400">{t.tamamlanma(tamam, toplam)}</p>
      </div>

      {/* Derinlik panosu: kanıtsız kalan kişi sayısı (boş an riski) */}
      <p
        className={`rounded-xl px-4 py-2.5 text-center text-sm font-medium ${
          kanitsiz > 0 ? "bg-amber-900/20 text-amber-300" : "bg-emerald-500/10 text-emerald-300"
        }`}
      >
        {t.kanitsizUyari(kanitsiz)}
      </p>
    </div>
  );
}
