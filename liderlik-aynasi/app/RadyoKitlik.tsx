"use client";

import { useEffect, useRef, useState } from "react";
import { sesCal } from "@/lib/sesEfekti";

// G7 — canlı radyo kıtlık kartı. Yayın açıldığında (≤5 dk taze) belirir, geri
// sayım biter bitmez kaybolur (tekrar yok). ~30 sn poll. reduced-motion: nabız yok.
type Yayin = { id: string; metin: string; sesUrl: string | null; kalanSn: number };

export default function RadyoKitlik() {
  const [yayin, setYayin] = useState<Yayin | null>(null);
  const [kalan, setKalan] = useState(0);
  const gorulen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let iptal = false;
    async function yokla() {
      try {
        const r = await fetch("/api/radyo-kitlik", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { yayin: Yayin | null };
        if (iptal) return;
        if (j.yayin) {
          setYayin(j.yayin);
          setKalan(j.yayin.kalanSn);
          if (!gorulen.current.has(j.yayin.id)) {
            gorulen.current.add(j.yayin.id);
            sesCal("kayit-zili");
          }
        } else {
          setYayin(null);
        }
      } catch {
        /* sessiz */
      }
    }
    yokla();
    const id = setInterval(yokla, 30_000);
    return () => {
      iptal = true;
      clearInterval(id);
    };
  }, []);

  // Geri sayım — 0'da kaybolur.
  useEffect(() => {
    if (!yayin) return;
    const id = setInterval(() => setKalan((k) => Math.max(0, k - 1)), 1000);
    return () => clearInterval(id);
  }, [yayin]);

  if (!yayin || kalan <= 0) return null;

  const dk = Math.floor(kalan / 60);
  const sn = kalan % 60;

  return (
    <div className="mb-3 rounded-2xl border border-gold/50 bg-gradient-to-b from-gold/[0.14] to-transparent p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-gold-light">
          <span className="ekran-canli-nokta inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden />
          📻 Radyo yayında
        </p>
        <span className="font-mono text-sm text-slate-300">
          {dk}:{String(sn).padStart(2, "0")}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">5 dakika açık — sonra kaybolur.</p>
      {yayin.sesUrl && <audio controls autoPlay src={yayin.sesUrl} className="mt-2 w-full" />}
    </div>
  );
}
