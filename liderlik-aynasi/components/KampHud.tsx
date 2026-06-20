"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import {
  KAMP_GUNLERI,
  kampGunu,
  gunProgrami,
  dakikaCevir,
  ETKINLIK_SIMGESI,
} from "@/lib/kampProgrami";
import {
  grupNoCozumle,
  grupBloklari,
  grupAdi,
  cmtDk,
  ETKINLIK_SIMGE,
} from "@/lib/cumartesiProgrami";

const t = tr.hud;
const ILK = KAMP_GUNLERI[0];
const SON = KAMP_GUNLERI[KAMP_GUNLERI.length - 1];

type Blok = { bas: number; bit: number; baslik: string; simge: string };

function istanbulTarih(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}
function istanbulDakika(): number {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [s, d] = f.format(new Date()).split(":").map(Number);
  return s * 60 + d;
}

// UX #9 (2.tur): Kamp HUD'u — aday "kampın neresindeyim?" sorusunu hiç sormasın.
// Kamp gününde: o anki blok + kalan süre + sırada ne var. Kamp öncesi: geri sayım.
// CUMARTESİ (Gün 2): herkesin programı farklı — grup üyesine GRUBUNUN gerçek o anki
// bloğunu gösterir (jenerik "Oyunlar 09:30-19:30" yerine). 20 sn'de tazelenir.
export default function KampHud({ takim }: { takim?: string | null }) {
  const [an, setAn] = useState<{ tarih: string; dk: number } | null>(null);

  useEffect(() => {
    const guncelle = () => setAn({ tarih: istanbulTarih(), dk: istanbulDakika() });
    guncelle();
    const id = setInterval(guncelle, 20_000);
    return () => clearInterval(id);
  }, []);

  // SSR/ilk render: an=null → boş (hidrasyon güvenli, sunucu saatine güvenmez)
  if (!an) return null;

  const gun = kampGunu(an.tarih);

  // Kamp öncesi: geri sayım + görsel ilerleme çubuğu
  if (!gun) {
    if (an.tarih > SON) return null; // kamp bitti — HUD kaybolur
    const kalanGun = Math.round((Date.parse(ILK) - Date.parse(an.tarih)) / 86_400_000);
    // Son 30 gün içinde: çubuk dolmaya başlar; 0 gün kaldıysa tam dolu
    const PENCERE = 30;
    const doluOran = kalanGun >= PENCERE ? 0 : Math.round(((PENCERE - kalanGun) / PENCERE) * 100);
    return (
      <Cerceve>
        <div className="flex items-center gap-2">
          <span className="text-base">🏕</span>
          <span className="font-semibold text-gold-light">
            {kalanGun <= 0 ? t.bugunBasliyor : t.kampaKalan(kalanGun)}
          </span>
        </div>
        {kalanGun > 0 && kalanGun < PENCERE && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold-light transition-all duration-700"
              style={{ width: `${doluOran}%` }}
            />
          </div>
        )}
      </Cerceve>
    );
  }

  // Gün 2 + grup üyesi → grubun gerçek Cumartesi akışı; aksi halde jenerik program.
  const grup = gun === 2 ? grupNoCozumle(takim) : null;
  const bloklar: Blok[] = grup
    ? grupBloklari(grup).map((b) => ({
        bas: cmtDk(b.baslangic),
        bit: cmtDk(b.bitis),
        baslik: b.baslik,
        simge: ETKINLIK_SIMGE[b.tur],
      }))
    : gunProgrami(gun).map((m) => ({
        bas: dakikaCevir(m.baslangic),
        bit: dakikaCevir(m.bitis),
        baslik: m.baslik,
        simge: ETKINLIK_SIMGESI[m.tur],
      }));

  const aktif = bloklar.find((b) => an.dk >= b.bas && an.dk < b.bit) ?? null;
  const sonraki = bloklar.find((b) => b.bas > an.dk) ?? null;
  const kalanDk = aktif ? aktif.bit - an.dk : sonraki ? sonraki.bas - an.dk : null;

  const simge = aktif ? aktif.simge : "🌿";
  const baslik = aktif ? aktif.baslik : t.serbest;

  // Aktif bloğun ilerleme oranı (görsel nabız)
  const oran = aktif
    ? Math.min(100, Math.max(0, ((an.dk - aktif.bas) / Math.max(1, aktif.bit - aktif.bas)) * 100))
    : null;

  return (
    <Cerceve>
      <div className="flex w-full min-w-0 items-center gap-2.5">
        <span className="shrink-0 rounded-md bg-gold/15 px-2 py-0.5 text-[0.7rem] font-bold text-gold-light">
          {t.gun(gun)}
        </span>
        {grup && (
          <span className="shrink-0 rounded-md bg-royal/25 px-2 py-0.5 text-[0.7rem] font-bold text-royal-light">
            {grupAdi(grup)}
          </span>
        )}
        <span className="shrink-0 text-base" aria-hidden>
          {simge}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold text-slate-100">{baslik}</span>
        {kalanDk !== null && kalanDk >= 0 && (
          <span className="shrink-0 font-mono text-xs font-bold text-gold-light">
            {aktif ? t.kalan(kalanDk) : t.sonra(kalanDk)}
          </span>
        )}
      </div>
      {oran !== null && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold-light transition-all duration-1000"
            style={{ width: `${oran}%` }}
          />
        </div>
      )}
      {aktif && sonraki && (
        <p className="mt-1.5 truncate text-[0.7rem] text-slate-400">{t.sirada(sonraki.baslik)}</p>
      )}
    </Cerceve>
  );
}

function Cerceve({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.05] px-3 py-2 text-sm">
      {children}
    </div>
  );
}
