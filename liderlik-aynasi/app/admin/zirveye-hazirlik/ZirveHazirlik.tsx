"use client";

import { useState } from "react";

type Durum = {
  toplam: number;
  mektupVar: number;
  klonlu: number;
  sesVar: number;
  hazir: boolean;
};

// [E1-a] Zirveye Hazırlık istemcisi: "Hepsini üret" → kalan 0 olana dek /api'yi
// döngüyle çağırır, canlı N/29 ilerlemesi gösterir. İdempotent, durdurulabilir.
export default function ZirveHazirlik({ ilk }: { ilk: Durum }) {
  const [durum, setDurum] = useState<Durum>(ilk);
  const [calisiyor, setCalisiyor] = useState(false);
  const [son, setSon] = useState<string>("");
  const [hata, setHata] = useState<string>("");

  async function birAdim(): Promise<boolean> {
    const r = await fetch("/api/admin/zirveye-hazirlik", { method: "POST" });
    const v = await r.json().catch(() => null);
    if (!r.ok) {
      setHata(v?.hata ?? "Üretim hatası — biraz sonra tekrar dene.");
      return false;
    }
    if (v?.durum) setDurum(v.durum);
    if (v?.sonuc?.ad) setSon(`${v.sonuc.ad} ✓`);
    return v?.sonuc?.yapilan !== null; // null → hepsi tamam
  }

  async function hepsiniUret() {
    if (calisiyor) return;
    setCalisiyor(true);
    setHata("");
    // Güvenlik tavanı: en fazla toplam×2 adım (mektup + ses), sonsuz döngü olmasın.
    const tavan = Math.max(4, durum.toplam * 2 + 2);
    for (let i = 0; i < tavan; i++) {
      const devam = await birAdim();
      if (!devam) break;
    }
    setCalisiyor(false);
  }

  const mektupYuzde = durum.toplam ? Math.round((durum.mektupVar / durum.toplam) * 100) : 0;
  const sesHedef = durum.klonlu; // klonu olanlar için ses beklenir
  const sesYuzde = sesHedef ? Math.round((durum.sesVar / sesHedef) * 100) : 100;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-midnight-card/50 p-5">
      <div className="space-y-3">
        <Satir ad="Ayna Mektupları" olan={durum.mektupVar} hedef={durum.toplam} yuzde={mektupYuzde} />
        <Satir
          ad="Mektup sesleri"
          olan={durum.sesVar}
          hedef={sesHedef}
          yuzde={sesYuzde}
          alt={`${durum.klonlu} kişinin ses klonu var`}
        />
      </div>

      {durum.hazir ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] p-3 text-center text-sm font-semibold text-emerald-300">
          ✓ Her şey hazır — reveal anında yük olmayacak.
        </div>
      ) : (
        <button
          onClick={() => void hepsiniUret()}
          disabled={calisiyor}
          className="btn-kor parilti flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-50"
        >
          {calisiyor ? `Üretiliyor… ${son}` : "Eksik olanları üret"}
        </button>
      )}

      {son && !calisiyor && <p className="text-center text-xs text-slate-400">Son: {son}</p>}
      {hata && <p className="text-center text-sm text-rose-300">{hata}</p>}
    </div>
  );
}

function Satir({
  ad,
  olan,
  hedef,
  yuzde,
  alt,
}: {
  ad: string;
  olan: number;
  hedef: number;
  yuzde: number;
  alt?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-200">{ad}</span>
        <span className="font-mono text-gold-light">
          {olan}/{hedef}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.min(100, yuzde)}%` }} />
      </div>
      {alt && <p className="mt-1 text-xs text-slate-500">{alt}</p>}
    </div>
  );
}
