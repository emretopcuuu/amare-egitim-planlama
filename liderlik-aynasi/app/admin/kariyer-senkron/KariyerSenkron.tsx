"use client";

import { useState } from "react";

type Sonuc = { taranan: number; guncellenen: number; atlayan: string[] };

// [E12] Kariyer senkron istemcisi: "Dış kaynaktan çek" (env) veya CSV yapıştır/yükle.
export default function KariyerSenkron() {
  const [csv, setCsv] = useState("");
  const [durum, setDurum] = useState<"hazir" | "calisiyor">("hazir");
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [hata, setHata] = useState("");

  async function senkronla(kullanCsv: boolean) {
    if (durum === "calisiyor") return;
    setDurum("calisiyor");
    setHata("");
    setSonuc(null);
    try {
      const r = await fetch("/api/admin/kariyer-senkron", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kullanCsv ? { csv } : {}),
      });
      const v = await r.json().catch(() => null);
      if (r.ok) setSonuc(v);
      else setHata(v?.hata ?? "Senkron başarısız.");
    } catch {
      setHata("Ağ hatası.");
    } finally {
      setDurum("hazir");
    }
  }

  async function dosyaOku(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setCsv(await f.text());
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => void senkronla(false)}
        disabled={durum === "calisiyor"}
        className="btn-kor parilti flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-50"
      >
        {durum === "calisiyor" ? "Senkronlanıyor…" : "Dış kaynaktan (amare) çek"}
      </button>

      <div className="rounded-2xl border border-white/10 bg-midnight-card/50 p-4">
        <p className="text-sm font-semibold text-slate-200">CSV fallback</p>
        <p className="mt-1 text-xs text-slate-400">
          Her satır: <code>eposta_veya_telefon,rütbe</code> (ör. <code>ayse@x.com,diamond</code>). Env yoksa bunu kullan.
        </p>
        <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void dosyaOku(e)} className="mt-3 block w-full text-xs text-slate-400" />
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={5}
          placeholder="eposta_veya_telefon,rütbe"
          className="mt-2 w-full rounded-xl border-2 border-white/15 bg-white/[0.04] p-3 font-mono text-xs text-slate-100 outline-none focus:border-gold"
        />
        <button
          onClick={() => void senkronla(true)}
          disabled={durum === "calisiyor" || csv.trim().length === 0}
          className="btn-kor mt-3 flex h-11 w-full items-center justify-center rounded-2xl text-sm font-bold disabled:opacity-40"
        >
          CSV ile senkronla
        </button>
      </div>

      {hata && <p className="rounded-xl border border-rose-400/30 bg-rose-400/[0.06] p-3 text-sm text-rose-300">{hata}</p>}
      {sonuc && (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200">
          <p>
            <b>{sonuc.taranan}</b> kayıt tarandı · <b>{sonuc.guncellenen}</b> kişi terfi etti (kutlama gönderildi).
          </p>
          {sonuc.atlayan.length > 0 && (
            <p className="mt-1 text-xs text-amber-300">Atlanan: {sonuc.atlayan.slice(0, 5).join(", ")}{sonuc.atlayan.length > 5 ? "…" : ""}</p>
          )}
        </div>
      )}
    </div>
  );
}
