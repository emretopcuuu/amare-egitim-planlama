"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import { ortuAc, ortuKapat } from "@/lib/ortu";
import AynaIkon from "@/components/AynaIkon";
import AynaSesi from "@/components/AynaSesi";
import MuhurIkon from "@/components/MuhurIkon";
import CanliAyna from "@/components/CanliAyna";

const t = tr.rituel;

// SES RİTÜELİ — YANSIMAN'ın doğum anı, TAM EKRAN sihirbaz.
// UX ilkesi: her ekranda TEK iş, az yazı, BÜYÜK yazı, tek ana buton.
// Akış: davet → onay (iki dev buton) → YÜZ YAKALA (Canlı Ayna, gömülü) → yemin
// → soru → uyanış → ses. Kimliğin doğuşu artık TEK törende: yüz + ses birlikte.
// Yüz yakalama zorunlu değil — atlayan kişi Pusula hub'ında sonradan yapabilir.

type Asama =
  | "giris"
  | "onay"
  | "yuzYakala"
  | "yeminHazirlik"
  | "kayit"
  | "soru"
  | "inceleme"
  | "gonderiliyor"
  | "baglantiBekliyor"
  | "hazir"
  | "sonra"
  | "hata"
  | "kapandi";

type Taniyici = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function taniyiciKur(): Taniyici | null {
  const w = window as unknown as {
    webkitSpeechRecognition?: new () => Taniyici;
    SpeechRecognition?: new () => Taniyici;
  };
  const Sinif = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Sinif ? new Sinif() : null;
}

// Dev birincil buton: yaşlı gözler ve kalın parmaklar için
function DevButon({
  onClick,
  children,
  ikincil = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  ikincil?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        ikincil
          ? "flex h-16 w-full items-center justify-center rounded-2xl border-2 border-white/25 text-xl font-bold text-slate-100 hover:bg-white/[0.08]"
          : "btn-kor parilti flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold"
      }
    >
      {children}
    </button>
  );
}

// A1 Mühür rozeti: ritüel kapanışında, kişinin beklenti sözünün "kampın sonunda
// açılmak üzere" mühürlendiğini hissettiren küçük, kutsal teyit.
function MuhurRozet() {
  return (
    <div className="mt-8 rounded-2xl border border-gold/30 bg-gold/[0.06] px-5 py-4 text-center">
      <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-gold-light">
        <MuhurIkon className="h-4 w-4" />
        {t.muhurUst}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.muhurMetin}</p>
    </div>
  );
}

type SesKalitesi = "iyi" | "kisa" | "sessiz" | null;

export default function AynaRituel() {
  const [asama, setAsama] = useState<Asama>("giris");
  const [beklenti, setBeklenti] = useState("");
  const [sesUrl, setSesUrl] = useState<string | null>(null);
  const [calindi, setCalindi] = useState(false);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [kayitOnizleme, setKayitOnizleme] = useState<string | null>(null);
  const [kayitCaliyor, setKayitCaliyor] = useState(false);
  const [sesKalitesi, setSesKalitesi] = useState<SesKalitesi>(null);
  const [kayitSuresi, setKayitSuresi] = useState(0);
  // Sözü yazıya dökme: ARTIK OTOMATİK DEĞİL — kişi yemini okurken textarea'ya
  // yanlışlıkla yazılmasın diye yalnız bu açıkken (manuel) konuşma tanınır.
  const [dinleniyor, setDinleniyor] = useState(false);

  const kayitci = useRef<MediaRecorder | null>(null);
  const parcalar = useRef<Blob[]>([]);
  const kayitVerisi = useRef<{ blob: Blob; tip: string } | null>(null);
  const onizlemeSes = useRef<HTMLAudioElement | null>(null);
  const akis = useRef<MediaStream | null>(null);
  const taniyici = useRef<Taniyici | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setInterval> | null>(null);
  const bitiriliyor = useRef(false);
  // Ses kalite ölçümü
  const audioCtxRef = useRef<AudioContext | null>(null);
  const samplerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baslangicZamaniRef = useRef<number>(0);
  const sesSeviyeleriRef = useRef<number[]>([]);

  // Ritüel TAM EKRAN sihirbaz: açıkken alt menüyü (AltNav) gizle — sihrin
  // ortasında dolaşma çubuğu durmasın. Bitince/çıkınca menü geri gelir.
  useEffect(() => {
    ortuAc();
    return () => ortuKapat();
  }, []);

  useEffect(() => {
    // unmount temizliği: mikrofonu ve sayaçları serbest bırak
    return () => {
      if (zamanlayici.current) clearInterval(zamanlayici.current);
      if (samplerRef.current) clearInterval(samplerRef.current);
      void audioCtxRef.current?.close().catch(() => {});
      taniyici.current?.stop();
      onizlemeSes.current?.pause();
      if (kayitci.current?.state === "recording") kayitci.current.stop();
      akis.current?.getTracks().forEach((iz) => iz.stop());
    };
  }, []);

  // Ritüel kapanınca (kayıt gönderildi ya da "sessiz" seçildi) artık ses profili
  // var; sunucu akışını yeniden çalıştır ki kullanıcı boş ekranda kalmadan
  // sıradaki adıma (oyun seçimi / ana sayfa) geçsin. Hard reload bulletproof.
  useEffect(() => {
    if (asama === "kapandi") {
      window.location.href = "/";
    }
  }, [asama]);

  async function sesBasla() {
    setHataMesaji(null);
    setSesKalitesi(null);
    setKayitSuresi(0);
    if (typeof MediaRecorder === "undefined") {
      setHataMesaji(t.mikrofonYok);
      setAsama("hata");
      return;
    }
    try {
      const ses = await navigator.mediaDevices.getUserMedia({ audio: true });
      akis.current = ses;
      const tip = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const kaydedici = tip ? new MediaRecorder(ses, { mimeType: tip }) : new MediaRecorder(ses);
      parcalar.current = [];
      kaydedici.ondataavailable = (e) => {
        if (e.data.size > 0) parcalar.current.push(e.data);
      };
      kayitci.current = kaydedici;

      // Ses seviyesi ölçümü — kalite kontrolü için
      try {
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          ctx.createMediaStreamSource(ses).connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          audioCtxRef.current = ctx;
          sesSeviyeleriRef.current = [];
          samplerRef.current = setInterval(() => {
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            sesSeviyeleriRef.current.push(avg);
          }, 300);
        }
      } catch {
        /* AudioContext desteklenmiyor — kalite bilinmiyor */
      }

      baslangicZamaniRef.current = Date.now();
      kaydedici.start(1000);
      bitiriliyor.current = false;
      titret([20, 60, 20]); // kayıt başladı: net fiziksel onay
      setAsama("kayit");
      // Geri sayım YOK: kayıt sürer; kişi yemini bitirince "Devam →" ile geçer.
    } catch {
      setHataMesaji(t.mikrofonYok);
      setAsama("hata");
    }
  }

  // "Devam →": yemin okundu → KAYIT BİTER (ses örneği = yemin okuması). Söz
  // ekranına geçilir; orada artık kayıt YOK, yalnız metin + sesle-yaz var.
  function yeminiBitir() {
    bitirVeGec("soru");
  }

  // Söz ekranından "Sözümü mühürle": kayıt zaten bitti, doğrudan incelemeye geç.
  function sozuMuhurle() {
    taniyici.current?.stop();
    setDinleniyor(false);
    setAsama("inceleme");
  }

  // Manuel sesli yazma anahtarı (soru ekranı): yalnız basınca konuşma yazıya döker.
  function sesliYazAnahtar() {
    if (dinleniyor) {
      taniyici.current?.stop();
      setDinleniyor(false);
      return;
    }
    const tan = taniyiciKur();
    if (!tan) return;
    tan.lang = "tr-TR";
    tan.continuous = true;
    tan.interimResults = true;
    tan.onresult = (e) => {
      let metin = "";
      for (let i = 0; i < e.results.length; i++) {
        metin += e.results[i][0]?.transcript ?? "";
      }
      setBeklenti(metin.trim().slice(0, 300));
    };
    tan.onerror = () => setDinleniyor(false);
    try {
      tan.start();
      taniyici.current = tan;
      setDinleniyor(true);
    } catch {
      taniyici.current = null;
      setDinleniyor(false);
    }
  }

  // Kaydı bitir ve `hedef` aşamasına geç. Yemin okunduğunda (Devam) çağrılır;
  // ses örneği o an mühürlenir, kişi söz ekranına geçer.
  function bitirVeGec(hedef: Asama) {
    if (bitiriliyor.current) return;
    bitiriliyor.current = true;
    if (zamanlayici.current) clearInterval(zamanlayici.current);
    taniyici.current?.stop();
    setDinleniyor(false);

    const kaydedici = kayitci.current;
    if (!kaydedici) {
      setAsama("hata");
      return;
    }
    kaydedici.onstop = () => {
      akis.current?.getTracks().forEach((iz) => iz.stop());

      // Kalite ölçümünü durdur ve değerlendir
      if (samplerRef.current) {
        clearInterval(samplerRef.current);
        samplerRef.current = null;
      }
      void audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      const sureSaniye = (Date.now() - baslangicZamaniRef.current) / 1000;
      setKayitSuresi(Math.round(sureSaniye));
      const seviyeler = sesSeviyeleriRef.current;
      const maxSeviye = seviyeler.length > 0 ? Math.max(...seviyeler) : null;
      let kalite: SesKalitesi;
      if (sureSaniye < 10) kalite = "kisa";
      else if (maxSeviye !== null && maxSeviye < 6) kalite = "sessiz";
      else kalite = "iyi";
      setSesKalitesi(kalite);

      const tip = kaydedici.mimeType.includes("mp4") ? "audio/mp4" : "audio/webm";
      const blob = new Blob(parcalar.current, { type: tip });
      kayitVerisi.current = { blob, tip };
      setKayitOnizleme((eski) => {
        if (eski) URL.revokeObjectURL(eski);
        return URL.createObjectURL(blob);
      });
      setKayitCaliyor(false);
      setAsama(hedef);
    };
    if (kaydedici.state !== "inactive") kaydedici.stop();
  }

  // İnceleme ekranı: kaydı çal/durdur
  function kaydiDinle() {
    if (!kayitOnizleme) return;
    if (kayitCaliyor) {
      onizlemeSes.current?.pause();
      if (onizlemeSes.current) onizlemeSes.current.currentTime = 0;
      setKayitCaliyor(false);
      return;
    }
    const ses = new Audio(kayitOnizleme);
    onizlemeSes.current = ses;
    ses.onended = () => setKayitCaliyor(false);
    void ses
      .play()
      .then(() => setKayitCaliyor(true))
      .catch(() => setKayitCaliyor(false));
  }

  // Beğendi: kaydı aynaya gönder
  function kaydiGonder() {
    const v = kayitVerisi.current;
    if (!v) {
      setAsama("hata");
      return;
    }
    onizlemeSes.current?.pause();
    setAsama("gonderiliyor");
    void gonder(v.blob, v.tip);
  }

  // Bağlantı geri gelince elde tutulan kaydı yeniden göndermeyi dene
  function tekrarGonder() {
    const v = kayitVerisi.current;
    if (!v) {
      setAsama("hata");
      return;
    }
    setAsama("gonderiliyor");
    void gonder(v.blob, v.tip);
  }

  // "baglantiBekliyor" aşamasındayken internet gelince otomatik tekrar dene
  useEffect(() => {
    if (asama !== "baglantiBekliyor") return;
    function denele() {
      if (kayitVerisi.current) tekrarGonder();
    }
    window.addEventListener("online", denele);
    return () => window.removeEventListener("online", denele);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asama]);

  // Beğenmedi: baştan (40 sn yeminden) yeniden kaydet
  function tekrarKaydet() {
    onizlemeSes.current?.pause();
    setKayitCaliyor(false);
    setKayitOnizleme((eski) => {
      if (eski) URL.revokeObjectURL(eski);
      return null;
    });
    kayitVerisi.current = null;
    setBeklenti("");
    setSesKalitesi(null);
    setKayitSuresi(0);
    sesSeviyeleriRef.current = [];
    // Hazır ekranından yeniden üretirken: üretilmiş klonu da sıfırla ki yeni
    // kayıt tekrar dinleme akışından geçsin (eski klona düşmesin).
    setCalindi(false);
    setSesUrl(null);
    void sesBasla();
  }

  async function gonder(blob: Blob, tip: string) {
    try {
      const form = new FormData();
      form.append("onay", "1");
      form.append("beklenti", beklenti);
      form.append(
        "ses",
        new File([blob], tip.includes("mp4") ? "ornek.mp4" : "ornek.webm", { type: tip })
      );
      const res = await fetch("/api/ses-rituel", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const veri = (await res.json()) as { durum: string; url?: string | null };
      if (veri.durum === "hazir" && veri.url) {
        setSesUrl(veri.url);
        setAsama("hazir");
      } else {
        setAsama("sonra");
      }
    } catch {
      // Ağ hatası: kaydı KAYBETME — bellekte tut, bağlantı gelince tekrar dene.
      if (kayitVerisi.current) {
        setAsama("baglantiBekliyor");
      } else {
        setHataMesaji(t.hata);
        setAsama("hata");
      }
    }
  }

  async function sessizSec() {
    try {
      const form = new FormData();
      form.append("onay", "0");
      const res = await fetch("/api/ses-rituel", { method: "POST", body: form });
      if (!res.ok) throw new Error("api-hatasi");
    } catch {
      // Ağ/sunucu hatası: sessiz tercih kaydedilemedi — yine de devam et.
      // Sayfa yenilenmeden voice_profiles yazılamasa da uygulama "kapandi"
      // sonrası /api/cikis'e ya da "/" ye gidiyor; kötü durumda giriş tekrar sorulur.
    }
    setAsama("kapandi");
  }

  function dinle() {
    if (!sesUrl) return;
    const ses = new Audio(sesUrl);
    ses.onended = () => setCalindi(true);
    void ses.play().catch(() => setCalindi(true));
  }

  if (asama === "kapandi") return null;

  return (
    // TAM EKRAN: o an yapılan iş dışında hiçbir şey görünmez
    // not: evren-gol sınıfı position:relative tanımladığı için fixed'i
    // eziyordu — overlay'de KULLANILMAZ; zemin/metin rengi elle verilir
    <div className="gece-ada fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#04101c]/95 p-6 text-[#e6edf4] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        {asama === "giris" && (
          <div className="text-center">
            <p className="prizma-serif text-sm uppercase tracking-[0.4em] text-slate-400">
              Ses Ritüeli
            </p>
            <AynaIkon className="mx-auto mt-5 h-12 w-12 text-gold/85" />
            <h1 className="prizma-serif ay-metin mt-3 text-4xl font-semibold leading-tight">
              {t.baslik}
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-slate-200">{t.aciklama}</p>
            <div className="mt-8 text-left">
              <AynaSesi kod="rituelGiris" />
            </div>
            <div className="mt-2">
              <DevButon onClick={() => setAsama("onay")}>{t.basla}</DevButon>
            </div>
            <button
              onClick={sessizSec}
              className="mt-6 text-base text-slate-500 underline-offset-4 hover:underline"
            >
              {t.sessiz}
            </button>
          </div>
        )}

        {asama === "onay" && (
          <div className="text-center">
            <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
              {t.onayBaslik}
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-slate-200">{t.onay}</p>
            <div className="mt-10 space-y-4">
              <DevButon onClick={() => setAsama("yuzYakala")}>{t.onayla}</DevButon>
              <DevButon onClick={sessizSec} ikincil>
                {t.sessiz}
              </DevButon>
            </div>
          </div>
        )}

        {asama === "yuzYakala" && (
          <div className="text-center">
            <AynaIkon className="mx-auto h-12 w-12 text-gold/85" />
            <h1 className="prizma-serif ay-metin mt-4 text-3xl font-semibold leading-tight">
              {t.yuzYakalaBaslik}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              {t.yuzYakalaAciklama}
            </p>
            <div className="mt-8">
              <CanliAyna gomulu onTamam={() => setAsama("yeminHazirlik")} />
            </div>
            <button
              onClick={() => setAsama("yeminHazirlik")}
              className="mt-6 text-base text-slate-500 underline-offset-4 hover:underline"
            >
              {t.yuzYakalaAtla}
            </button>
          </div>
        )}

        {asama === "yeminHazirlik" && (
          <div>
            <h1 className="prizma-serif ay-metin text-center text-3xl font-semibold leading-tight">
              {t.yeminHazirlikBaslik}
            </h1>
            <p className="mt-4 text-center text-lg leading-relaxed text-slate-300">
              {t.yeminHazirlikAciklama}
            </p>
            {/* Kaydı başlat YEMİNİN ÜSTÜNDE: küçük ekranda uzun yemini kaydırmadan
                tuşa ulaşılır; hazır olunca basılır, kayıt tam o an başlar. */}
            <div className="mt-6">
              <DevButon onClick={sesBasla}>🎤 {t.kayitBaslat}</DevButon>
            </div>
            <p className="mt-2 text-center text-sm text-slate-500">
              {t.kayitHenuzBaslamadi}
            </p>
            {/* Kayıt ipuçları — daha net ses = daha iyi klon */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-light">
                💡 {t.ipuclariBaslik}
              </p>
              <ul className="mt-2 space-y-1.5">
                {t.ipuclari.map((ip) => (
                  <li key={ip} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                    <span aria-hidden className="text-gold-light/70">•</span>
                    <span>{ip}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-6 text-sm uppercase tracking-widest text-slate-400">
              {t.yeminYonerge}
            </p>
            <p className="prizma-serif mt-3 text-2xl leading-relaxed text-slate-50">
              “{t.yemin}”
            </p>
          </div>
        )}

        {asama === "kayit" && (
          <div>
            <div className="flex items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3">
              <span className="flex items-center gap-2.5 text-lg font-bold text-red-300">
                <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.7)]" />
                {t.kaydediliyor}…
              </span>
            </div>
            <p className="mt-5 text-base uppercase tracking-widest text-slate-400">
              {t.yeminYonerge}
            </p>
            <p className="prizma-serif mt-4 text-2xl leading-relaxed text-slate-50">
              “{t.yemin}”
            </p>
            <div className="mt-8">
              <DevButon onClick={yeminiBitir}>{t.devam} →</DevButon>
            </div>
          </div>
        )}

        {asama === "soru" && (
          <div className="text-center">
            {/* Kayıt bitti: ses örneği alındı — net onay (belirsizlik gitsin) */}
            <div className="flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
              <span className="flex items-center gap-2.5 text-base font-bold text-emerald-300">
                ✓ {t.sesAlindi}
              </span>
            </div>
            <MuhurIkon className="mx-auto mt-5 h-14 w-14 text-gold-light" />
            <h1 className="prizma-serif ay-metin mt-3 text-3xl font-semibold leading-tight">
              {t.soru}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-300">{t.soruAlt}</p>
            {/* Söz kutusu — kenarında mikrofon: basınca konuşmayı yazıya döker */}
            <div className="relative mt-6">
              <textarea
                value={beklenti}
                onChange={(e) => setBeklenti(e.target.value.slice(0, 300))}
                rows={3}
                className="w-full rounded-2xl border-2 border-white/20 bg-white/[0.06] p-4 pr-16 text-xl text-slate-100 placeholder:text-slate-500 focus:border-sky-200/70 focus:outline-none"
                placeholder={t.soruNot}
              />
              <button
                type="button"
                onClick={sesliYazAnahtar}
                aria-label={dinleniyor ? t.sesliYazDurdur : t.sesliYazBaslat}
                aria-pressed={dinleniyor}
                className={`absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl transition-colors ${
                  dinleniyor
                    ? "border-red-500/60 bg-red-500/20 text-red-200"
                    : "border-white/25 bg-white/[0.06] text-slate-100 hover:bg-white/[0.12]"
                }`}
              >
                {dinleniyor ? "■" : "🎤"}
              </button>
            </div>
            {dinleniyor && (
              <p className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-red-300">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                {t.sesliYazDinleniyor}
              </p>
            )}
            <div className="mt-6">
              <DevButon onClick={sozuMuhurle}>{t.bitir}</DevButon>
            </div>
          </div>
        )}

        {asama === "inceleme" && (
          <div className="text-center">
            <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
              🎧 {t.inceleBaslik}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-200">
              {t.inceleAciklama}
            </p>

            {/* Ses kalite rozeti */}
            {sesKalitesi && (
              <div
                className={`mt-5 rounded-xl px-4 py-3 text-sm leading-snug ${
                  sesKalitesi === "iyi"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-amber-400/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                {sesKalitesi === "iyi" && (
                  <span>✓ {t.kaliteIyi}</span>
                )}
                {sesKalitesi === "kisa" && (
                  <>
                    <p className="font-semibold">⚠ {t.kaliteUyari}</p>
                    <p className="mt-1">{t.kaliteKisa} ({kayitSuresi}s)</p>
                  </>
                )}
                {sesKalitesi === "sessiz" && (
                  <>
                    <p className="font-semibold">⚠ {t.kaliteUyari}</p>
                    <p className="mt-1">{t.kaliteSessiz}</p>
                  </>
                )}
              </div>
            )}

            <div className="mt-6">
              <DevButon onClick={kaydiDinle} ikincil>
                {kayitCaliyor ? t.inceleDurdur : t.inceleDinle}
              </DevButon>
            </div>

            {/* Kalite kötüyse tekrar kaydet birincil, gönder ikincil */}
            <div className="mt-6 space-y-4">
              {sesKalitesi !== "iyi" && sesKalitesi !== null ? (
                <>
                  <DevButon onClick={tekrarKaydet}>{t.inceleTekrar}</DevButon>
                  <DevButon onClick={kaydiGonder} ikincil>
                    {t.inceleGonder} →
                  </DevButon>
                </>
              ) : (
                <>
                  <DevButon onClick={kaydiGonder}>{t.inceleGonder} →</DevButon>
                  <DevButon onClick={tekrarKaydet} ikincil>
                    {t.inceleTekrar}
                  </DevButon>
                </>
              )}
            </div>
          </div>
        )}

        {asama === "gonderiliyor" && (
          <div className="text-center">
            <div className="ayna-halka mx-auto h-20 w-20" />
            <p className="prizma-serif ay-metin mt-8 text-3xl font-semibold">{t.uyaniyor}</p>
          </div>
        )}

        {asama === "baglantiBekliyor" && (
          <div className="text-center">
            <p className="text-6xl">🔌</p>
            <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold leading-tight">
              {t.baglantiBekliyorBaslik}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-200">
              {t.baglantiBekliyorMetin}
            </p>
            <div className="mt-10">
              <DevButon onClick={tekrarGonder}>{t.baglantiTekrar}</DevButon>
            </div>
          </div>
        )}

        {asama === "hazir" && (
          <div className="text-center">
            {!calindi ? (
              <>
                <p className="prizma-serif text-sm uppercase tracking-[0.4em] text-slate-400">
                  Yansıman hazır
                </p>
                <div className="mt-8">
                  <DevButon onClick={dinle}>{t.dinle}</DevButon>
                </div>
              </>
            ) : (
              <>
                <p className="prizma-serif ay-metin text-3xl font-semibold leading-snug">
                  {t.seninle}
                </p>
                <MuhurRozet />
                {/* Yansımanı tekrar dinle — kişi sesini bir daha duymak isteyebilir */}
                <button
                  onClick={dinle}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-base font-semibold text-slate-100 transition-colors hover:bg-white/[0.08]"
                >
                  {t.tekrarDinle}
                </button>
                <div className="mt-6">
                  <DevButon onClick={() => setAsama("kapandi")}>{t.kapat}</DevButon>
                </div>
                {/* Klonu beğenmediyse: baştan kaydedip yeniden üret */}
                <button
                  onClick={tekrarKaydet}
                  className="mx-auto mt-5 block max-w-xs text-base font-semibold text-gold-light underline-offset-4 hover:underline"
                >
                  {t.yenidenOlustur}
                </button>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-500">
                  {t.yenidenOlusturAlt}
                </p>
              </>
            )}
          </div>
        )}

        {asama === "sonra" && (
          <div className="text-center">
            <p className="text-2xl leading-relaxed text-slate-100">{t.sonra}</p>
            <MuhurRozet />
            <div className="mt-10">
              <DevButon onClick={() => setAsama("kapandi")}>{t.kapat}</DevButon>
            </div>
          </div>
        )}

        {asama === "hata" && (
          <div className="text-center">
            <p className="text-2xl font-semibold text-red-300">{hataMesaji ?? t.hata}</p>
            <div className="mt-10 space-y-4">
              <DevButon onClick={sesBasla}>{t.tekrar}</DevButon>
              <DevButon onClick={sessizSec} ikincil>
                {t.sessiz}
              </DevButon>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
