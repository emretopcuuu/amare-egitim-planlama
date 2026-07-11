"use client";

import AynaSahneLoop from "@/components/AynaSahneLoop";
import { useEffect, useMemo, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import type { EkranVerisi } from "@/app/api/ekran/route";
import EpicYildizlar from "./EpicYildizlar";
import AynaGoz from "@/components/AynaGoz";
import {
  kampGunu,
  suankiMadde,
  siradakiMadde,
  dakikaCevir,
  ETKINLIK_SIMGESI,
} from "@/lib/kampProgrami";
import { sesCal } from "@/lib/sesEfekti";

const t = tr.ekran;
const VERI_YOKLAMA_MS = 10_000;
const SLAYT_MS = 14_000;
const SLAYT_SAYISI = 8;

// Takım renk paleti — projeksiyonda ayırt edilebilir, koyu zemine uygun
const TAKIM_RENKLERI = [
  "#fbbf24", // kor amber
  "#9cc3e0", // buz mavisi
  "#34d399", // zümrüt
  "#f472b6", // pembe
  "#60a5fa", // mavi
  "#fb923c", // turuncu
  "#2dd4bf", // turkuaz
  "#e879f9", // fuşya
];

function takimRengi(i: number): string {
  return i < 0 ? "#64748b" : TAKIM_RENKLERI[i % TAKIM_RENKLERI.length];
}

// Ağ yerleşimi: takımlar büyük bir çemberde kümelenir, üyeler küme
// çevresine dizilir. Deterministik — fizik simülasyonu yok, her yenilemede
// aynı görüntü.
function agYerlesimi(veri: EkranVerisi) {
  const W = 1200;
  const H = 640;
  const merkezX = W / 2;
  const merkezY = H / 2;
  const takimSayisi = Math.max(veri.takimlar.length, 1);
  // Daha geniş yayılım → ekranın boş alanını kullan (eski 200 küçük kalıyordu).
  const kumeYaricap = takimSayisi > 1 ? 258 : 0;

  const kumeMerkezleri = new Map<number, { x: number; y: number }>();
  for (let i = 0; i < takimSayisi; i++) {
    const aci = (2 * Math.PI * i) / takimSayisi - Math.PI / 2;
    kumeMerkezleri.set(i, {
      x: merkezX + kumeYaricap * Math.cos(aci),
      y: merkezY + kumeYaricap * Math.sin(aci),
    });
  }
  kumeMerkezleri.set(-1, { x: merkezX, y: merkezY });

  const gruplar = new Map<number, number[]>();
  veri.dugumler.forEach((d, i) => {
    const liste = gruplar.get(d.t) ?? [];
    liste.push(i);
    gruplar.set(d.t, liste);
  });

  const konumlar: { x: number; y: number }[] = new Array(veri.dugumler.length);
  for (const [takim, uyeler] of gruplar) {
    const merkez = kumeMerkezleri.get(takim) ?? { x: merkezX, y: merkezY };
    const r = 46 + uyeler.length * 6;
    uyeler.forEach((dugum, j) => {
      const aci = (2 * Math.PI * j) / uyeler.length;
      konumlar[dugum] = {
        x: merkez.x + r * Math.cos(aci),
        y: merkez.y + r * Math.sin(aci),
      };
    });
  }
  return { W, H, konumlar, kumeMerkezleri };
}

// #4 — program bloğu türü → sahne başlığı rozeti etiketi
const BLOK_ETIKET: Record<string, string> = {
  sahne: "Sahnede",
  ayna: "AYNA zamanı",
  serbest: "Serbest zaman",
  oyun: "Oyun zamanı",
  yemek: "Yemek molası",
  ara: "Ara",
  doga: "Doğa zamanı",
  gezi: "Gezi",
};

// QR aksiyon prompt'ları — slayta göre döner (insanları telefona/eyleme iter).
const AKSIYONLAR = [
  "Şimdi birini gözlemle 👁",
  "Bir takdir yaz 💛",
  "Bekleyen görevini yap 🤖",
  "Kendi aynana bak",
];

export default function EkranGosterisi() {
  const [veri, setVeri] = useState<EkranVerisi | null>(null);
  const [slayt, setSlayt] = useState(0);
  // QR — sahnedeki herkes telefonuyla anında uygulamaya girsin (client-side üret).
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let iptal = false;
    import("qrcode")
      .then((m) =>
        m.default.toDataURL("https://ayna.oneteamglobal.ai", {
          margin: 1,
          width: 220,
          color: { dark: "#04101c", light: "#ffffff" },
        })
      )
      .then((url) => {
        if (!iptal) setQr(url);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, []);
  // ŞİMDİ/SIRADA program slaytı için Istanbul saati — 30 sn'de bir tazelenir.
  const [an, setAn] = useState<{ tarih: string; dk: number } | null>(null);
  useEffect(() => {
    const guncelle = () => {
      const simdi = new Date();
      const tarih = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
      const [s, d] = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Istanbul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
        .format(simdi)
        .split(":")
        .map(Number);
      setAn({ tarih, dk: s * 60 + d });
    };
    guncelle();
    const id = setInterval(guncelle, 30_000);
    return () => clearInterval(id);
  }, []);
  // SAHNE: tarayıcı sesli oynatmayı kullanıcı dokunuşuna bağlar — kurulumda
  // bir kez "Sesi Aç"a tıklanır, sonrası otomatik. Olaylar bir kez oynar.
  const [sesAcik, setSesAcik] = useState(false);
  const [fieroGoster, setFieroGoster] = useState<{ ad: string } | null>(null);
  const [dalgaVideo, setDalgaVideo] = useState<number | null>(null);
  // UX #9 — anons görsel bandı: ses kapalıyken bile salon "anons var" görsün.
  const [anonsGoster, setAnonsGoster] = useState(false);
  // Faz 4/1.5b — Kamp Radyosu yayına geçince gerçek ses çalar; ses SÜRDÜĞÜ
  // müddetçe maskot "konusma" pozunda (bkz. AynaSahneLoop). Ses bitince/hiç
  // çalmadıysa "bekleme" — maskot yalnız GERÇEKTEN sesi varken konuşur gibi görünür.
  const [radyoKonusuyor, setRadyoKonusuyor] = useState(false);
  const sesAcikRef = useRef(false);
  const oynanan = useRef<Set<string>>(new Set());
  // Sahne Vitrini (DJ): host bir slayt sabitlediyse otomatik döngü durur.
  const vitrinRef = useRef<number | null>(null);
  // Canlı enerji (0-1): AYNA gözünün nabzını + ruh halini sürer. Aktivite
  // arttıkça yükselir, sönümlenerek azalır.
  const [enerji, setEnerji] = useState(0);
  const sonAktiviteRef = useRef<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setEnerji((e) => (e > 0.02 ? e * 0.85 : 0)), 3000);
    return () => clearInterval(id);
  }, []);
  // AYNA "karar veriyor" anı: yeni bir görev olayı gelince kısa flash.
  const [kararFlash, setKararFlash] = useState<string | null>(null);
  const sonGorevOlayRef = useRef<string | null>(null);
  // KİLOMETRE TAŞI kutlaması (her 100 kıvılcım / takım lideri değişimi).
  const [kutlama, setKutlama] = useState<{ metin: string } | null>(null);
  const oncekiKivilcimRef = useRef<number | null>(null);
  const oncekiLiderRef = useRef<string | null>(null);
  // Ligde "yükselenler" — bir önceki yoklamaya göre üst sıraya çıkanlar parlar.
  const oncekiLigRef = useRef<string[]>([]);
  const [yukselenler, setYukselenler] = useState<Set<string>>(new Set());
  // #4 PROGRAM-DUYARLI SAHNE: o anki program bloğuna göre "ilgili" slayt öne çıkar.
  // tur döngüsü (tourRef) her geçişte ilerler; her 3 geçişin 1'inde program-ilgili
  // sahne gösterilir → slaytlar kör dönmek yerine "doğru anı" yansıtır.
  const tercihSlaytRef = useRef<number | null>(null);
  const tourRef = useRef(0);
  const slaytSayacRef = useRef(0);
  const sonMozaikRef = useRef<number | null>(null);
  const [aktifBlok, setAktifBlok] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    async function yenile() {
      try {
        const res = await fetch("/api/ekran");
        if (!res.ok) return;
        const yeni = (await res.json()) as EkranVerisi;
        if (iptal) return;
        setVeri(yeni);

        // Salon Mozaiği: yeni bir arketip parçası belirince nazik "döşeme" sesi.
        // İlk yüklemede çalmaz; sesEfekti'nin soğuması art arda gelenleri yutar.
        const mozaikSayi = yeni.mozaik?.arketipler?.length ?? 0;
        if (sonMozaikRef.current !== null && mozaikSayi > sonMozaikRef.current) {
          sesCal("mozaik");
        }
        sonMozaikRef.current = mozaikSayi;

        // CANLI ENERJİ: bugünkü toplam aktivitenin (görev+gözlem+takdir) son
        // yoklamadan beri artışı → AYNA gözünün nabzını/parlaklığını canlandırır.
        const toplam = yeni.bugun.gorev + yeni.bugun.gozlem + yeni.bugun.takdir;
        if (sonAktiviteRef.current !== null) {
          const delta = Math.max(0, toplam - sonAktiviteRef.current);
          setEnerji((onceki) => Math.min(1, Math.max(onceki * 0.55, delta / 4)));
        }
        sonAktiviteRef.current = toplam;

        // AYNA KARAR ANI: yeni bir görev olayı tepeye geldiyse kısa flash göster
        // ("AYNA karar verdi → X'e görev"). İlk yüklemede tetiklenmez.
        const enYeniGorev = yeni.olaylar?.find((o) => o.tur === "gorev");
        if (enYeniGorev && enYeniGorev.ts !== sonGorevOlayRef.current) {
          if (sonGorevOlayRef.current !== null) {
            setKararFlash(enYeniGorev.metin);
            setTimeout(() => setKararFlash(null), 6000);
          }
          sonGorevOlayRef.current = enYeniGorev.ts;
        }

        // KİLOMETRE TAŞI: kümülatif kıvılcım 100'lük eşiği geçince ya da takım
        // lideri değişince tam ekran kutlama (ilk yüklemede tetiklenmez).
        const kiv = yeni.kumulatif?.kivilcim ?? 0;
        if (oncekiKivilcimRef.current !== null && kiv > 0) {
          if (Math.floor(kiv / 100) > Math.floor(oncekiKivilcimRef.current / 100)) {
            const esik = Math.floor(kiv / 100) * 100;
            setKutlama({ metin: `${esik} kıvılcım! 🎉` });
            setTimeout(() => setKutlama(null), 7000);
          }
        }
        oncekiKivilcimRef.current = kiv;
        const lider = yeni.takimLigi?.[0]?.takim ?? null;
        if (oncekiLiderRef.current !== null && lider && lider !== oncekiLiderRef.current) {
          setKutlama({ metin: `${lider} lider oldu! 👑` });
          setTimeout(() => setKutlama(null), 7000);
        }
        oncekiLiderRef.current = lider;
        // Ligde yükselenler (önceki sıraya göre üst sıraya çıkanlar) parlasın.
        const yeniSira = (yeni.lig ?? []).map((k) => k.ad);
        if (oncekiLigRef.current.length > 0) {
          const yuks = new Set<string>();
          yeniSira.forEach((ad, i) => {
            const eski = oncekiLigRef.current.indexOf(ad);
            if (eski > i) yuks.add(ad);
          });
          if (yuks.size > 0) {
            setYukselenler(yuks);
            setTimeout(() => setYukselenler(new Set()), 6000);
          }
        }
        oncekiLigRef.current = yeniSira;

        // Sahne Vitrini (DJ): host bir slayt sabitlemişse ekranı oraya kilitle
        vitrinRef.current = yeni.vitrin;
        if (yeni.vitrin !== null) setSlayt(yeni.vitrin);

        // Sahne olayları: her sinyal yalnızca bir kez oynatılır
        const s = yeni.sahne;
        if (s?.fiero && !oynanan.current.has(`f${s.fiero.id}`)) {
          oynanan.current.add(`f${s.fiero.id}`);
          setFieroGoster({ ad: s.fiero.ad });
          setTimeout(() => setFieroGoster(null), 9000);
          if (sesAcikRef.current && s.fiero.sesUrl) {
            void new Audio(s.fiero.sesUrl).play().catch(() => {});
          }
        }
        if (
          s?.dalga &&
          s.dalga.id <= 3 &&
          !oynanan.current.has(`d${s.dalga.olayId}`)
        ) {
          oynanan.current.add(`d${s.dalga.olayId}`);
          setDalgaVideo(s.dalga.id);
        }
        if (s?.anons && !oynanan.current.has(`a${s.anons.id}`)) {
          oynanan.current.add(`a${s.anons.id}`);
          // UX #9 — sesle birlikte görsel bant (ses kapalı odada da görünür)
          setAnonsGoster(true);
          setTimeout(() => setAnonsGoster(false), 8000);
          if (sesAcikRef.current && s.anons.sesUrl) {
            void new Audio(s.anons.sesUrl).play().catch(() => {});
          }
        }
        // Faz 4/1.5b — Kamp Radyosu: gerçek ses çalarken maskot "konusma" pozunda.
        if (s?.radyo && !oynanan.current.has(`r${s.radyo.id}`)) {
          oynanan.current.add(`r${s.radyo.id}`);
          if (sesAcikRef.current && s.radyo.sesUrl) {
            const ses = new Audio(s.radyo.sesUrl);
            ses.onplay = () => setRadyoKonusuyor(true);
            ses.onended = () => setRadyoKonusuyor(false);
            ses.onerror = () => setRadyoKonusuyor(false);
            void ses.play().catch(() => setRadyoKonusuyor(false));
          }
        }
      } catch {
        // sahne wifi'ı takıldı: eski veri ekranda kalır, sonraki tur dener
      }
    }
    void yenile();
    const veriZamanlayici = setInterval(yenile, VERI_YOKLAMA_MS);
    const slaytZamanlayici = setInterval(() => {
      // DJ sabitlemesi varken otomatik döngüyü atla.
      if (vitrinRef.current !== null) return;
      tourRef.current = (tourRef.current + 1) % SLAYT_SAYISI;
      slaytSayacRef.current += 1;
      // #4 Program-duyarlı: her 3 geçişin 1'inde program-ilgili sahneye yönel,
      // gerisinde tüm slaytları sırayla turla (her şey yine görünür).
      const tercih = tercihSlaytRef.current;
      if (tercih !== null && slaytSayacRef.current % 3 === 0) {
        setSlayt(tercih);
      } else {
        setSlayt(tourRef.current);
      }
    }, SLAYT_MS);
    return () => {
      iptal = true;
      clearInterval(veriZamanlayici);
      clearInterval(slaytZamanlayici);
    };
  }, []);

  // #4 — o anki program bloğunu çöz → ilgili slaytı tercih et.
  useEffect(() => {
    if (!an || !veri?.kampGun1) {
      tercihSlaytRef.current = null;
      setAktifBlok(null);
      return;
    }
    const gun = kampGunu(an.tarih, veri.kampGun1);
    if (!gun) {
      tercihSlaytRef.current = null;
      setAktifBlok(null);
      return;
    }
    const aktif = suankiMadde(gun, an.dk);
    // Blok türü → ilgili slayt: sahne→Şimdi/Sırada, ayna/serbest→Nabız,
    // oyun→Takım ağı, yemek/ara/doğa→Yansımalar, gezi→Anı Duvarı.
    const harita: Record<string, number> = {
      sahne: 6, ayna: 0, serbest: 0, oyun: 1, yemek: 5, ara: 5, doga: 5, gezi: 4,
    };
    tercihSlaytRef.current = aktif ? harita[aktif.tur] ?? null : null;
    setAktifBlok(aktif?.tur ?? null);
  }, [an, veri]);

  const yerlesim = useMemo(() => (veri ? agYerlesimi(veri) : null), [veri]);
  // Düğüm derecesi (kaç gözlem bağı dokunuyor) → düğüm boyutu = etki.
  const dereceler = useMemo(() => {
    const m = new Map<number, number>();
    for (const b of veri?.baglar ?? []) {
      m.set(b.a, (m.get(b.a) ?? 0) + 1);
      m.set(b.b, (m.get(b.b) ?? 0) + 1);
    }
    return m;
  }, [veri]);
  const siraliOzellikler = useMemo(
    () =>
      veri
        ? [...veri.ozellikler].sort((a, b) => (b.ort ?? -1) - (a.ort ?? -1))
        : [],
    [veri]
  );
  const enYuksekOrt = siraliOzellikler[0]?.ort ?? null;

  // AYNA'nın ruh hali — canlı enerjiden türetilir (atmosfer barometresi).
  const ruh =
    enerji > 0.45
      ? { e: "🔥", t: "Salon yüksek enerjide", c: "text-rose-300", b: "border-rose-400/40 bg-rose-400/10" }
      : enerji > 0.12
        ? { e: "⚡", t: "Hareketli", c: "text-amber-300", b: "border-amber-400/40 bg-amber-400/10" }
        : { e: "🌙", t: "Sakin salon", c: "text-sky-300", b: "border-sky-400/30 bg-sky-400/10" };

  return (
    // SİNEMATİK PROJEKSİYON ZEMİNİ: hall'da parlak foto yazıyı yutar. Foto artık
    // yalnız faint bir doku (≈%8) — neredeyse opak koyu zemin + üstte hafif glow
    // vinyet. İçerik ışıldar, uzaktan okunur. koyu-alan: gündüz teması da koyu.
    <main className="koyu-alan ekran-sahne relative flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-b from-[#020a12]/95 via-[#040f1c]/92 to-[#01040a]/97 p-5 pb-20 sm:p-10">
      {/* AYNA'NIN YAŞAYAN GÖZÜ — her şey onun gözünün içinde yaşar (z-0, arkada) */}
      <AynaGoz enerji={enerji} fiero={!!fieroGoster} />
      {/* #9 DUYGU BAROMETRESİ: salonun enerjisi arka plan rengini hafifçe sürükler */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-[3000ms]"
        style={{
          opacity: Math.min(0.55, 0.1 + enerji * 0.55),
          background:
            enerji > 0.45
              ? "radial-gradient(80% 60% at 50% 38%, rgba(244,63,94,0.18), transparent 70%)"
              : enerji > 0.12
                ? "radial-gradient(80% 60% at 50% 38%, rgba(245,158,11,0.15), transparent 70%)"
                : "radial-gradient(80% 60% at 50% 38%, rgba(56,189,248,0.08), transparent 72%)",
        }}
        aria-hidden
      />
      {/* Ses kapısı: kurulumda tek tıklama, sonrası otomatik anonslar */}
      <button
        onClick={() => {
          sesAcikRef.current = true;
          setSesAcik(true);
        }}
        className={`absolute right-4 top-4 z-30 rounded-lg px-3 py-1.5 text-sm font-semibold ${
          sesAcik
            ? "border border-emerald-400/40 text-emerald-300"
            : "btn-kor"
        }`}
      >
        {sesAcik ? t.sesAcikEtiket : t.sesiAc}
      </button>

      {/* ANLIK DUYURU: host'un sahne kumandasından gönderdiği bant (3 dk) —
          push ölse bile herkesin gördüğü güvenilir kanal. */}
      {veri?.sahne?.duyuru && (
        <div className="fixed inset-x-0 top-0 z-40 bg-gold/95 px-10 py-5 text-center shadow-2xl">
          <p className="font-display text-4xl font-bold text-[#1a1206]">
            📣 {veri.sahne.duyuru.metin}
          </p>
        </div>
      )}

      {/* UX #9 — ANONS BANDI: program anonsu çalarken görsel işaret */}
      {anonsGoster && (
        <div className="fixed inset-x-0 top-0 z-40 bg-royal/95 px-10 py-5 text-center shadow-2xl">
          <p className="font-display text-4xl font-bold text-white">
            📢 {t.anonsBant}
          </p>
        </div>
      )}

      {/* AYNA KARAR ANI: yeni görev gönderince kısa, dikkat çeken flash */}
      {kararFlash && (
        <div className="parilti fixed inset-x-0 top-0 z-[45] flex items-center justify-center gap-3 bg-gradient-to-r from-royal/95 via-[#1a2c4a]/95 to-royal/95 px-10 py-4 shadow-2xl">
          <span className="text-2xl" aria-hidden>🤖</span>
          <p className="font-display text-2xl font-bold text-gold-light">
            AYNA karar verdi · <span className="text-white">{kararFlash}</span>
          </p>
        </div>
      )}

      {/* KİLOMETRE TAŞI KUTLAMASI — kolektif başarı anı (100 kıvılcım / yeni lider) */}
      {kutlama && (
        <div className="pointer-events-none fixed inset-0 z-[46] flex items-center justify-center bg-[#020a12]/70">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="yildiz-dogus absolute text-4xl"
              style={{
                left: `${12 + ((i * 41) % 76)}%`,
                top: `${18 + ((i * 29) % 60)}%`,
                color: ["#fbbf24", "#f472b6", "#34d399", "#60a5fa"][i % 4],
                animationDelay: `${i * 90}ms`,
              }}
            >
              ✦
            </span>
          ))}
          <p className="parilti rounded-3xl border-2 border-gold/60 bg-[#06121e]/90 px-12 py-7 text-center font-display text-6xl font-bold text-gold-light">
            {kutlama.metin}
          </p>
        </div>
      )}

      {/* FIERO: 10/10 anı — tüm perdeyi alan tören: koyu zemin + yıldız patlaması */}
      {fieroGoster && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[#020a12]/85">
          {Array.from({ length: 16 }, (_, i) => (
            <span
              key={i}
              className="yildiz-dogus absolute text-5xl text-gold-light"
              style={{
                left: `${20 + ((i * 37) % 60)}%`,
                top: `${15 + ((i * 23) % 55)}%`,
                animationDelay: `${i * 110}ms`,
              }}
            >
              ✦
            </span>
          ))}
          <p className="parilti rounded-3xl border-2 border-gold/60 bg-[#06121e]/90 px-12 py-8 text-center font-display text-6xl font-bold text-gold-light">
            ✨ {t.fiero(fieroGoster.ad)}
          </p>
        </div>
      )}

      {/* DALGA SİNEMASI: dalga açıldığında perdede tören filmi */}
      {dalgaVideo !== null && (
        <div className="fixed inset-0 z-50 bg-black">
          <video
            src={`/dalga/dalga-${dalgaVideo}.mp4`}
            autoPlay
            playsInline
            muted={!sesAcik}
            onEnded={() => setDalgaVideo(null)}
            onError={() => setDalgaVideo(null)}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <header className="relative z-10 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        {/* Faz 1.5 — canlı AYNA maskotu: bekleme döngüsü sahnede sürekli döner */}
        <AynaSahneLoop
          mod={radyoKonusuyor ? "konusma" : "bekleme"}
          boyut={120}
          sinif="hidden shrink-0 sm:block"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.3em] text-royal-light sm:text-lg">
            <span className="ekran-canli-nokta inline-block h-3 w-3 rounded-full bg-red-500" aria-hidden />
            {t.altBaslik}
          </p>
          <h1 className="font-display altin-metin mt-1 text-4xl font-bold leading-none text-gold drop-shadow-[0_2px_18px_rgba(212,175,55,0.25)] sm:text-7xl">
            {t.baslik}
          </h1>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-2 text-right">
          {/* AYNA'nın ruh hali — salonun o anki enerjisini hisseder */}
          <span
            className={`rounded-full border px-3 py-1 text-base font-bold sm:px-4 sm:py-1.5 sm:text-lg ${ruh.b} ${ruh.c}`}
          >
            {ruh.e} {ruh.t}
          </span>
          {aktifBlok && (
            <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-sm font-medium text-slate-300 sm:text-base">
              {ETKINLIK_SIMGESI[aktifBlok as keyof typeof ETKINLIK_SIMGESI] ?? "📍"}{" "}
              {BLOK_ETIKET[aktifBlok] ?? "Program"}
            </span>
          )}
          <p className="text-base text-slate-400 sm:text-xl">{veri?.dalgaAdi ?? t.dalgaYok}</p>
          {veri && <EpicYildizlar toplam={veri.toplamPuan} />}
        </div>
      </header>

      {/* KÜMÜLATİF KAHRAMAN SAYAÇLAR — kampın TOPLAM efsanesi büyük; "bugün +N"
          küçük ikincil. Böylece sahne aktivite 0 olsa bile asla ölü görünmez. */}
      {veri?.kumulatif && (
        <div className="relative z-10 mt-5 grid grid-cols-4 gap-3">
          {[
            { ikon: "⚡", toplam: veri.kumulatif.kivilcim, bugun: null, etiket: "kıvılcım", renk: "text-gold" },
            { ikon: "🤖", toplam: veri.kumulatif.gorev, bugun: veri.bugun?.gorev ?? 0, etiket: "görev", renk: "text-gold-light" },
            { ikon: "💛", toplam: veri.kumulatif.takdir, bugun: veri.bugun?.takdir ?? 0, etiket: "takdir", renk: "text-pink-300" },
            { ikon: "⭐", toplam: veri.kumulatif.fiero, bugun: veri.bugun?.fiero ?? 0, etiket: "fiero", renk: "text-amber-300" },
          ].map((s) => (
            <div
              key={s.etiket}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center backdrop-blur"
            >
              <p className={`font-display text-6xl font-bold leading-none tabular-nums ${s.renk} drop-shadow-[0_2px_14px_rgba(212,175,55,0.18)]`}>
                {s.toplam}
              </p>
              <p className="mt-1.5 text-base font-medium uppercase tracking-wide text-slate-400">
                {s.ikon} {s.etiket}
              </p>
              {s.bugun != null && s.bugun > 0 && (
                <p className="mt-0.5 text-sm font-semibold text-emerald-300">bugün +{s.bugun}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SENKRON AN canlı katılım bandı */}
      {veri?.senkron && (
        <div className="parilti relative z-10 mt-4 flex items-center justify-between rounded-2xl border-2 border-gold/50 bg-gold/15 px-8 py-4">
          <p className="text-3xl font-bold text-gold-light">
            ⏰ {t.senkronBaslik}: {veri.senkron.baslik}
          </p>
          <p className="text-3xl font-bold text-slate-100">
            {veri.senkron.yanit}/{veri.senkron.toplam}
            <span className="ml-4 font-mono text-2xl text-amber-300">
              {Math.floor(veri.senkron.kalanSn / 60)}:
              {String(veri.senkron.kalanSn % 60).padStart(2, "0")}
            </span>
          </p>
        </div>
      )}

      <div className="relative z-10 mt-8 flex-1">
        {!veri ? (
          <p className="flex h-full items-center justify-center text-2xl text-slate-400">
            {t.veriYok}
          </p>
        ) : (
          <>
            {/* Slayt 1 — Nabız sayaçları */}
            <section
              className={`absolute inset-0 grid grid-cols-2 content-center gap-8 transition-all duration-1000 ${
                slayt === 0 ? "opacity-100 scale-100" : "pointer-events-none scale-[0.98] opacity-0"
              }`}
            >
              {(
                [
                  [veri.katilimci, t.nabiz.katilimci],
                  [veri.toplamPuan, t.nabiz.puan],
                  [`${veri.ozTamam}/${veri.katilimci}`, t.nabiz.oz],
                  [veri.tamDegerlendirme, t.nabiz.degerlendirme],
                ] as const
              ).map(([deger, etiket]) => (
                <div
                  key={etiket}
                  className="kart-3d rounded-3xl bg-midnight-card/60 p-10 text-center shadow-2xl ring-1 ring-royal/30 backdrop-blur"
                >
                  <p className="font-mono text-8xl font-bold text-gold">{deger}</p>
                  <p className="mt-3 text-2xl text-slate-300">{etiket}</p>
                </div>
              ))}
            </section>

            {/* Slayt 2 — Takım kimyası ağ haritası */}
            <section
              className={`absolute inset-0 flex flex-col pb-44 transition-all duration-1000 ${
                slayt === 1 ? "opacity-100 scale-100" : "pointer-events-none scale-[0.98] opacity-0"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-4xl font-bold text-gold-light">
                  {t.agBaslik}
                </h2>
                {veri.caprazOran !== null && (
                  <p className="text-xl text-gold">{t.agCapraz(veri.caprazOran)}</p>
                )}
              </div>
              <p className="mt-1 text-lg text-slate-400">{t.agAciklama}</p>

              {yerlesim && (
                <svg
                  viewBox={`0 0 ${yerlesim.W} ${yerlesim.H}`}
                  className="mt-2 min-h-0 w-full flex-1"
                >
                  {veri.baglar.map((b, i) => {
                    const k1 = yerlesim.konumlar[b.a];
                    const k2 = yerlesim.konumlar[b.b];
                    if (!k1 || !k2) return null;
                    return (
                      <line
                        key={i}
                        x1={k1.x}
                        y1={k1.y}
                        x2={k2.x}
                        y2={k2.y}
                        stroke={b.capraz ? "#f59e0b" : "#4e7ca6"}
                        strokeOpacity={b.capraz ? 0.7 : 0.28}
                        strokeWidth={b.capraz ? 2.4 : 1.2}
                        strokeLinecap="round"
                        // Takımlar-arası altın köprüler "akan enerji" gibi titreşir.
                        className={b.capraz ? "ekran-bag-akan" : undefined}
                      />
                    );
                  })}
                  {veri.dugumler.map((d, i) => {
                    const k = yerlesim.konumlar[i];
                    if (!k) return null;
                    // Çok gözlemlenen düğüm daha büyük + nabız atar (etki = boyut).
                    const der = dereceler.get(i) ?? 0;
                    const r = 10 + Math.min(der, 12) * 1;
                    return (
                      <circle
                        key={i}
                        cx={k.x}
                        cy={k.y}
                        r={r}
                        fill={takimRengi(d.t)}
                        stroke="#06121e"
                        strokeWidth={2.5}
                        className="ekran-dugum"
                        style={{ animationDelay: `${(i % 8) * 0.25}s` }}
                      />
                    );
                  })}
                  {veri.takimlar.map((ad, i) => {
                    const merkez = yerlesim.kumeMerkezleri.get(i);
                    if (!merkez) return null;
                    return (
                      <text
                        key={ad}
                        x={merkez.x}
                        y={merkez.y + 5}
                        textAnchor="middle"
                        fill={takimRengi(i)}
                        fontSize={23}
                        fontWeight={800}
                        // Koyu hale: etiket parlak fotoğrafın üstünde de net okunsun.
                        stroke="#020a12"
                        strokeWidth={5}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                      >
                        {ad}
                      </text>
                    );
                  })}
                </svg>
              )}
            </section>

            {/* Slayt 3 — Özellik ortalamaları */}
            <section
              className={`absolute inset-0 flex flex-col pb-44 transition-all duration-1000 ${
                slayt === 2 ? "opacity-100 scale-100" : "pointer-events-none scale-[0.98] opacity-0"
              }`}
            >
              <h2 className="text-4xl font-bold text-gold-light">
                💪 {t.ozellikBaslik}
              </h2>
              <p className="mt-1 text-lg text-slate-400">{t.ozellikAciklama}</p>
              <ul className="mt-6 flex min-h-0 flex-1 flex-col justify-between gap-2">
                {siraliOzellikler.map((o, i) => (
                  <li key={o.ad} className="flex items-center gap-5">
                    <span className="w-64 truncate text-right text-xl font-medium text-slate-100">
                      {o.ad}
                    </span>
                    <div className="h-6 flex-1 overflow-hidden rounded-full bg-midnight-card/80">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${((o.ort ?? 0) / 10) * 100}%`,
                          background:
                            i === 0
                              ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                              : "linear-gradient(90deg, #4e7ca6, #9cc3e0)",
                        }}
                      />
                    </div>
                    <span className="w-16 font-mono text-xl font-bold text-gold-light">
                      {o.ort === null ? "—" : o.ort.toFixed(1)}
                    </span>
                    {i === 0 && enYuksekOrt !== null && (
                      <span className="text-2xl">👑</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            {/* Slayt 4 — Kıvılcım Ligi */}
            <section
              className={`absolute inset-0 flex flex-col pb-44 transition-all duration-1000 ${
                slayt === 3 ? "opacity-100 scale-100" : "pointer-events-none scale-[0.98] opacity-0"
              }`}
            >
              <h2 className="text-4xl font-bold text-gold-light">
                {t.ligBaslik}
              </h2>
              <p className="mt-1 text-lg text-slate-400">{t.ligAciklama}</p>

              {veri.lig.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-xl text-slate-400">
                  {t.ligBos}
                </p>
              ) : (
                <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-2">
                  <ol className="space-y-3">
                    {veri.lig.map((k, i) => (
                      <li
                        key={k.ad}
                        className={`flex items-center gap-4 kart-3d rounded-2xl bg-midnight-card/60 p-4 transition-all duration-700 ${
                          yukselenler.has(k.ad)
                            ? "parilti ring-2 ring-emerald-400/70"
                            : "ring-1 ring-gold/20"
                        }`}
                      >
                        <span className="w-10 text-center text-3xl">
                          {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}
                        </span>
                        {yukselenler.has(k.ad) && (
                          <span className="shrink-0 rounded-full bg-emerald-400/20 px-2 py-0.5 text-sm font-bold text-emerald-300">
                            ▲ yükseldi
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-2xl font-semibold text-slate-100">
                            {k.ad}
                          </span>
                          {/* UX #8 — spotlight: kişi salt sayı değil, kim olduğu */}
                          {(k.arketip || k.enGuclu) && (
                            <span className="mt-0.5 block truncate text-base text-slate-400">
                              {k.arketip && (
                                <span className="text-gold-light/90">
                                  {k.arketip.simge} {k.arketip.ad}
                                </span>
                              )}
                              {k.arketip && k.enGuclu && <span className="mx-1.5 text-slate-600">·</span>}
                              {k.enGuclu && <span>💪 {k.enGuclu}</span>}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-lg text-royal-light">{k.unvan}</span>
                        <span className="shrink-0 font-mono text-2xl font-bold text-gold">
                          {k.kivilcim} ⚡
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-300">
                      {t.ligTakimlar}
                    </h3>
                    {/* [E7] Takım Çekimi vurgusu: skor kıvılcım × tamamlama oranı */}
                    <p className="mt-1 text-sm text-gold-light/80">{t.ligTakimlarAlt}</p>
                    <ul className="mt-4 space-y-4">
                      {veri.takimLigi.map((tk, i) => {
                        const enYuksek = veri.takimLigi[0]?.kivilcim ?? 1;
                        // #8 Takım amblemi: takımın kendi rengi (ağ haritasıyla aynı)
                        const renk = takimRengi(veri.takimlar.indexOf(tk.takim));
                        return (
                          <li key={tk.takim}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-[#06121e] ring-2 ring-white/10"
                                  style={{ background: renk }}
                                  aria-hidden
                                >
                                  {tk.takim.charAt(0).toUpperCase()}
                                </span>
                                <span className="truncate text-xl font-medium text-slate-100">
                                  {tk.takim} {i === 0 && "👑"}
                                </span>
                              </span>
                              <span className="shrink-0 font-mono text-xl font-bold text-gold-light">
                                {tk.kivilcim} ⚡
                              </span>
                            </div>
                            <div className="mt-1.5 h-4 w-full overflow-hidden rounded-full bg-midnight-card/80">
                              <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                  width: `${(tk.kivilcim / enYuksek) * 100}%`,
                                  background: `linear-gradient(90deg, ${renk}88, ${renk})`,
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </section>
            {/* Slayt 5 — Anı Duvarı */}
            <section
              className={`absolute inset-0 flex flex-col pb-44 transition-all duration-1000 ${
                slayt === 4 ? "opacity-100 scale-100" : "pointer-events-none scale-[0.98] opacity-0"
              }`}
            >
              <h2 className="text-4xl font-bold text-gold-light">{t.duvarBaslik}</h2>
              {veri.anilar.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                  <span className="text-7xl" aria-hidden>📸</span>
                  <p className="font-display text-4xl font-bold text-slate-200">
                    İlk anıyı sen ekle
                  </p>
                  <p className="max-w-2xl text-2xl text-slate-400">{t.duvarBos}</p>
                  <p className="mt-2 rounded-full bg-gold/15 px-6 py-2 text-xl font-bold text-gold-light">
                    📲 Telefonundan fotoğraf paylaş → ayna.oneteamglobal.ai
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-3 gap-4 lg:grid-cols-4">
                  {veri.anilar.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="aspect-square w-full rounded-2xl object-cover ring-1 ring-white/10"
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Slayt 6 — #8 Salonun Kalbi: isimsiz olumlu yansımalar duvarı */}
            <section
              className={`absolute inset-0 flex flex-col pb-44 transition-all duration-1000 ${
                slayt === 5 ? "opacity-100 scale-100" : "pointer-events-none scale-[0.98] opacity-0"
              }`}
            >
              <h2 className="text-4xl font-bold text-gold-light">{t.yansimaBaslik}</h2>
              <p className="mt-1 text-lg text-slate-400">{t.yansimaAciklama}</p>
              {veri.yansimalar.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-xl text-slate-400">
                  {t.yansimaBos}
                </p>
              ) : (
                <div className="mt-6 grid min-h-0 flex-1 grid-cols-2 content-start gap-5 overflow-hidden lg:grid-cols-3">
                  {veri.yansimalar.map((söz, i) => (
                    <blockquote
                      key={i}
                      className="kart-3d seri-belir rounded-3xl bg-midnight-card/60 p-6 text-2xl font-medium leading-snug text-slate-100 ring-1 ring-gold/20"
                      style={{ animationDelay: `${(i % 6) * 120}ms` }}
                    >
                      <span className="text-gold-light">“</span>
                      {söz}
                      <span className="text-gold-light">”</span>
                    </blockquote>
                  ))}
                </div>
              )}
            </section>

            {/* Slayt 7 — ŞİMDİ / SIRADA: o anki program bloğu + geri sayım + sıradaki */}
            <section
              className={`absolute inset-0 flex flex-col pb-44 transition-all duration-1000 ${
                slayt === 6 ? "opacity-100 scale-100" : "pointer-events-none scale-[0.98] opacity-0"
              }`}
            >
              <h2 className="text-4xl font-bold text-gold-light">📍 Şimdi / Sırada</h2>
              <p className="mt-1 text-lg text-slate-400">
                Salonun nabzı: o an ne yapıyoruz, sırada ne var.
              </p>
              {(() => {
                const gun = an && veri?.kampGun1 ? kampGunu(an.tarih, veri.kampGun1) : null;
                if (!gun || !an) {
                  return (
                    <div className="flex flex-1 items-center justify-center">
                      <p className="text-2xl text-slate-400">Kamp programı yakında başlıyor.</p>
                    </div>
                  );
                }
                const aktif = suankiMadde(gun, an.dk);
                const sira = siradakiMadde(gun, an.dk);
                const kalan = aktif
                  ? dakikaCevir(aktif.bitis) - an.dk
                  : sira
                    ? dakikaCevir(sira.baslangic) - an.dk
                    : null;
                return (
                  <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
                    <span className="rounded-full bg-gold/15 px-5 py-1.5 text-2xl font-bold text-gold-light">
                      Gün {gun} / 3
                    </span>
                    <div>
                      <p className="text-2xl uppercase tracking-[0.3em] text-slate-400">Şimdi</p>
                      <p className="mt-2 font-display text-7xl font-bold text-slate-100">
                        {aktif ? `${ETKINLIK_SIMGESI[aktif.tur]} ${aktif.baslik}` : "🌿 Serbest zaman"}
                      </p>
                      {kalan != null && kalan >= 0 && (
                        <p className="mt-3 font-mono text-3xl text-amber-300">
                          {aktif ? `bitişe ~${kalan} dk` : `başlamasına ~${kalan} dk`}
                        </p>
                      )}
                    </div>
                    {sira && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4">
                        <p className="text-xl uppercase tracking-[0.3em] text-slate-500">Sırada</p>
                        <p className="mt-1 text-3xl font-semibold text-slate-200">
                          {sira.baslangic} · {ETKINLIK_SIMGESI[sira.tur]} {sira.baslik}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>

            {/* Slayt 8 — [9] Salon Mozaiği: kolektif dönüşüm haritası, isimsiz */}
            <section
              className={`absolute inset-0 flex flex-col pb-44 transition-all duration-1000 ${
                slayt === 7 ? "opacity-100 scale-100" : "pointer-events-none scale-[0.98] opacity-0"
              }`}
            >
              <h2 className="text-4xl font-bold text-gold-light">{t.mozaikBaslik}</h2>
              <p className="mt-1 text-lg text-slate-400">{t.mozaikAciklama}</p>
              {veri.mozaik.arketipler.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-xl text-slate-400">
                  {t.mozaikBos}
                </p>
              ) : (
                <div className="mt-6 flex min-h-0 flex-1 flex-col gap-6">
                  <div className="flex flex-wrap content-start justify-center gap-3 overflow-hidden">
                    {veri.mozaik.arketipler.map((a, i) => (
                      <span
                        key={i}
                        className="kart-3d seri-belir flex items-center gap-2 rounded-2xl bg-midnight-card/60 px-4 py-2.5 ring-1 ring-gold/20"
                        style={{ animationDelay: `${(i % 12) * 80}ms` }}
                      >
                        <span className="text-2xl" aria-hidden>{a.simge}</span>
                        <span className="text-lg font-medium text-slate-200">{a.ad}</span>
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {veri.mozaik.korNoktaKapananOran !== null && (
                      <div className="kart-3d rounded-2xl border border-gold/25 bg-gold/[0.06] p-5 text-center">
                        <p className="font-mono text-4xl font-bold text-gold">
                          %{veri.mozaik.korNoktaKapananOran}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-gold-light">
                          {t.mozaikKorNokta(veri.mozaik.korNoktaKapananOran)}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">{t.mozaikKorNoktaAciklama}</p>
                      </div>
                    )}
                    {veri.mozaik.enCokBuyuyenOzellik && (
                      <div className="kart-3d rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-5 text-center">
                        <p className="text-3xl" aria-hidden>📈</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-300">
                          {t.mozaikBuyuyen(veri.mozaik.enCokBuyuyenOzellik.ad)}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          +{veri.mozaik.enCokBuyuyenOzellik.fark.toFixed(1)} puan (ilk → son dalga)
                        </p>
                      </div>
                    )}
                    {/* FAZ 3.5 — kamp zinciri: isimsiz, yalnız ulaştığı halka sayısı */}
                    {veri.zincir && (
                      <div className="kart-3d rounded-2xl border border-royal-light/25 bg-royal/[0.08] p-5 text-center sm:col-span-2">
                        <p className="text-3xl" aria-hidden>🔗</p>
                        <p className="mt-1 text-lg font-semibold text-royal-light">
                          Zincir {veri.zincir.uzunluk} kişiye ulaştı
                        </p>
                      </div>
                    )}
                    {/* [1.5] Salon Daveti sayacı — bu salondan çıkan davetler */}
                    {veri.salonDavetSayisi > 0 && (
                      <div className="kart-3d rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-5 text-center sm:col-span-2">
                        <p className="text-3xl" aria-hidden>🕊️</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-300">
                          Bu salondan {veri.salonDavetSayisi} davet çıktı
                        </p>
                      </div>
                    )}
                    {/* [E3] Kolektif söz mührü — canlı sayaç */}
                    {veri.sozMuhur && (
                      <div className="kart-3d rounded-2xl border border-gold/40 bg-gold/[0.08] p-5 text-center sm:col-span-2">
                        <p className="text-3xl" aria-hidden>📜</p>
                        <p className="mt-1 text-2xl font-bold text-gold-light">
                          {veri.sozMuhur.muhurlu} / {veri.sozMuhur.sozVeren} söz mühürlendi
                        </p>
                      </div>
                    )}
                    {/* [#10/#3] Salon kariyer kolektifi — görüşme sözü + ilk adım + kayıt */}
                    {(veri.salonKariyer.gorusmeSozu > 0 || veri.salonKariyer.ilkAdim > 0) && (
                      <div className="kart-3d rounded-2xl border border-royal-light/30 bg-royal-light/[0.07] p-5 text-center sm:col-span-2">
                        <p className="text-3xl" aria-hidden>🚀</p>
                        <p className="mt-1 text-lg font-semibold text-royal-light">
                          Bu salon
                          {veri.salonKariyer.gorusmeSozu > 0 && ` ${veri.salonKariyer.gorusmeSozu} görüşme sözü verdi`}
                          {veri.salonKariyer.ilkAdim > 0 && ` · ${veri.salonKariyer.ilkAdim} ilk adım attı`}
                          {veri.salonKariyer.kayit > 0 && ` · ${veri.salonKariyer.kayit} kayıt 🎉`}
                        </p>
                      </div>
                    )}
                    {/* FAZ 5.2 — altın görev kutlaması: isimli (bilinçli — kutlama) */}
                    {veri.altinKazananlar.length > 0 && (
                      <div className="kart-3d rounded-2xl border border-gold/40 bg-gold/[0.10] p-5 text-center sm:col-span-2">
                        <p className="text-3xl" aria-hidden>⚡</p>
                        <p className="mt-1 text-lg font-semibold text-gold-light">
                          Bugünün Altın Görev kahramanları
                        </p>
                        <p className="mt-1 text-sm text-slate-200">
                          {veri.altinKazananlar.join(" · ")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* QR + AKSİYON ÇAĞRISI — salondaki herkesi telefona/eyleme iter (sol-alt) */}
      {qr && (
        <div className="absolute bottom-16 left-6 z-20 flex items-center gap-3 rounded-2xl border border-gold/30 bg-[#04101c]/85 p-3 shadow-2xl backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Katıl" className="h-28 w-28 rounded-lg" />
          <div className="max-w-[14rem]">
            <p className="text-base font-semibold uppercase tracking-wide text-gold-light/80">
              📲 Telefonunu çıkar
            </p>
            <p className="mt-0.5 text-2xl font-bold leading-tight text-slate-100">
              {AKSIYONLAR[slayt % AKSIYONLAR.length]}
            </p>
            <p className="mt-1 font-mono text-sm text-slate-400">ayna.oneteamglobal.ai</p>
          </div>
        </div>
      )}

      {/* [KURULUM 3] CANLI KURULUM SAYACI (sağ-alt) — salon ritüeli: "kaç kişi
          bildirimini açtı". Herkes açınca yeşile döner + "hepimiz hazırız". Her
          yükseldiğinde salon alkışlar; sosyal baskı tek tek ikna etmekten güçlü.
          Yalnız eksik varken görünür (tamamlanınca 8 sn kutlar sonra kaybolur). */}
      {veri && veri.kurulum && veri.kurulum.toplam > 0 && (
        <div
          className={`absolute bottom-16 right-6 z-20 rounded-2xl border p-4 text-center shadow-2xl backdrop-blur ${
            veri.kurulum.kuranlar >= veri.kurulum.toplam
              ? "border-emerald-400/50 bg-emerald-500/15"
              : "border-gold/30 bg-[#04101c]/85"
          }`}
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-light/80">🔔 Bildirim hazır</p>
          <p className="mt-0.5 text-5xl font-black tabular-nums text-slate-50">
            {veri.kurulum.kuranlar}
            <span className="text-2xl text-slate-400">/{veri.kurulum.toplam}</span>
          </p>
          <p className="mt-1 text-sm font-medium text-slate-300">
            {veri.kurulum.kuranlar >= veri.kurulum.toplam
              ? "🎉 Hepimiz hazırız!"
              : "Ana ekrana ekle + bildirime izin ver"}
          </p>
        </div>
      )}

      {/* AYNA imzası — her slaytta dönen kısa fısıltı (sinematik kabuk) */}
      <p className="relative z-10 mt-4 text-center text-sm font-medium uppercase tracking-[0.4em] text-gold-light/40">
        — {["AYNA gözlemliyor", "AYNA görüyor", "AYNA dinliyor", "AYNA hatırlıyor", "AYNA yönetiyor"][slayt % 5]} —
      </p>

      {/* Slayt göstergesi: tempo çubuğu + nokta + N/toplam */}
      <footer className="relative z-10 mt-3">
        <div className="mx-auto mb-3 h-1 w-64 overflow-hidden rounded-full bg-white/10">
          {/* key={slayt} → her slaytta baştan dolar (kalan süre görünür) */}
          <div key={slayt} className="ekran-ilerle h-full rounded-full bg-gold/70" />
        </div>
        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: SLAYT_SAYISI }, (_, i) => (
            <button
              key={i}
              onClick={() => setSlayt(i)}
              aria-label={`Slayt ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                slayt === i ? "w-10 bg-gold" : "w-2.5 bg-slate-600"
              }`}
            />
          ))}
          <span className="ml-3 font-mono text-base text-slate-400">
            {slayt + 1}/{SLAYT_SAYISI}
          </span>
        </div>
      </footer>

      {/* CANLI OLAY ŞERİDİ (ticker): AYNA'nın o an ne yaptığının durmayan kanıtı.
          Olaylar türe göre renk-kodlu; solda "son 60 sn'de N olay" hız rozeti. */}
      {veri?.olaylar && veri.olaylar.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center overflow-hidden border-t border-white/10 bg-[#020a12]/90 backdrop-blur">
          {(() => {
            const sonDk = veri.olaylar.filter(
              (o) => Date.now() - new Date(o.ts).getTime() < 60_000
            ).length;
            return sonDk > 0 ? (
              <span className="z-10 flex shrink-0 items-center gap-2 self-stretch bg-gold/15 px-4 text-base font-bold text-gold-light">
                <span className="ekran-canli-nokta inline-block h-2 w-2 rounded-full bg-gold" aria-hidden />
                son 60 sn · {sonDk} olay
              </span>
            ) : null;
          })()}
          <div className="pointer-events-none overflow-hidden py-2.5">
            <div className="ekran-ticker flex w-max items-center gap-10 whitespace-nowrap pl-10">
              {[...veri.olaylar, ...veri.olaylar].map((o, i) => {
                const renk =
                  o.tur === "fiero"
                    ? "text-amber-300"
                    : o.tur === "tamam"
                      ? "text-emerald-300"
                      : o.tur === "takdir"
                        ? "text-pink-300"
                        : o.tur === "gozlem"
                          ? "text-sky-300"
                          : "text-royal-light";
                return (
                  <span key={i} className={`flex items-center gap-2.5 text-lg font-medium ${renk}`}>
                    <span aria-hidden>{o.ikon}</span>
                    <span>{o.metin}</span>
                    <span className="text-gold-light/40">◆</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
