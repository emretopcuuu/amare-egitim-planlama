"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// SESLE YAZ — çift motorlu:
//
// 1) BİRİNCİL (Faz 2, "scribe"): MediaRecorder ile cihazda kayıt →
//    /api/ses-yaz → ElevenLabs Scribe metni döner. Türkçe'de cihaz motorundan
//    belirgin isabetli ve WhatsApp-içi tarayıcı gibi Web Speech'in HİÇ olmadığı
//    ortamlarda da çalışır (yalnız mikrofon kaydı gerekir).
// 2) YEDEK (Faz 1, "tarayici"): tarayıcının yerleşik tanıması (Web Speech) —
//    canlı önizleme + otomatik yeniden başlatma. Scribe SERVİSİ yoksa (503)
//    ya da üst üste düşerse sonraki denemeler bu motora döner; MediaRecorder
//    yoksa baştan bu moddur.
//
// GÜVENİLİRLİK (saha geri bildirimi "her zaman duymuyor"):
// - Boş kayıt / boş çeviri artık SESSİZ geçilmez — kişiye ne olduğu söylenir.
// - Başarısız çeviride kayıt atılmaz: "Tekrar gönder" aynı kaydı yeniden dener.
// - 429 (AI limiti) GEÇİCİDİR: motor tarayıcıya düşürülmez, bekle-yeniden-gönder.
// - Kayıt sırasında GERÇEK mikrofon seviyesi (AnalyserNode) çizilir; ses hiç
//   gelmiyorsa 4 sn'de dürüst "mikrofon ses almıyor" uyarısı çıkar.
//
// İki motor da yoksa düğme hiç görünmez.

type TanimaSonucu = { transcript: string };
type TanimaOlayi = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<TanimaSonucu> & { isFinal: boolean }>;
};
type HataOlayi = { error?: string };
type Tanima = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: TanimaOlayi) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: HataOlayi) => void) | null;
};

// Kayıt/dinleme tavanları.
const AZAMI_KAYIT_SN = 120; // Scribe kaydı — maliyet ve istek boyutu sınırı
const AZAMI_DINLEME_MS = 90_000; // Web Speech oturum tavanı (yedek motor)
const SESSIZLIK_IPUCU_MS = 5_000;
const VU_SESSIZLIK_MS = 4_000; // gerçek seviye bu kadar süre sıfırsa uyar
const KISA_KAYIT_BAYT = 1024; // altı: kayıt fiilen boş (iOS anlık dokunuşları)
const SCRIBE_DUSME_ESIGI = 2; // üst üste bu kadar servis hatasında tarayıcıya dön

function hataMesaji(kod: string | undefined): string {
  switch (kod) {
    case "not-allowed":
    case "service-not-allowed":
      return tr.ses.hata.izin;
    case "audio-capture":
      return tr.ses.hata.mesgul;
    case "no-speech":
      return tr.ses.hata.sessiz;
    case "network":
      return tr.ses.hata.ag;
    default:
      return tr.ses.hata.genel;
  }
}

function tanimaOlustur(): Tanima | null {
  if (typeof window === "undefined") return null;
  const Sinif =
    (window as unknown as { SpeechRecognition?: new () => Tanima })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => Tanima })
      .webkitSpeechRecognition;
  return Sinif ? new Sinif() : null;
}

function kayitDestekliMi(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function sureYazi(sn: number): string {
  const d = Math.floor(sn / 60);
  const s = sn % 60;
  return `${d}:${s.toString().padStart(2, "0")}`;
}

export default function MikrofonButonu({
  onMetin,
  disabled,
  ikon = false,
  belirgin = false,
}: {
  onMetin: (parca: string) => void;
  disabled?: boolean;
  // Kompakt ikon modu: dar giriş satırlarında (Hedef/Pusula sohbeti gibi)
  // textarea + Gönder ile aynı hizada duran kare ikon düğme.
  ikon?: boolean;
  // Öneri #9 — "Anlat, ben yazayım": açık uçlu onboarding alanlarında konuşma
  // BİRİNCİL eylem olsun diye büyük, tam genişlik, birincil stilli düğme.
  belirgin?: boolean;
}) {
  const [motor, setMotor] = useState<"yok" | "scribe" | "tarayici">("yok");
  const [dinliyor, setDinliyor] = useState(false);
  const [cevriliyor, setCevriliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [araMetin, setAraMetin] = useState("");
  const [sessizIpucu, setSessizIpucu] = useState(false);
  const [kayitSn, setKayitSn] = useState(0);
  // Başarısız çeviri sonrası aynı kaydı yeniden gönderme imkânı (render tetikler).
  const [tekrarVar, setTekrarVar] = useState(false);

  const onMetinRef = useRef(onMetin);
  useEffect(() => {
    onMetinRef.current = onMetin;
  }, [onMetin]);

  // — Scribe kayıt durumu —
  const kayitciRef = useRef<MediaRecorder | null>(null);
  const akisRef = useRef<MediaStream | null>(null);
  const parcalarRef = useRef<Blob[]>([]);
  const sayacRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Kayıt vazgeçilerek mi durdu (unmount) — çeviriye gönderme.
  const vazgecildiRef = useRef(false);
  // Son başarısız kayıt: "Tekrar gönder" bunu yeniden dener (yeniden konuşturma).
  const sonKayitRef = useRef<{ blob: Blob; tip: string } | null>(null);
  // Üst üste Scribe SERVİS hatası sayacı (429 sayılmaz — o geçici).
  const scribeHataRef = useRef(0);
  // Gerçek seviye ölçümü (VU) — süsleme değil: "duyuyor mu?" sorusunun cevabı.
  const vuRef = useRef<{ ctx: AudioContext; raf: number } | null>(null);
  const cubukRef = useRef<(HTMLSpanElement | null)[]>([]);

  // — Web Speech (yedek) durumu —
  const tanimaRef = useRef<Tanima | null>(null);
  const istekliDurdurmaRef = useRef(false);
  const baslangicMsRef = useRef(0);
  const sesGeldiRef = useRef(false);
  const ipucuZamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bu oturumda kaç final segmenti zaten metne EKLENDİ. Mobil/uygulama-içi
  // tarayıcılarda onresult.resultIndex sık sık 0'a düşüp TÜM finalleri her
  // olayda yeniden yollar → aynı kelime 8-10 kez eklenir (saha bildirimi).
  // Bu sayaç her final'i yalnız BİR KEZ eklememizi sağlar (her yeni oturumda 0).
  const islenenFinalRef = useRef(0);

  useEffect(() => {
    // Motor seçimi ancak istemcide bilinebilir; tek seferlik.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (kayitDestekliMi()) setMotor("scribe");
    else if (tanimaOlustur()) setMotor("tarayici");
    return () => {
      vazgecildiRef.current = true;
      istekliDurdurmaRef.current = true;
      if (sayacRef.current) clearInterval(sayacRef.current);
      if (ipucuZamanlayiciRef.current) clearTimeout(ipucuZamanlayiciRef.current);
      vuDurdur();
      kayitciRef.current?.stream.getTracks().forEach((iz) => iz.stop());
      akisRef.current?.getTracks().forEach((iz) => iz.stop());
      const t = tanimaRef.current;
      if (t) {
        t.onresult = null;
        t.onend = null;
        t.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Canlı soru overlay'i açılınca (CanliSoruDinleyici 'la-kayit-durdur' yayınlar)
  // altta süren kaydı durdur — kayıt görünmeyen formun içine akıp "mikrofonum
  // takılı kaldı" paniği yaratmasın. Yalnız dinliyorken iş yapar.
  useEffect(() => {
    function durdur() {
      if (!dinliyor) return;
      if (motor === "scribe") kayitDurdur();
      else tanimaDegistir(); // dinliyorken çağrı = durdurur
    }
    window.addEventListener("la-kayit-durdur", durdur);
    return () => window.removeEventListener("la-kayit-durdur", durdur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dinliyor, motor]);

  if (motor === "yok") return null;

  // ————— GERÇEK SEVİYE (VU) —————

  function vuBaslat(akis: MediaStream) {
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const analiz = ctx.createAnalyser();
      analiz.fftSize = 256;
      ctx.createMediaStreamSource(akis).connect(analiz);
      const veri = new Uint8Array(analiz.frequencyBinCount);
      // Konuşma enerjisi alt bantlarda — üst %40'ı atla (boş tiz gürültüsü).
      const ustSinir = Math.floor(veri.length * 0.6);
      let sonSesMs = Date.now();
      const dongu = () => {
        analiz.getByteFrequencyData(veri);
        for (let b = 0; b < cubukRef.current.length; b++) {
          const el = cubukRef.current[b];
          if (!el) continue;
          const bas = Math.floor((b / cubukRef.current.length) * ustSinir);
          const son = Math.floor(((b + 1) / cubukRef.current.length) * ustSinir);
          let toplam = 0;
          for (let i = bas; i < son; i++) toplam += veri[i];
          const oran = toplam / Math.max(1, son - bas) / 255;
          el.style.animation = "none"; // CSS süs animasyonunu gerçek seviye ezer
          el.style.transformOrigin = "center";
          el.style.transform = `scaleY(${Math.max(0.15, Math.min(1, oran * 2.4))})`;
        }
        let genelToplam = 0;
        for (let i = 0; i < ustSinir; i++) genelToplam += veri[i];
        const genel = genelToplam / ustSinir / 255;
        if (genel > 0.02) {
          sonSesMs = Date.now();
          setSessizIpucu(false);
        } else if (Date.now() - sonSesMs > VU_SESSIZLIK_MS) {
          setSessizIpucu(true);
        }
        if (vuRef.current) vuRef.current.raf = requestAnimationFrame(dongu);
      };
      vuRef.current = { ctx, raf: requestAnimationFrame(dongu) };
    } catch {
      // VU ölçümü düşerse kayıt etkilenmez — çubuklar CSS animasyonunda kalır.
    }
  }

  function vuDurdur() {
    const v = vuRef.current;
    if (!v) return;
    vuRef.current = null;
    cancelAnimationFrame(v.raf);
    void v.ctx.close().catch(() => {});
  }

  // ————— SCRIBE (birincil) —————

  async function kayitBaslat() {
    setHata(null);
    setTekrarVar(false);
    setSessizIpucu(false);
    sonKayitRef.current = null;
    vazgecildiRef.current = false;
    try {
      const ses = await navigator.mediaDevices.getUserMedia({ audio: true });
      akisRef.current = ses;
      const tip = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const kaydedici = tip ? new MediaRecorder(ses, { mimeType: tip }) : new MediaRecorder(ses);
      parcalarRef.current = [];
      kaydedici.ondataavailable = (e) => {
        if (e.data.size > 0) parcalarRef.current.push(e.data);
      };
      kaydedici.onstop = () => {
        ses.getTracks().forEach((iz) => iz.stop());
        akisRef.current = null;
        if (sayacRef.current) clearInterval(sayacRef.current);
        vuDurdur();
        setSessizIpucu(false);
        if (vazgecildiRef.current) return;
        const blobTip = kaydedici.mimeType.includes("mp4") ? "audio/mp4" : "audio/webm";
        const blob = new Blob(parcalarRef.current, { type: blobTip });
        parcalarRef.current = [];
        // Eskiden boş kayıt SESSİZCE yutuluyordu → "duymadı" algısı. Artık söyle.
        if (blob.size < KISA_KAYIT_BAYT) {
          setHata(blob.size === 0 ? tr.ses.hata.sessiz : tr.ses.kisaKayit);
          return;
        }
        sonKayitRef.current = { blob, tip: blobTip };
        void cevir(blob, blobTip);
      };
      kayitciRef.current = kaydedici;
      kaydedici.start(1000);
      vuBaslat(ses);
      setDinliyor(true);
      setKayitSn(0);
      sayacRef.current = setInterval(() => {
        setKayitSn((sn) => {
          if (sn + 1 >= AZAMI_KAYIT_SN) kayitDurdur(); // tavana gelince otomatik bitir
          return sn + 1;
        });
      }, 1000);
    } catch (e) {
      const ad = (e as { name?: string })?.name ?? "";
      setHata(ad === "NotAllowedError" || ad === "SecurityError" ? tr.ses.hata.izin : tr.ses.hata.mesgul);
    }
  }

  function kayitDurdur() {
    setDinliyor(false);
    const k = kayitciRef.current;
    if (k && k.state !== "inactive") k.stop(); // onstop → cevir()
  }

  async function cevir(blob: Blob, tip: string) {
    setCevriliyor(true);
    setHata(null);
    setTekrarVar(false);
    try {
      const form = new FormData();
      form.append("ses", blob, tip.includes("mp4") ? "kayit.mp4" : "kayit.webm");
      const res = await fetch("/api/ses-yaz", { method: "POST", body: form });
      const veri = await res.json().catch(() => null);
      if (res.ok && typeof veri?.metin === "string") {
        scribeHataRef.current = 0;
        if (veri.metin.trim()) {
          sonKayitRef.current = null;
          onMetinRef.current(veri.metin.trim());
        } else {
          // Scribe kayıtta konuşma bulamadı — aynı kaydı yeniden denemek boşuna.
          sonKayitRef.current = null;
          setHata(tr.ses.duyamadim);
        }
        return;
      }
      // 429 = AI limit penceresi, GEÇİCİ: motoru düşürme, kaydı sakla, beklet.
      if (res.status === 429) {
        setHata(tr.ses.yogun);
        setTekrarVar(true);
        return;
      }
      // 503 = servis yapılandırılmamış (anahtar yok): kalıcı — tarayıcıya dön.
      if (res.status === 503) {
        if (tanimaOlustur()) setMotor("tarayici");
        setHata(tr.ses.cevirihata);
        return;
      }
      // 502/diğer: geçici servis hatası olabilir — kaydı tut, tekrar dene imkânı
      // ver; ancak üst üste düşüyorsa tarayıcı motoruna dön (varsa).
      scribeHataRef.current++;
      if (scribeHataRef.current >= SCRIBE_DUSME_ESIGI && tanimaOlustur()) {
        setMotor("tarayici");
        setHata(tr.ses.cevirihata);
        return;
      }
      setHata(tr.ses.cevirihata);
      setTekrarVar(true);
    } catch {
      // Ağ hatası: kayıt elimizde — bağlantı gelince yeniden gönderilebilir.
      setHata(tr.ses.hata.ag);
      setTekrarVar(true);
    } finally {
      setCevriliyor(false);
    }
  }

  function tekrarGonder() {
    const s = sonKayitRef.current;
    if (s && !cevriliyor) void cevir(s.blob, s.tip);
  }

  // ————— WEB SPEECH (yedek — Faz 1 davranışı) —————

  function ipucuKur() {
    if (ipucuZamanlayiciRef.current) clearTimeout(ipucuZamanlayiciRef.current);
    ipucuZamanlayiciRef.current = setTimeout(() => {
      if (!sesGeldiRef.current) setSessizIpucu(true);
    }, SESSIZLIK_IPUCU_MS);
  }

  function oturumBaslat(): boolean {
    const tanima = tanimaOlustur();
    if (!tanima) return false;
    // Yeni oturum = taze results dizisi → işlenen final sayacını sıfırla
    // (onend ile otomatik yeniden başlatmada da her oturum 0'dan sayılır).
    islenenFinalRef.current = 0;
    tanima.lang = "tr-TR";
    tanima.continuous = true;
    tanima.interimResults = true;
    tanima.onresult = (e) => {
      sesGeldiRef.current = true;
      setSessizIpucu(false);
      let ara = "";
      // resultIndex'e GÜVENME — bazı tarayıcılar onu 0'a düşürüp tüm finalleri
      // tekrar yollar. Her zaman baştan tara; her final'i yalnız bir kez ekle
      // (indeks korumasıyla), interim'ler yalnız canlı önizleme.
      for (let i = 0; i < e.results.length; i++) {
        const sonuc = e.results[i];
        const parca = sonuc[0]?.transcript ?? "";
        if (sonuc.isFinal) {
          if (i >= islenenFinalRef.current) {
            if (parca.trim()) onMetinRef.current(parca.trim());
            islenenFinalRef.current = i + 1;
          }
        } else {
          ara += parca;
        }
      }
      setAraMetin(ara.trim());
    };
    tanima.onend = () => {
      setAraMetin("");
      if (
        !istekliDurdurmaRef.current &&
        Date.now() - baslangicMsRef.current < AZAMI_DINLEME_MS
      ) {
        if (!oturumBaslat()) setDinliyor(false);
        return;
      }
      setDinliyor(false);
    };
    tanima.onerror = (e) => {
      if (e?.error === "no-speech" || e?.error === "aborted") return;
      istekliDurdurmaRef.current = true;
      setDinliyor(false);
      setAraMetin("");
      setHata(hataMesaji(e?.error));
    };
    tanimaRef.current = tanima;
    try {
      tanima.start();
      return true;
    } catch {
      return false;
    }
  }

  function tanimaDegistir() {
    if (dinliyor) {
      istekliDurdurmaRef.current = true;
      if (ipucuZamanlayiciRef.current) clearTimeout(ipucuZamanlayiciRef.current);
      const t = tanimaRef.current;
      if (t) {
        t.onend = null;
        t.stop();
      }
      setDinliyor(false);
      setAraMetin("");
      setSessizIpucu(false);
      return;
    }
    setHata(null);
    setSessizIpucu(false);
    istekliDurdurmaRef.current = false;
    sesGeldiRef.current = false;
    baslangicMsRef.current = Date.now();
    if (oturumBaslat()) {
      setDinliyor(true);
      ipucuKur();
    } else {
      setHata(tr.ses.hata.genel);
    }
  }

  // ————— Ortak tetik + görünüm —————

  function degistir() {
    if (cevriliyor) return;
    if (motor === "scribe") {
      if (dinliyor) kayitDurdur();
      else void kayitBaslat();
    } else {
      tanimaDegistir();
    }
  }

  const mesgul = cevriliyor;
  const etiketKisa = cevriliyor
    ? tr.ses.cevriliyor
    : dinliyor
      ? motor === "scribe"
        ? `⏺ ${tr.ses.dinliyorKisa} ${sureYazi(kayitSn)}`
        : `⏺ ${tr.ses.dinliyorKisa}`
      : `🎙 ${belirgin ? tr.ses.anlatYazayim : tr.ses.baslat}`;

  // Canlı şerit: scribe modunda kayıt/sessizlik ipucu; tarayıcı modunda ara metin.
  const canliSerit = dinliyor ? (
    <p
      role="status"
      aria-live="polite"
      className={`max-w-xs text-xs leading-relaxed ${
        motor === "tarayici" && araMetin
          ? "text-slate-200"
          : sessizIpucu
            ? "text-amber-300/90"
            : "text-slate-500"
      }`}
    >
      {motor === "scribe"
        ? sessizIpucu
          ? tr.ses.mikSesYok
          : tr.ses.kayitIpucu
        : araMetin || (sessizIpucu ? tr.ses.duyamiyorum : tr.ses.konusIpucu)}
    </p>
  ) : null;

  // Başarısız çeviri sonrası aynı kaydı yeniden gönderme düğmesi.
  const tekrarDugmesi =
    tekrarVar && !dinliyor && !cevriliyor ? (
      <button
        type="button"
        onClick={tekrarGonder}
        className="rounded-lg border border-amber-400/40 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-400/10"
      >
        {tr.ses.tekrarGonder}
      </button>
    ) : null;

  if (ikon) {
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={degistir}
          disabled={disabled || mesgul}
          aria-pressed={dinliyor}
          aria-label={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
          title={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition-colors disabled:opacity-40 ${
            dinliyor
              ? "animate-pulse bg-red-500/80 text-white ring-2 ring-red-400/50"
              : "bg-midnight-soft text-slate-300 ring-1 ring-royal-light/40 hover:text-slate-100"
          }`}
        >
          {cevriliyor ? "✍️" : dinliyor ? "⏹" : "🎤"}
        </button>
        {(dinliyor || cevriliyor || hata) && (
          <div className="absolute bottom-full right-0 mb-2 w-max max-w-[16rem] space-y-1.5 rounded-lg bg-midnight px-3 py-1.5 shadow-lg ring-1 ring-royal-light/25">
            {hata ? (
              <>
                <p role="status" className="text-xs leading-relaxed text-amber-300/90">
                  {hata}
                </p>
                {tekrarDugmesi}
              </>
            ) : cevriliyor ? (
              <p role="status" className="text-xs leading-relaxed text-slate-300">
                {tr.ses.cevriliyor}
              </p>
            ) : (
              canliSerit
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-2 ${belirgin ? "w-full" : ""}`}>
      <div className={`flex items-center gap-3 ${belirgin ? "w-full" : ""}`}>
        <button
          type="button"
          onClick={degistir}
          disabled={disabled || mesgul}
          aria-pressed={dinliyor}
          aria-label={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
          title={dinliyor ? tr.ses.dinliyor : undefined}
          className={`bas-his flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:opacity-40 ${
            belirgin
              ? "h-12 flex-1 rounded-2xl px-4 text-base font-bold"
              : "h-11 rounded-xl px-4 text-sm font-semibold"
          } ${
            dinliyor
              ? "bg-red-500/80 text-white ring-2 ring-red-400/40"
              : belirgin
                ? "btn-kor"
                : "border border-royal-light/40 text-slate-200 hover:bg-midnight-soft"
          }`}
        >
          {etiketKisa}
        </button>
        {/* Dinlerken canlı ses dalgası — scribe modunda GERÇEK mikrofon
            seviyesi (VU), analizör kurulamazsa CSS süs animasyonu kalır. */}
        {dinliyor && (
          <div className="flex h-8 items-center gap-[3px]" aria-hidden>
            {[0, 0.12, 0.24, 0.36, 0.18, 0.06, 0.3, 0.2].map((g, i) => (
              <span
                key={i}
                ref={(el) => {
                  cubukRef.current[i] = el;
                }}
                className="ses-cubuk"
                style={{ animationDelay: `${g}s` }}
              />
            ))}
          </div>
        )}
      </div>
      {canliSerit}
      {cevriliyor && !dinliyor && (
        <p role="status" className="text-xs text-slate-400">
          {tr.ses.cevriliyor}
        </p>
      )}
      {hata && (
        <p role="status" className="max-w-xs text-xs leading-relaxed text-amber-300/90">
          {hata}
        </p>
      )}
      {tekrarDugmesi}
    </div>
  );
}
