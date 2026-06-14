"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.pusula;
const BLANK_SAYISI = 10;
const MIN_MADDE = 3;

type Mesaj = { rol: string; icerik: string };
type Faz = "riza" | "liste" | "sohbet" | "bitti";

// Web Speech API — sesle yazma (Türkçe). Desteklenmiyorsa buton görünmez.
type SesTaniyici = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function sesTaniyiciKur(): SesTaniyici | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    webkitSpeechRecognition?: new () => SesTaniyici;
    SpeechRecognition?: new () => SesTaniyici;
  };
  const Sinif = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Sinif ? new Sinif() : null;
}

// Mikrofon: konuşulanı Türkçe metne çevirip hedef alana ekler (yazmak yerine konuş).
function SesButonu({ onSonuc }: { onSonuc: (metin: string) => void }) {
  const [dinliyor, setDinliyor] = useState(false);
  const [sesVar, setSesVar] = useState(false);
  const taniyiciRef = useRef<SesTaniyici | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sesTaniyiciKur()) setSesVar(true);
  }, []);
  function topla() {
    if (dinliyor) {
      taniyiciRef.current?.stop();
      return;
    }
    const tan = sesTaniyiciKur();
    if (!tan) return;
    tan.lang = "tr-TR";
    tan.interimResults = false;
    tan.continuous = false;
    tan.onresult = (e) => {
      const son = e.results[e.results.length - 1];
      const m = son?.[0]?.transcript ?? "";
      if (m.trim()) onSonuc(m.trim());
    };
    tan.onerror = () => setDinliyor(false);
    tan.onend = () => setDinliyor(false);
    taniyiciRef.current = tan;
    setDinliyor(true);
    try {
      tan.start();
    } catch {
      setDinliyor(false);
    }
  }
  if (!sesVar) return null;
  return (
    <button
      type="button"
      onClick={topla}
      aria-label={dinliyor ? t.sesDurdur : t.sesYaz}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition-colors ${
        dinliyor
          ? "animate-pulse bg-red-500/30 text-red-200"
          : "bg-midnight-soft text-slate-300 hover:text-slate-100"
      }`}
    >
      🎤
    </button>
  );
}

// FAZ 0 akışı: rıza → 10 öncelik FORM'u (madde madde) → AI derinleşme sohbeti.
export default function PusulaSohbet({
  baslangic,
  rizaVar,
  onceliklerVar,
  oncelikler = [],
}: {
  baslangic: Mesaj[];
  rizaVar: boolean;
  onceliklerVar: boolean;
  oncelikler?: string[];
}) {
  const router = useRouter();
  const ilkFaz: Faz =
    baslangic.length > 0 || onceliklerVar ? "sohbet" : rizaVar ? "liste" : "riza";

  const [faz, setFaz] = useState<Faz>(ilkFaz);
  const [mesajlar, setMesajlar] = useState<Mesaj[]>(baslangic);
  const [maddeler, setMaddeler] = useState<string[]>([]); // tek tek eklenen öncelikler
  const [maddeGirdi, setMaddeGirdi] = useState("");
  const [girdi, setGirdi] = useState("");
  const [elenenler, setElenenler] = useState<string[]>([]); // eleme: gönderilen maddeler
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const altRef = useRef<HTMLDivElement>(null);
  const maddeRef = useRef<HTMLInputElement>(null);
  const acilisRef = useRef(false);

  // Sohbet sırasında gösterilecek liste: sunucudan (dönen kullanıcı) ya da
  // oturum içi girilen maddeler. Eleme aşamasında seçilenler eksilir.
  const tumListe = oncelikler.length ? oncelikler : maddeler;

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar, mesgul]);

  async function istek(govde: Record<string, unknown>): Promise<{
    mesaj?: string;
    bitti?: boolean;
    hata?: string;
    ok?: boolean;
  } | null> {
    const res = await fetch("/api/pusula", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(govde),
    });
    return res.json().catch(() => null);
  }

  // Sohbette listeden geldiyse (mesaj yoksa) açılış repliğini getir.
  useEffect(() => {
    if (faz !== "sohbet" || mesajlar.length > 0 || acilisRef.current) return;
    acilisRef.current = true;
    (async () => {
      setMesgul(true);
      const v = await istek({});
      if (v?.mesaj) setMesajlar([{ rol: "ayna", icerik: v.mesaj }]);
      else setHata(t.aiHata);
      setMesgul(false);
    })();
  }, [faz, mesajlar.length]);

  async function rizaKabul() {
    setMesgul(true);
    await istek({ basla: true });
    setMesgul(false);
    setFaz("liste");
  }

  // Tek bir maddeyi listeye ekle, girişi temizle, odağı koru (tek tek akış).
  function maddeEkle() {
    const m = maddeGirdi.trim();
    if (!m || maddeler.length >= BLANK_SAYISI) return;
    setMaddeler((l) => [...l, m]);
    setMaddeGirdi("");
    setHata(null);
    maddeRef.current?.focus();
  }

  async function listeyiTamamla() {
    const bekleyen = maddeGirdi.trim();
    const dolu = bekleyen ? [...maddeler, bekleyen].slice(0, BLANK_SAYISI) : maddeler;
    if (dolu.length < MIN_MADDE) {
      setHata(t.listeAzUyari(MIN_MADDE));
      return;
    }
    setMesgul(true);
    setHata(null);
    const v = await istek({ oncelikler: dolu });
    setMesgul(false);
    if (!v?.mesaj) {
      setHata(v?.hata ?? t.aiHata);
      return;
    }
    acilisRef.current = true; // açılış zaten geldi
    setMesajlar([{ rol: "ayna", icerik: v.mesaj }]);
    setFaz("sohbet");
  }

  async function gonder() {
    const metin = girdi.trim();
    if (!metin || mesgul) return;
    setMesajlar((m) => [...m, { rol: "kullanici", icerik: metin }]);
    setGirdi("");
    // Gönderilen madde listede varsa eleme olarak işaretle (chip'lerden düşsün).
    if (tumListe.includes(metin)) {
      setElenenler((e) => (e.includes(metin) ? e : [...e, metin]));
    }
    setMesgul(true);
    setHata(null);
    const v = await istek({ mesaj: metin });
    setMesgul(false);
    if (!v?.mesaj) {
      setHata(v?.hata ?? t.aiHata);
      return;
    }
    setMesajlar((m) => [...m, { rol: "ayna", icerik: v.mesaj! }]);
    if (v.bitti) {
      setFaz("bitti");
      setTimeout(() => router.refresh(), 2500);
    }
  }

  // ---- Rıza ----
  if (faz === "riza") {
    return (
      <Kapak ikon="🧭" baslik={t.rizaBaslik}>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{t.rizaMetin}</p>
        <p className="mt-3 text-xs text-slate-500">{t.rizaNot}</p>
        <button
          onClick={rizaKabul}
          disabled={mesgul}
          className="btn-kor parilti mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
        >
          {t.rizaKabul}
        </button>
      </Kapak>
    );
  }

  // ---- Liste (tek tek / madde madde) ----
  if (faz === "liste") {
    const tamam = maddeler.length >= BLANK_SAYISI;
    const yeterli = maddeler.length >= MIN_MADDE;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.listeBaslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.listeAciklama}</p>

        {/* Yazdıkça öncekiler görünür kalsın */}
        {maddeler.length > 0 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t.listeYazdiklarin} ({maddeler.length}/{BLANK_SAYISI})
            </p>
            <ol className="mt-2 space-y-1.5">
              {maddeler.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-royal-light/20 bg-midnight-soft/60 px-3 py-2"
                >
                  <span className="w-5 shrink-0 text-right text-sm font-bold text-gold-light">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-base text-slate-100">{m}</span>
                  <button
                    onClick={() => setMaddeler((l) => l.filter((_, j) => j !== i))}
                    aria-label="Sil"
                    className="shrink-0 px-1 text-slate-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Teşvik eden tek soru + tek giriş */}
        <div className="mt-6 flex-1">
          <p className="text-base font-medium leading-relaxed text-slate-200">
            {tamam ? t.listeSonHatirlatma : t.listeTesvik(maddeler.length)}
          </p>
          {!tamam && (
            <div className="mt-3 flex items-center gap-2">
              <input
                ref={maddeRef}
                value={maddeGirdi}
                onChange={(e) => setMaddeGirdi(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    maddeEkle();
                  }
                }}
                autoFocus
                placeholder={t.listeTekYer}
                className="flex-1 rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-base text-slate-100 outline-none focus:border-gold"
              />
              <SesButonu
                onSonuc={(m) => setMaddeGirdi((g) => (g ? `${g} ${m}` : m))}
              />
              <button
                onClick={maddeEkle}
                disabled={!maddeGirdi.trim()}
                className="btn-kor flex h-11 shrink-0 items-center justify-center rounded-xl px-5 text-base font-bold disabled:opacity-40"
              >
                {t.listeEkle}
              </button>
            </div>
          )}
        </div>

        {hata && <p className="mt-3 text-center text-sm text-red-400">{hata}</p>}
        <button
          onClick={listeyiTamamla}
          disabled={mesgul || !yeterli}
          className="btn-kor parilti mt-5 flex h-14 w-full shrink-0 items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
        >
          {mesgul ? t.dusunuyor : t.listeDevam}
        </button>
      </main>
    );
  }

  // ---- Bitti ----
  if (faz === "bitti") {
    return (
      <Kapak ikon="🧭" baslik={t.tamamBaslik}>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{t.tamamMetin}</p>
      </Kapak>
    );
  }

  // ---- Sohbet ----
  // Seçilip elenenler düştükten sonra kalan öncelikler chip olarak görünür.
  const gosterListe = tumListe.filter((m) => !elenenler.includes(m));
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-6">
      <header className="shrink-0 pb-3 text-center">
        <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
          {tr.app.name}
        </p>
        <h1 className="prizma-serif ay-metin mt-1 text-xl font-semibold">{t.baslik}</h1>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {mesajlar.map((m, i) => (
          <div key={i} className={`flex ${m.rol === "ayna" ? "justify-start" : "justify-end"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-base leading-relaxed ${
                m.rol === "ayna" ? "kart-cam text-slate-100" : "bg-royal/40 text-slate-100"
              }`}
            >
              {m.icerik}
            </p>
          </div>
        ))}
        {mesgul && (
          <div className="flex justify-start">
            <p className="kart-cam max-w-[85%] rounded-2xl px-4 py-2.5 text-sm text-slate-400">
              {t.dusunuyor}
            </p>
          </div>
        )}
        <div ref={altRef} />
      </div>

      {hata && (
        <p role="alert" className="pb-2 text-center text-sm font-medium text-red-400">
          {hata}
        </p>
      )}

      {/* Öncelik listesi yanıt kutusunun HEMEN ÜSTÜNDE; dokun → yanıta yaz */}
      {gosterListe.length > 0 && (
        <div className="shrink-0 pb-3">
          <p className="mb-1.5 text-center text-[0.65rem] uppercase tracking-wide text-slate-500">
            {t.listeHatirlat}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {gosterListe.map((m, i) => (
              <button
                key={i}
                onClick={() => setGirdi(m)}
                className="rounded-full border border-royal-light/30 bg-midnight-soft px-3 py-1 text-sm text-slate-200 transition-colors hover:border-gold"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-end gap-2">
        <textarea
          value={girdi}
          onChange={(e) => setGirdi(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              gonder();
            }
          }}
          rows={1}
          placeholder={t.girisYer}
          className="max-h-32 min-h-[3rem] flex-1 resize-none rounded-2xl border border-royal-light/30 bg-midnight-soft px-4 py-3 text-base text-slate-100 outline-none focus:border-gold"
        />
        <SesButonu onSonuc={(m) => setGirdi((g) => (g ? `${g} ${m}` : m))} />
        <button
          onClick={gonder}
          disabled={mesgul || !girdi.trim()}
          className="btn-kor flex h-12 shrink-0 items-center justify-center rounded-2xl px-5 text-base font-bold disabled:opacity-50"
        >
          {t.gonder}
        </button>
      </div>
    </main>
  );
}

function Kapak({
  ikon,
  baslik,
  children,
}: {
  ikon: string;
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="kart-cam max-w-md rounded-3xl p-8 text-center">
        <p className="text-5xl" aria-hidden>
          {ikon}
        </p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">{baslik}</h1>
        {children}
      </div>
    </main>
  );
}
