"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { sesCal } from "@/lib/sesEfekti";

// G8 — sistemin içindeki gizli parlayan nokta. Yalnız aktif turun konumunda
// (usePathname eşleşince) + kişi henüz pay almadıysa köşede belirir. Dokun →
// ödül. Keşif hissi için küçük ve sessiz; reduced-motion'da sabit.
type Durum = { konum: string; faz: "gizli" | "bulundu_pay"; benAldim: boolean } | null;

export default function KayipNokta() {
  const pathname = usePathname();
  const [durum, setDurum] = useState<Durum>(null);
  const [odul, setOdul] = useState<{ ilk: boolean; deger: number } | null>(null);
  const [gizle, setGizle] = useState(false);

  useEffect(() => {
    let iptal = false;
    async function yokla() {
      try {
        const r = await fetch("/api/kayip-esya", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { durum: Durum };
        if (!iptal) setDurum(j.durum);
      } catch {
        /* sessiz */
      }
    }
    yokla();
    const id = setInterval(yokla, 45_000);
    return () => {
      iptal = true;
      clearInterval(id);
    };
  }, []);

  if (!durum || durum.benAldim || gizle) return null;
  // Rota'nın query/hash'ini yok say — yalnız yol eşleşmesi.
  if (pathname !== durum.konum) return null;

  async function dokun() {
    try {
      const r = await fetch("/api/kayip-esya", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; odul?: { ilk: boolean; deger: number } };
      if (r.ok && j.ok && j.odul) {
        sesCal(j.odul.ilk ? "fiero" : "kivilcim");
        setOdul(j.odul);
      }
      setGizle(true);
    } catch {
      /* sessiz */
    }
  }

  return (
    <>
      <button
        onClick={dokun}
        aria-label="Parlayan bir şey"
        className="kayip-parla fixed bottom-24 left-3 z-[55] h-4 w-4 rounded-full bg-gold shadow-[0_0_16px_6px_rgba(212,175,55,0.6)]"
      />
      {odul && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={() => setOdul(null)}>
          <div className="kart-cam rounded-3xl px-8 py-9 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-5xl">🔍</p>
            <h3 className="prizma-serif mt-3 text-2xl font-bold text-gold">
              {odul.ilk ? "İlk sen buldun!" : "Payını aldın!"}
            </h3>
            <p className="mt-2 text-sm text-slate-200">
              AYNA'nın kaybettiği şeyi buldun — <span className="text-gold-light">+{odul.deger}⚡</span>.
            </p>
            <button onClick={() => setOdul(null)} className="btn-kor mt-6 h-12 w-full rounded-xl text-base font-bold">
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
