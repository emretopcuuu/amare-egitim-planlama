"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// UX #3 — Telafi penceresi geri sayımı. Süresi geçen görev 24 saat içinde
// telafi edilebilir; kişi "ne kadar vaktim kaldı?" belirsizliğinde kalmasın.
// Pencere kapanınca kart yine de durur (sayfa yenilenince sunucu eler) ama
// rozet "az kaldı / bitiyor" diye uyarır — son dakika kayıplarını önler.
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
      <p className="mt-2 text-xs font-semibold text-red-300">
        ⏳ {tr.gorevler.telafiBitti}
      </p>
    );
  }

  const saat = Math.floor(kalanMs / 3_600_000);
  const dakika = Math.floor((kalanMs % 3_600_000) / 60_000);
  const metin = saat > 0 ? `${saat} sa ${dakika} dk` : `${dakika} dk`;
  const acil = kalanMs <= 2 * 3_600_000; // son 2 saat

  return (
    <p
      className={`mt-2 text-xs font-semibold ${acil ? "text-red-300" : "text-amber-300/90"}`}
    >
      ⏳ {tr.gorevler.telafiKalan(metin)}
    </p>
  );
}
