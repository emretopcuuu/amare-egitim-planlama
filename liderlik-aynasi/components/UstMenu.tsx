"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import YaziBoyu from "@/components/YaziBoyu";
import TemaSecimi from "@/components/TemaSecimi";
import BildirimAnahtari from "@/components/BildirimAnahtari";

const t = tr.anaSayfa;

type Props = {
  ozTamam: boolean;
  dalgaAcik: boolean;
  raporlarAcik: boolean;
  yansimanHazir: boolean;
  ozHedefId: string;
  // Kimlik başlığı (üstte avatar + isim + ünvan + kıvılcım)
  ad: string;
  unvanAd?: string | null;
  kivilcim?: number;
  // Rozetler
  okunmamisMesaj?: number;
  analizSayisi?: number;
  // Kamp öncesi adımları (Pusula/Hedef/Ön Farkındalık) tamamlayanlar için
  // bu sayfalar yetim kalmasın — menüden geri dönülebilsin.
  pusulaTamam?: boolean;
  hedefTamam?: boolean;
  ofTamam?: boolean;
  // [FAZ 9 · U2] Yetim yolculuk sayfaları — açıkken menüden erişilebilsin.
  ikinciAynaAcik?: boolean;
  muhurZinciriAcik?: boolean;
};

// Çizgi-ikon seti — EMOJİ DEĞİL (eski cihazda □ tofu riski yok), her yerde birebir.
function Ikon({ cocuk }: { cocuk: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {cocuk}
    </svg>
  );
}
const IK = {
  kocu: <Ikon cocuk={<><circle cx="12" cy="12" r="3" /><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /></>} />,
  analiz: <Ikon cocuk={<><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 12a9 9 0 0 1 9-9" opacity=".4" /><path d="M12 7v5l3 2" /></>} />,
  soz: <Ikon cocuk={<><path d="M7 7h4v6H7z" /><path d="M13 7h4v6h-4z" /><path d="M9 13v3M15 13v3" /></>} />,
  ozDuzenle: <Ikon cocuk={<><path d="M4 7h10M4 12h16M4 17h8" /><circle cx="18" cy="7" r="2" /><circle cx="14" cy="17" r="2" /></>} />,
  rapor: <Ikon cocuk={<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 13h6M9 17h6" /></>} />,
  yansiman: <Ikon cocuk={<><circle cx="12" cy="12" r="9" /><path d="M10 9l5 3-5 3z" /></>} />,
  ben: <Ikon cocuk={<><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></>} />,
  gunluk: <Ikon cocuk={<><path d="M4 20l4-1L19 8a2 2 0 0 0-3-3L5 16l-1 4Z" /><path d="M14 7l3 3" /></>} />,
  grup: <Ikon cocuk={<><circle cx="9" cy="9" r="3" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5" /><path d="M16 7a3 3 0 0 1 0 6M21 19c0-2.4-1.8-4.2-4-4.8" /></>} />,
  aynaEsi: <Ikon cocuk={<><path d="M8 13l2 2 4-4" /><path d="M12 21C7 17 3 13 3 8a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 1.2-.3 2.3-.8 3.3" /></>} />,
  takdir: <Ikon cocuk={<><path d="M12 21s-7-4.5-9-9a4 4 0 0 1 7-2.5A4 4 0 0 1 21 12c-2 4.5-9 9-9 9Z" /></>} />,
  gizlilik: <Ikon cocuk={<><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M9 12l2 2 4-4" /></>} />,
};

// Üst menü: açılış ekranı tek işe odaklanır; ikincil her şey buradan açılır.
// Tasarım: kimlik başlığı + kategori şeritleri (sana özel=altın, paylaş=mor,
// ayarlar=gri) + her maddede ikon/alt-açıklama/ok + rozetler.
export default function UstMenu({
  ozTamam,
  dalgaAcik,
  raporlarAcik,
  yansimanHazir,
  ozHedefId,
  ad,
  unvanAd,
  kivilcim = 0,
  okunmamisMesaj = 0,
  analizSayisi = 0,
  pusulaTamam: _pusulaTamam = false,
  hedefTamam: _hedefTamam = false,
  ofTamam: _ofTamam = false,
  ikinciAynaAcik = false,
  muhurZinciriAcik = false,
}: Props) {
  const [acik, setAcik] = useState(false);
  const [analizYeni, setAnalizYeni] = useState(false);

  // Menü açıkken üstteki kimlik çubuğu (KimsinBant) ve alttaki kapsül menü
  // kapatma ✕'ini örtüp dokunuşu yutmasın: "ortu-acik" ikisini de gizler.
  useEffect(() => {
    document.body.classList.toggle("ortu-acik", acik);
    return () => document.body.classList.remove("ortu-acik");
  }, [acik]);

  // "Yeni analiz" rozeti: sunucudan gelen analiz sayısı, en son görülenden
  // fazlaysa nokta göster (client-side seen-tracking; sunucuda iz tutmaya gerek yok).
  useEffect(() => {
    try {
      const gorulen = Number(localStorage.getItem("la_analiz_gorulen") ?? "0");
      setAnalizYeni(analizSayisi > gorulen);
    } catch {}
  }, [analizSayisi, acik]);

  function analizGoruldu() {
    try {
      localStorage.setItem("la_analiz_gorulen", String(analizSayisi));
    } catch {}
    setAcik(false);
  }

  type Oge = {
    href: string;
    etiket: string;
    alt: string;
    ikon: ReactNode;
    rozet?: ReactNode;
    onClick?: () => void;
  };

  const sayiRozet = (n: number) =>
    n > 0 ? (
      <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-bold text-[#1a1206]">
        {n > 99 ? "99+" : n}
      </span>
    ) : undefined;
  const noktaRozet = (
    <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-gold-light">
      <span className="h-2 w-2 rounded-full bg-gold" />
      {t.menuYeniRozet}
    </span>
  );

  // SANA ÖZEL (altın şerit)
  const sanaOzel: Oge[] = [];
  sanaOzel.push({ href: "/kocu", etiket: t.menuKocu, alt: t.menuAltKocu, ikon: IK.kocu });
  sanaOzel.push({
    href: "/analizlerim",
    etiket: tr.analiz.menuLink,
    alt: t.menuAltAnaliz,
    ikon: IK.analiz,
    rozet: analizYeni ? noktaRozet : undefined,
    onClick: analizGoruldu,
  });
  if (ozTamam && dalgaAcik)
    sanaOzel.push({
      href: `/degerlendir/${ozHedefId}`,
      etiket: t.menuOzDuzenle,
      alt: t.menuAltOzDuzenle,
      ikon: IK.ozDuzenle,
      rozet: (
        <span className="ml-auto rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
          açık
        </span>
      ),
    });
  if (raporlarAcik)
    sanaOzel.push({ href: "/ayna", etiket: t.menuRapor, alt: t.menuAltRapor, ikon: IK.rapor });
  if (yansimanHazir)
    sanaOzel.push({ href: "/yansiman", etiket: t.menuYansiman, alt: t.menuAltYansiman, ikon: IK.yansiman });
  // [FAZ 5 · Tek Söz birleşmesi] Eski v1 "/soz" (pledges) menü girişi KALDIRILDI —
  // koşulsuz görünüyordu ve SÖZ v2 (/sozum, şahitler) ile çift-söz karmaşası
  // yaratıyordu. v2 söz ana sayfadaki 90 günlük yolculuk kartından erişilir.
  // [FAZ 9 · U2] Yetim yolculuk sayfaları — açıkken menüden erişilebilsin
  // (eskiden yalnız push ile ulaşılıyordu; push kaçarsa kayıptı).
  if (muhurZinciriAcik)
    sanaOzel.push({ href: "/muhur-zinciri", etiket: "Mühür Zinciri", alt: "Sözünü yeniden teyit et", ikon: IK.soz });
  if (ikinciAynaAcik)
    sanaOzel.push({ href: "/ikinci-ayna", etiket: "İkinci Ayna", alt: "90 günün kapanış mektubu", ikon: IK.rapor });

  // PAYLAŞ & KEŞFET (mor şerit)
  const paylas: Oge[] = [
    { href: "/ben", etiket: t.menuBen, alt: t.menuAltBen, ikon: IK.ben },
    { href: "/gunluk", etiket: t.menuGunluk, alt: t.menuAltGunluk, ikon: IK.gunluk },
    {
      href: "/grup",
      etiket: t.menuGrup,
      alt: t.menuAltGrup,
      ikon: IK.grup,
      rozet: sayiRozet(okunmamisMesaj),
    },
    { href: "/ayna-esi", etiket: t.menuAynaEsi, alt: t.menuAltAynaEsi, ikon: IK.aynaEsi },
    { href: "/takdir", etiket: t.menuTakdir, alt: t.menuAltTakdir, ikon: IK.takdir },
    { href: "/gizlilik", etiket: t.menuGizlilik, alt: t.menuAltGizlilik, ikon: IK.gizlilik },
  ];

  async function cikis() {
    await fetch("/api/cikis", { method: "POST" });
    try { localStorage.removeItem("la_giris_kod"); } catch {}
    window.location.href = "/giris?cikis=1";
  }

  const ilkHarf = (ad?.trim()?.charAt(0) || "?").toUpperCase();

  function Bolum({
    baslik,
    ogeler,
    seritRenk,
  }: {
    baslik: string;
    ogeler: Oge[];
    seritRenk: string;
  }) {
    if (ogeler.length === 0) return null;
    return (
      <>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {baslik}
        </p>
        <nav className="mt-2 space-y-2">
          {ogeler.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              onClick={() => (o.onClick ? o.onClick() : setAcik(false))}
              className={`flex items-center gap-3 rounded-2xl border border-white/10 border-l-[3px] ${seritRenk} bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.06]`}
            >
              <span className="text-slate-300">{o.ikon}</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-tight text-slate-100">
                  {o.etiket}
                </span>
                <span className="block truncate text-xs text-slate-400">{o.alt}</span>
              </span>
              {o.rozet ?? <span className="ml-auto text-slate-600" aria-hidden>›</span>}
            </Link>
          ))}
        </nav>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setAcik(true)}
        aria-label={t.menuBaslik}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-2xl text-slate-200 transition-colors hover:bg-white/[0.08]"
      >
        ☰
      </button>

      {acik && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
          onClick={() => setAcik(false)}
        >
          <div className="flex min-h-full items-center justify-center p-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
            <div
              className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-midnight-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Her zaman görünen kapatma çarpısı. */}
              <button
                onClick={() => setAcik(false)}
                aria-label={t.menuKapat}
                className="absolute right-3 top-3 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-xl font-bold text-[#1a1206] shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
              >
                ✕
              </button>

              {/* KİMLİK BAŞLIĞI: avatar (baş harf) + isim + ünvan · kıvılcım */}
              <div className="flex items-center gap-3 pr-14">
                <span
                  className="prizma-serif flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-light text-xl font-bold text-[#1a1206] ring-2 ring-gold/30"
                  aria-hidden
                >
                  {ilkHarf}
                </span>
                <div className="min-w-0">
                  <p className="prizma-serif ay-metin truncate text-lg font-semibold leading-tight">
                    {ad}
                  </p>
                  {(unvanAd || kivilcim > 0) && (
                    <p className="truncate text-xs text-gold-light/90">
                      {unvanAd}
                      {unvanAd && kivilcim > 0 ? " · " : ""}
                      {kivilcim > 0 ? `${kivilcim} kıvılcım` : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Kategoriler — sol kenar renk şeridiyle */}
              <Bolum baslik={t.menuBirincilBaslik} ogeler={sanaOzel} seritRenk="border-l-gold/70" />
              <Bolum baslik={t.menuEkstraBaslik} ogeler={paylas} seritRenk="border-l-royal-light/70" />

              {/* AYARLAR — ayrı, daha sönük kart */}
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t.menuAyarlarBaslik}
              </p>
              <div className="mt-2 space-y-3 rounded-2xl border border-l-[3px] border-white/5 border-l-slate-500/60 bg-black/20 p-3">
                <BildirimAnahtari />
                <YaziBoyu />
                <TemaSecimi />
              </div>

              <button
                onClick={() => setAcik(false)}
                className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl border-2 border-gold/50 text-base font-semibold text-gold-light transition-colors hover:bg-gold/10"
              >
                ✕ {t.menuKapat}
              </button>
              {/* Çıkış: sönük footer (10B) */}
              <button
                onClick={cikis}
                className="mt-3 flex w-full items-center justify-center py-2 text-sm text-slate-500 transition-colors hover:text-red-300"
              >
                {t.cikisYap}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
