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
  CUMARTESI_TARIH,
  grupNoCozumle,
  grupBloklari,
  grupAdi,
  cmtDk,
  ETKINLIK_SIMGE,
} from "@/lib/cumartesiProgrami";

const SON = KAMP_GUNLERI[KAMP_GUNLERI.length - 1];

type Satir = {
  bas: number;
  bit: number;
  basY: string;
  bitY: string;
  baslik: string;
  detay?: string;
  simge: string;
};

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

// Ana sayfa "Günün Programın" kartı: kişinin BUGÜNKÜ programını saatleriyle net
// gösterir. CUMARTESİ (Gün 2) herkesin programı farklı olduğundan grup üyesine
// GRUBUNUN akışını verir; Gün 1/3'te jenerik kamp programı. Şu anki blok vurgulu,
// sıradaki rozetli + geri sayım. Kamp dışında grup üyesine Cumartesi önizlemesi.
// Saf istemci, DB'siz; 30 sn'de tazelenir.
export default function GunProgramKarti({ takim }: { takim: string | null }) {
  const [an, setAn] = useState<{ tarih: string; dk: number } | null>(null);

  useEffect(() => {
    setAn(istanbulAni());
    const id = setInterval(() => setAn(istanbulAni()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!an) return null;

  const grup = grupNoCozumle(takim);
  const gun = kampGunu(an.tarih);
  const canli = !!gun;

  // Hangi günün programı gösterilecek?
  // - Kamp günündeysek: bugünün programı (Gün 2 + grup → grup akışı).
  // - Kamp öncesi + grup üyesi: Cumartesi önizleme (farklılaşan asıl program).
  // - Aksi halde gösterme.
  let satirlar: Satir[] = [];
  let baslik = "Günün Programın";
  let altBaslik = "";

  if (gun === 2 && grup) {
    satirlar = grupBloklari(grup).map((b) => ({
      bas: cmtDk(b.baslangic),
      bit: cmtDk(b.bitis),
      basY: b.baslangic,
      bitY: b.bitis,
      baslik: b.baslik,
      detay: b.detay,
      simge: ETKINLIK_SIMGE[b.tur],
    }));
    altBaslik = `Gün 2 · ${grupAdi(grup)}`;
  } else if (gun) {
    satirlar = gunProgrami(gun).map((m) => ({
      bas: dakikaCevir(m.baslangic),
      bit: dakikaCevir(m.bitis),
      basY: m.baslangic,
      bitY: m.bitis,
      baslik: m.baslik,
      simge: ETKINLIK_SIMGESI[m.tur],
    }));
    altBaslik = `Gün ${gun}`;
  } else if (an.tarih <= SON && grup) {
    // Kamp öncesi önizleme: grubun Cumartesi akışı (canlı değil)
    satirlar = grupBloklari(grup).map((b) => ({
      bas: cmtDk(b.baslangic),
      bit: cmtDk(b.bitis),
      basY: b.baslangic,
      bitY: b.bitis,
      baslik: b.baslik,
      detay: b.detay,
      simge: ETKINLIK_SIMGE[b.tur],
    }));
    baslik = "Cumartesi Programın";
    altBaslik = `Önizleme · ${grupAdi(grup)}`;
  } else {
    return null;
  }

  if (satirlar.length === 0) return null;

  const simdiIdx = canli ? satirlar.findIndex((s) => an.dk >= s.bas && an.dk < s.bit) : -1;
  const siradaIdx = canli ? satirlar.findIndex((s) => s.bas > an.dk) : -1;
  const aktif = simdiIdx >= 0 ? satirlar[simdiIdx] : null;
  const sirada = siradaIdx >= 0 ? satirlar[siradaIdx] : null;

  return (
    <section className="kart-cam relative overflow-hidden rounded-3xl p-5 ring-1 ring-royal/30">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="prizma-serif ay-metin text-lg font-semibold leading-tight">
            🗓 {baslik}
          </h2>
          {altBaslik && <p className="text-xs text-slate-400">{altBaslik}</p>}
        </div>
        {canli && (
          <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-300">
            CANLI
          </span>
        )}
      </div>

      {/* Şu an / Sırada özeti — saati kaçırma */}
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

      {/* Tam çizelge — saatler net, şu anki blok vurgulu */}
      <ul className="mt-3 space-y-1">
        {satirlar.map((s, i) => {
          const aktifMi = i === simdiIdx;
          const gecti = canli && an.dk >= s.bit;
          return (
            <li
              key={i}
              className={`flex items-baseline gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                aktifMi ? "bg-royal/30 ring-1 ring-gold/30" : ""
              }`}
            >
              <span
                className={`w-[5.5rem] shrink-0 font-mono text-xs font-bold ${
                  aktifMi ? "text-gold-light" : gecti ? "text-slate-600" : "text-royal-light"
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
              {i === siradaIdx && (
                <span className="shrink-0 rounded-full bg-royal/30 px-1.5 py-0.5 text-[0.6rem] font-bold text-royal-light">
                  SIRADA
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {!canli && (
        <p className="mt-2 text-[0.7rem] text-slate-500">
          Bu, Cumartesi (Gün 2) için planlanan akışın. O gün burada canlı olarak nerede
          olduğunu, sıradaki etkinliği ve kalan süreyi göreceksin.
        </p>
      )}
    </section>
  );
}
