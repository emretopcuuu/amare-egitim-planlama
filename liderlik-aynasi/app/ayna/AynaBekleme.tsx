"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import PrizmaArkaplan from "@/components/prizma/PrizmaArkaplan";

const YOKLAMA_MS = 5000;

// Senkronize "Ayna Anı": admin reports_visible'ı açtığında salondaki tüm
// telefonlar bir sonraki yoklamada aynı anda rapora geçer. PRİZMA evreninde
// bekleyiş, kırıkların en yoğun süzüldüğü sahnedir — birleşme anını bekler.
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
    <main className="evren-prizma flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden p-6 text-center">
      <PrizmaArkaplan adet={28} />
      <div className="kart-cam relative overflow-hidden rounded-3xl p-10">
        <p className="prizma-serif text-xs uppercase tracking-[0.45em] text-slate-400">
          Ayna Anı
        </p>
        <h1 className="prizma-serif tayf-metin mt-3 text-3xl font-semibold">
          {tr.ayna.bekleBaslik.replace(" 🔮", "")}
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-slate-300">
          {tr.ayna.bekleAciklama}
        </p>
        <div className="mt-8 flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-200/70"
              style={{ animationDelay: `${i * 300}ms` }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
