"use client";

import { useEffect, useState } from "react";
import {
  KAMP_GUNLERI,
  kampGunu,
  gunProgrami,
  dakikaCevir,
  ETKINLIK_SIMGESI,
} from "@/lib/kampProgrami";
import {
  grupNoCozumle,
  grupAdi,
  cumartesiGunTimeline,
  type GunSatiri,
} from "@/lib/cumartesiProgrami";

const SON = KAMP_GUNLERI[KAMP_GUNLERI.length - 1];
const GUN_ADI: Record<number, string> = { 1: "Cuma", 2: "Cumartesi", 3: "Pazar" };

function istanbulAni(): { tarih: string; dk: number } {
  const tarih = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(
    new Date()
  );
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [s, d] = f.format(new Date()).split(":").map(Number);
  return { tarih, dk: s * 60 + d };
}

function kalanYazi(dk: number): string {
  if (dk >= 60) return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
  return `${Math.max(0, dk)} dk`;
}

// Jenerik kamp günü (Cuma/Pazar) → GunSatiri çizelgesi.
function kampSatirlari(gun: 1 | 2 | 3): GunSatiri[] {
  return gunProgrami(gun).map((m) => ({
    bas: dakikaCevir(m.baslangic),
    bit: dakikaCevir(m.bitis),
    basY: m.baslangic,
    bitY: m.bitis,
    baslik: m.baslik,
    detay: m.konusmaci,
    simge: ETKINLIK_SIMGESI[m.tur],
    serbest: m.tur === "ayna" || m.tur === "serbest",
  }));
}

// Ana sayfa "Kamp Programın" kartı: katılımcının 3 GÜNLÜK planı (Cuma · Cumartesi
// · Pazar). Cumartesi grup üyesine tam-gün çizelge (kahvaltı + grup etkinlikleri +
// boşluklar "AYNA Görevleri & Serbest Zaman" + akşam yemeği). Bugünkü gün açık ve
// canlı vurgulu; diğer günler katlanır. Saf istemci, 30 sn'de tazelenir.
export default function GunProgramKarti({ takim }: { takim: string | null }) {
  const [an, setAn] = useState<{ tarih: string; dk: number } | null>(null);
  const [acik, setAcik] = useState<Record<number, boolean>>({});
  const [initEdildi, setInitEdildi] = useState(false);

  useEffect(() => {
    setAn(istanbulAni());
    const id = setInterval(() => setAn(istanbulAni()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Açık/kapalı günleri bir kez kur: yalnız bugün kamp günüyse o gün açık gelir;
  // kamp dışında (önizleme) hepsi kapalı — Cumartesi "grubuna özel" rozetiyle
  // dikkat çeker, kişi üstüne basınca açılır.
  useEffect(() => {
    if (!an || initEdildi) return;
    const bg = kampGunu(an.tarih);
    setAcik({ 1: bg === 1, 2: bg === 2, 3: bg === 3 });
    setInitEdildi(true);
  }, [an, initEdildi]);

  if (!an) return null;

  const grup = grupNoCozumle(takim);
  const bugunGun = kampGunu(an.tarih);
  const canli = bugunGun !== null;

  // Kamp bittiyse kartı gösterme.
  if (!canli && an.tarih > SON) return null;

  const gunler = ([1, 2, 3] as const).map((gun) => ({
    gun,
    ad: GUN_ADI[gun],
    grupEtiket: gun === 2 && grup ? grupAdi(grup) : null,
    satirlar:
      gun === 2 && grup ? cumartesiGunTimeline(grup) : kampSatirlari(gun),
  }));

  // Canlı "Şu an / Sırada" — bugünkü çizelgeden.
  const bugun = canli ? gunler.find((g) => g.gun === bugunGun) : null;
  const aktif = bugun?.satirlar.find((s) => an.dk >= s.bas && an.dk < s.bit) ?? null;
  const sirada = bugun?.satirlar.find((s) => s.bas > an.dk) ?? null;

  return (
    <section className="kart-cam relative overflow-hidden rounded-3xl p-5 ring-1 ring-royal/30">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="prizma-serif ay-metin text-lg font-semibold leading-tight">
            🗓 Kamp Programın
          </h2>
          <p className="text-xs text-slate-400">
            3 gün · Cuma · Cumartesi{grup ? ` (${grupAdi(grup)})` : ""} · Pazar
          </p>
        </div>
        {canli && (
          <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-300">
            CANLI
          </span>
        )}
      </div>

      {/* Şu an / Sırada özeti — bugün kamp günüyse */}
      {canli && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-royal/20 p-3">
            <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">Şu an</p>
            {aktif ? (
              <>
                <p className="mt-0.5 text-sm font-semibold text-slate-100">
                  {aktif.simge} {aktif.baslik}
                </p>
                <p className="font-mono text-xs text-gold-light">
                  {aktif.basY}–{aktif.bitY} · {kalanYazi(aktif.bit - an.dk)} kaldı
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-sm text-slate-300">Serbest zaman 🌿</p>
            )}
          </div>
          <div className="rounded-2xl bg-midnight-soft/60 p-3">
            <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">Sırada</p>
            {sirada ? (
              <>
                <p className="mt-0.5 text-sm font-semibold text-slate-100">
                  {sirada.simge} {sirada.baslik}
                </p>
                <p className="font-mono text-xs text-royal-light">
                  {sirada.basY} · {kalanYazi(sirada.bas - an.dk)} sonra
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-sm text-slate-300">Günün programı tamamlandı ✓</p>
            )}
          </div>
        </div>
      )}

      {/* 3 günlük plan — her gün katlanır bölüm */}
      <div className="mt-3 space-y-2">
        {gunler.map(({ gun, ad, grupEtiket, satirlar }) => {
          const bugunMu = canli && gun === bugunGun;
          return (
            <details
              key={gun}
              open={!!acik[gun]}
              onToggle={(e) =>
                setAcik((a) => ({ ...a, [gun]: (e.target as HTMLDetailsElement).open }))
              }
              className={`overflow-hidden rounded-2xl ${
                bugunMu ? "bg-royal/15 ring-1 ring-gold/30" : "bg-midnight-soft/40"
              }`}
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                <span className="text-xs font-bold uppercase tracking-wide text-gold-light">
                  Gün {gun}
                </span>
                <span className="text-sm font-semibold text-slate-100">{ad}</span>
                {grupEtiket && (
                  <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-gold/30 to-royal/30 px-2 py-0.5 text-[0.65rem] font-bold text-gold-light ring-1 ring-gold/40">
                    ✨ {grupEtiket}&apos;e özel
                  </span>
                )}
                {bugunMu && (
                  <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-emerald-300">
                    BUGÜN
                  </span>
                )}
                <span className="ml-auto text-[0.65rem] text-slate-500">
                  {acik[gun] ? "▲" : "▼"}
                </span>
              </summary>

              <ul className="space-y-0.5 px-2 pb-2">
                {satirlar.map((s, i) => {
                  const aktifMi = bugunMu && an.dk >= s.bas && an.dk < s.bit;
                  const gecti = bugunMu && an.dk >= s.bit;
                  const siradaMi = bugunMu && s === sirada;
                  return (
                    <li
                      key={i}
                      className={`flex items-baseline gap-2 rounded-lg px-2 py-1.5 ${
                        aktifMi ? "bg-royal/30 ring-1 ring-gold/30" : ""
                      }`}
                    >
                      <span
                        className={`w-[5.5rem] shrink-0 font-mono text-xs font-bold ${
                          aktifMi
                            ? "text-gold-light"
                            : gecti
                              ? "text-slate-600"
                              : "text-royal-light"
                        }`}
                      >
                        {s.basY}–{s.bitY}
                      </span>
                      <span
                        className={`min-w-0 flex-1 text-sm ${
                          aktifMi
                            ? "font-semibold text-slate-100"
                            : gecti
                              ? "text-slate-500 line-through decoration-slate-600"
                              : s.serbest
                                ? "text-slate-400"
                                : "text-slate-300"
                        }`}
                      >
                        {s.simge} {s.baslik}
                        {s.detay && !gecti ? (
                          <span className="text-slate-500"> · {s.detay}</span>
                        ) : null}
                      </span>
                      {aktifMi && (
                        <span className="shrink-0 rounded-full bg-gold/20 px-1.5 py-0.5 text-[0.6rem] font-bold text-gold-light">
                          ŞİMDİ
                        </span>
                      )}
                      {siradaMi && !aktifMi && (
                        <span className="shrink-0 rounded-full bg-royal/30 px-1.5 py-0.5 text-[0.6rem] font-bold text-royal-light">
                          SIRADA
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>

      {!canli && (
        <p className="mt-2 text-[0.7rem] text-slate-500">
          Kampın 3 günlük planı. Cumartesi günü kendi grubunun akışını; o gün burada
          canlı olarak nerede olduğunu, sıradaki etkinliği ve kalan süreyi göreceksin.
        </p>
      )}
    </section>
  );
}
