"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { tr } from "@/lib/i18n/tr";
import KomutPaleti from "./KomutPaleti";
import KlavyeKisayollari from "./KlavyeKisayollari";
import TemaDugmesi from "@/components/TemaDugmesi";

const n = tr.admin.nav;
const g = tr.admin.navGrup;
const k = tr.admin.ux.kokpit;

function aktifMi(href: string, pathname: string): boolean {
  const base = href.split("#")[0];
  return pathname === href || (href.includes("#") && pathname === base);
}

// FUNNEL NAVİGASYONU: Panel + kampın YOLCULUĞUNA göre 4 grup (açılır menü).
// Türe göre değil zamana göre: Hazırlık → Kamp Canlı → Final → Sistem.
// Operatör soldan sağa okur = süreçte ilerler; aradığı aracı aşamasından bulur.
type NavLink = { href: string; etiket: string };
const PANEL: NavLink = { href: "/admin", etiket: n.panel };
const GRUPLAR: { ad: string; ikon: string; linkler: NavLink[] }[] = [
  {
    ad: g.hazirlik,
    ikon: "🧰",
    linkler: [
      { href: "/admin/kurulum", etiket: n.kurulum },
      { href: "/admin/katilimcilar", etiket: n.katilimcilar },
      { href: "/admin/eslestirmeler", etiket: n.eslestirmeler },
      { href: "/admin/qr", etiket: n.qr },
      { href: "/admin/davet", etiket: n.davet },
      { href: "/admin/yansima", etiket: n.yansima },
    ],
  },
  {
    ad: g.canli,
    ikon: "🎬",
    linkler: [
      { href: "/admin/icerik", etiket: n.icerik },
      { href: "/admin/gonder", etiket: n.gonder },
      { href: "/admin/kontrol#dalga", etiket: n.kDalga },
      { href: "/admin/ayna-direktoru", etiket: n.komuta },
      { href: "/admin/sahne", etiket: n.sahne },
      { href: "/admin/moderasyon", etiket: n.moderasyon },
      { href: "/admin/mesajlar", etiket: n.mesajlar },
      { href: "/admin/canli-ayna", etiket: n.canliAyna },
      { href: "/admin/market", etiket: n.market },
      { href: "/admin/oyunlastirma", etiket: n.oyunlastirma },
      { href: "/admin/saglik", etiket: n.saglik },
      { href: "/admin/mentorluk", etiket: n.mentorluk },
    ],
  },
  {
    ad: g.final,
    ikon: "🏁",
    linkler: [
      { href: "/admin/kapanis", etiket: n.kapanis },
      { href: "/admin/final", etiket: n.kBosluk },
      { href: "/admin/ayna-saglik", etiket: n.aynaSaglik },
      { href: "/admin/sozler", etiket: n.sozler },
      { href: "/admin/elmas", etiket: n.elmas },
      { href: "/admin/sahne-kisi", etiket: n.sahneKisi },
    ],
  },
  {
    ad: g.sistem,
    ikon: "⚙️",
    linkler: [
      { href: "/admin/sistem#prova", etiket: n.sProva },
      { href: "/admin/sistem#zamanlama", etiket: n.sZamanlama },
      { href: "/admin/sistem#araclar", etiket: n.sAraclar },
      { href: "/admin/sistem#kod", etiket: n.sKod },
      { href: "/admin/sistem#yedek", etiket: n.sYedek },
      { href: "/admin/sistem#yeni-kamp", etiket: n.sYeniKamp },
      { href: "/admin/sistem#kvkk", etiket: n.sKvkk },
      { href: "/admin/simulasyon", etiket: n.sSimulasyon },
      { href: "/admin/prova", etiket: n.prova },
    ],
  },
];

export default function AdminNav({
  ad,
  dalgaAdi,
  dalgaSure,
  aynaUyanik,
  tamYetki = true,
  provaAcik = false,
  raporAcik = false,
  muhurAcik = false,
  moderasyonBekleyen = 0,
  mesajBekleyen = 0,
  kayipBekleyen = 0,
}: {
  ad: string;
  dalgaAdi: string | null;
  dalgaSure?: string | null;
  aynaUyanik: boolean;
  tamYetki?: boolean;
  provaAcik?: boolean;
  raporAcik?: boolean;
  muhurAcik?: boolean;
  moderasyonBekleyen?: number;
  mesajBekleyen?: number;
  kayipBekleyen?: number;
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
    <>
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
                    aktifMi(l.href, pathname)
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
      {/* İki sıra da EKRANDA ORTALI: Panel + 1·2·3·4·5 üst sırada ortalı,
          Hızlı eylem + durum rozetleri alt sırada ortalı (kenarlara yayılmaz). */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-1.5 p-3">
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

        {/* Kategori açılır menüleri — Panel'in HEMEN yanında 1·2·3·4·5 tek sırada */}
        {tamYetki &&
          GRUPLAR.map((grup) => {
            const acik = acikGrup === grup.ad;
            const grupAktif = grup.linkler.some((l) => aktifMi(l.href, pathname));
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

        {/* Zorunlu satır kırma: Panel + 1·2·3·4·5 üstte tek sırada kalsın;
            Hızlı eylem ve durum rozetleri ALT SATIRA insin. */}
        <div className="basis-full" aria-hidden />

        {/* #1/#4 Komut paleti tetikleyici (Hızlı eylem) — alt sırada, soldan */}
        {tamYetki && <KomutPaleti />}

        {/* Canlı durum rozetleri — alt sırada Hızlı eylem'le birlikte ORTALI
            (eskiden ml-auto ile sağ kenara fırlıyordu; artık ortada toplanır). */}
        {provaAcik && (
          <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
            ⚠️ {g.prova}
          </span>
        )}
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            dalgaAdi
              ? "bg-emerald-400/15 text-emerald-400"
              : "bg-slate-500/15 text-slate-400"
          }`}
        >
          🌊 {dalgaAdi ?? "Dalga kapalı"}
          {dalgaSure && <span className="ml-1 opacity-70">· {dalgaSure}</span>}
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
        {mesajBekleyen > 0 && (
          <Link
            href="/admin/mesajlar"
            className="shrink-0 rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold-light transition-colors hover:bg-gold/30"
          >
            💬 {k.mesaj(mesajBekleyen)}
          </Link>
        )}
        {/* [FAZ3] Kayıp radarı rozeti — insan dokunuşu bekleyen kişi varsa KIRMIZI */}
        {kayipBekleyen > 0 && (
          <Link
            href="/admin/kayip-radari"
            className="shrink-0 rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/30"
          >
            🛟 {kayipBekleyen} kayıp
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
    <KlavyeKisayollari />
    </>
  );
}
