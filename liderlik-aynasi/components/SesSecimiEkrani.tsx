"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import AynaIkon from "@/components/AynaIkon";
import { sureRozeti } from "@/lib/onboardingSure";

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
  // [E7] Seçim kaydedildikten sonra AYNA'nın seçilen sesle kişisel karşılaması
  // çalarken gösterilen ara durum (yalnız onboarding akışında, ayar modunda değil).
  const [karsilamaCaliyor, setKarsilamaCaliyor] = useState(false);
  const sesRef = useRef<HTMLAudioElement | null>(null);
  const karsilamaRef = useRef<HTMLAudioElement | null>(null);

  // [E7] Karşılamayı çal; ses altyapısı yoksa/hata olursa SESSİZCE atla —
  // akış her koşulda router.refresh() ile sıradaki adıma (ritüel) geçer.
  async function karsilamaCalVeDevamEt() {
    try {
      // Üretim birkaç saniye sürebilir — kişi bu sırada boş/disabled buton
      // yerine "Aynan seninle tanışıyor…" ekranını görür (Geç ile atlanabilir).
      setKarsilamaCaliyor(true);
      const r = await fetch("/api/karsilama");
      if (r.ok) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const el = new Audio(url);
        karsilamaRef.current = el;
        await new Promise<void>((coz) => {
          el.onended = () => coz();
          el.onerror = () => coz();
          el.play().catch(() => coz());
        });
        URL.revokeObjectURL(url);
      }
    } catch {
      // karşılama süs — çalmazsa akış bozulmaz
    }
    router.refresh();
  }

  function karsilamayiGec() {
    karsilamaRef.current?.pause();
    router.refresh();
  }

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
        // [E7] Onboarding akışı: yönlendirmeden önce AYNA seçilen sesle kısa
        // kişisel karşılamasını yapar (çalamazsa sessizce devam eder).
        await karsilamaCalVeDevamEt();
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
      {/* [E2] Süre beklentisi rozeti — merkezi haritadan */}
      {!ayarModu && (
        <p className="mt-2 text-center">
          <span className="inline-block rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-400">
            {sureRozeti("sesSecimi")}
          </span>
        </p>
      )}
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

  // [E7] Karşılama çalarken tek işlik sakin ekran — bitince (ya da Geç ile)
  // akış kendiliğinden ritüele ilerler.
  const karsilamaEkrani = (
    <div className="mx-auto w-full max-w-lg px-6 text-center">
      <div className="mb-6 flex justify-center">
        <span className="ayna-halka flex h-20 w-20 items-center justify-center">
          <AynaIkon className="h-10 w-10 text-gold" />
        </span>
      </div>
      <h1 className="prizma-serif ay-metin text-2xl font-bold leading-tight">
        {t.karsilamaBaslik}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-slate-300">{t.karsilamaAlt}</p>
      <button
        onClick={karsilamayiGec}
        className="mt-8 text-sm text-slate-500 underline-offset-4 hover:underline"
      >
        {t.karsilamaGec}
      </button>
    </div>
  );

  if (ayarModu) return kart;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#06121e] py-10">
      {karsilamaCaliyor ? karsilamaEkrani : kart}
    </main>
  );
}
