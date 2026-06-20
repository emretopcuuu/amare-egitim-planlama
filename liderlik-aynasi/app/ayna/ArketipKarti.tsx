"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import OkuButonu from "@/components/OkuButonu";

const t = tr.arketip;
const W = 1080;
const H = 1350; // 4:5 — Instagram dikey

// Paylaşılabilir Arketip Kartı: harici kütüphane yok, doğrudan canvas'a çizilir.
function kartiCiz(
  canvas: HTMLCanvasElement,
  ad: string,
  arketipAd: string,
  simge: string,
  ozet: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const arkaPlan = ctx.createLinearGradient(0, 0, W * 0.4, H);
  arkaPlan.addColorStop(0, "#06121e");
  arkaPlan.addColorStop(1, "#0a1c2e");
  ctx.fillStyle = arkaPlan;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = "center";

  ctx.fillStyle = "#9cc3e0";
  ctx.font = "600 36px system-ui, sans-serif";
  ctx.fillText(tr.app.name.toLocaleUpperCase("tr-TR"), W / 2, 150);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 46px system-ui, sans-serif";
  ctx.fillText(ad, W / 2, 250);

  // Arketip simgesi
  ctx.font = "200px system-ui";
  ctx.fillText(simge, W / 2, 530);

  ctx.fillStyle = "#9cc3e0";
  ctx.font = "italic 400 36px Georgia, serif";
  ctx.fillText(t.kartUstYazi, W / 2, 640);

  // Arketip adı — kartın yıldızı
  ctx.fillStyle = "#f59e0b";
  let boyut = 96;
  ctx.font = `800 ${boyut}px Georgia, serif`;
  while (ctx.measureText(arketipAd).width > W - 160 && boyut > 48) {
    boyut -= 5;
    ctx.font = `800 ${boyut}px Georgia, serif`;
  }
  ctx.fillText(arketipAd, W / 2, 740);

  // Özet — satırlara böl
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "400 40px system-ui, sans-serif";
  const kelimeler = ozet.split(" ");
  let satir = "";
  let y = 880;
  for (const k of kelimeler) {
    const deneme = satir ? `${satir} ${k}` : k;
    if (ctx.measureText(deneme).width > W - 200 && satir) {
      ctx.fillText(satir, W / 2, y);
      satir = k;
      y += 56;
    } else {
      satir = deneme;
    }
  }
  if (satir) ctx.fillText(satir, W / 2, y);

  ctx.fillStyle = "rgba(241, 245, 249, 0.5)";
  ctx.font = "400 30px system-ui, sans-serif";
  ctx.fillText(tr.app.tagline, W / 2, 1240);
}

export default function ArketipKarti({
  ad,
  arketipAd,
  simge,
  ozet,
}: {
  ad: string;
  arketipAd: string;
  simge: string;
  ozet: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paylasilabilir, setPaylasilabilir] = useState(false);

  useEffect(() => {
    if (canvasRef.current) kartiCiz(canvasRef.current, ad, arketipAd, simge, ozet);
    // navigator SSR'da yok; paylaş butonu ancak hydration sonrası bilinebilir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaylasilabilir(typeof navigator.share === "function");
  }, [ad, arketipAd, simge, ozet]);

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
    a.download = "liderlik-aynasi-arketip.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function paylas() {
    const blob = await pngAl();
    if (!blob) return;
    const dosya = new File([blob], "liderlik-aynasi-arketip.png", {
      type: "image/png",
    });
    try {
      await navigator.share({ files: [dosya], title: tr.app.name });
    } catch {
      // kullanıcı paylaşımı iptal etti — sorun değil
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="mt-4 w-full rounded-xl ring-1 ring-royal/40"
      />
      {/* UX #8: arketip özeti kartta görsel — sesli de dinlenebilsin */}
      <OkuButonu metin={`${arketipAd}. ${ozet}`} />
      <div className="mt-4 flex gap-3">
        <button
          onClick={indir}
          className="flex-1 btn-3d rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-light"
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
    </>
  );
}
