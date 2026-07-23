"use client";

import { useEffect, useState } from "react";

// [YOLCULUK #15] Kurulum koçu kartları (telefona ekle / bildirim aç) her ana
// sayfa açılışında çıkıyor — 90 gün boyunca her gün aynı dürtme yorar. Yolculuk
// modunda bu sarmalayıcı, "şimdilik gerek yok" diyene 7 gün boyunca kartları
// göstermez (localStorage snooze). Kamp modunda hiç kullanılmaz — kartlar
// doğrudan render edilir (kamp öncesi kurulum kritik). Zaten kurmuş/abone olmuş
// kişide alt kartlar kendini gizler; bu yalnız kalan azınlığın nagını keser.
const ANAHTAR = "la_kurulum_ertele";
const SURE = 7 * 86_400_000;

export default function KurulumErtele({ children }: { children: React.ReactNode }) {
  const [durum, setDurum] = useState<"yukleniyor" | "gizli" | "gorunur">("yukleniyor");

  useEffect(() => {
    // Async IIFE: localStorage yalnız istemcide okunabilir; setState'i efekt
    // gövdesinde senkron çağırmamak için (cascading render uyarısı) sarmalanır.
    (async () => {
      try {
        const ts = Number(localStorage.getItem(ANAHTAR) ?? "0");
        setDurum(new Date().getTime() - ts < SURE ? "gizli" : "gorunur");
      } catch {
        setDurum("gorunur");
      }
    })();
  }, []);

  if (durum !== "gorunur") return null;

  return (
    <div>
      {children}
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(ANAHTAR, String(Date.now()));
          } catch {}
          setDurum("gizli");
        }}
        className="mt-2 block w-full text-center text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        Şimdilik gerek yok — bir hafta sonra hatırlat
      </button>
    </div>
  );
}
