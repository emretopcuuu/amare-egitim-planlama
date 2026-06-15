"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.rituel;

// SES RİTÜELİ — YANSIMAN'ın doğum anı, TAM EKRAN sihirbaz.
// UX ilkesi: her ekranda TEK iş, az yazı, BÜYÜK yazı, tek ana buton.
// Akış: davet → onay (iki dev buton) → fotoğraf → yemin → soru → uyanış → ses.

type Asama =
  | "giris"
  | "onay"
  | "foto"
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
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-light">
        {t.muhurUst}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.muhurMetin}</p>
    </div>
  );
}

export default function AynaRituel() {
  const [asama, setAsama] = useState<Asama>("giris");
  const [sayac, setSayac] = useState(0);
  const [beklenti, setBeklenti] = useState("");
  const [sesUrl, setSesUrl] = useState<string | null>(null);
  const [calindi, setCalindi] = useState(false);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [fotoOnizleme, setFotoOnizleme] = useState<string | null>(null);
  const [kayitOnizleme, setKayitOnizleme] = useState<string | null>(null);
  const [kayitCaliyor, setKayitCaliyor] = useState(false);

  const kayitci = useRef<MediaRecorder | null>(null);
  const fotoDosya = useRef<File | null>(null);
  const dosyaGirisi = useRef<HTMLInputElement | null>(null);
  const parcalar = useRef<Blob[]>([]);
  const kayitVerisi = useRef<{ blob: Blob; tip: string } | null>(null);
  const onizlemeSes = useRef<HTMLAudioElement | null>(null);
  const akis = useRef<MediaStream | null>(null);
  const taniyici = useRef<Taniyici | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setInterval> | null>(null);
  const kalan = useRef(0);
  const bitiriliyor = useRef(false);

  useEffect(() => {
    // unmount temizliği: mikrofonu ve sayaçları serbest bırak
    return () => {
      if (zamanlayici.current) clearInterval(zamanlayici.current);
      taniyici.current?.stop();
      onizlemeSes.current?.pause();
      if (kayitci.current?.state === "recording") kayitci.current.stop();
      akis.current?.getTracks().forEach((iz) => iz.stop());
    };
  }, []);

  function geriSayim(saniye: number, bitince: () => void) {
    if (zamanlayici.current) clearInterval(zamanlayici.current);
    kalan.current = saniye;
    setSayac(saniye);
    const id = setInterval(() => {
      kalan.current -= 1;
      setSayac(Math.max(0, kalan.current));
      if (kalan.current <= 0) {
        clearInterval(id);
        bitince();
      }
    }, 1000);
    zamanlayici.current = id;
  }

  function fotoSecildi(dosya: File | null) {
    if (!dosya) return;
    fotoDosya.current = dosya;
    setFotoOnizleme((eski) => {
      if (eski) URL.revokeObjectURL(eski);
      return URL.createObjectURL(dosya);
    });
  }

  async function sesBasla() {
    setHataMesaji(null);
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
      kaydedici.start(1000);
      bitiriliyor.current = false;
      setAsama("kayit");
      geriSayim(40, soruyaGec);
    } catch {
      setHataMesaji(t.mikrofonYok);
      setAsama("hata");
    }
  }

  function soruyaGec() {
    setAsama("soru");
    geriSayim(20, bitir);
    // beklenti cümlesi konuşulurken yazıya dökülür (destekleyen tarayıcıda)
    const tan = taniyiciKur();
    if (tan) {
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
      tan.onerror = () => {};
      try {
        tan.start();
        taniyici.current = tan;
      } catch {
        taniyici.current = null;
      }
    }
  }

  // Kaydı bitir: GÖNDERME — önce dinleme/inceleme ekranına götür.
  function bitir() {
    if (bitiriliyor.current) return;
    bitiriliyor.current = true;
    if (zamanlayici.current) clearInterval(zamanlayici.current);
    taniyici.current?.stop();

    const kaydedici = kayitci.current;
    if (!kaydedici) {
      setAsama("hata");
      return;
    }
    kaydedici.onstop = () => {
      akis.current?.getTracks().forEach((iz) => iz.stop());
      const tip = kaydedici.mimeType.includes("mp4") ? "audio/mp4" : "audio/webm";
      const blob = new Blob(parcalar.current, { type: tip });
      kayitVerisi.current = { blob, tip };
      setKayitOnizleme((eski) => {
        if (eski) URL.revokeObjectURL(eski);
        return URL.createObjectURL(blob);
      });
      setKayitCaliyor(false);
      setAsama("inceleme");
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
      if (fotoDosya.current) form.append("foto", fotoDosya.current);
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
      await fetch("/api/ses-rituel", { method: "POST", body: form });
    } catch {
      // tercih sonraki girişte tekrar sorulur; akışı kesme
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
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#04101c]/95 p-6 text-[#e6edf4] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        {asama === "giris" && (
          <div className="text-center">
            <p className="prizma-serif text-sm uppercase tracking-[0.4em] text-slate-400">
              Ses Ritüeli
            </p>
            <h1 className="prizma-serif ay-metin mt-4 text-4xl font-semibold leading-tight">
              🌊 {t.baslik}
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-slate-200">{t.aciklama}</p>
            <div className="mt-10">
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
              <DevButon onClick={() => setAsama("foto")}>{t.onayla}</DevButon>
              <DevButon onClick={sessizSec} ikincil>
                {t.sessiz}
              </DevButon>
            </div>
          </div>
        )}

        {asama === "foto" && (
          <div className="text-center">
            <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
              🪞 {t.fotoBaslik}
            </h1>
            <p className="mt-5 text-xl leading-relaxed text-slate-200">{t.fotoAciklama}</p>
            <input
              ref={dosyaGirisi}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => fotoSecildi(e.target.files?.[0] ?? null)}
            />
            {fotoOnizleme ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoOnizleme}
                  alt=""
                  className="mx-auto mt-6 h-48 w-40 rounded-3xl object-cover opacity-85"
                />
                <div className="mt-8 space-y-4">
                  <DevButon onClick={sesBasla}>{t.fotoDevam} →</DevButon>
                  <DevButon onClick={() => dosyaGirisi.current?.click()} ikincil>
                    {t.fotoYeniden}
                  </DevButon>
                </div>
              </>
            ) : (
              <div className="mt-10">
                <DevButon onClick={() => dosyaGirisi.current?.click()}>
                  {t.fotoCek}
                </DevButon>
              </div>
            )}
            <button
              onClick={sesBasla}
              className="mt-6 text-base text-slate-500 underline-offset-4 hover:underline"
            >
              {t.fotoAtla}
            </button>
          </div>
        )}

        {asama === "kayit" && (
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg font-bold text-red-300">
                <span className="h-3 w-3 animate-pulse rounded-full bg-red-400" />
                REC
              </span>
              <span className="font-mono text-2xl font-bold text-slate-200">{sayac}</span>
            </div>
            <p className="mt-5 text-base uppercase tracking-widest text-slate-400">
              {t.yeminYonerge}
            </p>
            <p className="prizma-serif mt-5 text-2xl leading-relaxed text-slate-50">
              “{t.yemin}”
            </p>
            <div className="mt-8">
              <DevButon onClick={soruyaGec}>{t.devam} →</DevButon>
            </div>
          </div>
        )}

        {asama === "soru" && (
          <div className="text-center">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg font-bold text-red-300">
                <span className="h-3 w-3 animate-pulse rounded-full bg-red-400" />
                REC
              </span>
              <span className="font-mono text-2xl font-bold text-slate-200">{sayac}</span>
            </div>
            <h1 className="prizma-serif ay-metin mt-6 text-3xl font-semibold leading-tight">
              {t.soru}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-300">{t.soruAlt}</p>
            <textarea
              value={beklenti}
              onChange={(e) => setBeklenti(e.target.value.slice(0, 300))}
              rows={3}
              className="mt-6 w-full rounded-2xl border-2 border-white/20 bg-white/[0.06] p-4 text-xl text-slate-100 placeholder:text-slate-500 focus:border-sky-200/70 focus:outline-none"
              placeholder={t.soruNot}
            />
            <div className="mt-8">
              <DevButon onClick={bitir}>{t.bitir}</DevButon>
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
            <div className="mt-8">
              <DevButon onClick={kaydiDinle} ikincil>
                {kayitCaliyor ? t.inceleDurdur : t.inceleDinle}
              </DevButon>
            </div>
            <div className="mt-8 space-y-4">
              <DevButon onClick={kaydiGonder}>{t.inceleGonder} →</DevButon>
              <DevButon onClick={tekrarKaydet} ikincil>
                {t.inceleTekrar}
              </DevButon>
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
                <div className="mt-10">
                  <DevButon onClick={() => setAsama("kapandi")}>{t.kapat}</DevButon>
                </div>
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
