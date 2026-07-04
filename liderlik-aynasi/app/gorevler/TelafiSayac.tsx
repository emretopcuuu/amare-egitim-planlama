"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// UX #3 + D8/D11 — Telafi penceresi: motivasyon paragrafı + ayrı sayaç satırı
// yerine TEK kompakt, belirgin şerit ("⏳ Telafi · X kaldı · yarı kıvılcım")
// + altında tek kısa soluk satır. Pencere kapanınca kart yine de durur (sayfa
// yenilenince sunucu eler) ama şerit "kapandı" der — son dakika kayıplarını önler.
export default function TelafiSayac({ bitis }: { bitis: string }) {
  // bitis = due_at + 24sa (ISO). İstemci saatine göre canlı sayar.
  const hedef = new Date(bitis).getTime();
  const [kalanMs, setKalanMs] = useState<number | null>(null);

  useEffect(() => {
    const guncelle = () => setKalanMs(hedef - Date.now());
    guncelle();
    const id = setInterval(guncelle, 30_000);
    return () => clearInterval(id);
  }, [hedef]);

  if (kalanMs === null) return null; // ilk render (hidrasyon) — saat farkı zıplamasın

  if (kalanMs <= 0) {
    return (
      <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-300 ring-1 ring-red-400/30">
        ⏳ {tr.gorevler.telafiBitti}
      </p>
    );
  }

  const saat = Math.floor(kalanMs / 3_600_000);
  const dakika = Math.floor((kalanMs % 3_600_000) / 60_000);
  const metin = saat > 0 ? `${saat} sa ${dakika} dk` : `${dakika} dk`;
  const acil = kalanMs <= 2 * 3_600_000; // son 2 saat

  return (
    <div className="mt-3">
      <p
        className={`rounded-xl px-3 py-2.5 text-sm font-bold ring-1 ${
          acil
            ? "bg-red-500/15 text-red-200 ring-red-400/40"
            : "bg-amber-400/15 text-amber-200 ring-amber-400/40"
        }`}
      >
        {tr.gorevler.telafiSerit(metin)}
      </p>
      <p className="mt-1 text-xs text-slate-500">{tr.gorevler.telafiNot}</p>
    </div>
  );
}
