"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tost } from "@/lib/tost";

interface KisiOzet {
  id: string;
  ad: string;
  takim: string | null;
  sehir: string | null;
  telefon: string | null;
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
  const [durtuluyor, setDurtuluyor] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // [ADMIN-UX9] Tek kişiye hatırlatma — mevcut duyuru API'sinin "kisi:" hedefi.
  async function hatirlat() {
    if (!ozet || durtuluyor) return;
    setDurtuluyor(true);
    try {
      const r = await fetch("/api/admin/duyuru", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baslik: "AYNA seni bekliyor 👁",
          govde: "Yolculuğunda eksik kalan bir adım var — birkaç dakika ayır, tamamla.",
          hedef: `kisi:${ozet.id}`,
        }),
      });
      tost(r.ok ? `${ozet.ad.split(" ")[0]} dürtüldü 🔔` : "Gönderilemedi", r.ok ? "basari" : "hata");
    } catch {
      tost("Gönderilemedi", "hata");
    } finally {
      setDurtuluyor(false);
    }
  }

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
          {/* [ADMIN-UX9] Hızlı eylemler — bakmaktan eyleme sayfa değiştirmeden */}
          {ozet && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {ozet.telefon ? (
                <a
                  href={`https://wa.me/${ozet.telefon.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-2 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/20"
                >
                  📲 WhatsApp
                </a>
              ) : (
                <span className="flex items-center justify-center rounded-xl border border-white/10 px-2 py-2 text-xs text-slate-600">
                  telefon yok
                </span>
              )}
              <button
                onClick={() => void hatirlat()}
                disabled={durtuluyor}
                className="flex items-center justify-center gap-1 rounded-xl border border-gold/30 bg-gold/10 px-2 py-2 text-xs font-semibold text-gold-light transition-colors hover:bg-gold/20 disabled:opacity-50"
              >
                🔔 {durtuluyor ? "…" : "Hatırlat"}
              </button>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(ozet.loginKodu).catch(() => {});
                  tost(`Kod kopyalandı: ${ozet.loginKodu}`, "bilgi");
                }}
                className="flex items-center justify-center gap-1 rounded-xl border border-white/15 px-2 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.06]"
              >
                📋 Kod
              </button>
            </div>
          )}
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
