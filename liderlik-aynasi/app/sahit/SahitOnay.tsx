"use client";

import { useState } from "react";
import { titret } from "@/lib/his";

// [E3] Şahit onayı: söz sahibinin adını gösterir, tek dokunuşla imzalar.
export default function SahitOnay({ token, sahibiAd }: { token: string; sahibiAd: string }) {
  const [durum, setDurum] = useState<"hazir" | "gonderiliyor" | "oldu" | "hata">("hazir");

  async function onayla() {
    if (durum === "gonderiliyor") return;
    setDurum("gonderiliyor");
    try {
      const r = await fetch("/api/sahit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (r.ok) {
        setDurum("oldu");
        titret([12, 40, 12, 40, 30]);
      } else {
        setDurum("hata");
      }
    } catch {
      setDurum("hata");
    }
  }

  if (durum === "oldu") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-6">
        <p className="text-4xl" aria-hidden>🤝</p>
        <p className="mt-2 text-lg font-semibold text-emerald-300">{sahibiAd}&apos;in sözüne şahit oldun.</p>
        <p className="mt-1 text-sm text-slate-400">Sözü tuttuğunda yanında olacaksın.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-midnight-card/60 p-6">
      <p className="text-4xl" aria-hidden>📜</p>
      <p className="mt-3 text-lg font-semibold text-slate-100">
        <span className="text-gold-light">{sahibiAd}</span> sana sözünü emanet ediyor.
      </p>
      <p className="mt-1 text-sm text-slate-400">Şahit olursan, sözünü tuttuğunda onun yanında olmayı kabul edersin.</p>
      {durum === "hata" && <p className="mt-3 text-sm text-rose-300">Kaydedilemedi, tekrar dene.</p>}
      <button
        onClick={() => void onayla()}
        disabled={durum === "gonderiliyor"}
        className="btn-kor parilti mt-4 flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-50"
      >
        {durum === "gonderiliyor" ? "İmzalanıyor…" : "Şahit oluyorum 🤝"}
      </button>
    </div>
  );
}
