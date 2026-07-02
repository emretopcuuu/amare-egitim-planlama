"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Kapi = { id: string; etiket: string };

// FAZ 5.4 / [E6] — KAPI/ÇEK SEÇİMİ: kişi kartlardan birini seçer. Seçince o kart
// açılır (aktif göreve döner), DİĞERLERİ yanar-söner kaybolur (geri dönüş yok).
// 2 kart = İki Kapı; 3 kart = Görev Çek (sessizleşip dönen kişiye nazik aktivasyon).
export default function KapiSecimi({ kapilar }: { kapilar: Kapi[] }) {
  const router = useRouter();
  const [secilen, setSecilen] = useState<string | null>(null);
  const cok = kapilar.length >= 3;

  async function sec(gorevId: string) {
    if (secilen) return;
    setSecilen(gorevId); // seçileni işaretle → diğerleri sönmeye başlar
    try {
      const r = await fetch("/api/kapi-sec", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId }),
      });
      if (r.ok) {
        // Sönme animasyonu görünsün diye kısa gecikme, sonra yenile.
        setTimeout(() => router.refresh(), 650);
      } else {
        setSecilen(null);
      }
    } catch {
      setSecilen(null);
    }
  }

  return (
    <section className="kart-3d rounded-2xl border border-gold/30 bg-midnight-card/60 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-gold-light/80">
        {cok ? "🎴 Bir görev çek" : "🚪 Bir kapı seç"}
      </p>
      <p className="mt-1 text-sm text-slate-400">
        {cok ? "Birini çek — gerisi söner." : "Seçtiğin açılır — geri dönüş yok."}
      </p>
      <div className={`mt-4 grid gap-3 ${cok ? "grid-cols-3" : "grid-cols-2"}`}>
        {kapilar.map((k) => {
          const bu = secilen === k.id;
          const diger = secilen != null && !bu;
          return (
            <button
              key={k.id}
              onClick={() => void sec(k.id)}
              disabled={!!secilen}
              className={`btn-kor flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center font-bold transition-all duration-500 ${
                cok ? "text-sm" : "text-base"
              } ${bu ? "scale-105 ring-2 ring-gold" : ""} ${
                diger ? "scale-90 opacity-0" : "opacity-100"
              }`}
            >
              <span className={cok ? "text-xl" : "text-2xl"}>{k.etiket.split(" ")[0]}</span>
              <span className="text-sm">{k.etiket.replace(/^\S+\s/, "")}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
