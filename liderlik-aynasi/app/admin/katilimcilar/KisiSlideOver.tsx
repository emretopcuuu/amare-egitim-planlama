"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface KisiOzet {
  id: string;
  ad: string;
  takim: string | null;
  sehir: string | null;
  loginKodu: string;
  kampAcik: boolean;
  ofTamam: boolean;
  pusulaTamam: boolean;
  degerlerTamam: boolean;
  oyunSecti: boolean;
  pushVar: boolean;
  momentum: number | null;
  gorevTamam: number;
  takdir: number;
  saatGec: number | null;
}

export default function KisiSlideOver({
  kisiId,
  onKapat,
}: {
  kisiId: string;
  onKapat: () => void;
}) {
  const [ozet, setOzet] = useState<KisiOzet | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setYukleniyor(true);
    setOzet(null);
    fetch(`/api/admin/kisi-ozet/${kisiId}`)
      .then((r) => r.json())
      .then((data) => setOzet(data))
      .finally(() => setYukleniyor(false));
  }, [kisiId]);

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") onKapat();
    }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onKapat]);

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onKapat}
        aria-hidden
      />
      {/* panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-midnight shadow-2xl ring-1 ring-royal/30"
      >
        <div className="flex items-center justify-between border-b border-royal/20 px-5 py-4">
          <h2 className="text-base font-semibold text-gold-light">Katılımcı Özeti</h2>
          <button
            onClick={onKapat}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {yukleniyor && (
            <p className="text-sm text-slate-400 text-center pt-10">Yükleniyor…</p>
          )}

          {!yukleniyor && ozet && (
            <>
              <div>
                <h3 className="text-xl font-bold text-slate-100">{ozet.ad}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {[ozet.takim, ozet.sehir, `kod ${ozet.loginKodu}`].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className={`rounded-full px-2.5 py-1 font-medium ${ozet.kampAcik ? "bg-emerald-400/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                    {ozet.kampAcik ? "Kampta" : "Kamp dışı"}
                  </span>
                  {ozet.ofTamam && (
                    <span className="rounded-full bg-royal/20 px-2.5 py-1 font-medium text-royal-light">ÖF ✓</span>
                  )}
                  {ozet.pusulaTamam && (
                    <span className="rounded-full bg-gold/10 px-2.5 py-1 font-medium text-gold-light">Pusula ✓</span>
                  )}
                  {/* [M2/M3/M9] Eksik olanlar KIRMIZI görünür ki operatör hemen fark etsin. */}
                  <span className={`rounded-full px-2.5 py-1 font-medium ${ozet.degerlerTamam ? "bg-gold/10 text-gold-light" : "bg-rose-500/15 text-rose-300"}`}>
                    Değerler {ozet.degerlerTamam ? "✓" : "✗"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 font-medium ${ozet.oyunSecti ? "bg-royal/20 text-royal-light" : "bg-rose-500/15 text-rose-300"}`}>
                    Oyun {ozet.oyunSecti ? "✓" : "✗"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 font-medium ${ozet.pushVar ? "bg-emerald-400/15 text-emerald-400" : "bg-amber-500/15 text-amber-300"}`}>
                    Push {ozet.pushVar ? "✓" : "✗"}
                  </span>
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <dt className="text-xs text-slate-500">Momentum</dt>
                  <dd className="mt-0.5 text-lg font-bold text-slate-100">{ozet.momentum ?? "—"}</dd>
                </div>
                <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <dt className="text-xs text-slate-500">Görev ✓</dt>
                  <dd className="mt-0.5 text-lg font-bold text-slate-100">{ozet.gorevTamam}</dd>
                </div>
                <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <dt className="text-xs text-slate-500">Takdir</dt>
                  <dd className="mt-0.5 text-lg font-bold text-slate-100">{ozet.takdir}</dd>
                </div>
              </dl>

              {ozet.saatGec !== null && (
                <p className={`text-xs ${ozet.saatGec >= 12 ? "text-amber-300" : "text-slate-400"}`}>
                  Son hareket: {ozet.saatGec} saat önce
                  {ozet.saatGec >= 12 && " ⚠️"}
                </p>
              )}

              {/* KVKK: pusula İÇERİĞİ admin'e görünmez — üstteki "Pusula ✓" rozeti yeterli. */}
            </>
          )}
        </div>

        <div className="border-t border-royal/20 px-5 py-4">
          <Link
            href={`/admin/kisi/${kisiId}`}
            className="block w-full rounded-xl bg-royal/30 px-4 py-2.5 text-center text-sm font-semibold text-gold-light hover:bg-royal/40 transition-colors"
          >
            Tam 360° Kartı →
          </Link>
        </div>
      </div>
    </>
  );
}
