"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const W = 1080;
const H = 1350; // 4:5 — paylaşıma uygun dikey

// Paylaşılabilir Profil Kartı: harici görsel yok (CORS taint riski yok), doğrudan
// canvas'a çizilir — kıvılcım + unvan kutlaması.
function ciz(
  canvas: HTMLCanvasElement,
  ad: string,
  takim: string,
  unvan: string,
  kivilcim: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const arka = ctx.createLinearGradient(0, 0, W * 0.4, H);
  arka.addColorStop(0, "#06121e");
  arka.addColorStop(1, "#0a1c2e");
  ctx.fillStyle = arka;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = "center";

  ctx.fillStyle = "#9cc3e0";
  ctx.font = "600 36px system-ui, sans-serif";
  ctx.fillText(tr.app.name.toLocaleUpperCase("tr-TR"), W / 2, 150);

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "600 56px system-ui, sans-serif";
  ctx.fillText(ad, W / 2, 260);
  if (takim) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "400 36px system-ui, sans-serif";
    ctx.fillText(takim, W / 2, 315);
  }

  ctx.font = "190px system-ui";
  ctx.fillText("⚡", W / 2, 600);

  ctx.fillStyle = "#f59e0b";
  ctx.font = "800 150px Georgia, serif";
  ctx.fillText(String(kivilcim), W / 2, 800);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 44px system-ui, sans-serif";
  ctx.fillText("KIVILCIM", W / 2, 860);

  ctx.fillStyle = "#9cc3e0";
  ctx.font = "italic 400 40px Georgia, serif";
  ctx.fillText(tr.kivilcim.unvanin, W / 2, 990);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "800 80px Georgia, serif";
  ctx.fillText(unvan, W / 2, 1085);

  ctx.fillStyle = "rgba(241, 245, 249, 0.5)";
  ctx.font = "400 30px system-ui, sans-serif";
  ctx.fillText(tr.app.tagline, W / 2, 1240);
}

export default function BenKarti({
  ad,
  takim,
  unvan,
  kivilcim,
}: {
  ad: string;
  takim: string;
  unvan: string;
  kivilcim: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paylasilabilir, setPaylasilabilir] = useState(false);

  useEffect(() => {
    if (canvasRef.current) ciz(canvasRef.current, ad, takim, unvan, kivilcim);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaylasilabilir(typeof navigator.share === "function");
  }, [ad, takim, unvan, kivilcim]);

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
    a.download = "liderlik-aynasi-profil.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function paylas() {
    const blob = await pngAl();
    if (!blob) return;
    const dosya = new File([blob], "liderlik-aynasi-profil.png", { type: "image/png" });
    try {
      await navigator.share({ files: [dosya], title: tr.app.name });
    } catch {
      // iptal — sorun değil
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="mt-3 w-full rounded-xl ring-1 ring-royal/40"
      />
      <div className="mt-3 flex gap-3">
        <button
          onClick={indir}
          className="btn-3d flex-1 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-light"
        >
          ⬇ {tr.arketip.indir}
        </button>
        {paylasilabilir && (
          <button
            onClick={paylas}
            className="flex-1 rounded-xl border border-royal-light/40 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft"
          >
            ↗ {tr.arketip.paylas}
          </button>
        )}
      </div>
    </>
  );
}
