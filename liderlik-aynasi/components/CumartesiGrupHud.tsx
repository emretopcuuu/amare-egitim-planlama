"use client";

import { useEffect, useState } from "react";
import {
  CUMARTESI_TARIH,
  ETKINLIK_SIMGE,
  grupNoCozumle,
  grupBloklari,
  grupAktifBlok,
  grupSiradaki,
  grupBostaMi,
  grupAdi,
  cmtDk,
} from "@/lib/cumartesiProgrami";

// Aday grup HUD'u (Slice 5): katılımcı, kendi grubunun Cumartesi (Gün 2)
// akışını görür — şu an neredeler, sırada ne var, AYNA görev penceresi açık mı.
// Saf istemci (DB'siz): cumartesiProgrami tek doğruluk kaynağından okur, dakikada
// bir kendini tazeler. Cumartesi günü "canlı" mod; diğer günlerde "plan" modu.

function istanbulAni(): { tarih: string; gunDk: number } {
  const now = new Date();
  const tarih = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const sd = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const [h, m] = sd.split(":").map(Number);
  return { tarih, gunDk: h * 60 + m };
}

export default function CumartesiGrupHud({
  takim,
  cumartesiTarih = CUMARTESI_TARIH,
}: {
  takim: string | null;
  // Kampın 2. günü (Istanbul "YYYY-MM-DD"); kamp başlatma tarihinden türetilir.
  cumartesiTarih?: string;
}) {
  const grup = grupNoCozumle(takim);
  const [an, setAn] = useState<{ tarih: string; gunDk: number } | null>(null);

  useEffect(() => {
    if (!grup) return;
    setAn(istanbulAni());
    const t = setInterval(() => setAn(istanbulAni()), 60_000);
    return () => clearInterval(t);
  }, [grup]);

  if (!grup) return null;

  const bloklar = grupBloklari(grup);
  const canli = an?.tarih === cumartesiTarih;
  const aktif = canli && an ? grupAktifBlok(grup, an.gunDk) : null;
  const siradaki = canli && an ? grupSiradaki(grup, an.gunDk) : null;
  const bosta = canli && an ? grupBostaMi(grup, an.gunDk) : false;

  return (
    <section className="kart-cam rounded-3xl p-5 ring-1 ring-royal/30">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">
          🎲 Cumartesi planın · {grupAdi(grup)}
        </p>
        {canli && (
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-300">
            CANLI
          </span>
        )}
      </div>

      {/* Canlı mod: şu an + sırada (Cumartesi günü içinde) */}
      {canli && an && (
        <div className="mt-3 space-y-2">
          {aktif ? (
            <div className="rounded-2xl bg-royal/20 p-3">
              <p className="text-[0.7rem] uppercase tracking-wide text-slate-400">Şu an</p>
              <p className="mt-0.5 text-base font-semibold text-slate-100">
                {ETKINLIK_SIMGE[aktif.tur]} {aktif.baslik}
              </p>
              <p className="text-xs text-slate-400">
                {aktif.baslangic}–{aktif.bitis}
                {aktif.detay ? ` · ${aktif.detay}` : ""}
              </p>
            </div>
          ) : bosta ? (
            <div className="rounded-2xl bg-gold/10 p-3">
              <p className="text-sm font-medium text-gold-light">
                ✦ Serbest pencere — AYNA'dan görev gelebilir, telefonunu yakında kontrol et.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-midnight-soft/60 p-3">
              <p className="text-sm text-slate-300">
                Program akışında bir aradasın. Sıradaki etkinliğe hazır ol.
              </p>
            </div>
          )}
          {siradaki && (
            <div className="rounded-2xl bg-midnight-soft/40 p-3">
              <p className="text-[0.7rem] uppercase tracking-wide text-slate-400">Sırada</p>
              <p className="mt-0.5 text-sm font-medium text-slate-200">
                {ETKINLIK_SIMGE[siradaki.tur]} {siradaki.baslik}
                <span className="ml-1.5 font-mono text-xs text-royal-light">
                  {siradaki.baslangic}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tam çizelge — gün boyu referans (canlıda aktif blok vurgulanır) */}
      <ul className="mt-3 space-y-1 text-xs">
        {bloklar.map((b, i) => {
          const aktifMi =
            canli && an && an.gunDk >= cmtDk(b.baslangic) && an.gunDk < cmtDk(b.bitis);
          return (
            <li
              key={i}
              className={`flex items-baseline gap-2 rounded-lg px-2 py-1 ${
                aktifMi ? "bg-royal/25" : ""
              }`}
            >
              <span className="w-24 shrink-0 font-mono text-royal-light">
                {b.baslangic}–{b.bitis}
              </span>
              <span className={aktifMi ? "text-slate-100" : "text-slate-300"}>
                {ETKINLIK_SIMGE[b.tur]} {b.baslik}
              </span>
            </li>
          );
        })}
      </ul>

      {!canli && (
        <p className="mt-2 text-[0.7rem] text-slate-500">
          Bu, Cumartesi (Gün 2) günün için planlanan akış. O gün burada canlı
          olarak nerede olduğunu göreceksin.
        </p>
      )}
    </section>
  );
}
