"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import KonusanYansima from "@/components/KonusanYansima";

// [YOLCULUK #10] 30/60/90. GÜN DÖNÜM TÖRENİ — tik o günlerde push atıyordu ama
// uygulamada iz yoktu. Milestone gününde ana ekranda kutlama afişi: kişi kampta
// verdiği sözü KENDİ SESİNDEN dinler (en güçlü motivasyon) + döneme özel rozet.
// Oturum başına bir kez (sessionStorage) — nag değil, tören. Normal hub'ı
// değiştirmez, üstünde afiş olarak durur; kapatılabilir.
export default function YolculukToren({
  gun,
  sozSesUrl,
}: {
  gun: number;
  sozSesUrl: string | null;
}) {
  const t = tr.yolculukUx;
  const [goster, setGoster] = useState(false);

  useEffect(() => {
    // Async IIFE: sessionStorage istemci-özel; setState'i efekt gövdesinde
    // senkron çağırmamak için sarmalanır (cascading render uyarısı).
    (async () => {
      try {
        const k = `la_toren_${gun}`;
        if (!sessionStorage.getItem(k)) {
          setGoster(true);
          sessionStorage.setItem(k, "1");
        }
      } catch {
        setGoster(true);
      }
    })();
  }, [gun]);

  if (!goster) return null;

  return (
    <section className="kart-cam relative overflow-hidden rounded-3xl border border-gold/40 p-6 text-center shadow-[0_0_30px_-8px_rgba(212,175,55,0.4)]">
      <button
        type="button"
        onClick={() => setGoster(false)}
        aria-label="Kapat"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 transition-colors hover:bg-white/20"
      >
        ✕
      </button>
      <p className="text-5xl" aria-hidden>🏁</p>
      <h2 className="prizma-serif ay-metin mt-2 text-2xl font-bold text-gold-light">
        {t.torenBaslik(gun)}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.torenMetin}</p>
      {sozSesUrl && (
        <div className="mt-3">
          <KonusanYansima videoUrl={null} sesUrl={sozSesUrl} etiket={t.torenSes} />
        </div>
      )}
      <p className="mt-3 inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold-light">
        🏅 {t.torenRozet(gun)}
      </p>
    </section>
  );
}
