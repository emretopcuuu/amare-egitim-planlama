"use client";

import { useState } from "react";
import { titret } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";

// [5.2] EYLÜL AYNASI — istemci: tek cümle yansıma + 0-10 puan (before/after).
export default function EylulAynasiForm({
  mevcut,
}: {
  mevcut: { cevap: string; puan: number } | null;
}) {
  const [cevap, setCevap] = useState(mevcut?.cevap ?? "");
  const [puan, setPuan] = useState(mevcut?.puan ?? 7);
  const [durum, setDurum] = useState<"bos" | "kaydediliyor" | "kaydedildi" | "hata">(
    mevcut ? "kaydedildi" : "bos"
  );

  async function kaydet() {
    if (cevap.trim().length < 3 || durum === "kaydediliyor") return;
    setDurum("kaydediliyor");
    try {
      const r = await fetch("/api/eylul-aynasi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cevap, puan }),
      });
      if (r.ok) {
        setDurum("kaydedildi");
        titret([12, 40, 12, 40, 30]);
      } else {
        setDurum("hata");
      }
    } catch {
      setDurum("hata");
    }
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-midnight-card/60 p-4">
      <label className="block text-sm font-medium text-slate-300">
        İki ay önce kimdin, şimdi kimsin? Tek cümle.
      </label>
      <textarea
        value={cevap}
        onChange={(e) => {
          setCevap(e.target.value);
          setDurum("bos");
        }}
        rows={3}
        maxLength={800}
        placeholder="Örn. Kamptan çekinen biri döndü; bugün ekibime ilk kez ben liderlik ediyorum."
        className="mt-2 w-full rounded-xl border-2 border-white/15 bg-white/[0.04] p-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-gold"
      />
      <div className="mt-2">
        <MikrofonButonu
          onMetin={(p) => {
            setCevap((g) => (g.trim() ? `${g.trim()} ${p}` : p).slice(0, 800));
            setDurum("bos");
          }}
        />
      </div>

      <label className="mt-4 block text-sm font-medium text-slate-300">
        Bugünkü liderlik hâlin: <span className="font-bold text-gold-light">{puan}/10</span>
      </label>
      <input
        type="range"
        min={0}
        max={10}
        value={puan}
        onChange={(e) => {
          setPuan(Number(e.target.value));
          setDurum("bos");
        }}
        className="mt-2 w-full accent-gold"
      />

      {durum === "hata" && <p className="mt-2 text-sm text-rose-300">Kaydedilemedi, tekrar dene.</p>}
      <button
        onClick={() => void kaydet()}
        disabled={cevap.trim().length < 3 || durum === "kaydediliyor"}
        className="btn-kor parilti mt-4 flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-40"
      >
        {durum === "kaydediliyor" ? "Kaydediliyor…" : durum === "kaydedildi" ? "Aynan kaydedildi ✓" : "Aynaya bak"}
      </button>
    </div>
  );
}
