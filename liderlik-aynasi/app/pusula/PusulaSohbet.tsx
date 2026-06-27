"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import AsamaRayi, { type RayAsama } from "@/components/AsamaRayi";

const t = tr.pusula;
const BLANK_SAYISI = 10;
// Artık 10 madde ZORUNLU: "on tane yazmayan devam edemesin". Örneklerden de
// seçilebilir; eksikken "son N kaldı" uyarısı çıkar, devam butonu kilitli.
const MIN_MADDE = 10;
const ORNEK_GORUNUR = 6; // ilk gösterilen örnek sayısı; gerisi "daha fazla"da
// Sohbet aşamaları sırası — aşama rayında adlarıyla görünür.
const SOHBET_ASAMALARI = ["eleme", "bosluk", "engel"] as const;

type Mesaj = { rol: string; icerik: string };
type Faz = "riza" | "kariyer" | "liste" | "kopru" | "sohbet" | "slogan" | "bitti";

// Kariyer basamakları — form dropdown'ları için sıralı (düşükten yükseğe).
const KARIYER_SECENEKLER = [
  "leader", "senior_leader", "exec_leader", "diamond",
  "1_star_diamond", "2_star_diamond", "3_star_diamond", "presidential_diamond",
] as const;

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
  boyutSinif = "h-11 w-11 rounded-xl",
}: {
  onParca: (metin: string) => void;
  dinleyince?: (aktif: boolean) => void;
  // Satırdaki diğer kontrollerle hizalansın diye boyut dışarıdan verilebilir.
  boyutSinif?: string;
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

  // Taze bir tanıyıcı kurar. Her (yeniden) başlatmada YENİ örnek kullanılır;
  // böylece sessizlik sonrası restart'ta eski oturumun final sonuçları yeniden
  // EKLENMEZ (Android Chrome'da kümülatif tekrar yazma hatasının kökü buydu).
  function kur(): SesTaniyici | null {
    const tan = sesTaniyiciKur();
    if (!tan) return null;
    tan.lang = "tr-TR";
    tan.interimResults = false;
    tan.continuous = true;
    tan.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const sonuc = e.results[i];
        const metin = sonuc?.[0]?.transcript ?? "";
        if (sonuc?.isFinal && metin.trim()) onParcaRef.current(metin.trim());
      }
    };
    tan.onerror = () => {};
    tan.onend = () => {
      if (!isterRef.current) {
        durumGuncelle(false);
        return;
      }
      const yeni = kur();
      if (!yeni) {
        isterRef.current = false;
        durumGuncelle(false);
        return;
      }
      taniyiciRef.current = yeni;
      try {
        yeni.start();
      } catch {
        isterRef.current = false;
        durumGuncelle(false);
      }
    };
    return tan;
  }

  function basla() {
    const tan = kur();
    if (!tan) return;
    taniyiciRef.current = tan;
    isterRef.current = true;
    durumGuncelle(true);
    try {
      tan.start();
    } catch {
      isterRef.current = false;
      durumGuncelle(false);
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
      className={`flex ${boyutSinif} shrink-0 items-center justify-center text-xl transition-colors ${
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
  kariyerVar = false,
  onceliklerVar,
  oncelikler = [],
  asamaBaslangic = "eleme",
}: {
  baslangic: Mesaj[];
  rizaVar: boolean;
  kariyerVar?: boolean;
  onceliklerVar: boolean;
  oncelikler?: string[];
  asamaBaslangic?: string;
}) {
  const router = useRouter();
  // Akış: riza → kariyer (Pusula öncesi) → liste → sohbet. Dönen kullanıcıda
  // tamamlanmış adımlar atlanır.
  const ilkFaz: Faz =
    baslangic.length > 0 || onceliklerVar
      ? "sohbet"
      : !rizaVar
        ? "riza"
        : !kariyerVar
          ? "kariyer"
          : "liste";

  const [faz, setFaz] = useState<Faz>(ilkFaz);
  const [mesajlar, setMesajlar] = useState<Mesaj[]>(baslangic);
  const [maddeler, setMaddeler] = useState<string[]>([]); // tek tek eklenen öncelikler
  const [maddeGirdi, setMaddeGirdi] = useState("");
  const [ornekAcik, setOrnekAcik] = useState(false); // örnek listesi genişledi mi
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
  const [sloganAdaylar, setSloganAdaylar] = useState<string[]>([]);
  const [sloganGirdi, setSloganGirdi] = useState("");
  const [sloganKendinYaz, setSloganKendinYaz] = useState(false);
  const [sloganKaydediyor, setSloganKaydediyor] = useState(false);
  const [sifirlaSor, setSifirlaSor] = useState(false);
  const [sifirliyor, setSifirliyor] = useState(false);
  const [geriAliniyor, setGeriAliniyor] = useState(false); // son elemeyi geri alma
  const [bittiBekliyor, setBittiBekliyor] = useState(false); // son analiz okunsun, sonra devam
  // Kariyer konumu formu (Pusula öncesi). "Şu anki" alanı artık aynı zamanda
  // "bugüne kadar ulaşılan en yüksek" anlamına gelir (tek alana sadeleştirildi).
  const [karSuanki, setKarSuanki] = useState("");
  const [karGecenAy, setKarGecenAy] = useState("");
  const [karKidem, setKarKidem] = useState("");
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
    sloganAdaylar?: string[];
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
    setFaz("kariyer");
  }

  // Kariyer konumunu kaydet (yalnız "şu anki" zorunlu) → liste adımına geç.
  async function kariyerKaydet() {
    if (mesgul) return;
    if (!karSuanki) {
      setHata(t.kariyerSuankiEtiket);
      return;
    }
    setMesgul(true);
    setHata(null);
    const v = await istek({
      kariyer: {
        suanki: karSuanki,
        // Form sadeleştirildi: "şu anki" alanı aynı zamanda en yüksek ulaşılan
        // kariyer olarak alınır (ayrı en-yüksek dropdown'ı kaldırıldı).
        enYuksek: karSuanki || null,
        gecenAy: karGecenAy || null,
        kidemAy: karKidem.trim() === "" ? null : Number(karKidem),
      },
    });
    setMesgul(false);
    if (!v?.ok) {
      setHata(v?.hata ?? t.aiHata);
      return;
    }
    setFaz("liste");
  }

  function kariyerAtla() {
    setHata(null);
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

  // Örnekten ekle: ilham için. Doluysa ya da zaten varsa eklemez (sessizce).
  function ornekEkle(metin: string) {
    setMaddeler((l) =>
      l.length >= BLANK_SAYISI || l.includes(metin) ? l : [...l, metin]
    );
    setHata(null);
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

  // metinParam verilirse (chip'ten tek dokunuş eleme) onu gönderir; yoksa girdi.
  async function gonder(metinParam?: string) {
    const metin = (metinParam ?? girdi).trim();
    if (!metin || mesgul) return;
    setMesajlar((m) => [...m, { rol: "kullanici", icerik: metin }]);
    if (metinParam === undefined) setGirdi("");
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
      if (v.sloganAdaylar?.length) setSloganAdaylar(v.sloganAdaylar);
      // Doğrudan slogan/bitti ekranına atlama: önce son analiz mesajı sohbette
      // okunsun, kişi hazır olunca kendisi geçsin (#6 — çok hızlı geçme sorunu).
      setBittiBekliyor(true);
    }
  }

  // Son elemeyi geri al: sunucudan son (kullanıcı eleme + AYNA yanıtı) çiftini
  // sildir, istemcide de son iki mesajı ve son eleneni çıkar.
  async function sonElemeyiGeriAl() {
    if (geriAliniyor || mesgul || !elenenler.length) return;
    setGeriAliniyor(true);
    const v = await istek({ geriAl: true });
    setGeriAliniyor(false);
    if (!v?.ok) {
      setHata(t.aiHata);
      return;
    }
    setMesajlar((m) => m.slice(0, -2));
    setElenenler((e) => e.slice(0, -1));
    setAsama("eleme");
    setHata(null);
  }

  async function sloganKaydet(secilen: string) {
    const metin = secilen.trim();
    if (!metin) return;
    setSloganKaydediyor(true);
    await istek({ sloganSec: metin });
    setSloganKaydediyor(false);
    setFaz("bitti");
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

  // ---- Kariyer konumu (Pusula öncesi) ----
  if (faz === "kariyer") {
    const sec = (
      deger: string,
      setDeger: (v: string) => void,
      etiket: string,
      bosLabel: string
    ) => (
      <label className="block text-left">
        <span className="mb-1.5 block text-sm font-medium text-slate-300">{etiket}</span>
        <select
          value={deger}
          onChange={(e) => setDeger(e.target.value)}
          className="h-12 w-full rounded-2xl border border-royal-light/30 bg-midnight-soft px-3 text-base text-slate-100 outline-none focus:border-gold"
        >
          <option value="">{bosLabel}</option>
          {KARIYER_SECENEKLER.map((k) => (
            <option key={k} value={k}>
              {t.kariyerSeviyeEtiketler[k]}
            </option>
          ))}
        </select>
      </label>
    );
    return (
      <Kapak ikon="📊" baslik={t.kariyerBaslik}>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{t.kariyerMetin}</p>
        <div className="mt-6 space-y-4">
          {sec(karSuanki, setKarSuanki, t.kariyerSuankiEtiket, t.kariyerSecimYer)}
          {sec(karGecenAy, setKarGecenAy, t.kariyerGecenAyEtiket, t.kariyerSecimYer)}
          <label className="block text-left">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">
              {t.kariyerKidemEtiket}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              value={karKidem}
              onChange={(e) => setKarKidem(e.target.value)}
              placeholder={t.kariyerKidemYer}
              className="h-12 w-full rounded-2xl border border-royal-light/30 bg-midnight-soft px-3 text-base text-slate-100 outline-none focus:border-gold"
            />
          </label>
        </div>
        {hata && <p className="mt-3 text-sm text-red-400">{hata}</p>}
        <button
          onClick={kariyerKaydet}
          disabled={mesgul || !karSuanki}
          className="btn-kor parilti mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
        >
          {mesgul ? t.dusunuyor : t.kariyerKaydet}
        </button>
        <button
          onClick={kariyerAtla}
          className="mx-auto mt-3 block text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          {t.kariyerAtla}
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
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.listeAciklama}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.listeAciklama2}</p>

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

              {/* Örnekler — ilham için; dokun → listene eklenir. İlk birkaçı
                  görünür, gerisi "daha fazla"da. Eklenen örnek ✓ ile işaretli. */}
              <div className="mt-4 rounded-2xl border border-royal-light/15 bg-white/[0.02] p-3">
                <p className="text-xs leading-relaxed text-slate-400">{t.listeOrnekBaslik}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(ornekAcik ? t.listeOrnekler : t.listeOrnekler.slice(0, ORNEK_GORUNUR)).map(
                    (o) => {
                      const eklendi = maddeler.includes(o);
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => ornekEkle(o)}
                          disabled={eklendi}
                          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                            eklendi
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300/80"
                              : "border-royal-light/30 bg-midnight-soft text-slate-200 hover:border-gold"
                          }`}
                        >
                          {eklendi ? `${o} ✓` : `+ ${o}`}
                        </button>
                      );
                    }
                  )}
                </div>
                {t.listeOrnekler.length > ORNEK_GORUNUR && (
                  <button
                    type="button"
                    onClick={() => setOrnekAcik((a) => !a)}
                    className="mt-2 text-xs font-semibold text-gold-light underline-offset-2 hover:underline"
                  >
                    {ornekAcik
                      ? t.listeOrnekKapat
                      : t.listeOrnekDahaFazla(t.listeOrnekler.length - ORNEK_GORUNUR)}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {hata && <p className="mt-3 text-center text-sm text-red-400">{hata}</p>}
        {/* Kalan madde uyarısı — 10 zorunlu; eksikken net "kaç kaldı" */}
        {!yeterli && (
          <p className="mt-4 text-center text-sm font-medium text-gold-light/90">
            {t.listeKalanNot(MIN_MADDE - maddeler.length)}
          </p>
        )}
        <button
          onClick={listeyiTamamla}
          disabled={mesgul || !yeterli}
          className="btn-kor parilti mt-3 flex h-14 w-full shrink-0 items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
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

  // ---- Slogan seçimi ----
  if (faz === "slogan") {
    return (
      <Kapak ikon="✨" baslik={t.sloganBaslik}>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.sloganAciklama}</p>
        <div className="mt-5 space-y-2.5 text-left">
          {sloganAdaylar.map((s, i) => (
            <button
              key={i}
              onClick={() => void sloganKaydet(s)}
              disabled={sloganKaydediyor}
              className="w-full rounded-2xl border border-royal-light/30 bg-midnight-soft px-4 py-3.5 text-left text-base font-medium text-slate-100 transition-colors hover:border-gold hover:bg-midnight-card disabled:opacity-40"
            >
              <span className="mr-2 text-gold-light opacity-60">"{`${i + 1}`}"</span>
              {s}
            </button>
          ))}
        </div>

        {/* Kendin yaz seçeneği */}
        {!sloganKendinYaz ? (
          <button
            onClick={() => setSloganKendinYaz(true)}
            className="mx-auto mt-4 block text-sm font-medium text-royal-light underline-offset-2 hover:underline"
          >
            {t.sloganKendinYaz}
          </button>
        ) : (
          <div className="mt-4 space-y-2">
            <OtoTextarea
              value={sloganGirdi}
              onChange={setSloganGirdi}
              placeholder={t.sloganYazYer}
              ariaLabel={t.sloganYazYer}
              otoOdak
            />
            <button
              onClick={() => void sloganKaydet(sloganGirdi)}
              disabled={!sloganGirdi.trim() || sloganKaydediyor}
              className="btn-kor flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-40"
            >
              {sloganKaydediyor ? t.dusunuyor : t.sloganKaydet}
            </button>
          </div>
        )}

        <button
          onClick={() => setFaz("bitti")}
          className="mx-auto mt-3 block text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          {t.sloganAtla}
        </button>
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-16">
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
          {/* AŞAMA RAYI — sohbetin 3 aşaması adlarıyla; sıradakini görürsün */}
          <AsamaRayi
            className="mt-3"
            asamalar={SOHBET_ASAMALARI.map<RayAsama>((s) => ({
              ad: t.sohbetAsamalar[s],
              durum:
                (ILERLEME[s] ?? 0) < (ILERLEME[asama] ?? 0)
                  ? "tamam"
                  : s === asama
                    ? "simdi"
                    : "bekliyor",
            }))}
          />
          {/* ELEME SAYACI (#1) — kalan öncelik görsel noktalarla, metin tekrarı yerine */}
          {asama === "eleme" && tumListe.length > 0 && (
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <div className="flex flex-wrap justify-center gap-1.5">
                {tumListe.map((m, i) => {
                  const elendi = elenenler.includes(m);
                  return (
                    <span
                      key={i}
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        elendi ? "bg-white/15" : "bg-gold"
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-[0.7rem] font-medium text-slate-400">
                {t.elemeKalanEtiket(gosterListe.length)}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {mesajlar.map((m, i) => (
          <div key={i} className={`flex ${m.rol === "ayna" ? "justify-start" : "justify-end"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-base leading-relaxed ${
                m.rol === "ayna"
                  ? "ayna-balon-okur text-slate-100"
                  : "bg-gradient-to-br from-[#243349] to-[#10192a] text-[#f5ecd8] ring-1 ring-[#d4af37]/40 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.45)]"
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

      {/* Bitiş bekliyor (#6): son analiz mesajı sohbette okunsun; kişi hazır
          olunca slogan/bitiş ekranına KENDİSİ geçsin (ani atlama yok). */}
      {bittiBekliyor ? (
        <button
          onClick={() => setFaz(sloganAdaylar.length ? "slogan" : "bitti")}
          className="btn-kor parilti flex h-14 w-full shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
        >
          {sloganAdaylar.length ? t.analizDevamSlogan : t.analizDevamBitti}
        </button>
      ) : (
        <>
          {/* Bıraktıkların izi + son elemeyi geri al (#3) — yalnız eleme aşamasında */}
          {asama === "eleme" && elenenler.length > 0 && (
            <div className="shrink-0 pb-2">
              <p className="mb-1 text-center text-[0.65rem] uppercase tracking-wide text-slate-600">
                {t.elenenlerBaslik}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {elenenler.map((m, i) => (
                  <span
                    key={i}
                    title={m}
                    className="max-w-[10rem] truncate rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-slate-500 line-through"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <button
                onClick={sonElemeyiGeriAl}
                disabled={geriAliniyor}
                className="mx-auto mt-1.5 block text-xs font-medium text-gold-light/80 underline-offset-2 hover:underline disabled:opacity-50"
              >
                {geriAliniyor ? t.geriAliniyor : t.geriAlSon}
              </button>
            </div>
          )}

          {/* Kalan öncelikler — eleme'de tek dokunuş 'bırak', diğer aşamada yanıta yaz (#4) */}
          {gosterListe.length > 0 && (
            <div className="shrink-0 pb-3">
              <p className="mb-1.5 text-center text-[0.65rem] uppercase tracking-wide text-slate-500">
                {asama === "eleme" ? t.elemeChipIpucu : t.listeHatirlat}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {gosterListe.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => (asama === "eleme" ? gonder(m) : setGirdi(m))}
                    disabled={mesgul}
                    title={m}
                    className={`max-w-[12rem] truncate rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                      asama === "eleme"
                        ? "border-rose-400/30 bg-rose-500/5 text-slate-200 hover:border-rose-400/70 hover:bg-rose-500/10"
                        : "border-royal-light/30 bg-midnight-soft text-slate-200 hover:border-gold"
                    }`}
                  >
                    {asama === "eleme" ? `${m} ✕` : m}
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
                onEnter={() => gonder()}
                placeholder={t.girisYer}
                ariaLabel={t.girisYer}
              />
            </div>
            <SesButonu
              onParca={(m) => setGirdi((g) => (g ? `${g} ${m}` : m))}
              dinleyince={setSohbetDinliyor}
              boyutSinif="h-12 w-12 rounded-2xl"
            />
            <button
              onClick={() => gonder()}
              disabled={mesgul || !girdi.trim()}
              className="btn-kor flex h-12 shrink-0 items-center justify-center rounded-2xl px-5 text-base font-bold disabled:opacity-50"
            >
              {t.gonder}
            </button>
          </div>
        </>
      )}
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
