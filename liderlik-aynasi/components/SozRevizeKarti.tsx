"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// [B#13] SÖZ REVİZYON RİTÜELİ — 30. günde kişi sözünü BİR KEZ yenileyebilir.
// Kapalı gelir; "Sözünü yenile"ye basınca mevcut metin düzenlenebilir açılır.
export default function SozRevizeKarti({ mevcutMetin }: { mevcutMetin: string }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState(mevcutMetin);
  const [durum, setDurum] = useState<"hazir" | "kaydediliyor" | "oldu" | "hata">("hazir");

  async function kaydet() {
    if (durum === "kaydediliyor" || !metin.trim()) return;
    setDurum("kaydediliyor");
    try {
      const res = await fetch("/api/soz-revize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metin }),
      });
      const v = await res.json().catch(() => null);
      if (res.ok && v?.ok) {
        setDurum("oldu");
        setTimeout(() => router.refresh(), 1200);
      } else {
        setDurum("hata");
      }
    } catch {
      setDurum("hata");
    }
  }

  if (durum === "oldu") {
    return (
      <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.07] p-5 text-center">
        <p className="text-2xl" aria-hidden>✨</p>
        <p className="mt-1 text-sm font-semibold text-emerald-300">Sözün yenilendi</p>
        <p className="mt-1 text-xs text-slate-400">Şahitlerine haber gitti.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-royal-light/30 bg-royal/[0.06] p-5">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>📝</span>
        <h2 className="text-base font-bold text-royal-light">Sözünü yenileme zamanı</h2>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
        30 gün geçti — çok şey öğrendin. İstersen sözünü <b>bir kez</b> güncelleyebilirsin. Sesin
        kalır, sadece sözlerin tazelenir. Şahitlerin haberdar olur.
      </p>
      {!acik ? (
        <button
          onClick={() => setAcik(true)}
          className="mt-3 w-full rounded-xl border border-royal-light/40 py-2.5 text-sm font-semibold text-royal-light transition-colors hover:bg-royal/15"
        >
          Sözümü yenile
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            value={metin}
            onChange={(e) => setMetin(e.target.value.slice(0, 4000))}
            rows={8}
            className="w-full resize-none rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 font-serif text-sm leading-relaxed text-slate-100 outline-none focus:border-gold"
          />
          {durum === "hata" && (
            <p className="text-center text-xs text-amber-300">Kaydedilemedi — belki zaten yenilenmiş.</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => void kaydet()}
              disabled={durum === "kaydediliyor" || !metin.trim()}
              className="btn-kor flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {durum === "kaydediliyor" ? "Kaydediliyor…" : "Yeni sözümü mühürle"}
            </button>
            <button
              onClick={() => setAcik(false)}
              className="h-11 rounded-xl border border-white/15 px-4 text-sm text-slate-400 hover:bg-white/5"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
