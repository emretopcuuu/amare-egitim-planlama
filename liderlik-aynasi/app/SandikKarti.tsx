"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sesCal } from "@/lib/sesEfekti";

// G2 — ana sayfadaki gizemli sandık. bekleyen>0 iken elmasın altında hafif
// sallanan sandık; dokun → 1.5 sn açılış → ödül. reduced-motion'da statik.
type Odul = { tur: string; deger: number; baslik: string; metin: string; ikon: string; altin: boolean };

export default function SandikKarti({ bekleyen: bekleyenBaslangic }: { bekleyen: number }) {
  const router = useRouter();
  const [bekleyen, setBekleyen] = useState(bekleyenBaslangic);
  const [faz, setFaz] = useState<"idle" | "aciliyor" | "odul">("idle");
  const [odul, setOdul] = useState<Odul | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [hareketli, setHareketli] = useState(true);
  const zaman = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHareketli(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    return () => {
      if (zaman.current) clearTimeout(zaman.current);
    };
  }, []);

  if (bekleyen <= 0 && faz === "idle") return null;

  async function ac() {
    if (faz !== "idle") return;
    setHata(null);
    setFaz("aciliyor");
    sesCal("kart-ac");
    try {
      const r = await fetch("/api/sandik", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; odul?: Odul; hata?: string };
      // Animasyon en az 1.5 sn görünsün (hareketli değilse kısa).
      const bekle = hareketli ? 1500 : 250;
      zaman.current = setTimeout(() => {
        if (r.ok && j.odul) {
          setOdul(j.odul);
          setFaz("odul");
          setBekleyen((b) => Math.max(0, b - 1));
          sesCal(j.odul.altin ? "fiero" : "kivilcim");
        } else {
          setHata(j.hata ?? "Açılamadı.");
          setFaz("idle");
        }
      }, bekle);
    } catch {
      setHata("Ağ hatası.");
      setFaz("idle");
    }
  }

  function kapat() {
    setFaz("idle");
    setOdul(null);
    router.refresh(); // cüzdan/koleksiyon güncellensin
  }

  return (
    <div className="mt-3">
      {faz === "idle" && (
        <button
          onClick={ac}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gold/40 bg-gradient-to-b from-gold/[0.12] to-gold/[0.04] py-4 transition-transform active:scale-95"
        >
          <span className={`text-3xl ${hareketli ? "sandik-salla" : ""}`} aria-hidden>
            🎁
          </span>
          <span className="text-left">
            <span className="block text-sm font-bold text-gold-light">Gizemli sandık hazır</span>
            <span className="block text-xs text-slate-400">
              {bekleyen > 1 ? `${bekleyen} sandık` : "Dokun, aç"} · içinde ne var?
            </span>
          </span>
        </button>
      )}

      {faz === "aciliyor" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gold/40 bg-gold/[0.06] py-8">
          <span className={`text-5xl ${hareketli ? "sandik-titre" : ""}`} aria-hidden>
            🎁
          </span>
          <p className="mt-3 text-sm text-gold-light">açılıyor…</p>
        </div>
      )}

      {faz === "odul" && odul && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6" onClick={kapat}>
          <div
            className={`w-full max-w-sm rounded-3xl border p-7 text-center ${
              odul.altin ? "border-gold bg-gradient-to-b from-gold/25 to-midnight-card" : "border-gold/40 bg-midnight-card"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`text-6xl ${hareketli ? "sandik-patla" : ""}`}>{odul.ikon}</p>
            <h3 className="prizma-serif mt-3 text-2xl font-bold text-gold">{odul.baslik}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{odul.metin}</p>
            <button onClick={kapat} className="btn-kor mt-6 h-12 w-full rounded-xl text-base font-bold">
              Harika
            </button>
            <Link href="/koleksiyon" className="mt-3 block text-xs text-slate-400 underline-offset-2 hover:underline">
              Koleksiyonuma bak →
            </Link>
          </div>
        </div>
      )}

      {hata && <p className="mt-1 text-center text-xs text-amber-400">{hata}</p>}
    </div>
  );
}
