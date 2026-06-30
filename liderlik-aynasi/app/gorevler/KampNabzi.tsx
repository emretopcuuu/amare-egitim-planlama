"use client";

import { useEffect, useRef, useState } from "react";

type Nabiz = {
  toplamGorev: number;
  toplamKivilcim: number;
  bugunGorev: number;
  bugunAktifKisi: number;
  bugunFiero: number;
  toplamKisi: number;
  siram: number;
  ilk5Kalan: number;
};

// KAMPIN NABZI — tek, sakin şerit. Üst satır: kampın bugünkü toplu eylemi +
// kişinin (pozitif) sırası. Alt satır: 4-5 sn'de bir NAZİKÇE dönen tek bir
// teşvik/ambient cümle (beş ayrı banner yerine bir ritim). 25 sn'de bir yoklar.
export default function KampNabzi() {
  const [veri, setVeri] = useState<Nabiz | null>(null);
  const [idx, setIdx] = useState(0);
  const [gorunur, setGorunur] = useState(true);
  const mesajlarRef = useRef<string[]>([]);

  useEffect(() => {
    let iptal = false;
    async function yokla() {
      try {
        const r = await fetch("/api/kamp-nabzi", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as Nabiz;
        if (!iptal) setVeri(d);
      } catch {
        // sessiz
      }
    }
    void yokla();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void yokla();
    }, 25_000);
    return () => {
      iptal = true;
      clearInterval(id);
    };
  }, []);

  // Dönen alt cümleler — yalnız anlamlı olanlar.
  const mesajlar: string[] = [];
  if (veri) {
    if (veri.ilk5Kalan > 0) mesajlar.push(`İlk 5'e ${veri.ilk5Kalan} kıvılcım`);
    else if (veri.siram <= 5 && veri.siram > 0) mesajlar.push(`İlk 5'tesin — momentumu bırakma`);
    if (veri.bugunAktifKisi > 0) mesajlar.push(`Bugün ${veri.bugunAktifKisi} lider sahada — yalnız değilsin`);
    if (veri.bugunFiero > 0) mesajlar.push(`Bugün ${veri.bugunFiero} kez ayna parladı ✨`);
    if (veri.toplamGorev > 0) mesajlar.push(`Kampta toplam ${veri.toplamGorev} görev tamamlandı`);
  }
  mesajlarRef.current = mesajlar;

  // Yumuşak geçişle döndür (fade out → indeksi ilerlet → fade in).
  useEffect(() => {
    if (mesajlar.length <= 1) return;
    const id = setInterval(() => {
      setGorunur(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % Math.max(1, mesajlarRef.current.length));
        setGorunur(true);
      }, 360);
    }, 4500);
    return () => clearInterval(id);
  }, [mesajlar.length]);

  if (!veri || veri.toplamGorev === 0) return null;

  const altMetin = mesajlar.length > 0 ? mesajlar[idx % mesajlar.length] : "";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-slate-300">
          <span className="ekran-canli-nokta inline-block h-1.5 w-1.5 rounded-full bg-gold/80" aria-hidden />
          <span className="font-semibold text-slate-200">Kampın nabzı</span>
          <span className="text-slate-500">·</span>
          <span className="tabular-nums">bugün {veri.bugunGorev} görev</span>
        </span>
        {veri.siram > 0 && (
          <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold-light tabular-nums">
            {veri.siram}.<span className="font-normal text-gold-light/70">/{veri.toplamKisi}</span>
          </span>
        )}
      </div>
      {altMetin && (
        <p
          className={`mt-1 text-xs text-slate-400 transition-opacity duration-300 ${
            gorunur ? "opacity-100" : "opacity-0"
          }`}
        >
          {altMetin}
        </p>
      )}
    </section>
  );
}
