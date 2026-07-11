"use client";

/* Görsel paket #10 — Kamp Radyosu kartının canlı başlığı: ses çalarken maskot
   KONUŞMA video loop'una geçer (dev ekrandaki davranışın mobil karşılığı),
   ses yoksa/durunca statik konuşuyor pozunda kalır. Ses yoksa yalnız avatar. */

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";
import AynaSahneLoop from "@/components/AynaSahneLoop";
import AynaYuzu from "@/components/AynaYuzu";
import SesCal from "@/components/SesCal";

const t = tr.gorevler;

export default function RadyoCanli({
  slot,
  sesUrl,
}: {
  slot: string;
  sesUrl: string | null;
}) {
  const [caliyor, setCaliyor] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {caliyor ? (
        <AynaSahneLoop mod="konusma" boyut={44} sinif="shrink-0" />
      ) : (
        <AynaYuzu durum="konusuyor" boyut={44} sinif="shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-gold-light/80">
          📻 {t.radyoBaslik}
        </p>
        <p className="text-sm text-slate-400">
          {slot === "sabah" ? t.radyoSabah : t.radyoAksam}
        </p>
      </div>
      {sesUrl && (
        <div className="w-32 shrink-0">
          <SesCal url={sesUrl} etiket={t.radyoDinle} onCaliyor={setCaliyor} />
        </div>
      )}
    </div>
  );
}
