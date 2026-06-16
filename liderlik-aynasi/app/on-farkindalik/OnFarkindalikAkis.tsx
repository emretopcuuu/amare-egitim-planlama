"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import { KATMAN1_BLOKLAR, KATMAN1_MADDELER } from "@/lib/onFarkindalik";

const t = tr.onFarkindalik;

// Madde → ait olduğu blok adı (üst etiket için).
const BLOK_ADI = new Map<string, string>();
for (const b of KATMAN1_BLOKLAR) for (const m of b.maddeler) BLOK_ADI.set(m.kod, b.ad);
const TOPLAM = KATMAN1_MADDELER.length;

// SİHİRBAZ: her ekranda TEK ifade, dev 1-5 butonları, otomatik ilerleme.
// Öz-puan deneyiminin birebir kardeşi: az yazı, büyük yazı, kademe kademe, kısmi kayıt.
export default function OnFarkindalikAkis({
  baslangic,
}: {
  baslangic: Record<string, number>;
}) {
  const router = useRouter();
  const [yanitlar, setYanitlar] = useState<Record<string, number>>({ ...baslangic });
  const [giris, setGiris] = useState(Object.keys(baslangic).length === 0);
  const [adim, setAdim] = useState(() => {
    const i = KATMAN1_MADDELER.findIndex((m) => !baslangic[m.kod]);
    return i === -1 ? TOPLAM : i;
  });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bitti, setBitti] = useState(false);
  const ilerleZam = useRef<ReturnType<typeof setTimeout> | null>(null);

  const yapilan = useMemo(
    () => KATMAN1_MADDELER.filter((m) => yanitlar[m.kod]).length,
    [yanitlar]
  );

  async function kaydet(): Promise<boolean> {
    const gonderilecek = KATMAN1_MADDELER.filter((m) => yanitlar[m.kod]).map((m) => ({
      kod: m.kod,
      deger: yanitlar[m.kod],
    }));
    if (gonderilecek.length === 0) {
      setHata(t.enAzBir);
      return false;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/on-farkindalik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ yanitlar: gonderilecek }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(v?.hata ?? t.hata);
        return false;
      }
      return true;
    } catch {
      setHata(t.hata);
      return false;
    } finally {
      setKaydediliyor(false);
    }
  }

  async function kaydetVeCik() {
    if (await kaydet()) {
      router.refresh();
      router.push("/");
    }
  }

  function sec(kod: string, deger: number) {
    titret(10);
    setYanitlar((e) => ({ ...e, [kod]: deger }));
    setHata(null);
    if (ilerleZam.current) clearTimeout(ilerleZam.current);
    ilerleZam.current = setTimeout(() => setAdim((a) => Math.min(a + 1, TOPLAM)), 280);
  }

  // GİRİŞ EKRANI (tek seferlik, ilk girişte)
  if (giris) {
    return (
      <div className="flex min-h-[82vh] flex-col justify-center py-8 text-center">
        <p className="text-5xl">🪞</p>
        <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold leading-tight">
          {t.girisBaslik}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-slate-300">
          {t.girisMetin}
        </p>
        <button
          onClick={() => setGiris(false)}
          className="parilti btn-kor mx-auto mt-10 flex h-16 w-full max-w-md items-center justify-center rounded-2xl text-xl font-bold"
        >
          {t.girisDevam}
        </button>
      </div>
    );
  }

  // TAMAM / KAYDEDİLDİ ekranı
  const sonEkran = adim >= TOPLAM;
  if (sonEkran || bitti) {
    const tamamMi = yapilan === TOPLAM;
    return (
      <div className="flex min-h-[82vh] flex-col justify-center py-8 text-center">
        <p className="text-5xl">{tamamMi ? "🪞" : "💾"}</p>
        <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold leading-tight">
          {tamamMi ? t.tamamBaslik : t.devamBaslik}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-slate-300">
          {tamamMi ? t.tamamMetin : t.devamMetin}
        </p>
        <p className="mt-4 text-sm text-slate-400">{t.ilerleme(yapilan, TOPLAM)}</p>
        {hata && <p role="alert" className="mt-3 text-sm font-medium text-red-400">{hata}</p>}
        <div className="mt-8 space-y-3">
          <button
            onClick={kaydetVeCik}
            disabled={kaydediliyor}
            className="btn-kor parilti flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold disabled:opacity-50"
          >
            {kaydediliyor ? t.kaydediliyor : t.kaydet}
          </button>
          {!tamamMi && (
            <button
              onClick={() => {
                const i = KATMAN1_MADDELER.findIndex((m) => !yanitlar[m.kod]);
                setBitti(false);
                setAdim(i === -1 ? 0 : i);
              }}
              className="flex h-12 w-full items-center justify-center text-base text-slate-400 hover:text-slate-200"
            >
              {t.devam}
            </button>
          )}
        </div>
      </div>
    );
  }

  const madde = KATMAN1_MADDELER[adim];
  const blokAd = BLOK_ADI.get(madde.kod) ?? "";
  const secili = yanitlar[madde.kod];

  return (
    <div className="flex min-h-[82vh] flex-col">
      <header>
        <div className="flex items-center justify-between">
          {adim === 0 ? (
            <Link
              href="/"
              className="text-base text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              ← {t.geriDon}
            </Link>
          ) : (
            <button
              onClick={() => setAdim((a) => Math.max(a - 1, 0))}
              className="text-base text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              ← {t.geri}
            </button>
          )}
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-slate-300">
              {Math.min(adim + 1, TOPLAM)} / {TOPLAM}
            </span>
            <button
              type="button"
              onClick={kaydetVeCik}
              disabled={kaydediliyor || yapilan === 0}
              className="rounded-lg bg-gold px-3 py-1.5 text-sm font-bold text-midnight transition-colors hover:bg-gold-light disabled:opacity-40"
            >
              {kaydediliyor ? "…" : `💾 ${t.kaydet}`}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
          {blokAd}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-300"
            style={{ width: `${(Math.min(adim, TOPLAM) / TOPLAM) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center py-8">
        <h1 className="prizma-serif text-2xl font-semibold leading-snug text-slate-50">
          {madde.metin}
        </h1>
        <p className="mt-4 text-sm text-slate-400">{t.blokAlt}</p>

        <div role="radiogroup" aria-label={madde.metin} className="mt-8 space-y-2.5">
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={secili === p}
              onClick={() => sec(madde.kod, p)}
              className={`flex h-14 w-full items-center gap-4 rounded-2xl px-5 text-left text-lg font-semibold transition-all ${
                secili === p
                  ? "btn-kor scale-[1.01]"
                  : "border-2 border-white/20 text-slate-200 hover:border-gold/60"
              }`}
            >
              <span className="font-mono text-2xl font-bold">{p}</span>
              <span className="text-base">{t.olcek[p]}</span>
            </button>
          ))}
        </div>
        {hata && <p role="alert" className="mt-4 text-center text-sm font-medium text-red-400">{hata}</p>}
      </div>

      <p className="pb-2 text-center text-xs text-slate-500">{t.kismiNot}</p>
    </div>
  );
}
