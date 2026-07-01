"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ADIMLAR, DEGER_LISTESI, nedenKodlari, type Adim } from "@/lib/degerler";

// DEĞERLER ÇALIŞMASI sihirbazı — adım-adım, kaydet-devam, geri tuşlu, user-friendly.
// Çekirdek (3 değer + 1. neden + cümleler + final) zorunlu; gerisi teşvik.

const TOPLAM = ADIMLAR.length;

export default function DegerlerAkis() {
  const router = useRouter();
  const [yuklendi, setYuklendi] = useState(false);
  const [adim, setAdim] = useState(0);
  const [parla, setParla] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  // Tüm cevaplar tek nesnede: metinler (kod->string) + seçim dizileri (sec10/sec5).
  const [cevaplar, setCevaplar] = useState<Record<string, unknown>>({});
  const [secilenUc, setSecilenUc] = useState<string[]>([]);
  const ustRef = useRef<HTMLDivElement | null>(null);

  // Açılışta kaydı yükle + kaldığı adıma yaklaş (ilk boş zorunlu adıma değil,
  // basitçe başa; kişi geri/ileri ile gezer — veriler dolu gelir).
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const r = await fetch("/api/degerler");
        if (r.ok) {
          const d = await r.json();
          if (!iptal) {
            setCevaplar((d.cevaplar as Record<string, unknown>) ?? {});
            setSecilenUc((d.secilenUc as string[]) ?? []);
          }
        }
      } catch {}
      if (!iptal) setYuklendi(true);
    })();
    return () => {
      iptal = true;
    };
  }, []);

  // Her adım değişiminde tepeye kaydır + kısa parlama (soru değişti hissi).
  useEffect(() => {
    ustRef.current?.scrollIntoView({ block: "start" });
    window.scrollTo(0, 0);
    setParla(true);
    const id = setTimeout(() => setParla(false), 420);
    return () => clearTimeout(id);
  }, [adim]);

  const metin = (kod: string) => (typeof cevaplar[kod] === "string" ? (cevaplar[kod] as string) : "");
  const dizi = (kod: string) => (Array.isArray(cevaplar[kod]) ? (cevaplar[kod] as string[]) : []);

  function metinDegis(kod: string, deger: string) {
    setCevaplar((c) => ({ ...c, [kod]: deger }));
    setUyari(null);
  }

  // sec adımı için kaynak değer listesi
  function secKaynak(a: Extract<Adim, { tip: "sec" }>): string[] {
    if (a.kaynak === "liste") return DEGER_LISTESI;
    return dizi(a.kaynak); // "sec10" | "sec5"
  }
  function secGuncel(a: Extract<Adim, { tip: "sec" }>): string[] {
    return a.kod === "sec3" ? secilenUc : dizi(a.kod);
  }
  function secToggle(a: Extract<Adim, { tip: "sec" }>, deger: string) {
    const guncel = secGuncel(a);
    const sec = guncel.includes(deger)
      ? guncel.filter((d) => d !== deger)
      : guncel.length >= a.adet
        ? guncel // limit dolu — ekleme
        : [...guncel, deger];
    if (a.kod === "sec3") setSecilenUc(sec);
    else setCevaplar((c) => ({ ...c, [a.kod]: sec }));
    setUyari(null);
  }

  async function kaydet() {
    setKaydediliyor(true);
    try {
      await fetch("/api/degerler", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cevaplar, secilenUc }),
      });
    } catch {
      // sessiz — sonraki adımda yine denenir
    } finally {
      setKaydediliyor(false);
    }
  }

  // Geçerlilik: zorunlu adım boşsa ilerleme engellenir (nazik uyarı).
  function ilerlenebilir(a: Adim): string | null {
    if (a.tip === "sec") {
      const n = secGuncel(a).length;
      if (n !== a.adet) return `Tam ${a.adet} değer seç (şu an ${n}).`;
    }
    if (a.tip === "neden" && a.zorunlu) {
      const ilk = metin(`neden_${a.degerIndeks}_1`).trim();
      if (!ilk) return "En az ilk “neden?” cevabını yaz.";
    }
    if (a.tip === "cumle" && a.zorunlu && !metin(a.kod).trim()) return "Bu cümleyi tamamla.";
    if (a.tip === "metin" && a.zorunlu && !metin(a.kod).trim()) return "Bu soruyu yanıtla.";
    return null;
  }

  async function ileri() {
    const a = ADIMLAR[adim];
    const hata = ilerlenebilir(a);
    if (hata) {
      setUyari(hata);
      return;
    }
    await kaydet();
    if (adim < TOPLAM - 1) {
      setAdim((x) => x + 1);
    } else {
      // Son adım: kaydedildi → onboarding akışı bizi Pusula'ya taşır.
      router.push("/");
      router.refresh();
    }
  }

  function geri() {
    setUyari(null);
    if (adim > 0) setAdim((x) => x - 1);
  }

  if (!yuklendi) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400">Yükleniyor…</div>
    );
  }

  const a = ADIMLAR[adim];
  const sonAdim = adim === TOPLAM - 1;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-28 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div ref={ustRef} />
      {/* İlerleme */}
      <div className="mb-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-500"
            style={{ width: `${((adim + 1) / TOPLAM) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          Adım {adim + 1} / {TOPLAM}
        </p>
      </div>

      <div key={adim} className={`flex-1 ${parla ? "of-parla" : ""}`}>
        {a.tip === "intro" && (
          <div className="flex min-h-[50vh] flex-col justify-center text-center">
            <h1 className="prizma-serif ay-metin text-3xl font-bold leading-tight">{a.baslik}</h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-200">{a.paragraf}</p>
          </div>
        )}

        {a.tip === "metin" && (
          <div>
            <h2 className={`text-2xl font-bold leading-snug ${a.guclu ? "altin-metin" : "text-slate-100"}`}>
              {a.guclu && "✦ "}
              {a.baslik}
            </h2>
            {a.ipuclari && a.ipuclari.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {a.ipuclari.map((ip, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-400">
                    <span className="text-gold-light/70">•</span>
                    <span>{ip}</span>
                  </li>
                ))}
              </ul>
            )}
            <textarea
              value={metin(a.kod)}
              onChange={(e) => metinDegis(a.kod, e.target.value)}
              rows={5}
              placeholder={a.zorunlu ? "Buraya yaz…" : "Dilersen yaz, dilersen geç…"}
              className="mt-4 w-full resize-y rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-base leading-relaxed text-slate-100 outline-none focus:border-gold/50"
            />
          </div>
        )}

        {a.tip === "sec" && (
          <div>
            <h2 className="text-2xl font-bold leading-snug text-slate-100">{a.baslik}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {a.aciklama}{" "}
              <span className="font-semibold text-gold-light">
                {secGuncel(a).length}/{a.adet}
              </span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {secKaynak(a).map((d) => {
                const secili = secGuncel(a).includes(d);
                const dolu = !secili && secGuncel(a).length >= a.adet;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => secToggle(a, d)}
                    disabled={dolu}
                    className={`rounded-full border px-4 py-2 text-base font-medium transition-colors ${
                      secili
                        ? "border-gold bg-gold text-[#1a1206]"
                        : dolu
                          ? "border-white/10 text-slate-600"
                          : "border-white/20 text-slate-200 hover:border-gold/50 hover:bg-white/5"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {a.tip === "neden" && (
          <div>
            <h2 className="text-2xl font-bold leading-snug text-slate-100">{a.baslik}</h2>
            <p className="mt-2 text-lg font-semibold text-gold-light">
              {secilenUc[a.degerIndeks] ?? "(önce 3 değerini seç)"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Her cevabın için tekrar “peki bu neden önemli?” diye sor. 5. “neden”de çoğu zaman
              gerçek motivasyonuna ulaşırsın.
            </p>
            <div className="mt-4 space-y-3">
              {nedenKodlari(a.degerIndeks).map((kod, i) => (
                <div key={kod}>
                  <label className="text-sm font-medium text-slate-400">
                    {i + 1}. {i === 0 ? "Bu değer benim için neden önemli?" : "Peki bu neden önemli?"}
                  </label>
                  <textarea
                    value={metin(kod)}
                    onChange={(e) => metinDegis(kod, e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] p-3 text-base text-slate-100 outline-none focus:border-gold/50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {a.tip === "cumle" && (
          <div className="flex min-h-[40vh] flex-col justify-center">
            <p className="text-xl leading-relaxed text-slate-200">
              <span className="font-semibold text-gold-light">{a.on}</span>{" "}
              <input
                value={metin(a.kod)}
                onChange={(e) => metinDegis(a.kod, e.target.value)}
                placeholder="…"
                className="inline-block min-w-[8rem] border-b-2 border-gold/50 bg-transparent px-2 py-1 text-center text-slate-100 outline-none focus:border-gold"
              />{" "}
              {a.son && <span className="font-semibold text-gold-light">{a.son}</span>}
            </p>
          </div>
        )}
      </div>

      {uyari && <p className="mt-3 text-sm font-medium text-amber-300">{uyari}</p>}

      {/* Alt navigasyon — geri + ileri (kaydet-devam) */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-midnight/90 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          <button
            type="button"
            onClick={geri}
            disabled={adim === 0}
            className="flex h-12 items-center justify-center rounded-xl border border-white/15 px-5 text-base font-medium text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-30"
          >
            ← Geri
          </button>
          <button
            type="button"
            onClick={ileri}
            disabled={kaydediliyor}
            className="btn-kor flex h-12 flex-1 items-center justify-center rounded-xl text-base font-bold disabled:opacity-60"
          >
            {a.tip === "intro" && "dugme" in a
              ? a.dugme
              : sonAdim
                ? "Tamamla →"
                : "İleri →"}
          </button>
        </div>
      </div>
    </main>
  );
}
