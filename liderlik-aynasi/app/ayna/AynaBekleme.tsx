"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const YOKLAMA_MS = 5000;

// Senkronize "Ayna Anı": admin reports_visible'ı açtığında salondaki tüm
// telefonlar bir sonraki yoklamada aynı anda rapora geçer. GECE GÖLÜ
// evreninde bekleyiş, suyun durulmasını izlemektir — ayna olmasını bekler.
export default function AynaBekleme() {
  const router = useRouter();
  const durdu = useRef(false);

  // [E1-c] Reveal ÖNCESİ kendi mektup sesini service worker'a önbellet — reveal
  // anında 29 telefon aynı anda açsa bile ses ağdan değil önbellekten çalar.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg) => {
        const hedef = reg.active ?? navigator.serviceWorker.controller;
        hedef?.postMessage({ tip: "la-onbellek", url: "/api/mektup-ses" });
      })
      .catch(() => {});
  }, []);

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
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto flex w-full max-w-md flex-col items-center p-5 text-center">
      <div className="kart-cam relative overflow-hidden rounded-3xl p-10">
        <p className="prizma-serif text-xs uppercase tracking-[0.45em] text-slate-400">
          Ayna Anı
        </p>
        <h1 className="prizma-serif ay-metin mt-3 text-3xl font-semibold">
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
      </div>
    </main>
  );
}
