"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.pusula;
const BLANK_SAYISI = 10;
const MIN_MADDE = 3;

type Mesaj = { rol: string; icerik: string };
type Faz = "riza" | "liste" | "kopru" | "sohbet" | "bitti";

// Sohbet ilerlemesi — aşamadan yüzdeye. Her AYNA yanıtı aşamayı döndürür,
// böylece kişi her soruda sona ne kadar kaldığını görür.
const ILERLEME: Record<string, number> = {
  eleme: 25,
  bosluk: 55,
  engel: 82,
  tamam: 100,
};

// Web Speech API — sesle yazma (Türkçe). Desteklenmiyorsa buton görünmez.
type TanimaSonuc = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type SesTaniyici = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: { resultIndex: number; results: ArrayLike<TanimaSonuc> }) => void)
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

// Kayıt sürerken görünen canlı ses dalgası (çubuklar farklı gecikmeyle dalgalanır).
function SesDalga() {
  const cubuklar = [0, 0.12, 0.24, 0.36, 0.18, 0.06, 0.3, 0.42, 0.2, 0.1, 0.34, 0.16];
  return (
    <div className="flex h-8 flex-1 items-center justify-center gap-[3px]" aria-hidden>
      {cubuklar.map((g, i) => (
        <span key={i} className="ses-cubuk" style={{ animationDelay: `${g}s` }} />
      ))}
    </div>
  );
}

// Mikrofon: konuşulanı Türkçe metne çevirip hedef alana ekler. Tıkla-başlat /
// tıkla-durdur. Duraklamalarda (sessizlik) tanıma kendiliğinden biterse, kullanıcı
// durdurana dek otomatik yeniden başlatılır — böylece mola verince kesilmez.
function SesButonu({
  onParca,
  dinleyince,
}: {
  onParca: (metin: string) => void;
  dinleyince?: (aktif: boolean) => void;
}) {
  const [dinliyor, setDinliyor] = useState(false);
  const [sesVar, setSesVar] = useState(false);
  const taniyiciRef = useRef<SesTaniyici | null>(null);
  const isterRef = useRef(false); // kullanıcı kaydı sürdürmek istiyor mu
  const onParcaRef = useRef(onParca);
  const dinleyinceRef = useRef(dinleyince);
  useEffect(() => {
    onParcaRef.current = onParca;
    dinleyinceRef.current = dinleyince;
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sesTaniyiciKur()) setSesVar(true);
    return () => {
      isterRef.current = false;
      taniyiciRef.current?.stop();
    };
  }, []);

  function durumGuncelle(aktif: boolean) {
    setDinliyor(aktif);
    dinleyinceRef.current?.(aktif);
  }

  function basla() {
    const tan = sesTaniyiciKur();
    if (!tan) return;
    tan.lang = "tr-TR";
    tan.interimResults = true;
    tan.continuous = true;
    tan.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const sonuc = e.results[i];
        const metin = sonuc?.[0]?.transcript ?? "";
        if (sonuc?.isFinal && metin.trim()) onParcaRef.current(metin.trim());
      }
    };
    tan.onerror = () => {
      // Sessizlik/ağ hatasında bırakma; onend zaten devreye girip yeniden başlatır.
    };
    tan.onend = () => {
      if (isterRef.current) {
        try {
          tan.start();
        } catch {
          durumGuncelle(false);
          isterRef.current = false;
        }
      } else {
        durumGuncelle(false);
      }
    };
    taniyiciRef.current = tan;
    isterRef.current = true;
    durumGuncelle(true);
    try {
      tan.start();
    } catch {
      durumGuncelle(false);
      isterRef.current = false;
    }
  }

  function durdur() {
    isterRef.current = false;
    taniyiciRef.current?.stop();
    durumGuncelle(false);
  }

  if (!sesVar) return null;
  return (
    <button
      type="button"
      onClick={() => (dinliyor ? durdur() : basla())}
      aria-label={dinliyor ? t.sesDurdur : t.sesYaz}
      aria-pressed={dinliyor}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition-colors ${
        dinliyor
          ? "bg-red-500/80 text-white ring-2 ring-red-400/50"
          : "bg-midnight-soft text-slate-300 hover:text-slate-100"
      }`}
    >
      {dinliyor ? "■" : "🎤"}
    </button>
  );
}

// Otomatik büyüyen metin alanı — uzun yazınca tek satırda kaymaz, aşağı doğru
// büyür (içeriğe göre yükseklik). Maks. yükseklikten sonra kendi içinde kayar.
function OtoTextarea({
  value,
  onChange,
  onEnter,
  placeholder,
  ariaLabel,
  otoOdak,
  disRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  otoOdak?: boolean;
  disRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const yerelRef = useRef<HTMLTextAreaElement>(null);
  const ref = disRef ?? yerelRef;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, ref]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (onEnter && e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter();
        }
      }}
      rows={1}
      autoFocus={otoOdak}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="max-h-[200px] min-h-[3rem] w-full flex-1 resize-none rounded-2xl border border-royal-light/30 bg-midnight-soft px-4 py-3 text-base leading-relaxed text-slate-100 outline-none focus:border-gold"
    />
  );
}

// Liste maddesi — uzun metni 2 satıra kısaltır, dokununca tamamı açılır/kapanır.
// Böylece çok uzun girişler listeyi ve sonraki diyagramları bozmaz.
function MaddeMetni({ metin }: { metin: string }) {
  const [acik, setAcik] = useState(false);
  const uzun = metin.length > 60;
  if (!uzun) return <span className="flex-1 text-base text-slate-100">{metin}</span>;
  return (
    <button
      type="button"
      onClick={() => setAcik((a) => !a)}
      className="flex-1 text-left text-base text-slate-100"
      aria-expanded={acik}
    >
      <span className={acik ? "" : "line-clamp-2"}>{metin}</span>
      <span className="mt-0.5 block text-xs font-medium text-gold-light/80">
        {acik ? t.maddeKapat : t.maddeAc}
      </span>
    </button>
  );
}

// FAZ 0 akışı: rıza → 10 öncelik FORM'u (madde madde) → AI derinleşme sohbeti.
export default function PusulaSohbet({
  baslangic,
  rizaVar,
  onceliklerVar,
  oncelikler = [],
  asamaBaslangic = "eleme",
}: {
  baslangic: Mesaj[];
  rizaVar: boolean;
  onceliklerVar: boolean;
  oncelikler?: string[];
  asamaBaslangic?: string;
}) {
  const router = useRouter();
  const ilkFaz: Faz =
    baslangic.length > 0 || onceliklerVar ? "sohbet" : rizaVar ? "liste" : "riza";

  const [faz, setFaz] = useState<Faz>(ilkFaz);
  const [mesajlar, setMesajlar] = useState<Mesaj[]>(baslangic);
  const [maddeler, setMaddeler] = useState<string[]>([]); // tek tek eklenen öncelikler
  const [maddeGirdi, setMaddeGirdi] = useState("");
  const [girdi, setGirdi] = useState("");
  const [listeDinliyor, setListeDinliyor] = useState(false);
  const [sohbetDinliyor, setSohbetDinliyor] = useState(false);
  // Elenenleri sunucudaki geçmişten yeniden kur: kişinin önceliklerden seçtiği
  // (yazdığı) maddeler. Böylece sayfa yenilenince elenenler geri gelmez.
  const [elenenler, setElenenler] = useState<string[]>(() => {
    const set = new Set(oncelikler);
    return [
      ...new Set(
        baslangic
          .filter((m) => m.rol === "kullanici" && set.has(m.icerik.trim()))
          .map((m) => m.icerik.trim())
      ),
    ];
  });
  const [asama, setAsama] = useState<string>(asamaBaslangic);
  const [sifirlaSor, setSifirlaSor] = useState(false);
  const [sifirliyor, setSifirliyor] = useState(false);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const altRef = useRef<HTMLDivElement>(null);
  const maddeRef = useRef<HTMLTextAreaElement>(null);
  const acilisRef = useRef(false);

  // Sohbet sırasında gösterilecek liste: sunucudan (dönen kullanıcı) ya da
  // oturum içi girilen maddeler. Eleme aşamasında seçilenler eksilir.
  const tumListe = oncelikler.length ? oncelikler : maddeler;
  const ilerleme = ILERLEME[asama] ?? 25;

  // Baştan başla: sunucudaki sohbet+öncelik+rızayı temizle, en başa dön.
  async function sifirla() {
    if (sifirliyor) return;
    setSifirliyor(true);
    try {
      await istek({ sifirla: true });
      setMesajlar([]);
      setMaddeler([]);
      setMaddeGirdi("");
      setGirdi("");
      setElenenler([]);
      setAsama("eleme");
      setHata(null);
      acilisRef.current = false;
      setSifirlaSor(false);
      setFaz("riza");
      router.refresh();
    } finally {
      setSifirliyor(false);
    }
  }

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar, mesgul]);

  async function istek(govde: Record<string, unknown>): Promise<{
    mesaj?: string;
    asama?: string;
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
    if (v.asama) setAsama(v.asama);
    // Doğrudan sohbete atlamak yerine önce köprü ekranı: ne olacağını net anlat.
    setFaz("kopru");
  }

  function sohbeteBasla() {
    setFaz("sohbet");
    setTimeout(() => altRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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
    if (v.asama) setAsama(v.asama);
    if (v.bitti) {
      setAsama("tamam");
      // Otomatik atlama yok — kişi yazıyı okuyup "Devam et" ile geçsin.
      setFaz("bitti");
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
        <div className="flex items-start justify-between gap-3">
          <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.listeBaslik}</h1>
          <SifirlaButon sor={sifirlaSor} setSor={setSifirlaSor} sifirla={sifirla} mesgul={sifirliyor} />
        </div>
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
                  className="flex items-start gap-3 rounded-xl border border-royal-light/20 bg-midnight-soft/60 px-3 py-2"
                >
                  <span className="mt-0.5 w-5 shrink-0 text-right text-sm font-bold text-gold-light">
                    {i + 1}
                  </span>
                  <MaddeMetni metin={m} />
                  <button
                    onClick={() => setMaddeler((l) => l.filter((_, j) => j !== i))}
                    aria-label="Sil"
                    className="mt-0.5 shrink-0 px-1 text-slate-500 hover:text-red-400"
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
            <div className="mt-3 space-y-2">
              <OtoTextarea
                value={maddeGirdi}
                onChange={setMaddeGirdi}
                onEnter={maddeEkle}
                placeholder={t.listeTekYer}
                ariaLabel={t.listeTekYer}
                otoOdak
                disRef={maddeRef}
              />
              {listeDinliyor && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/5 px-3 py-2">
                  <SesDalga />
                  <span className="shrink-0 text-xs font-medium text-red-200">
                    {t.sesDinleniyor}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <SesButonu
                  onParca={(m) => setMaddeGirdi((g) => (g ? `${g} ${m}` : m))}
                  dinleyince={setListeDinliyor}
                />
                <button
                  onClick={maddeEkle}
                  disabled={!maddeGirdi.trim()}
                  className="btn-kor flex h-11 flex-1 items-center justify-center rounded-xl px-5 text-base font-bold disabled:opacity-40"
                >
                  {t.listeEkle}
                </button>
              </div>
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

  // ---- Köprü (liste → sohbet geçişi net anlatılır) ----
  if (faz === "kopru") {
    return (
      <Kapak ikon="💬" baslik={t.kopruBaslik}>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{t.kopruMetin}</p>
        <ol className="mt-4 space-y-2 text-left">
          {t.kopruAdimlar.map((adim, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-300">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold-light">
                {i + 1}
              </span>
              <span className="leading-relaxed">{adim}</span>
            </li>
          ))}
        </ol>
        <button
          onClick={sohbeteBasla}
          className="btn-kor parilti mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
        >
          {t.kopruBasla}
        </button>
        <button
          onClick={() => setSifirlaSor(true)}
          className="mt-3 text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          {t.sifirlaDugme}
        </button>
        {sifirlaSor && (
          <SifirlaOnay sifirla={sifirla} vazgec={() => setSifirlaSor(false)} mesgul={sifirliyor} />
        )}
      </Kapak>
    );
  }

  // ---- Bitti ----
  if (faz === "bitti") {
    return (
      <Kapak ikon="🧭" baslik={t.tamamBaslik}>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{t.tamamMetin}</p>
        <button
          onClick={() => router.refresh()}
          className="btn-kor parilti mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
        >
          {t.bittiDevam}
        </button>
        <button
          onClick={() => setSifirlaSor(true)}
          className="mt-3 text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          {t.sifirlaDugme}
        </button>
        {sifirlaSor && (
          <SifirlaOnay sifirla={sifirla} vazgec={() => setSifirlaSor(false)} mesgul={sifirliyor} />
        )}
      </Kapak>
    );
  }

  // ---- Sohbet ----
  // Seçilip elenenler düştükten sonra kalan öncelikler chip olarak görünür.
  const gosterListe = tumListe.filter((m) => !elenenler.includes(m));
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-6">
      <header className="shrink-0 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 text-center">
            <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
              {tr.app.name}
            </p>
            <h1 className="prizma-serif ay-metin mt-1 text-xl font-semibold">{t.baslik}</h1>
          </div>
          <SifirlaButon sor={sifirlaSor} setSor={setSifirlaSor} sifirla={sifirla} mesgul={sifirliyor} />
        </div>
        {/* İlerleme — kişi sona ne kadar kaldığını her soruda görür */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[0.7rem] font-medium text-slate-400">
            <span>{t.ilerlemeEtiket}</span>
            <span className="text-gold-light">%{ilerleme}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-royal-light to-gold transition-all duration-700"
              style={{ width: `${ilerleme}%` }}
            />
          </div>
          {asama === "engel" && (
            <p className="mt-1.5 text-center text-[0.7rem] text-gold-light/80">{t.ilerlemeSonuna}</p>
          )}
        </div>
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
                title={m}
                className="max-w-[12rem] truncate rounded-full border border-royal-light/30 bg-midnight-soft px-3 py-1 text-sm text-slate-200 transition-colors hover:border-gold"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {sohbetDinliyor && (
        <div className="mb-2 flex shrink-0 items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/5 px-3 py-2">
          <SesDalga />
          <span className="shrink-0 text-xs font-medium text-red-200">{t.sesDinleniyor}</span>
        </div>
      )}
      <div className="flex shrink-0 items-end gap-2">
        <div className="min-w-0 flex-1">
          <OtoTextarea
            value={girdi}
            onChange={setGirdi}
            onEnter={gonder}
            placeholder={t.girisYer}
            ariaLabel={t.girisYer}
          />
        </div>
        <SesButonu
          onParca={(m) => setGirdi((g) => (g ? `${g} ${m}` : m))}
          dinleyince={setSohbetDinliyor}
        />
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

// Köşedeki "↺ Baştan başla" — basınca yerinde onay açar (yanlışlıkla sıfırlama olmasın).
function SifirlaButon({
  sor,
  setSor,
  sifirla,
  mesgul,
}: {
  sor: boolean;
  setSor: (v: boolean) => void;
  sifirla: () => void;
  mesgul: boolean;
}) {
  if (sor) {
    return (
      <div className="shrink-0 rounded-xl border border-royal-light/30 bg-midnight-card/90 p-2 text-right">
        <p className="px-1 pb-1.5 text-xs text-slate-300">{t.sifirlaOnayMetin}</p>
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSor(false)}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            {t.sifirlaVazgec}
          </button>
          <button
            onClick={sifirla}
            disabled={mesgul}
            className="rounded-lg bg-red-500/80 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40"
          >
            {mesgul ? t.sifirlaniyor : t.sifirlaEvet}
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={() => setSor(true)}
      className="shrink-0 rounded-xl border border-royal-light/30 px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-gold hover:text-slate-200"
    >
      {t.sifirlaDugme}
    </button>
  );
}

// Kapak ekranlarında (köprü/bitti) açılan onay satırı.
function SifirlaOnay({
  sifirla,
  vazgec,
  mesgul,
}: {
  sifirla: () => void;
  vazgec: () => void;
  mesgul: boolean;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/5 p-3">
      <p className="text-sm text-slate-300">{t.sifirlaOnayMetin}</p>
      <div className="mt-2 flex justify-center gap-3">
        <button
          onClick={vazgec}
          className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-midnight-soft"
        >
          {t.sifirlaVazgec}
        </button>
        <button
          onClick={sifirla}
          disabled={mesgul}
          className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
        >
          {mesgul ? t.sifirlaniyor : t.sifirlaEvet}
        </button>
      </div>
    </div>
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
