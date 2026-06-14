"use client";

import { useEffect, useState, useCallback } from "react";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.fazSifir;

// FAZ 0 admin kontrolü: Pusula penceresini aç/kapa, oda QR kodunu ayarla,
// tamamlanma sayısını izle. Kritik Kontroller bölgesinde yaşar.
export default function FazSifirKontrol() {
  const [acik, setAcik] = useState(false);
  const [kod, setKod] = useState("");
  const [tamam, setTamam] = useState(0);
  const [toplam, setToplam] = useState(0);
  const [yuklendi, setYuklendi] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pusula");
      const v = await res.json().catch(() => null);
      if (res.ok && v) {
        setAcik(!!v.acik);
        setKod(v.kilitKodu ?? "");
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

  async function gonder(govde: Record<string, unknown>, basariMesaji?: string) {
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/pusula", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(govde),
      });
      if (!res.ok) {
        tost(t.hata, "hata");
        return;
      }
      if (basariMesaji) tost(basariMesaji, "basari");
      await yukle();
    } catch {
      tost(t.hata, "hata");
    } finally {
      setMesgul(false);
    }
  }

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

  const qrUrl =
    typeof window !== "undefined" && kod.trim()
      ? `${window.location.origin}/ac?k=${encodeURIComponent(kod.trim())}`
      : "";

  if (!yuklendi) {
    return <p className="text-sm text-slate-500">{tr.pusula.yukleniyor}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{t.aciklama}</p>

      {/* Pencere aç/kapa */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={`text-sm font-semibold ${acik ? "text-emerald-400" : "text-slate-400"}`}
        >
          {acik ? t.pencereAcik : t.pencereKapali}
        </p>
        <button
          onClick={() => void gonder({ acik: !acik })}
          disabled={mesgul}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
            acik
              ? "border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
              : "bg-gold text-midnight hover:bg-gold-light"
          }`}
        >
          {acik ? t.pencereKapat : t.pencereAc}
        </button>
      </div>

      {/* Tamamlanma */}
      <div className="rounded-xl bg-midnight-soft p-3 text-center">
        <p className="text-2xl font-bold text-gold">
          {tamam}/{toplam}
        </p>
        <p className="mt-1 text-xs text-slate-400">{t.tamamlanma(tamam, toplam)}</p>
      </div>

      {/* Akıllı hatırlatma: hazırlığı eksik olanlara kişiselleştirilmiş push */}
      <button
        onClick={() => void hatirlat()}
        disabled={mesgul}
        className="w-full rounded-xl border border-royal-light/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-50"
      >
        {t.hatirlatDugme}
      </button>

      {/* Oda QR kodu */}
      <div>
        <label className="text-sm font-medium text-slate-300">{t.kodEtiket}</label>
        <div className="mt-2 flex gap-2">
          <input
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            placeholder={t.kodYer}
            className="flex-1 rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
          />
          <button
            onClick={() => void gonder({ kilitKodu: kod }, t.kodKaydedildi)}
            disabled={mesgul}
            className="shrink-0 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-50"
          >
            {t.kodKaydet}
          </button>
        </div>
        {kod.trim() ? (
          <p className="mt-2 break-all text-xs text-slate-500">{t.qrIpucu(qrUrl)}</p>
        ) : (
          <p className="mt-2 text-xs text-amber-400">{t.kodBos}</p>
        )}
      </div>
    </div>
  );
}
