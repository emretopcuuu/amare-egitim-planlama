"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";
import Konfeti from "@/components/Konfeti";
import { ADIMLAR, adimDolu, katman1Tutarlilik, SONUC_KARTI } from "@/lib/onFarkindalik";

const t = tr.onFarkindalik;
const TOPLAM = ADIMLAR.length;
const SONUC_KODLAR = new Set(SONUC_KARTI.map((s) => s.kod));

// SİHİRBAZ: her ekranda TEK iş. Girdi tipleri: 1-5 ifade, ikili 1-10, sayı,
// yazılı (sesle de). Kademeli, otomatik ilerleme (likert), kısmi kayıt.
export default function OnFarkindalikAkis({
  baslangicSayi,
  baslangicMetin,
  oneri,
}: {
  baslangicSayi: Record<string, number>;
  baslangicMetin: Record<string, string>;
  oneri: Record<string, string>;
}) {
  const router = useRouter();
  const [yanitlar, setYanitlar] = useState<Record<string, number>>({ ...baslangicSayi });
  // Sonuç Kartı'nı profil önerisiyle pre-fill et (boşsa) — düzenlenebilir.
  const [metinler, setMetinler] = useState<Record<string, string>>(() => {
    const m = { ...baslangicMetin };
    for (const kod of SONUC_KODLAR) {
      if (!(m[kod] ?? "").trim() && (oneri[kod] ?? "").trim()) m[kod] = oneri[kod];
    }
    return m;
  });
  const [giris, setGiris] = useState(
    Object.keys(baslangicSayi).length === 0 && Object.keys(baslangicMetin).length === 0
  );
  const [adim, setAdim] = useState(() => {
    const i = ADIMLAR.findIndex((a) => !adimDolu(a, baslangicSayi, baslangicMetin));
    return i === -1 ? TOPLAM : i;
  });
  const [sayiGirdi, setSayiGirdi] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const ilerleZam = useRef<ReturnType<typeof setTimeout> | null>(null);

  const yapilan = useMemo(
    () => ADIMLAR.filter((a) => adimDolu(a, yanitlar, metinler)).length,
    [yanitlar, metinler]
  );

  // UX #3: tüm çalışma tamamlanınca mikro-kutlama (haptik) — momentum hissi.
  const tumuBitti = adim >= TOPLAM && yapilan === TOPLAM;
  useEffect(() => {
    if (tumuBitti) titret([15, 40, 15, 40, 30]);
  }, [tumuBitti]);

  function ilerle() {
    setSayiGirdi("");
    setHata(null);
    setAdim((a) => Math.min(a + 1, TOPLAM));
  }

  async function kaydet(): Promise<boolean> {
    const gonderilecek: { kod: string; deger?: number; metin?: string }[] = [
      ...Object.entries(yanitlar).map(([kod, deger]) => ({ kod, deger })),
      ...Object.entries(metinler)
        .filter(([, m]) => (m ?? "").trim())
        .map(([kod, metin]) => ({ kod, metin })),
    ];
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

  function setSayi(kod: string, deger: number) {
    setYanitlar((e) => ({ ...e, [kod]: deger }));
    setHata(null);
  }
  function setMetin(kod: string, deger: string) {
    setMetinler((e) => ({ ...e, [kod]: deger }));
    setHata(null);
  }

  function likertSec(kod: string, deger: number) {
    titret(10);
    setSayi(kod, deger);
    if (ilerleZam.current) clearTimeout(ilerleZam.current);
    ilerleZam.current = setTimeout(ilerle, 260);
  }

  // GİRİŞ EKRANI
  if (giris) {
    return (
      <div className="flex min-h-[82vh] flex-col justify-center py-8 text-center">
        <p className="text-5xl">🪞</p>
        <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold leading-tight">{t.girisBaslik}</h1>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-slate-300">{t.girisMetin}</p>
        {/* UX #4: sonunda ne kazanacağın — "neden buradayım" çerçevesi + ödül önizlemesi */}
        <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
          {t.girisKazanimlar.map((k, i) => (
            <li key={i} className="flex items-start gap-2.5 text-base text-slate-200">
              <span className="mt-0.5 text-gold-light" aria-hidden>✦</span>
              <span>{k}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setGiris(false)}
          className="parilti btn-kor mx-auto mt-10 flex h-16 w-full max-w-md items-center justify-center rounded-2xl text-xl font-bold"
        >
          {t.girisDevam}
        </button>
      </div>
    );
  }

  // TAMAM / KAYDEDİLDİ
  if (adim >= TOPLAM) {
    const tamamMi = yapilan === TOPLAM;
    return (
      <div className="flex min-h-[82vh] flex-col justify-center py-8 text-center">
        {tamamMi && <Konfeti />}
        <p className="text-5xl">{tamamMi ? "🪞" : "💾"}</p>
        <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold leading-tight">
          {tamamMi ? t.tamamBaslik : t.devamBaslik}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-slate-300">
          {tamamMi ? t.tamamMetin : t.devamMetin}
        </p>
        <p className="mt-4 text-sm text-slate-400">{t.ilerleme(yapilan, TOPLAM)}</p>
        {/* #10 Veri dürüstlüğü: düz-çizgi cevap sezilirse nazik, özel bir yansıma */}
        {katman1Tutarlilik(yanitlar).dusukVaryans && (
          <div className="mx-auto mt-5 max-w-md rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-4 text-left">
            <p className="text-sm font-semibold text-amber-300">{t.guvenBaslik}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{t.guvenMetin}</p>
            <button
              onClick={() => setAdim(0)}
              className="mt-3 text-sm font-medium text-amber-300 underline-offset-4 hover:underline"
            >
              {t.guvenTekrar} →
            </button>
          </div>
        )}
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
              onClick={() => setAdim(ADIMLAR.findIndex((a) => !adimDolu(a, yanitlar, metinler)))}
              className="flex h-12 w-full items-center justify-center text-base text-slate-400 hover:text-slate-200"
            >
              {t.devam}
            </button>
          )}
          {/* UX #5: korkusuz düzeltme — her an başa dönüp cevapları gözden geçir */}
          <button
            onClick={() => setAdim(0)}
            className="flex h-11 w-full items-center justify-center text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
          >
            {t.gozdenGecir}
          </button>
        </div>
      </div>
    );
  }

  const a = ADIMLAR[adim];
  const yuzde = Math.round((Math.min(adim + 1, TOPLAM) / TOPLAM) * 100);
  // UX #2: kalan süre tahmini (~12 sn/adım) — görünür bitiş çizgisi tamamlamayı artırır.
  const kalanDk = Math.max(1, Math.round(((TOPLAM - adim) * 12) / 60));

  return (
    <div className="flex min-h-[82vh] flex-col">
      <header>
        <div className="flex items-center justify-between">
          {adim === 0 ? (
            <Link href="/" className="text-base text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
              ← {t.geriDon}
            </Link>
          ) : (
            <button
              onClick={() => setAdim((x) => Math.max(x - 1, 0))}
              className="text-base text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              ← {t.geri}
            </button>
          )}
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-slate-300">%{yuzde}</span>
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
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">{a.grup}</p>
          <p className="text-xs text-slate-500">{t.kalanDk(kalanDk)}</p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-300"
            style={{ width: `${yuzde}%` }}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center py-8">
        {a.tip === "likert5" && (
          <>
            <h1 className="prizma-serif text-2xl font-semibold leading-snug text-slate-50">{a.metin}</h1>
            <p className="mt-4 text-sm text-slate-400">{t.blokAlt}</p>
            <div role="radiogroup" aria-label={a.metin} className="mt-8 space-y-2.5">
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={yanitlar[a.kod] === p}
                  onClick={() => likertSec(a.kod, p)}
                  className={`flex h-14 w-full items-center gap-4 rounded-2xl px-5 text-left transition-all ${
                    yanitlar[a.kod] === p ? "btn-kor scale-[1.01]" : "border-2 border-white/20 text-slate-200 hover:border-gold/60"
                  }`}
                >
                  <span className="font-mono text-2xl font-bold">{p}</span>
                  <span className="text-base font-semibold">{t.olcek[p]}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {a.tip === "ikili10" && (
          <>
            <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">{a.ad}</h1>
            <p className="mt-2 text-base leading-relaxed text-slate-300">{a.anlam}</p>
            <Olcek10 etiket={t.onemSoru} secili={yanitlar[a.onemKod]} onSec={(p) => setSayi(a.onemKod, p)} />
            <Olcek10 etiket={t.gercekSoru} secili={yanitlar[a.gercekKod]} onSec={(p) => setSayi(a.gercekKod, p)} />
            <button
              onClick={ilerle}
              disabled={!yanitlar[a.onemKod] || !yanitlar[a.gercekKod]}
              className="btn-kor mt-8 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-40"
            >
              {t.devam} →
            </button>
          </>
        )}

        {a.tip === "sayi" && (
          <>
            <h1 className="prizma-serif text-2xl font-semibold leading-snug text-slate-50">{a.metin}</h1>
            <p className="mt-3 text-sm text-slate-400">{t.sayiAlt}</p>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={a.max}
              value={yanitlar[a.kod] !== undefined ? String(yanitlar[a.kod]) : sayiGirdi}
              onChange={(e) => {
                setSayiGirdi(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && Number.isInteger(n) && n >= 0 && n <= a.max) {
                  setSayi(a.kod, n);
                } else {
                  setYanitlar((y) => {
                    const k = { ...y };
                    delete k[a.kod];
                    return k;
                  });
                }
              }}
              placeholder="0"
              className="mt-6 h-20 w-full rounded-2xl border-2 border-white/20 bg-white/[0.04] text-center font-mono text-5xl font-bold text-slate-50 outline-none focus:border-gold"
            />
            <button
              onClick={ilerle}
              disabled={yanitlar[a.kod] === undefined}
              className="btn-kor mt-8 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-40"
            >
              {t.devam} →
            </button>
          </>
        )}

        {a.tip === "metin" && (
          <MetinAdim
            kod={a.kod}
            metin={a.metin}
            zorunlu={a.zorunlu}
            deger={metinler[a.kod] ?? ""}
            onDegis={(v) => setMetin(a.kod, v)}
            onDevam={ilerle}
          />
        )}

        {hata && <p role="alert" className="mt-4 text-center text-sm font-medium text-red-400">{hata}</p>}
      </div>

      <p className="pb-2 text-center text-xs text-slate-500">{t.kismiNot}</p>
    </div>
  );
}

// Yazılı adım: soru + büyüyen textarea + sesle yaz + Devam (zorunluysa boş geçilmez).
function MetinAdim({
  kod,
  metin,
  zorunlu,
  deger,
  onDegis,
  onDevam,
}: {
  kod: string;
  metin: string;
  zorunlu: boolean;
  deger: string;
  onDegis: (v: string) => void;
  onDevam: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [deger, kod]);
  return (
    <>
      <h1 className="prizma-serif text-2xl font-semibold leading-snug text-slate-50">{metin}</h1>
      <textarea
        ref={ref}
        value={deger}
        onChange={(e) => onDegis(e.target.value)}
        rows={3}
        placeholder={t.metinYer}
        className="mt-6 max-h-[220px] min-h-[5rem] w-full resize-none rounded-2xl border-2 border-white/20 bg-white/[0.04] p-4 text-lg leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
      />
      <div className="mt-3">
        <MikrofonButonu onMetin={(p) => onDegis(deger.trim() ? `${deger.trim()} ${p}` : p)} />
      </div>
      <button
        onClick={onDevam}
        disabled={zorunlu && !deger.trim()}
        className="btn-kor mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-40"
      >
        {deger.trim() || zorunlu ? `${t.devam} →` : t.metinAtla}
      </button>
    </>
  );
}

// 1-10 ölçek satırı (iki sıra × beş): önem / gerçek için.
function Olcek10({
  etiket,
  secili,
  onSec,
}: {
  etiket: string;
  secili: number | undefined;
  onSec: (p: number) => void;
}) {
  return (
    <div className="mt-6">
      <p className="text-base font-semibold text-gold-light">{etiket}</p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={secili === p}
            onClick={() => onSec(p)}
            className={`h-12 rounded-xl text-lg font-bold transition-all ${
              secili === p ? "btn-kor scale-105" : "border-2 border-white/20 text-slate-200 hover:border-gold/60"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
