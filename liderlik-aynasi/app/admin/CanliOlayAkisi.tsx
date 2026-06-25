"use client";

import { useEffect, useRef } from "react";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

// UX #2 — Canlı olay akışı. Arka planda /api/admin/canli-olaylar yoklanır;
// yeni bir kritik eylem (dalga açıldı, rapor açıldı, kriz bayrağı…) olunca
// panelde küçük bir bildirim belirir. Operatör sürekli yenilemek zorunda kalmaz.
// İlk yüklemede mevcut kayıtlar "görüldü" sayılır (geçmiş için toast yağmuru yok).
const e = tr.islemGunlugu;

function eylemAdi(eylem: string): string {
  return e.eylemler[eylem] ?? eylem;
}

export default function CanliOlayAkisi({ saniye = 20 }: { saniye?: number }) {
  const gorulen = useRef<Set<string> | null>(null);

  useEffect(() => {
    let durduruldu = false;

    async function yokla() {
      try {
        const res = await fetch("/api/admin/canli-olaylar", { cache: "no-store" });
        if (!res.ok) return;
        const { olaylar } = (await res.json()) as {
          olaylar: { id: string; eylem: string; kim: string | null }[];
        };
        if (durduruldu) return;
        if (!gorulen.current) {
          // İlk yükleme: hepsini görüldü say, toast gösterme.
          gorulen.current = new Set(olaylar.map((o) => o.id));
          return;
        }
        // En eskiden yeniye doğru: en fazla 4 toast (yağmur olmasın).
        const yeni = olaylar.filter((o) => !gorulen.current!.has(o.id)).reverse();
        yeni.forEach((o) => gorulen.current!.add(o.id));
        for (const o of yeni.slice(-4)) {
          tost(`${eylemAdi(o.eylem)}${o.kim ? ` · ${o.kim}` : ""}`, "bilgi");
        }
      } catch {
        // ağ hatası → sessizce geç, bir sonraki turda dene
      }
    }

    void yokla();
    const i = setInterval(() => {
      if (document.visibilityState === "visible") void yokla();
    }, saniye * 1000);
    return () => {
      durduruldu = true;
      clearInterval(i);
    };
  }, [saniye]);

  return null;
}
