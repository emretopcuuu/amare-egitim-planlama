"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Kapi = { id: string; etiket: string };

// FAZ 5.4 — İKİ KAPI: kişi iki kapıdan birini seçer. Seçince açılır, geri
// dönüş yok. Seçilen görev normal aktif göreve dönüşür (sayfa yenilenir).
export default function KapiSecimi({ kapilar }: { kapilar: Kapi[] }) {
  const router = useRouter();
  const [seciliyor, setSeciliyor] = useState<string | null>(null);

  async function sec(gorevId: string) {
    if (seciliyor) return;
    setSeciliyor(gorevId);
    try {
      const r = await fetch("/api/kapi-sec", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId }),
      });
      if (r.ok) router.refresh();
      else setSeciliyor(null);
    } catch {
      setSeciliyor(null);
    }
  }

  return (
    <section className="kart-3d rounded-2xl border border-gold/30 bg-midnight-card/60 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-gold-light/80">🚪 Bir kapı seç</p>
      <p className="mt-1 text-sm text-slate-400">Seçtiğin açılır — geri dönüş yok.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {kapilar.map((k) => (
          <button
            key={k.id}
            onClick={() => void sec(k.id)}
            disabled={!!seciliyor}
            className="btn-kor flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center text-base font-bold disabled:opacity-40"
          >
            <span className="text-2xl">{k.etiket.split(" ")[0]}</span>
            <span className="text-sm">{k.etiket.replace(/^\S+\s/, "")}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
