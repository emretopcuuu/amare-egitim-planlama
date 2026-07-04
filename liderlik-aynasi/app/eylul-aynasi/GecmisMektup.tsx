"use client";

import { useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.eylulAynasi;

// Özellik 4 — 90. gün dönüşü: kampın 2. gecesi kaydedilen sesli mektubun mührü
// açıldı. Dokununca GET /api/sesli-mektup imzalı URL döner (sunucu dinlendi_at'ı
// damgalar) ve kayıt çalınır.

export default function GecmisMektup() {
  const [durum, setDurum] = useState<"hazir" | "yukleniyor" | "caliyor" | "hata">("hazir");
  const ses = useRef<HTMLAudioElement | null>(null);

  async function dinle() {
    // Tekrar dinleme: URL bir kez alındıysa yeniden kullan.
    if (ses.current) {
      ses.current.currentTime = 0;
      void ses.current.play().then(() => setDurum("caliyor")).catch(() => setDurum("hata"));
      return;
    }
    setDurum("yukleniyor");
    try {
      const res = await fetch("/api/sesli-mektup");
      if (!res.ok) throw new Error();
      const veri = (await res.json()) as { url?: string };
      if (!veri.url) throw new Error();
      const a = new Audio(veri.url);
      a.onended = () => setDurum("hazir");
      ses.current = a;
      await a.play();
      setDurum("caliyor");
    } catch {
      setDurum("hata");
    }
  }

  return (
    <section className="rounded-2xl border border-gold/40 bg-gold/[0.08] p-5">
      <h2 className="font-display text-lg font-bold text-gold-light">{t.mektupBaslik}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.mektupMetin}</p>
      <button
        type="button"
        onClick={dinle}
        disabled={durum === "yukleniyor" || durum === "caliyor"}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-gold/90 px-4 text-base font-bold text-midnight transition-colors hover:bg-gold disabled:opacity-60"
      >
        {durum === "yukleniyor" ? t.mektupYukleniyor : t.mektupDinle}
      </button>
      {durum === "hata" && (
        <p className="mt-2 text-center text-xs text-red-300">{t.mektupHata}</p>
      )}
    </section>
  );
}
