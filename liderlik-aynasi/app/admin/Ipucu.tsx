"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tr } from "@/lib/i18n/tr";

// #10 Admin yardım katmanı: her kontrolün/bölümün yanında küçük "?" → ne işe
// yarar, nasıl işletilir, nelere dikkat edilir. Yerine bakan bir görevli bile
// soru sormadan işi yürütebilsin. metin tek satır ya da paragraf dizisi olabilir;
// baslik verilirse popover üstünde kalın başlık gösterilir.
// YENİ ÖZELLİK EKLENDİĞİNDE: ilgili açıklamayı tr.admin.yardim içinde güncelle.
export default function Ipucu({
  metin,
  baslik,
}: {
  metin: string | readonly string[];
  baslik?: string;
}) {
  const [acik, setAcik] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [konum, setKonum] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxH: number;
  } | null>(null);

  function degis() {
    if (acik) {
      setAcik(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const genislik = 320; // 20rem
      const left = Math.max(8, Math.min(r.left, window.innerWidth - genislik - 8));
      // Dikey sınır: altta yer yoksa (ekran dibindeki butonlar) üstte aç —
      // taşmasın. Yüksekliği uygun boşluğa göre sınırla (içeride kaydırılır).
      const altBosluk = window.innerHeight - r.bottom;
      const ustBosluk = r.top;
      const ustte = altBosluk < 260 && ustBosluk > altBosluk;
      setKonum(
        ustte
          ? { left, bottom: window.innerHeight - r.top + 6, maxH: ustBosluk - 16 }
          : { left, top: r.bottom + 6, maxH: altBosluk - 16 }
      );
    }
    setAcik(true);
  }

  // Kaydırma / yeniden boyutlandırmada konum kaymasın diye kapat.
  useEffect(() => {
    if (!acik) return;
    const kapat = () => setAcik(false);
    window.addEventListener("resize", kapat);
    window.addEventListener("scroll", kapat, true);
    return () => {
      window.removeEventListener("resize", kapat);
      window.removeEventListener("scroll", kapat, true);
    };
  }, [acik]);

  const paragraflar = Array.isArray(metin) ? metin : [metin as string];

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          // Tıklanır kapsayıcı (Link, <summary>) içinde de güvenli: parent'ı tetikleme.
          e.preventDefault();
          e.stopPropagation();
          degis();
        }}
        aria-label={tr.admin.ipucu.ac}
        aria-expanded={acik}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10"
      >
        ?
      </button>
      {acik &&
        konum &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setAcik(false)}
              className="fixed inset-0 z-[60] cursor-default"
            />
            <div
              role="tooltip"
              style={{
                position: "fixed",
                left: konum.left,
                top: konum.top,
                bottom: konum.bottom,
                maxHeight: konum.maxH,
              }}
              className="z-[61] w-80 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-royal-light/40 bg-midnight-card p-4 text-sm font-normal leading-relaxed text-slate-200 shadow-2xl"
            >
              {baslik && <p className="mb-2 text-sm font-bold text-gold-light">{baslik}</p>}
              <div className="space-y-2">
                {paragraflar.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </span>
  );
}
