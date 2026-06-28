"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.altNav;

// İnce çizgi ikon seti: emoji yerine (cihazdan cihaza değişen, kaba duran ve
// premium koyu temayla çelişen) currentColor ile boyanan, zarif SVG'ler.
type IkonAd = "ana" | "degerlendir" | "koc" | "gorevler" | "duvar" | "program";
function Ikon({ ad, className = "" }: { ad: IkonAd; className?: string }) {
  const ortak = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (ad) {
    case "ana":
      return (
        <svg {...ortak}>
          <path d="M3 10.75 12 3l9 7.75" />
          <path d="M5.25 9.5V20a1 1 0 0 0 1 1h11.5a1 1 0 0 0 1-1V9.5" />
          <path d="M9.75 21v-6.25h4.5V21" />
        </svg>
      );
    case "degerlendir":
      return (
        <svg {...ortak}>
          <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.8l-5.2 2.72.99-5.8-4.21-4.1 5.82-.85z" />
        </svg>
      );
    case "gorevler":
      return (
        <svg {...ortak}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "duvar":
      return (
        <svg {...ortak}>
          <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="2.5" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="M4 16.5 9 12l3 3 3.5-3.5L20.5 16" />
        </svg>
      );
    case "koc":
      return (
        <svg {...ortak}>
          <path d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V16.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
          <path d="M8.5 10h7M8.5 12.75h4" />
        </svg>
      );
    case "program":
      return (
        <svg {...ortak}>
          <rect x="3.5" y="4.75" width="17" height="15.5" rx="2.5" />
          <path d="M3.5 9h17M8 3v3.5M16 3v3.5" />
          <path d="M7 13h4M7 16.5h7" />
        </svg>
      );
  }
}

// En sık kullanılan 4 hedef için alt çubuk (başparmak erişimi). İkincil her
// şey üstteki ☰ menüde kalır. Katılımcı dışı/tam ekran rotalarda gizlenir.
// Görev + Program HER ZAMAN birincil: ikisi de alt çubukta, her ekrandan tek
// dokunuş. İkincil olan "Duvar" üst ☰ menüde kalır. "Değerlendir" dalga
// kapalıyken Koç'a döner (aşağıda, bağlam-duyarlı).
const SEKMELER: { href: string; ikon: IkonAd; etiket: string }[] = [
  { href: "/", ikon: "ana", etiket: t.ana },
  { href: "/gorevler", ikon: "gorevler", etiket: t.gorevler },
  { href: "/program", ikon: "program", etiket: t.program },
  { href: "/degerlendir", ikon: "degerlendir", etiket: t.degerlendir },
];

// Bu önekler katılımcı deneyimi değil (admin/büyük ekran/tam ekran) — çubuk yok.
// /pusula tam ekran FAZ 0 akışıdır (Nedenler + "kampta görüşürüz" beklemesi);
// kamp açılmadan görev/değerlendirme sekmeleri görünmesin.
const GIZLI = ["/giris", "/admin", "/ekran", "/sahne", "/yansiman", "/pusula", "/on-farkindalik", "/hedef", "/sozum", "/takip", "/sahitlik", "/mini360", "/ayna-esi", "/kocu"];

type Kivilcim = {
  toplam: number;
  unvan: string;
  sonraki: string | null;
  kalan: number;
  yuzde: number;
  dalgaAcik?: boolean;
  gorevBekleyen?: number;
};

export default function AltNav() {
  const pathname = usePathname();
  // Tam ekran odak rotalar + tek kişi puanlama sihirbazı (/degerlendir/<id>):
  // çubuk gizli, dolaşma yok. Liste (/degerlendir) çubuğu korur.
  const gizli =
    GIZLI.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    /^\/degerlendir\/[^/]+$/.test(pathname);
  const [kiv, setKiv] = useState<Kivilcim | null>(null);

  // Çubuk görünürken içerik altına nefes payı bırak (sabit çubuk içeriği örtmesin)
  useEffect(() => {
    document.body.classList.toggle("alt-nav-acik", !gizli);
    return () => document.body.classList.remove("alt-nav-acik");
  }, [gizli]);

  // #2 Kalıcı Kıvılcım şeridi: her ekranda ilerleme görünür kalsın.
  useEffect(() => {
    if (gizli) return;
    let iptal = false;
    fetch("/api/kivilcim")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!iptal && d) setKiv(d);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [gizli, pathname]);

  if (gizli) return null;

  function aktifMi(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  // B1: bağlam-duyarlı çubuk. Dalga kapalıyken "Değerlendir" sekmesi ölü kalır;
  // onun yerine her zaman değerli olan "Ayna Koçu"nu göster. Dalga açıkken
  // (yükleme dahil değilse) değerlendirme öne döner.
  const sekmeler = SEKMELER.map((s) =>
    s.href === "/degerlendir" && kiv && kiv.dalgaAcik === false
      ? { href: "/kocu", ikon: "koc" as IkonAd, etiket: t.koc }
      : s
  );

  return (
    <nav className="alt-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-midnight/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden">
      {/* Sticky görev şeridi: bekleyen görev varken her ekranda üstte durur,
          tek dokunuşla göreve götürür. Görev = her zaman birincil. /gorevler'de
          gizlenir (zaten oradasın). */}
      {(kiv?.gorevBekleyen ?? 0) > 0 && !pathname.startsWith("/gorevler") && (
        <Link
          href="/gorevler"
          className="block border-b border-gold/25 bg-gold/[0.1] px-4 py-2 transition-colors hover:bg-gold/15"
        >
          <div className="mx-auto flex w-full max-w-md items-center gap-2 text-xs font-semibold text-gold-light">
            <span aria-hidden>🤖</span>
            <span>
              {(kiv?.gorevBekleyen ?? 0) > 1
                ? `${kiv?.gorevBekleyen} bekleyen görevin var`
                : "Bekleyen görevin var"}
            </span>
            <span className="ml-auto">Aç →</span>
          </div>
        </Link>
      )}
      {/* #2 Kıvılcım ilerleme şeridi — toplam + unvan + sonraki rozete kalan */}
      {kiv && (
        <Link
          href="/ben"
          title={t.kivilcimIpucu}
          className="block border-b border-white/5 px-4 pb-1 pt-1.5"
        >
          <div className="mx-auto flex w-full max-w-md items-center gap-2 text-[0.7rem]">
            <span className="font-bold text-gold">⚡ {kiv.toplam}</span>
            <span className="text-slate-400">{kiv.unvan}</span>
            <span className="ml-auto text-slate-500">
              {kiv.sonraki ? t.kivilcimSonraki(kiv.kalan, kiv.sonraki) : t.kivilcimZirve}
            </span>
          </div>
          <div className="mx-auto mt-1 h-1 w-full max-w-md overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-700"
              style={{ width: `${kiv.yuzde}%` }}
            />
          </div>
        </Link>
      )}
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around">
        {sekmeler.map((s) => {
          const aktif = aktifMi(s.href);
          // Görev her zaman öne çıksın: bekleyen görev varsa sekmede nokta rozeti.
          const gorevVar = s.href === "/gorevler" && (kiv?.gorevBekleyen ?? 0) > 0;
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-label={gorevVar ? `${s.etiket} · bekleyen görev var` : s.etiket}
              aria-current={aktif ? "page" : undefined}
              className={`relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors ${
                aktif ? "text-gold-light" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {/* Aktif sekme üst çizgisi — "neredesin?" işareti */}
              {aktif && (
                <span className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-gold" />
              )}
              <span className="relative">
                <Ikon
                  ad={s.ikon}
                  className={`h-6 w-6 transition-transform ${aktif ? "scale-105" : ""}`}
                />
                {gorevVar && (
                  <span className="absolute -right-1.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-midnight" />
                  </span>
                )}
              </span>
              {s.etiket}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
