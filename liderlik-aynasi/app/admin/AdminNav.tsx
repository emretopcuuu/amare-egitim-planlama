"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { tr } from "@/lib/i18n/tr";
import KomutPaleti from "./KomutPaleti";
import TemaDugmesi from "@/components/TemaDugmesi";

const n = tr.admin.nav;
const g = tr.admin.navGrup;
const k = tr.admin.ux.kokpit;

// FUNNEL NAVİGASYONU: Panel + kampın YOLCULUĞUNA göre 4 aşama (açılır menü).
// Türe göre değil zamana göre: Hazırlık → Katılım → Kamp Canlı → Final & Sonrası.
// Operatör soldan sağa okur = süreçte ilerler; aradığı aracı aşamasından bulur.
type NavLink = { href: string; etiket: string };
const PANEL: NavLink = { href: "/admin", etiket: n.panel };
const GRUPLAR: { ad: string; ikon: string; linkler: NavLink[] }[] = [
  {
    ad: g.hazirlik,
    ikon: "🧰",
    linkler: [
      // Panel'den taşınan KONTROL anahtarları en üstte (işi yapan)
      { href: "/admin/kontrol/hazirlik#pusula", etiket: n.kPusula },
      { href: "/admin/kontrol/hazirlik#onfark", etiket: n.kOnfark },
      { href: "/admin/kurulum", etiket: n.kurulum },
      { href: "/admin/katilimcilar", etiket: n.katilimcilar },
      { href: "/admin/eslestirme", etiket: n.eslestirme },
      { href: "/admin/qr", etiket: n.qr },
      { href: "/admin/yansima", etiket: n.yansima },
      { href: "/admin/kiosk", etiket: n.kiosk },
      { href: "/admin/program", etiket: n.program },
      { href: "/admin/icerik", etiket: n.icerik },
      { href: "/admin/gorev-turleri", etiket: n.gorevTuru },
      { href: "/admin/test", etiket: n.test },
    ],
  },
  {
    ad: g.katilim,
    ikon: "🎯",
    linkler: [
      { href: "/admin/farkindalik", etiket: n.farkindalik },
      { href: "/admin/ayna-esi", etiket: n.aynaEsi },
      { href: "/admin/whatsapp", etiket: n.whatsapp },
    ],
  },
  {
    ad: g.canli,
    ikon: "🎛",
    linkler: [
      // Panel'den taşınan KONTROL anahtarları en üstte
      { href: "/admin/kontrol/canli#dalga", etiket: n.kDalga },
      { href: "/admin/kontrol/canli#hedef", etiket: n.kHedef },
      // Kamp Komuta (direktör + komutan + sahne) tek girişten — alt sekmelerle gezilir
      { href: "/admin/ayna-direktoru", etiket: n.komuta },
      { href: "/admin/duyuru", etiket: n.duyuru },
      { href: "/admin/moderasyon", etiket: n.moderasyon },
      { href: "/admin/canli-ayna", etiket: n.canliAyna },
      { href: "/admin/analiz", etiket: n.analiz },
      { href: "/admin/ayna-saglik", etiket: n.aynaSaglik },
      { href: "/admin/mentorluk", etiket: n.mentorluk },
      { href: "/admin/takim", etiket: n.takim },
      { href: "/admin/grup-odev", etiket: n.grupOdev },
      { href: "/admin/sunum", etiket: n.sunum },
    ],
  },
  {
    ad: g.final,
    ikon: "🪞",
    linkler: [
      // Panel'den taşınan KONTROL anahtarları en üstte
      { href: "/admin/kontrol/final#bosluk", etiket: n.kBosluk },
      { href: "/admin/kontrol/final#rapor", etiket: n.kRapor },
      { href: "/admin/kontrol/final#muhur", etiket: n.kMuhur },
      { href: "/admin/kontrol/final#soz", etiket: n.kSoz },
      { href: "/admin/kontrol/final#sonrasi", etiket: n.kSonrasi },
      { href: "/admin/sozler", etiket: n.sozler },
      { href: "/admin/elmas", etiket: n.elmas },
    ],
  },
  {
    ad: g.sistem,
    ikon: "⚙",
    linkler: [
      { href: "/admin/sistem#prova", etiket: n.sProva },
      { href: "/admin/sistem#zamanlama", etiket: n.sZamanlama },
      { href: "/admin/sistem#kod", etiket: n.sKod },
      { href: "/admin/sistem#yedek", etiket: n.sYedek },
      { href: "/admin/sistem#yeni-kamp", etiket: n.sYeniKamp },
      { href: "/admin/sistem#kvkk", etiket: n.sKvkk },
    ],
  },
];

export default function AdminNav({
  ad,
  dalgaAdi,
  aynaUyanik,
  tamYetki = true,
  provaAcik = false,
  raporAcik = false,
  muhurAcik = false,
  moderasyonBekleyen = 0,
}: {
  ad: string;
  dalgaAdi: string | null;
  aynaUyanik: boolean;
  tamYetki?: boolean;
  provaAcik?: boolean;
  raporAcik?: boolean;
  muhurAcik?: boolean;
  moderasyonBekleyen?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [cikiliyor, setCikiliyor] = useState(false);
  const [acikGrup, setAcikGrup] = useState<string | null>(null);
  const [acikKonum, setAcikKonum] = useState<{ left: number; top: number } | null>(null);

  // Açık menü, butonun ölçülen konumuna sabitlenir ve gövdeye portallanır.
  // Kaydırma / yeniden boyutlandırmada konum kaymasın diye menüyü kapatırız.
  const grupKapat = () => {
    setAcikGrup(null);
    setAcikKonum(null);
  };
  useEffect(() => {
    if (!acikGrup) return;
    const kapat = () => {
      setAcikGrup(null);
      setAcikKonum(null);
    };
    window.addEventListener("resize", kapat);
    window.addEventListener("scroll", kapat, true);
    return () => {
      window.removeEventListener("resize", kapat);
      window.removeEventListener("scroll", kapat, true);
    };
  }, [acikGrup]);

  function grupAc(ad: string, el: HTMLElement) {
    if (acikGrup === ad) return grupKapat();
    const r = el.getBoundingClientRect();
    // Menü 11rem (~176px) genişlikte; sağ kenardan taşmasın diye left'i kısıtla.
    const genislik = 176;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - genislik - 8));
    setAcikKonum({ left, top: r.bottom + 4 });
    setAcikGrup(ad);
  }

  async function cikis() {
    setCikiliyor(true);
    try {
      await fetch("/api/cikis", { method: "POST" });
    } finally {
      router.replace("/admin/giris");
      router.refresh();
    }
  }

  const panelAktif = pathname === PANEL.href;

  return (
    <nav className="sticky top-0 z-30 border-b border-royal/30 bg-midnight/90 backdrop-blur print:hidden">
      {/* Açık menü gövdeye portallanır (overflow-x kabının altında kırpılmasın).
          acikGrup yalnız tıklamayla (hidrasyon sonrası) dolar → SSR'da portal yok. */}
      {acikGrup &&
        acikKonum &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              aria-hidden
              tabIndex={-1}
              onClick={grupKapat}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              style={{ position: "fixed", left: acikKonum.left, top: acikKonum.top }}
              className="z-50 min-w-[11rem] overflow-hidden rounded-xl border border-royal/40 bg-midnight-card shadow-2xl"
            >
              {GRUPLAR.find((grup) => grup.ad === acikGrup)?.linkler.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={grupKapat}
                  className={`block px-4 py-2.5 text-sm transition-colors ${
                    pathname === l.href
                      ? "bg-royal/40 text-gold-light"
                      : "text-slate-300 hover:bg-royal/20"
                  }`}
                >
                  {l.etiket}
                </Link>
              ))}
            </div>
          </>,
          document.body
        )}
      {/* Yatay kaydırma yerine SATIRA SIĞMAYAN öğeler alt satıra taşar (wrap).
          Böylece hiçbir şey kırpılmaz, hiç kaydırmaya gerek kalmaz — operatör
          tüm aşamaları + durumu tek bakışta görür. */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-wrap items-center gap-1.5 p-3">
        <span className="mr-1 hidden shrink-0 text-sm font-bold text-gold sm:block">
          {tr.app.name}
        </span>

        <Link
          href={PANEL.href}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            panelAktif
              ? "bg-royal/40 text-gold-light"
              : "text-slate-300 hover:bg-midnight-card"
          }`}
        >
          {PANEL.etiket}
        </Link>

        {/* #1/#4 Komut paleti tetikleyici — her sayfadan ⌘K ile de açılır */}
        {tamYetki && <KomutPaleti />}

        {/* Kategori açılır menüleri — yalnız tam yetkili admin */}
        {tamYetki &&
          GRUPLAR.map((grup) => {
            const acik = acikGrup === grup.ad;
            const grupAktif = grup.linkler.some((l) => pathname === l.href);
            return (
              <button
                key={grup.ad}
                onClick={(e) => grupAc(grup.ad, e.currentTarget)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  grupAktif || acik
                    ? "bg-royal/40 text-gold-light"
                    : "text-slate-300 hover:bg-midnight-card"
                }`}
              >
                <span aria-hidden>{grup.ikon}</span>
                {grup.ad}
                <span className="text-[0.6rem] text-slate-500" aria-hidden>
                  ▾
                </span>
              </button>
            );
          })}

        {/* Canlı durum rozetleri: hangi sekmede olursan ol kokpit görünür */}
        {/* #9 Prova rozeti: test ortamı her an net görünür */}
        {/* Durum rozetleri: geniş ekranda sağa yaslı (ml-auto), dar ekranda
            alt satıra temiz sarar. Sarımı bozmamak için ml-auto yalnız ilk
            rozette; sonrakiler onu izler. */}
        {provaAcik && (
          <span className="ml-auto shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
            ⚠️ {g.prova}
          </span>
        )}
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            provaAcik ? "" : "ml-auto"
          } ${
            dalgaAdi
              ? "bg-emerald-400/15 text-emerald-400"
              : "bg-slate-500/15 text-slate-400"
          }`}
        >
          🌊 {dalgaAdi ?? "Dalga kapalı"}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            aynaUyanik ? "bg-gold/15 text-gold-light" : "bg-slate-500/15 text-slate-400"
          }`}
        >
          🤖 {aynaUyanik ? "uyanık" : "uyuyor"}
        </span>
        {/* #6 Kokpit rozetleri: rapor + mühür durumu, bekleyen moderasyon */}
        {raporAcik && (
          <span className="shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
            👁 {k.raporAcik}
          </span>
        )}
        {muhurAcik && (
          <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold-light">
            🔒 {k.muhurAcik}
          </span>
        )}
        {moderasyonBekleyen > 0 && (
          <Link
            href="/admin/moderasyon"
            className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
          >
            🖼 {k.moderasyon(moderasyonBekleyen)}
          </Link>
        )}
        <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{ad}</span>
        {/* Gece / Gündüz / Otomatik geçişi — admin panelinden de erişilebilir */}
        <TemaDugmesi />
        <button
          onClick={cikis}
          disabled={cikiliyor}
          className="shrink-0 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-midnight-card hover:text-slate-200 disabled:opacity-50"
        >
          {tr.anaSayfa.cikisYap}
        </button>
      </div>
    </nav>
  );
}
