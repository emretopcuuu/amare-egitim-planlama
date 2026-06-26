"use client";

import { useEffect } from "react";

// Geliştirme 1 — Bildirim Merkezi yardımcısı: SW'den gelen postMessage'ı dinle
// ve localStorage log'una yaz. BildirimListesi bu log'u gösterir.

const LOG_ANAHTAR = "la_bildirim_log";
const MAKS_KAYIT = 50;

type Kayit = {
  id: string;
  baslik: string;
  govde: string;
  url: string;
  zaman: number;
  okundu: boolean;
};

export function kaydetBildirim(baslik: string, govde: string, url: string): void {
  try {
    const ham = localStorage.getItem(LOG_ANAHTAR);
    const mevcut: Kayit[] = ham ? JSON.parse(ham) : [];
    const yeni: Kayit = {
      id: crypto.randomUUID(),
      baslik,
      govde,
      url,
      zaman: Date.now(),
      okundu: false,
    };
    localStorage.setItem(LOG_ANAHTAR, JSON.stringify([yeni, ...mevcut].slice(0, MAKS_KAYIT)));
  } catch {}
}

// Uygulamanın root layout'unda bir kez monte edilir; SW push mesajlarını yakalar.
export function useBildirimLog(): void {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const dinle = (event: MessageEvent) => {
      if (event.data?.tip === "la_bildirim_geldi") {
        kaydetBildirim(event.data.baslik ?? "", event.data.govde ?? "", event.data.url ?? "/");
      }
    };

    navigator.serviceWorker.addEventListener("message", dinle);
    return () => navigator.serviceWorker.removeEventListener("message", dinle);
  }, []);
}
