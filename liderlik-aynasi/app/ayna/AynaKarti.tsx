"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.aynaKarti;
const W = 1080;
const H = 1350; // 4:5 — Instagram dikey

// #10 Ayna Kartı: raporun kapanış özeti — arketip + en güçlü 3 yan + en çok
// gelişen, tek görselde. Harici kütüphane yok; doğrudan canvas'a çizilir.
function kartiCiz(
  canvas: HTMLCanvasElement,
  ad: string,
  arketipAd: string,
  simge: string,
  guclu: string[],
  gelisen: string | null
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Zemin: derin gece gradyanı
  const arkaPlan = ctx.createLinearGradient(0, 0, W * 0.5, H);
  arkaPlan.addColorStop(0, "#06121e");
  arkaPlan.addColorStop(1, "#0a1c2e");
  ctx.fillStyle = arkaPlan;
  ctx.fillRect(0, 0, W, H);

  // Altın çerçeve
  ctx.strokeStyle = "rgba(212, 175, 55, 0.55)";
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = "center";

  // Üst marka
  ctx.fillStyle = "#9cc3e0";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(tr.app.name.toLocaleUpperCase("tr-TR"), W / 2, 140);

  // İsim
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "500 50px system-ui, sans-serif";
  ctx.fillText(ad, W / 2, 220);

  // Arketip simgesi + adı
  ctx.font = "150px system-ui";
  ctx.fillText(simge, W / 2, 410);

  ctx.fillStyle = "#9cc3e0";
  ctx.font = "italic 400 32px Georgia, serif";
  ctx.fillText(t.kartUst, W / 2, 480);

  ctx.fillStyle = "#f59e0b";
  let boyut = 78;
  ctx.font = `800 ${boyut}px Georgia, serif`;
  while (ctx.measureText(arketipAd).width > W - 180 && boyut > 42) {
    boyut -= 4;
    ctx.font = `800 ${boyut}px Georgia, serif`;
  }
  ctx.fillText(arketipAd, W / 2, 560);

  // Ayırıcı çizgi
  ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 120, 620);
  ctx.lineTo(W / 2 + 120, 620);
  ctx.stroke();

  // En güçlü yanlar
  ctx.fillStyle = "#34d399";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText(t.gucluUst.toLocaleUpperCase("tr-TR"), W / 2, 700);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "500 46px system-ui, sans-serif";
  let y = 770;
  for (const g of guclu.slice(0, 3)) {
    ctx.fillText(g, W / 2, y);
    y += 66;
  }

  // En çok gelişen
  if (gelisen) {
    y += 24;
    ctx.fillStyle = "#a78bfa";
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.fillText(t.gelisenUst.toLocaleUpperCase("tr-TR"), W / 2, y);
    y += 64;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 50px system-ui, sans-serif";
    ctx.fillText(`🚀 ${gelisen}`, W / 2, y);
  }

  // Alt slogan
  ctx.fillStyle = "rgba(241, 245, 249, 0.5)";
  ctx.font = "400 30px system-ui, sans-serif";
  ctx.fillText(tr.app.tagline, W / 2, 1250);
}

export default function AynaKarti({
  ad,
  arketipAd,
  simge,
  guclu,
  gelisen,
}: {
  ad: string;
  arketipAd: string;
  simge: string;
  guclu: string[];
  gelisen: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paylasilabilir, setPaylasilabilir] = useState(false);

  useEffect(() => {
    if (canvasRef.current)
      kartiCiz(canvasRef.current, ad, arketipAd, simge, guclu, gelisen);
    // navigator SSR'da yok; paylaş butonu ancak hydration sonrası bilinebilir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaylasilabilir(typeof navigator.share === "function");
  }, [ad, arketipAd, simge, guclu, gelisen]);

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
    a.download = "liderlik-aynasi-ayna-karti.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function paylas() {
    const blob = await pngAl();
    if (!blob) return;
    const dosya = new File([blob], "liderlik-aynasi-ayna-karti.png", {
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
        className="mt-3 w-full rounded-xl ring-1 ring-gold/40"
      />
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
            className="flex-1 rounded-xl border border-gold/40 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft"
          >
            ↗ {t.paylas}
          </button>
        )}
      </div>
    </>
  );
}
