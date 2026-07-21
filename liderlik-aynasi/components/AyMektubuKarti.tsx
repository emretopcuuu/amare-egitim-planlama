"use client";

import { useState } from "react";

// [D#33] AY DÖNÜMÜ MEKTUBU kartı — 30/60/90. günde AYNA'nın kişisel mektubu.
// "Oku" → lazy üretir/getirir (ilk çağrıda AI, sonra cache). Metni yerinde açar.
export default function AyMektubuKarti({ milestone }: { milestone: number }) {
  const [durum, setDurum] = useState<"kapali" | "yukleniyor" | "acik" | "hata">("kapali");
  const [metin, setMetin] = useState<string | null>(null);

  async function oku() {
    if (durum === "yukleniyor") return;
    setDurum("yukleniyor");
    try {
      const res = await fetch("/api/ay-mektubu", { method: "POST" });
      const v = await res.json().catch(() => null);
      if (res.ok && v?.durum === "hazir" && typeof v.metin === "string") {
        setMetin(v.metin);
        setDurum("acik");
      } else {
        setDurum("hata");
      }
    } catch {
      setDurum("hata");
    }
  }

  return (
    <section className="kart-cam rounded-2xl border border-gold/35 bg-gold/[0.06] p-5">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>📜</span>
        <h2 className="prizma-serif ay-metin text-lg font-bold text-gold-light">
          {milestone}. gün mektubun
        </h2>
      </div>
      {durum === "acik" && metin ? (
        <p className="mt-3 whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-100">
          {metin}
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-sm text-slate-300">
            AYNA, {milestone}. günü doldurduğun için sana özel bir mektup yazdı.
          </p>
          <button
            onClick={() => void oku()}
            disabled={durum === "yukleniyor"}
            className="btn-kor parilti mt-3 flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-50"
          >
            {durum === "yukleniyor" ? "AYNA yazıyor…" : "Mektubunu oku"}
          </button>
          {durum === "hata" && (
            <p className="mt-2 text-center text-xs text-amber-300">
              Şu an açılamadı — birazdan tekrar dene.
            </p>
          )}
        </>
      )}
    </section>
  );
}
