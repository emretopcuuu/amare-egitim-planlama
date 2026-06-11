"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.kelimeKarti;
const W = 1080;
const H = 1350; // 4:5 — Instagram dikey

// Paylaşılabilir Kelime Kartı: harici kütüphane yok, kart doğrudan canvas'a
// çizilir. Aynı canvas hem önizleme hem PNG kaynağıdır.
function kartiCiz(canvas: HTMLCanvasElement, ad: string, ozellik: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const arkaPlan = ctx.createLinearGradient(0, 0, W * 0.4, H);
  arkaPlan.addColorStop(0, "#1e1233");
  arkaPlan.addColorStop(1, "#2d1b4e");
  ctx.fillStyle = arkaPlan;
  ctx.fillRect(0, 0, W, H);

  // çerçeve
  ctx.strokeStyle = "rgba(212, 175, 55, 0.6)";
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = "center";

  ctx.fillStyle = "#a78bfa";
  ctx.font = "600 38px system-ui, sans-serif";
  ctx.fillText(tr.app.name.toLocaleUpperCase("tr-TR"), W / 2, 170);

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "500 56px system-ui, sans-serif";
  ctx.fillText(ad, W / 2, 560);

  // Özellik — kartın yıldızı. Uzun adlarda ölçü küçültülür.
  ctx.fillStyle = "#d4af37";
  let boyut = 130;
  ctx.font = `800 ${boyut}px Georgia, serif`;
  while (ctx.measureText(ozellik).width > W - 160 && boyut > 60) {
    boyut -= 6;
    ctx.font = `800 ${boyut}px Georgia, serif`;
  }
  ctx.fillText(ozellik, W / 2, 740);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "italic 400 40px Georgia, serif";
  ctx.fillText(t.altYazi, W / 2, 830);

  // ayna simgesi
  ctx.font = "120px system-ui";
  ctx.fillText("🪞", W / 2, 1080);

  ctx.fillStyle = "rgba(241, 245, 249, 0.5)";
  ctx.font = "400 30px system-ui, sans-serif";
  ctx.fillText(tr.app.tagline, W / 2, 1230);
}

export default function KelimeKarti({
  ad,
  ozellik,
}: {
  ad: string;
  ozellik: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paylasilabilir, setPaylasilabilir] = useState(false);

  useEffect(() => {
    if (canvasRef.current) kartiCiz(canvasRef.current, ad, ozellik);
    // navigator SSR'da yok; paylaş butonu ancak hydration sonrası bilinebilir.
    // Bilinçli istisna — tek seferlik, kaskad render yok.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaylasilabilir(typeof navigator.share === "function");
  }, [ad, ozellik]);

  const pngAl = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      canvasRef.current?.toBlob((b) => resolve(b), "image/png");
    });
  }, []);

  async function indir() {
    const blob = await pngAl();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "liderlik-aynasi-kelime-karti.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function paylas() {
    const blob = await pngAl();
    if (!blob) return;
    const dosya = new File([blob], "liderlik-aynasi-kelime-karti.png", {
      type: "image/png",
    });
    try {
      await navigator.share({ files: [dosya], title: tr.app.name });
    } catch {
      // kullanıcı paylaşımı iptal etti — sorun değil
    }
  }

  return (
    <section className="rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-gold/30 backdrop-blur">
      <h2 className="font-semibold text-gold-light">{t.baslik}</h2>
      <p className="mt-1 text-xs text-slate-400">{t.aciklama}</p>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="mt-4 w-full rounded-xl ring-1 ring-royal/40"
      />

      <div className="mt-4 flex gap-3">
        <button
          onClick={indir}
          className="flex-1 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light"
        >
          ⬇ {t.indir}
        </button>
        {paylasilabilir && (
          <button
            onClick={paylas}
            className="flex-1 rounded-xl border border-royal-light/40 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft"
          >
            ↗ {t.paylas}
          </button>
        )}
      </div>
    </section>
  );
}
