"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// CANLI TAZELEME (katılımcı): ana sayfa bir sunucu durum makinesidir; admin bir
// dalga/rapor/boşluk/mühür açtığında açık duran telefon BAYAT kalır — kişi elle
// yenilemek (hatta PWA'yı kapatıp açmak) zorundaydı. Bu görünmez bileşen bunu
// otomatikleştirir:
//   1) Uygulama öne gelince / sekme görünür olunca → anında router.refresh()
//      (senin "kapat-aç" derdini kökten çözer).
//   2) Ekrana bakarken 12 sn'de bir /api/akis-suru imzasını yoklar; imza
//      değişince (yeni dalga, rapor açıldı, görev düştü...) sessizce yeniler.
// Admin ve büyük ekran kendi yenilemesine sahip — orada çalışmaz.
const ARALIK_MS = 12_000;
const EN_KISA_MS = 3_000; // arka arkaya yenilemeyi yumuşat

export default function CanliTazele() {
  const router = useRouter();
  const yol = usePathname();
  const sonImza = useRef<string | null>(null);
  const sonTazele = useRef(0);
  const kapali = useRef(false);

  // Admin paneli ve büyük ekran kendi tazeleme mantığına sahip → burada devre dışı.
  const etkin = !yol.startsWith("/admin") && !yol.startsWith("/ekran");

  const tazele = useCallback(() => {
    const simdi = Date.now();
    if (simdi - sonTazele.current < EN_KISA_MS) return;
    sonTazele.current = simdi;
    router.refresh();
  }, [router]);

  // İmzayı yokla; ilk okumada yalnız temel alır, sonraki değişimlerde yeniler.
  const yokla = useCallback(
    async (ilkSefer = false) => {
      if (kapali.current) return;
      try {
        const r = await fetch("/api/akis-suru", { cache: "no-store" });
        if (r.status === 401) {
          // Oturum yok (giriş/çıkış sayfası) → sessizce dur, istek üretme.
          kapali.current = true;
          return;
        }
        if (!r.ok) return;
        const { s } = (await r.json()) as { s?: string };
        if (typeof s !== "string") return;
        if (sonImza.current === null) {
          sonImza.current = s;
          return;
        }
        if (s !== sonImza.current) {
          sonImza.current = s;
          if (!ilkSefer) tazele();
        }
      } catch {
        // Ağ oynak — sessiz geç, sonraki turda dener.
      }
    },
    [tazele],
  );

  useEffect(() => {
    if (!etkin) return;
    kapali.current = false;

    // İlk temel imzayı al (sayfa zaten taze; yenileme yok).
    void yokla(true);

    const aralik = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine !== false) {
        void yokla();
      }
    }, ARALIK_MS);

    // Uygulama öne gelince / sekmeye dönünce: hem imzayı tazele hem de güvenli
    // tarafta kalmak için sunucu durumunu yenile (zamana bağlı kartlar da gelsin).
    function onGorunur() {
      if (document.visibilityState === "visible") {
        tazele();
        void yokla();
      }
    }
    function onOdak() {
      tazele();
      void yokla();
    }

    document.addEventListener("visibilitychange", onGorunur);
    window.addEventListener("focus", onOdak);
    return () => {
      clearInterval(aralik);
      document.removeEventListener("visibilitychange", onGorunur);
      window.removeEventListener("focus", onOdak);
    };
  }, [etkin, yokla, tazele]);

  return null;
}
