"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADIMLAR,
  DEGER_LISTESI,
  DEGER_ORNEK,
  nedenKodlari,
  nedenCumlesiKur,
  BOLUM_ADLARI,
  bolumIndeksi,
  bolumToplamAdim,
  bolumIcindekiSira,
  type Adim,
} from "@/lib/degerler";
import AsamaRayi, { type RayAsama } from "@/components/AsamaRayi";
import Konfeti from "@/components/Konfeti";
import KayitRozeti from "@/components/KayitRozeti";
import GizlilikMuhru from "@/components/GizlilikMuhru";
import { ONBOARDING_SURE_DK } from "@/lib/onboardingSure";
import { titret } from "@/lib/his";

// DEĞERLER ÇALIŞMASI sihirbazı — adım-adım, kaydet-devam, geri tuşlu, user-friendly.
// Çekirdek (3 değer + 1. neden + cümleler + final) zorunlu; gerisi teşvik.

const TOPLAM = ADIMLAR.length;

function vurguRender(baslik: string, vurgu: string | string[]): React.ReactNode {
  const vurgular = Array.isArray(vurgu) ? vurgu : [vurgu];
  const parts: React.ReactNode[] = [];
  let remaining = baslik;
  let key = 0;
  while (remaining.length > 0) {
    let bestIdx = -1;
    let bestV = "";
    for (const v of vurgular) {
      const idx = remaining.indexOf(v);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
        bestV = v;
      }
    }
    if (bestIdx === -1) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    if (bestIdx > 0) parts.push(<span key={key++}>{remaining.slice(0, bestIdx)}</span>);
    parts.push(<span key={key++} className="text-gold font-extrabold">{bestV}</span>);
    remaining = remaining.slice(bestIdx + bestV.length);
  }
  return <>{parts}</>;
}

// Paragraf metnini zenginleştirir: **bold** desteği + \n\n satır arası boşluk.
function zenginMetin(text: string): React.ReactNode {
  const parcalar = text.split("\n\n");
  return (
    <>
      {parcalar.map((p, pi) => {
        const bolumler: React.ReactNode[] = [];
        let kalan = p;
        let key = 0;
        while (kalan.length > 0) {
          const bas = kalan.indexOf("**");
          if (bas === -1) { bolumler.push(<span key={key++}>{kalan}</span>); break; }
          if (bas > 0) bolumler.push(<span key={key++}>{kalan.slice(0, bas)}</span>);
          const son = kalan.indexOf("**", bas + 2);
          if (son === -1) { bolumler.push(<span key={key++}>{kalan.slice(bas)}</span>); break; }
          bolumler.push(<strong key={key++} className="font-bold text-white">{kalan.slice(bas + 2, son)}</strong>);
          kalan = kalan.slice(son + 2);
        }
        return <p key={pi}>{bolumler}</p>;
      })}
    </>
  );
}

// Değer → emoji + şiirsel etiket haritaları (ai_oneri kartları)
const DEGER_EMOJI: Record<string, string> = {
  "Sevgi": "❤️", "Aile": "🏠", "Sağlık": "💪", "Özgürlük": "🦅",
  "Güven": "🛡️", "Dürüstlük": "💎", "Başarı": "🔥", "Gelişim": "🌱",
  "Saygı": "🤝", "Huzur": "🌊", "Anlam": "✨", "Mutluluk": "☀️",
  "Öğrenme": "📚", "Bağımsızlık": "🌿", "Katkı sağlamak": "🌟",
  "Adalet": "⚖️", "Sorumluluk": "🎯", "Liderlik": "👑",
  "Yaratıcılık": "🎨", "Yaşam dengesi": "🧘",
};
const DEGER_ETIKET: Record<string, string> = {
  "Sevgi": "Tüm kararlarının özü", "Aile": "Güç kaynağın",
  "Sağlık": "Temelinsin", "Özgürlük": "Nefessin",
  "Güven": "Zırhın", "Dürüstlük": "Pusulan",
  "Başarı": "İtici gücün", "Gelişim": "Yolculuğun",
  "Saygı": "Köprün", "Huzur": "Sığınağın",
  "Anlam": "Ateşin", "Mutluluk": "Işığın",
  "Öğrenme": "Kanatların", "Bağımsızlık": "Özgün sessin",
  "Katkı sağlamak": "Mirasın", "Adalet": "Kılıcın",
  "Sorumluluk": "Omurgan", "Liderlik": "Yolunsu",
  "Yaratıcılık": "Ruhunun rengi", "Yaşam dengesi": "Ritmin",
};

const NEDEN_YEDEK: Record<number, string> = {
  2: "Peki bu sana neden bu kadar önemli? Daha derine git — gerçek nedeni bul.",
  3: "Bu değer olmadan nasıl biri olurdun? Hayatında ne eksik kalırdı?",
};

// [UX1] KALDIĞIN YERDEN DEVAM — bir adımın "cevaplandı" sayılıp sayılmadığı.
// Sayfa yenilenince adım 0'a düşmek yerine ilk eksik adıma atlanır.
function adimTamamMi(a: Adim, cevaplar: Record<string, unknown>, secilenUc: string[]): boolean {
  const metinDolu = (kod: string) =>
    typeof cevaplar[kod] === "string" && (cevaplar[kod] as string).trim().length > 0;
  const diziBoyu = (kod: string) =>
    Array.isArray(cevaplar[kod]) ? (cevaplar[kod] as string[]).length : 0;
  if (a.tip === "intro") return true;
  if (a.tip === "ai_oneri") return secilenUc.length === 3;
  if (a.tip === "sec") return (a.kod === "sec3" ? secilenUc.length : diziBoyu(a.kod)) >= a.adet;
  if (a.tip === "metin") {
    if (a.degerSecimi) return a.cokSecim ? diziBoyu(a.kod) >= 1 : metinDolu(a.kod);
    return metinDolu(a.kod);
  }
  if (a.tip === "cumle" || a.tip === "neden_soru") return metinDolu(a.kod);
  if (a.tip === "neden") return metinDolu(`neden_${a.degerIndeks}_1`);
  return true;
}

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

export default function DegerlerAkis({ ustRay }: { ustRay?: React.ReactNode } = {}) {
  const router = useRouter();
  const [yuklendi, setYuklendi] = useState(false);
  const [adim, setAdim] = useState(0);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  const [cevaplar, setCevaplar] = useState<Record<string, unknown>>({});
  const [secilenUc, setSecilenUc] = useState<string[]>([]);
  const [aiOneri, setAiOneri] = useState<string[] | null>(null);
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [nedenSorular, setNedenSorular] = useState<Record<string, string>>({});
  const [nedenSoruYukleniyor, setNedenSoruYukleniyor] = useState<Record<string, boolean>>({});
  // Son adım ("final") bitince ana sayfaya ANINDA atmak yerine kapanış ekranı
  // gösterilir — Pusula/Hedef/Farkındalık'taki kanıtlı desenle aynı: kişinin
  // en ağır soruyu yanıtladığı an bir törenle kapanır, sessizce atılmaz.
  const [kapanisGoster, setKapanisGoster] = useState(false);
  // [UX1] Yenilemeden sonra ilk eksik adıma atlandıysa tek seferlik bilgi notu.
  const [kaldiginYerden, setKaldiginYerden] = useState(false);
  // [UX3+E8] Kayıt mikro güvencesi — ortak KayitRozeti bileşenine bağlanır:
  // başarı sayacı her artışta 1.5 sn "✓ Kaydedildi", hata kalıcı amber uyarı.
  const [kayitBasari, setKayitBasari] = useState(0);
  const [kayitHata, setKayitHata] = useState(false);
  // [UX5] Bölüm bitince kısa kutlama beat'i (tamamlanan bölümün adı).
  const [bolumKutlama, setBolumKutlama] = useState<string | null>(null);
  const ustRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const r = await fetch("/api/degerler");
        if (r.ok) {
          const d = await r.json();
          if (!iptal) {
            const yuklenen = (d.cevaplar as Record<string, unknown>) ?? {};
            const yuklenenUc = (d.secilenUc as string[]) ?? [];
            // DB verisi temel alınır ama kullanıcının zaten yazdıkları korunur
            setCevaplar((prev) => ({ ...yuklenen, ...prev }));
            setSecilenUc((prev) => prev.length > 0 ? prev : yuklenenUc);
            // [UX1] İlk eksik adıma atla: 41 adımı yeniden tıklamak yok.
            let ilkEksik = 0;
            while (
              ilkEksik < TOPLAM - 1 &&
              adimTamamMi(ADIMLAR[ilkEksik], yuklenen, yuklenenUc)
            )
              ilkEksik++;
            if (ilkEksik > 0) {
              setAdim(ilkEksik);
              setKaldiginYerden(true);
              setTimeout(() => setKaldiginYerden(false), 6000);
            }
          }
        }
      } catch {}
      if (!iptal) setYuklendi(true);
    })();
    return () => { iptal = true; };
  }, []);

  // Adım değişince uyarıyı temizle. (Geçiş ışıması artık key={adim} remount'uyla
  // kendiliğinden çalıyor — ayrı bir "parla" state'ine gerek yok.)
  useEffect(() => {
    setUyari(null);
  }, [adim]);

  // AI analiz: ai_oneri adımına gelince k1-k11 cevaplarını gönder
  useEffect(() => {
    const a = ADIMLAR[adim];
    if (a?.tip !== "ai_oneri" || aiOneri !== null || aiYukleniyor) return;
    setAiYukleniyor(true);
    const metinler: Record<string, string> = {};
    ["k1","k2","k3","k4","k5","k6","k7","k8","k9","k10","k11"].forEach((k) => {
      const v = cevaplar[k];
      if (typeof v === "string" && v.trim()) metinler[k] = v.trim();
    });
    fetch("/api/degerler/ai-oneri", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cevaplar: metinler }),
    })
      .then((r) => r.json())
      .then((d: { degerler?: string[] }) => {
        const degerler = d.degerler ?? [];
        setAiOneri(degerler);
        setSecilenUc(degerler);
        setAiYukleniyor(false);
      })
      .catch(() => { setAiOneri([]); setAiYukleniyor(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adim]);

  // Sarmal neden: tur 2 ve 3 için AI sorusu çek (tur 1 sabit soru)
  useEffect(() => {
    const a = ADIMLAR[adim];
    if (a?.tip !== "neden_soru" || a.tur === 1) return;
    const clef = `${a.degerIndeks}_${a.tur}`;
    if (nedenSorular[clef] !== undefined || nedenSoruYukleniyor[clef]) return;
    const deger = secilenUc[a.degerIndeks];
    if (!deger) {
      setNedenSorular((s) => ({ ...s, [clef]: NEDEN_YEDEK[a.tur] ?? "" }));
      return;
    }
    const oncekiCevaplar: string[] = [];
    for (let t = 1; t < a.tur; t++) {
      const v = typeof cevaplar[`nd_${a.degerIndeks}_${t}`] === "string"
        ? (cevaplar[`nd_${a.degerIndeks}_${t}`] as string).trim()
        : "";
      if (v) oncekiCevaplar.push(v);
    }
    if (!oncekiCevaplar.length) {
      setNedenSorular((s) => ({ ...s, [clef]: NEDEN_YEDEK[a.tur] ?? "" }));
      return;
    }
    setNedenSoruYukleniyor((s) => ({ ...s, [clef]: true }));
    fetch("/api/degerler/neden-derinles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deger, tur: a.tur, oncekiCevaplar }),
    })
      .then((r) => r.json())
      .then((d: { soru?: string }) => {
        setNedenSorular((s) => ({ ...s, [clef]: d.soru ?? NEDEN_YEDEK[a.tur] ?? "" }));
        setNedenSoruYukleniyor((s) => ({ ...s, [clef]: false }));
      })
      .catch(() => {
        setNedenSorular((s) => ({ ...s, [clef]: NEDEN_YEDEK[a.tur] ?? "" }));
        setNedenSoruYukleniyor((s) => ({ ...s, [clef]: false }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const r = await fetch("/api/degerler", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cevaplar, secilenUc }),
      });
      // [UX3+E8] Görünür güven: başarıda kısa "✓ Kaydedildi"; hatada kalıcı
      // amber "kaydedilemedi" (bir sonraki başarılı kayıtta kendiliğinden söner).
      if (r.ok) {
        setKayitBasari((n) => n + 1);
        setKayitHata(false);
      } else {
        setKayitHata(true);
      }
    } catch {
      setKayitHata(true);
    } finally {
      setKaydediliyor(false);
    }
  }

  // [UX2] HİÇBİR ADIM BOŞ GEÇİLMEZ — her yanıt adımı zorunlu (eskiden yalnız
  // a.zorunlu işaretliler engelliyordu; "dilersen geç" kaldırıldı).
  function ilerlenebilir(a: Adim): string | null {
    if (a.tip === "ai_oneri" && aiYukleniyor) return "Analiz tamamlanıyor…";
    if (a.tip === "sec") {
      const n = secGuncel(a).length;
      if (n !== a.adet) return `Tam ${a.adet} değer seç (şu an ${n}).`;
    }
    if (a.tip === "neden") {
      const ilk = metin(`neden_${a.degerIndeks}_1`).trim();
      if (!ilk) return 'En az ilk "neden?" cevabını yaz.';
    }
    if (a.tip === "cumle" && !metin(a.kod).trim()) return "Bu cümleyi tamamla.";
    if (a.tip === "metin") {
      if (a.degerSecimi) {
        const dolu = a.cokSecim
          ? Array.isArray(cevaplar[a.kod]) && (cevaplar[a.kod] as string[]).length > 0
          : !!metin(a.kod).trim();
        if (!dolu) return "Bir değer seç.";
      } else if (!metin(a.kod).trim()) {
        return "Bu soruyu yanıtla — bu yolculukta hiçbir adım boş geçilmez.";
      }
    }
    if (a.tip === "neden_soru" && !metin(a.kod).trim())
      return "Bu soruyu yanıtla — bu yolculukta hiçbir adım boş geçilmez.";
    return null;
  }

  function gecisYap(sonra: () => void) {
    // iOS Safari'de window.scrollTo react render'dan önce görsel olarak uygulanmıyor.
    // Çözüm: content'i DOM üzerinden anında gizle → scroll → adım değiştir →
    // 2 frame sonra opacity geri getir (yeni içerik doğru konumda belirir).
    const el = contentRef.current;
    if (el) { el.style.transition = "none"; el.style.opacity = "0"; }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    sonra();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.style.transition = "opacity 0.12s ease";
          contentRef.current.style.opacity = "1";
        }
      });
    });
  }

  async function ileri() {
    const a = ADIMLAR[adim];
    const hata = ilerlenebilir(a);
    if (hata) { setUyari(hata); return; }
    await kaydet();
    if (adim < TOPLAM - 1) {
      // [UX5] Bölüm bitişi: sıradaki adım başka bölümdeyse kısa kutlama beat'i.
      const suanki = bolumIndeksi(a.kod);
      const sonrakiKod = ADIMLAR[adim + 1].kod;
      if (bolumIndeksi(sonrakiKod) > suanki) {
        setBolumKutlama(`Bölüm ${suanki + 1}/5 tamam — ${BOLUM_ADLARI[suanki]} ✓`);
        titret([15, 40, 15]);
        setTimeout(() => setBolumKutlama(null), 1600);
      }
      gecisYap(() => setAdim((x) => x + 1));
    } else {
      // Son (en ağır) soru yanıtlandı — sessizce ana sayfaya atmak yerine
      // kendi neden cümlesini ona geri veren bir kapanış ekranı gösterilir.
      setKapanisGoster(true);
    }
  }

  function geri() {
    setUyari(null);
    gecisYap(() => {
      if (adim > 0) setAdim((x) => x - 1);
    });
  }

  if (!yuklendi) {
    return <div className="flex min-h-dvh items-center justify-center text-slate-400">Yükleniyor…</div>;
  }

  if (kapanisGoster) {
    const nedenCumlesi = nedenCumlesiKur(cevaplar as Record<string, string>);
    return (
      <>
        <div className="fixed inset-0 z-0 bg-[#06121e]" aria-hidden />
        <Konfeti anahtar="kutlama-degerler" />
        <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-6 py-10 text-center">
          <p className="text-6xl" aria-hidden>💎</p>
          <h1 className="prizma-serif ay-metin mt-5 text-3xl font-bold leading-tight">
            Artık kim olduğunu biliyorsun
          </h1>
          {nedenCumlesi && (
            <div className="mt-6 rounded-2xl border border-gold/25 bg-gold/[0.06] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Sen dedin ki
              </p>
              <p className="prizma-serif ay-metin mt-2 text-lg italic leading-relaxed text-gold-light">
                “{nedenCumlesi}”
              </p>
            </div>
          )}
          <p className="mt-5 max-w-sm text-base leading-relaxed text-slate-300">
            Bu senin çekirdeğin. Şimdi bu çekirdekten yola çıkarak, seni harekete geçiren derin nedenini keşfedeceğiz.
          </p>
          <button
            onClick={() => { router.push("/"); router.refresh(); }}
            className="btn-kor parilti mt-8 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
          >
            Şimdi Pusulanı Kur →
          </button>
        </main>
      </>
    );
  }

  const a = ADIMLAR[adim];
  const sonAdim = adim === TOPLAM - 1;

  return (
    <>
      {/* Göl arka planını sihirbaz sayfasında kapat — içerik odağı için */}
      <div className="fixed inset-0 z-0 bg-[#06121e]" aria-hidden />

      {/* [UX5] Bölüm bitiş beat'i — 1.6 sn, tıklamayı engellemez */}
      {bolumKutlama && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden>
          <div className="sahne-giris rounded-2xl border border-gold/50 bg-[#0a1826]/95 px-6 py-4 text-center shadow-2xl">
            <p className="text-3xl">🌟</p>
            <p className="mt-1 text-base font-bold text-gold-light">{bolumKutlama}</p>
          </div>
        </div>
      )}

      <main ref={(el) => { contentRef.current = el; }} className="relative z-10 mx-auto w-full max-w-xl px-5 pb-10 pt-[calc(env(safe-area-inset-top,0px)+3.5rem+1rem)]">
        <div ref={ustRef} />
        {ustRay && <div className="mb-3">{ustRay}</div>}

        {/* [UX1] Kaldığın yerden devam notu — 6 sn sonra kendiliğinden kaybolur */}
        {kaldiginYerden && (
          <p className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200">
            ▶ Kaldığın yerden devam ediyorsun — önceki cevapların kayıtlı.
          </p>
        )}

        {/* İlerleme — "Adım 23/41" yerine 5 bölümlük ray + bölüm-içi ilerleme.
            "40 adım" korkusunu, bütünsel ve sindirilir bir haritaya çevirir. */}
        {(() => {
          const suankiBolum = bolumIndeksi(a.kod);
          const rayAsamalar: RayAsama[] = BOLUM_ADLARI.map((ad, i) => {
            const durum: RayAsama["durum"] =
              i < suankiBolum ? "tamam" : i === suankiBolum ? "simdi" : "bekliyor";
            // Tamamlanmış/içinde olunan bölüme dokununca o bölümün ilk adımına
            // dön (geri geri gitmeden düzelt). İleri (bekleyen) bölüme atlama yok.
            const basIdx = ADIMLAR.findIndex((s) => bolumIndeksi(s.kod) === i);
            return {
              ad,
              durum,
              onTikla: durum === "bekliyor" || basIdx < 0 ? undefined : () => setAdim(basIdx),
            };
          });
          const localSira = bolumIcindekiSira(adim);
          const localToplam = bolumToplamAdim(suankiBolum);
          return (
            <div className="mb-5">
              <AsamaRayi asamalar={rayAsamalar} />
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-500"
                  style={{ width: `${(localSira / localToplam) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                Bölüm {suankiBolum + 1}/5 — {BOLUM_ADLARI[suankiBolum]} · {localSira}/{localToplam}
              </p>
            </div>
          );
        })()}

        {/* İçerik — ışıma (of-parla) AYRI bir arka plan katmanıdır; sınıfı
            doğrudan içeriğe verirsek içerik `position:absolute; z-index:-1`
            olup akıştan çıkar ve her şeyle çakışır (geçiş glitch'inin gerçek
            nedeni buydu). İçerik hep normal akışta; ışıma onun arkasında. */}
        <div key={adim} className="relative">
          <span className="of-parla" aria-hidden />
          {a.tip === "intro" && (
            <div className="py-8 text-center">
              <h1 className="prizma-serif ay-metin text-3xl font-bold leading-tight">
                {a.vurgu ? vurguRender(a.baslik, a.vurgu) : a.baslik}
              </h1>
              {/* [UX4] Süre beklentisi — bilinmezlik yarıda bırakmanın 1 numaralı sebebi */}
              {adim === 0 && (
                <p className="mt-3 inline-block rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-400">
                  ⏱ ~{ONBOARDING_SURE_DK.degerler} dk sürer · cevapların her adımda kaydedilir
                </p>
              )}
              {a.paragrafVurgu && (
                <p className="mt-5 text-lg font-semibold leading-relaxed text-gold-light">{a.paragrafVurgu}</p>
              )}
              <div className={`${a.paragrafVurgu ? "mt-3" : "mt-5"} space-y-3 text-lg leading-relaxed text-slate-300`}>
                {zenginMetin(a.paragraf)}
              </div>
              <AynaSesButonu anahtar={`degerler_${a.kod}`} />
            </div>
          )}

          {a.tip === "ai_oneri" && (
            <div className="py-4">
              {/* Başlık */}
              <div className="mb-6 text-center">
                <h1 className="prizma-serif text-2xl font-black tracking-wide">
                  <span className="text-gold">✦ SENİN </span>
                  <span className="text-slate-100">DEĞERLERİN</span>
                  <span className="text-gold"> ✦</span>
                </h1>
                <p className="mt-2 text-sm text-slate-400">{a.paragraf}</p>
              </div>

              {aiYukleniyor ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                  <p className="text-sm text-slate-400">Cevapların analiz ediliyor…</p>
                </div>
              ) : aiOneri && aiOneri.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {aiOneri.map((d, i) => {
                    const barGenislik = [100, 85, 72, 61, 52][i] ?? 50;
                    const emoji = DEGER_EMOJI[d] ?? "✦";
                    const etiket = DEGER_ETIKET[d] ?? "";
                    // [E5] Yaşayan örnek: değer kartının altında soluk, tek
                    // cümlelik somut davranış — değer soyut bir kelime kalmasın.
                    const ornek = DEGER_ORNEK[d];
                    if (i === 0) return (
                      <div key={d} className="rounded-2xl border border-gold bg-gradient-to-br from-[#1a1206] to-[#271a07] px-5 py-4 shadow-[0_0_24px_#d4af3720]">
                        <div className="mb-3 flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-black text-[#1a1206]">1</span>
                          <span className="text-2xl">{emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xl font-black leading-none text-[#fef3c7]">{d}</div>
                            {etiket && <div className="mt-0.5 text-[0.62rem] font-bold uppercase tracking-widest text-gold">{etiket}</div>}
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#b8891e] to-[#d4af37]" />
                        </div>
                        {ornek && (
                          <p className="mt-2.5 text-xs italic leading-relaxed text-slate-400">
                            {ornek}
                          </p>
                        )}
                      </div>
                    );
                    return (
                      <div key={d} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <div className="mb-2 flex items-center gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[0.62rem] font-bold text-gold">{i + 1}</span>
                          <span className="text-lg">{emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-base font-bold leading-none text-slate-100">{d}</div>
                            {etiket && <div className="mt-0.5 text-[0.58rem] font-semibold italic text-slate-500">{etiket}</div>}
                          </div>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#b8891e]/70 to-[#d4af37]/70" style={{ width: `${barGenislik}%` }} />
                        </div>
                        {ornek && (
                          <p className="mt-2 text-[0.7rem] italic leading-relaxed text-slate-500">
                            {ornek}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Bu değerler bu yolculukta sana rehber olacak.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Refleksiyon sorularını yanıtladıkça analiz daha iyi çalışır.
                </p>
              )}
            </div>
          )}

          {a.tip === "metin" && (
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold leading-snug text-slate-100">
                {a.guclu && <span className="text-gold mr-1">✦</span>}
                {a.vurgu ? vurguRender(a.baslik, a.vurgu) : a.baslik}
              </h2>
              {a.ipuclari && a.ipuclari.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {a.ipuclari.map((ip, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-gold/15 bg-gold/[0.05] px-4 py-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold-light">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-slate-300">{ip}</span>
                    </div>
                  ))}
                </div>
              )}
              {a.degerSecimi && secilenUc.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {a.cokSecim ? "Beş değerinizden seçin" : "Beş değerinizden birini seçin"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {secilenUc.map((d) => {
                      const secili = a.cokSecim
                        ? (Array.isArray(cevaplar[a.kod]) ? (cevaplar[a.kod] as string[]).includes(d) : false)
                        : metin(a.kod) === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            if (a.cokSecim) {
                              const mevcut = Array.isArray(cevaplar[a.kod]) ? (cevaplar[a.kod] as string[]) : [];
                              const yeni = secili ? mevcut.filter((x) => x !== d) : [...mevcut, d];
                              setCevaplar((c) => ({ ...c, [a.kod]: yeni }));
                              setUyari(null);
                            } else {
                              metinDegis(a.kod, secili ? "" : d);
                            }
                          }}
                          className={`rounded-full border px-5 py-2 text-sm font-semibold transition-all active:scale-95 ${
                            secili
                              ? "border-gold bg-gold/20 text-gold-light"
                              : "border-royal/40 bg-royal/10 text-slate-200 hover:border-gold/50 hover:text-gold-light"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {!a.degerSecimi && (
                <>
                  <textarea
                    value={metin(a.kod)}
                    onChange={(e) => metinDegis(a.kod, e.target.value)}
                    rows={5}
                    placeholder="Buraya yaz…"
                    className="mt-4 w-full resize-y rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-base leading-relaxed text-slate-100 outline-none focus:border-gold/50"
                  />
                  <SesliYazButonu onEkle={(t) => metinEkle(a.kod, t)} />
                </>
              )}
            </div>
          )}

          {a.tip === "sec" && (
            <div>
              <h2 className="text-2xl font-bold leading-snug text-slate-100">{a.baslik}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {a.aciklama}{" "}
                <span className="font-semibold text-gold-light">{secGuncel(a).length}/{a.adet}</span>
              </p>
              {a.kod === "sec10" && aiOneri && aiOneri.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="w-full text-xs font-semibold uppercase tracking-widest text-gold-light/70">✦ AYNA önerisi</span>
                  {aiOneri.map((d) => (
                    <span key={d} className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-light">
                      {d}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2.5">
                {secKaynak(a).map((d) => {
                  const secili = secGuncel(a).includes(d);
                  const dolu = !secili && secGuncel(a).length >= a.adet;
                  const onerildi = a.kod === "sec10" && aiOneri?.includes(d);
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
                            : onerildi
                              ? "border-gold/40 bg-gold/[0.08] text-slate-100 hover:border-gold/70 hover:bg-gold/15"
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

          {a.tip === "neden_soru" && (
            <div className="flex flex-col gap-4">
              {/* Değer başlığı + tur ilerleme noktaları */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {a.degerIndeks === 0 ? "1." : a.degerIndeks === 1 ? "2." : "3."}{" Değer · "}
                    <span className="text-gold/70">{a.tur}. Tur</span>
                  </p>
                  <h2 className="mt-0.5 text-3xl font-black leading-tight text-gold truncate">
                    {secilenUc[a.degerIndeks] ?? "—"}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 pt-2 shrink-0">
                  {[1, 2, 3].map((t) => (
                    <span
                      key={t}
                      className={`rounded-full transition-all ${
                        t === a.tur
                          ? "h-2.5 w-2.5 bg-gold"
                          : t < a.tur
                            ? "h-2 w-2 bg-gold/40"
                            : "h-2 w-2 bg-white/15"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Önceki cevaplar (tur 2 ve 3) */}
              {a.tur > 1 && (
                <div className="space-y-2">
                  {Array.from({ length: a.tur - 1 }, (_, i) => i + 1).map((t) => {
                    const v = metin(`nd_${a.degerIndeks}_${t}`);
                    return v.trim() ? (
                      <div
                        key={t}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm italic leading-relaxed text-slate-400"
                      >
                        &ldquo;{v.trim()}&rdquo;
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* Soru kutusu + textarea */}
              {(() => {
                const clef = `${a.degerIndeks}_${a.tur}`;
                const yukleniyor = !!nedenSoruYukleniyor[clef];
                const soru =
                  a.tur === 1
                    ? "Bu değer benim için neden önemli?"
                    : (nedenSorular[clef] ?? NEDEN_YEDEK[a.tur]);
                return (
                  <>
                    {yukleniyor ? (
                      <div className="flex items-center gap-2.5 rounded-xl border border-gold/15 bg-gold/[0.04] px-4 py-3 text-sm text-slate-400">
                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                        AYNA bir sonraki soru hazırlıyor…
                      </div>
                    ) : (
                      <div className="rounded-xl border border-royal/30 bg-royal/[0.08] px-4 py-3">
                        <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
                          {a.tur === 1 ? "İlk soru" : a.tur === 2 ? "✦ AYNA soruyor" : "Son soru"}
                        </p>
                        <p className="text-xl font-bold leading-snug text-slate-100">{soru}</p>
                      </div>
                    )}
                    <textarea
                      value={metin(a.kod)}
                      onChange={(e) => metinDegis(a.kod, e.target.value)}
                      rows={4}
                      placeholder="Buraya yaz…"
                      className="w-full resize-y rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-base leading-relaxed text-slate-100 outline-none focus:border-gold/50"
                    />
                    <SesliYazButonu onEkle={(t) => metinEkle(a.kod, t)} />
                  </>
                );
              })()}
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
                  placeholder="dokun, yaz…"
                  className="inline-block min-w-[10rem] rounded-xl border-2 border-dashed border-gold/60 bg-gold/[0.08] px-3 py-1.5 text-center text-slate-100 outline-none placeholder:text-gold-light/50 focus:border-solid focus:border-gold focus:bg-gold/[0.14]"
                />{" "}
                {a.son && <span className="font-semibold text-gold-light">{a.son}</span>}
              </p>
              {/* Boşluğun bir input olduğu net olsun diye açıklayıcı ipucu —
                  eskiden yalnız alt çizgili "…" vardı, insanlar tıklanabilir
                  bir alan olduğunu fark etmiyordu. */}
              {!metin(a.kod).trim() && (
                <p className="mt-2 text-sm text-slate-500">👆 Yukarıdaki kutuya dokunup cümleyi tamamla.</p>
              )}
              <SesliYazButonu onEkle={(t) => metinEkle(a.kod, t)} />
            </div>
          )}
        </div>

        {uyari && <p className="mt-3 text-sm font-medium text-amber-300">{uyari}</p>}

        {/* [UX7] Geri / İleri çubuğu YAPIŞKAN: mobilde klavye kapanınca buton
            hep görünür, aşağı kaydırma derdi yok. Zemin gradyanı içerikle
            çakışmayı yumuşatır. */}
        <div className="sticky bottom-0 z-20 -mx-5 mt-8 bg-gradient-to-t from-[#06121e] via-[#06121e]/95 to-transparent px-5 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] pt-4">
          {/* [UX3+E8] Görünür kayıt güveni — ortak köşe rozeti */}
          <KayitRozeti basari={kayitBasari} hata={kayitHata} />
          {/* Gizlilik mührü — kişisel değer seçimlerinde sakin güven imzası */}
          <GizlilikMuhru />
          <div className="flex items-center gap-3">
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
              {a.tip === "ai_oneri" ? (aiYukleniyor ? "Analiz ediliyor…" : "Devam →") : a.tip === "intro" && "dugme" in a ? a.dugme : sonAdim ? "Tamamla →" : "İleri →"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
