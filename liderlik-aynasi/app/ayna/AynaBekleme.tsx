"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const YOKLAMA_MS = 5000;

// Senkronize "Ayna Anı": admin reports_visible'ı açtığında salondaki tüm
// telefonlar bir sonraki yoklamada aynı anda rapora geçer.
export default function AynaBekleme() {
  const router = useRouter();
  const durdu = useRef(false);

  useEffect(() => {
    durdu.current = false;
    const zamanlayici = setInterval(async () => {
      if (durdu.current || document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/ayna-durumu");
        if (!res.ok) return;
        const veri = await res.json();
        if (veri.acik) {
          durdu.current = true;
          clearInterval(zamanlayici);
          router.refresh();
        }
      } catch {
        // ağ takıldı: bir sonraki yoklamada tekrar dene
      }
    }, YOKLAMA_MS);
    return () => {
      durdu.current = true;
      clearInterval(zamanlayici);
    };
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="rounded-2xl bg-midnight-card/60 p-10 shadow-2xl ring-1 ring-gold/30 backdrop-blur">
        <p className="animate-pulse text-6xl">🪞</p>
        <h1 className="mt-6 text-2xl font-bold text-gold">
          {tr.ayna.bekleBaslik}
        </h1>
        <p className="mt-3 text-slate-300">{tr.ayna.bekleAciklama}</p>
        <div className="mt-8 flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 animate-pulse rounded-full bg-gold/60"
              style={{ animationDelay: `${i * 300}ms` }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
