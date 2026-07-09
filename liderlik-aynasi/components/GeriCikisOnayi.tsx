"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.geriCikis;

// [#6] MUHAFAZAKÂR geri-tuşu güvenliği. Çok adımlı kritik akışta (ritüel) telefon
// geri tuşu akışı aniden bozmasın: bir sentinel geçmiş girişiyle geri basışı
// yakalar ve "çıkmak istiyor musun?" onayı gösterir. KİLİTLEMEZ — "Çık" gerçek
// çıkışa izin verir. Güvenli başarısızlık: popstate yakalanamazsa geri tuşu
// normal davranır (kimse mahsur kalmaz). aktif=false iken hiç devreye girmez.
export default function GeriCikisOnayi({
  aktif = true,
  metin,
}: {
  aktif?: boolean;
  metin?: string;
}) {
  const [sor, setSor] = useState(false);
  const birakRef = useRef(false); // "Çık" akışı: popstate'i yok say, bırak gitsin

  useEffect(() => {
    if (!aktif || typeof window === "undefined") return;
    // Tuzak: bir sentinel geçmiş girişi. Geri basınca bunu pop'lar → yakalarız.
    window.history.pushState({ la_geri_tuzak: 1 }, "");
    const handler = () => {
      if (birakRef.current) return; // gerçekten çıkılıyor
      setSor(true);
      // URL geri gelsin diye sentinel'i yeniden it → kişi sayfada kalır.
      window.history.pushState({ la_geri_tuzak: 1 }, "");
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [aktif]);

  function kal() {
    setSor(false);
  }
  function cik() {
    birakRef.current = true;
    setSor(false);
    window.history.back(); // sentinel'i geri al → önceki sayfaya/uygulamadan çık
  }

  if (!sor) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6"
      onClick={kal}
    >
      <div
        className="kart-cam w-full max-w-xs rounded-3xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-3xl" aria-hidden>⏸</p>
        <h2 className="prizma-serif ay-metin mt-2 text-xl font-bold">{t.baslik}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{metin ?? t.metin}</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={kal}
            className="btn-kor flex-1 rounded-2xl py-3 text-base font-bold"
          >
            {t.kal}
          </button>
          <button
            onClick={cik}
            className="flex-1 rounded-2xl border border-white/20 py-3 text-base font-medium text-slate-300 transition-colors hover:bg-white/5"
          >
            {t.cik}
          </button>
        </div>
      </div>
    </div>
  );
}
