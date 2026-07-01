"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ADIMLAR, DEGER_LISTESI, nedenKodlari, type Adim } from "@/lib/degerler";

// DEĞERLER ÇALIŞMASI sihirbazı — adım-adım, kaydet-devam, geri tuşlu, user-friendly.
// Çekirdek (3 değer + 1. neden + cümleler + final) zorunlu; gerisi teşvik.

const TOPLAM = ADIMLAR.length;

// AYNA'nın ElevenLabs sesiyle intro metnini okutan buton.
// /api/ayna-ses?k=degerler_<kod> → mp3; ses yoksa 503 → sessizce gizlenir.
function AynaSesButonu({ anahtar }: { anahtar: string }) {
  const [durum, setDurum] = useState<"bos" | "yukleniyor" | "oynatiliyor">("bos");
  const [destekleniyor, setDestekleniyor] = useState(true);
  const sesRef = useRef<HTMLAudioElement | null>(null);

  async function togla() {
    if (durum === "oynatiliyor") {
      sesRef.current?.pause();
      sesRef.current = null;
      setDurum("bos");
      return;
    }
    if (durum === "yukleniyor") return;
    setDurum("yukleniyor");
    try {
      const r = await fetch(`/api/ayna-ses?k=${anahtar}`);
      if (!r.ok) { setDestekleniyor(false); setDurum("bos"); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const ses = new Audio(url);
      sesRef.current = ses;
      ses.onended = () => { URL.revokeObjectURL(url); setDurum("bos"); };
      ses.onerror = () => { setDurum("bos"); };
      await ses.play();
      setDurum("oynatiliyor");
    } catch {
      setDurum("bos");
    }
  }

  if (!destekleniyor) return null;

  return (
    <button
      type="button"
      onClick={togla}
      aria-label={durum === "oynatiliyor" ? "Sesi durdur" : "AYNA'nın sesiyle dinle"}
      className={`mx-auto mt-6 flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-all active:scale-95 ${
        durum === "oynatiliyor"
          ? "border-gold/60 bg-gold/15 text-gold-light"
          : durum === "yukleniyor"
            ? "border-white/15 text-slate-500"
            : "border-white/20 text-slate-400 hover:border-gold/40 hover:text-gold-light"
      }`}
    >
      {durum === "yukleniyor" ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-gold" aria-hidden />
          Yükleniyor…
        </>
      ) : durum === "oynatiliyor" ? (
        <>
          <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
            <span className="h-3 w-[3px] rounded-sm bg-gold-light" />
            <span className="mx-0.5 h-3 w-[3px] rounded-sm bg-gold-light" />
          </span>
          Durdur
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          AYNA'dan dinle
        </>
      )}
    </button>
  );
}

// Web Speech API — Türkçe dikte. Her buton kendi kaydını yönetir.
function SesliYazButonu({ onEkle }: { onEkle: (metin: string) => void }) {
  const [destekleniyor, setDestekleniyor] = useState(false);
  const [dinleniyor, setDinleniyor] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taniciRef = useRef<any>(null);

  useEffect(() => {
    setDestekleniyor(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }, []);

  function togla() {
    if (dinleniyor) {
      taniciRef.current?.stop();
      setDinleniyor(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tanici: any = new SR();
    tanici.lang = "tr-TR";
    tanici.continuous = true;
    tanici.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tanici.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onEkle(e.results[i][0].transcript.trim());
      }
    };
    tanici.onerror = () => setDinleniyor(false);
    tanici.onend = () => setDinleniyor(false);
    taniciRef.current = tanici;
    tanici.start();
    setDinleniyor(true);
  }

  if (!destekleniyor) return null;

  return (
    <button
      type="button"
      onClick={togla}
      aria-label={dinleniyor ? "Kaydı durdur" : "Sesli yaz — mikrofona söyle"}
      className={`mt-2.5 flex items-center gap-2 self-start rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all active:scale-95 ${
        dinleniyor
          ? "border-red-400/60 bg-red-500/15 text-red-300 animate-pulse"
          : "border-white/15 text-slate-400 hover:border-gold/40 hover:text-gold-light"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4 shrink-0">
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" />
      </svg>
      {dinleniyor ? "Dinleniyor… (durdurmak için dokun)" : "Sesli yaz"}
    </button>
  );
}

export default function DegerlerAkis() {
  const router = useRouter();
  const [yuklendi, setYuklendi] = useState(false);
  const [adim, setAdim] = useState(0);
  const [parla, setParla] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  const [cevaplar, setCevaplar] = useState<Record<string, unknown>>({});
  const [secilenUc, setSecilenUc] = useState<string[]>([]);
  const ustRef = useRef<HTMLDivElement | null>(null);

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
    return () => { iptal = true; };
  }, []);

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

  function metinEkle(kod: string, ek: string) {
    setCevaplar((c) => {
      const mevcut = typeof c[kod] === "string" ? (c[kod] as string) : "";
      const aralik = mevcut.length > 0 && !mevcut.endsWith(" ") ? " " : "";
      return { ...c, [kod]: mevcut + aralik + ek };
    });
    setUyari(null);
  }

  function secKaynak(a: Extract<Adim, { tip: "sec" }>): string[] {
    if (a.kaynak === "liste") return DEGER_LISTESI;
    return dizi(a.kaynak);
  }
  function secGuncel(a: Extract<Adim, { tip: "sec" }>): string[] {
    return a.kod === "sec3" ? secilenUc : dizi(a.kod);
  }
  function secToggle(a: Extract<Adim, { tip: "sec" }>, deger: string) {
    const guncel = secGuncel(a);
    const sec = guncel.includes(deger)
      ? guncel.filter((d) => d !== deger)
      : guncel.length >= a.adet ? guncel : [...guncel, deger];
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
    } catch {}
    finally { setKaydediliyor(false); }
  }

  function ilerlenebilir(a: Adim): string | null {
    if (a.tip === "sec") {
      const n = secGuncel(a).length;
      if (n !== a.adet) return `Tam ${a.adet} değer seç (şu an ${n}).`;
    }
    if (a.tip === "neden" && a.zorunlu) {
      const ilk = metin(`neden_${a.degerIndeks}_1`).trim();
      if (!ilk) return 'En az ilk "neden?" cevabını yaz.';
    }
    if (a.tip === "cumle" && a.zorunlu && !metin(a.kod).trim()) return "Bu cümleyi tamamla.";
    if (a.tip === "metin" && a.zorunlu && !metin(a.kod).trim()) return "Bu soruyu yanıtla.";
    return null;
  }

  async function ileri() {
    const a = ADIMLAR[adim];
    const hata = ilerlenebilir(a);
    if (hata) { setUyari(hata); return; }
    await kaydet();
    if (adim < TOPLAM - 1) {
      setAdim((x) => x + 1);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  function geri() {
    setUyari(null);
    if (adim > 0) setAdim((x) => x - 1);
  }

  if (!yuklendi) {
    return <div className="flex min-h-dvh items-center justify-center text-slate-400">Yükleniyor…</div>;
  }

  const a = ADIMLAR[adim];
  const sonAdim = adim === TOPLAM - 1;

  return (
    <>
      {/* Göl arka planını sihirbaz sayfasında kapat — içerik odağı için */}
      <div className="fixed inset-0 z-0 bg-[#06121e]" aria-hidden />

      <main className="relative z-10 mx-auto w-full max-w-xl px-5 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div ref={ustRef} />

        {/* İlerleme */}
        <div className="mb-5">
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

        {/* İçerik */}
        <div key={adim} className={parla ? "of-parla" : ""}>
          {a.tip === "intro" && (
            <div className="py-8 text-center">
              <h1 className="prizma-serif ay-metin text-3xl font-bold leading-tight">{a.baslik}</h1>
              <p className="mt-5 text-lg leading-relaxed text-slate-200">{a.paragraf}</p>
              <AynaSesButonu anahtar={`degerler_${a.kod}`} />
            </div>
          )}

          {a.tip === "metin" && (
            <div className="flex flex-col">
              <h2 className={`text-2xl font-bold leading-snug ${a.guclu ? "altin-metin" : "text-slate-100"}`}>
                {a.guclu && "✦ "}{a.baslik}
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
              <SesliYazButonu onEkle={(t) => metinEkle(a.kod, t)} />
            </div>
          )}

          {a.tip === "sec" && (
            <div>
              <h2 className="text-2xl font-bold leading-snug text-slate-100">{a.baslik}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {a.aciklama}{" "}
                <span className="font-semibold text-gold-light">{secGuncel(a).length}/{a.adet}</span>
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
                Her cevabın için tekrar "peki bu neden önemli?" diye sor. 5. "neden"de çoğu zaman
                gerçek motivasyonuna ulaşırsın.
              </p>
              <div className="mt-4 space-y-4">
                {nedenKodlari(a.degerIndeks).map((kod, i) => (
                  <div key={kod} className="flex flex-col">
                    <label className="text-sm font-medium text-slate-400">
                      {i + 1}. {i === 0 ? "Bu değer benim için neden önemli?" : "Peki bu neden önemli?"}
                    </label>
                    <textarea
                      value={metin(kod)}
                      onChange={(e) => metinDegis(kod, e.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] p-3 text-base text-slate-100 outline-none focus:border-gold/50"
                    />
                    <SesliYazButonu onEkle={(t) => metinEkle(kod, t)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.tip === "cumle" && (
            <div className="py-8">
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
              <SesliYazButonu onEkle={(t) => metinEkle(a.kod, t)} />
            </div>
          )}
        </div>

        {uyari && <p className="mt-3 text-sm font-medium text-amber-300">{uyari}</p>}

        {/* Geri / İleri butonları — içeriğin hemen altında, sayfayla birlikte akar */}
        <div className="mt-8 flex items-center gap-3">
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
            {a.tip === "intro" && "dugme" in a ? a.dugme : sonAdim ? "Tamamla →" : "İleri →"}
          </button>
        </div>
      </main>
    </>
  );
}
