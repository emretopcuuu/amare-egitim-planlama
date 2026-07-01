"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import AynaIkon from "@/components/AynaIkon";

const t = tr.sesSecimi;

type Ses = "erkek" | "kadin";

// AYNA SESİ SEÇİMİ — hazırlıktan hemen sonra, ritüelden önce (akış: lib/akis.ts
// "sesSecimi" adımı). Kişi iki sesi de dinleyip birini seçer; bu andan itibaren
// AYNA'nın tüm kişisel seslendirmeleri (ayna-ses, acilis-ses) bu sesle konuşur.
// Ayarlar çekmecesinden de tekrar açılıp tercih değiştirilebilir (aynı bileşen).
export default function SesSecimiEkrani({
  mevcutSes = "erkek",
  ayarModu = false,
  onKapat,
}: {
  mevcutSes?: Ses;
  // Ayarlar çekmecesinden açılınca: zorunlu akış değil, "Kapat" ile çıkılabilir.
  ayarModu?: boolean;
  onKapat?: () => void;
}) {
  const router = useRouter();
  const [secim, setSecim] = useState<Ses>(mevcutSes);
  const [calan, setCalan] = useState<Ses | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState(false);
  const sesRef = useRef<HTMLAudioElement | null>(null);

  async function dinle(ses: Ses) {
    if (calan === ses) {
      sesRef.current?.pause();
      sesRef.current = null;
      setCalan(null);
      return;
    }
    sesRef.current?.pause();
    try {
      const r = await fetch(`/api/ses-onizleme?ses=${ses}`);
      if (!r.ok) return;
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      sesRef.current = el;
      el.onended = () => { URL.revokeObjectURL(url); setCalan(null); };
      await el.play();
      setCalan(ses);
    } catch {
      setCalan(null);
    }
  }

  async function onayla() {
    if (gonderiliyor) return;
    setGonderiliyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/ses-secimi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ses: secim }),
      });
      if (!res.ok) {
        setHata(true);
        return;
      }
      sesRef.current?.pause();
      if (ayarModu && onKapat) {
        onKapat();
      } else {
        router.refresh();
      }
    } catch {
      setHata(true);
    } finally {
      setGonderiliyor(false);
    }
  }

  const kart = (
    <div className="mx-auto w-full max-w-lg px-6">
      {!ayarModu && (
        <>
          <div className="mb-6 flex justify-center">
            <AynaIkon className="h-14 w-14 text-gold" />
          </div>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
            {t.ust}
          </p>
        </>
      )}
      <h1 className="prizma-serif ay-metin mt-3 text-center text-2xl font-bold leading-tight sm:text-3xl">
        {t.baslik}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-base leading-relaxed text-slate-300">
        {t.aciklama}
      </p>

      <div className="mt-7 space-y-3">
        {(["erkek", "kadin"] as const).map((ses) => {
          const secili = secim === ses;
          return (
            <button
              key={ses}
              type="button"
              onClick={() => setSecim(ses)}
              className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors ${
                secili
                  ? "border-gold bg-gold/10"
                  : "border-white/15 bg-white/[0.03] hover:border-white/25"
              }`}
            >
              <span className={`text-lg font-semibold ${secili ? "text-gold-light" : "text-slate-200"}`}>
                {ses === "erkek" ? t.erkek : t.kadin}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  void dinle(ses);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    void dinle(ses);
                  }
                }}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3 text-xs font-semibold text-slate-300 transition-colors hover:border-gold/50 hover:text-gold-light"
              >
                {calan === ses ? `⏸ ${t.dinleniyor}` : `▶ ${t.dinle}`}
              </span>
            </button>
          );
        })}
      </div>

      {hata && (
        <p role="alert" className="mt-3 text-center text-sm font-medium text-amber-300">
          {t.hata}
        </p>
      )}

      <button
        onClick={onayla}
        disabled={gonderiliyor}
        className="btn-kor parilti mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-60"
      >
        {t.dugme}
      </button>
      {ayarModu && onKapat && (
        <button
          onClick={onKapat}
          className="mt-3 w-full rounded-xl py-2.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          Kapat
        </button>
      )}
      {!ayarModu && <p className="mt-3 text-center text-xs text-slate-500">{t.varsayilanNot}</p>}
    </div>
  );

  if (ayarModu) return kart;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#06121e] py-10">
      {kart}
    </main>
  );
}
