"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.altNav;

// İnce çizgi ikon seti: emoji yerine (cihazdan cihaza değişen, kaba duran ve
// premium koyu temayla çelişen) currentColor ile boyanan, zarif SVG'ler.
type IkonAd = "ana" | "degerlendir" | "gorevler" | "duvar";
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
  }
}

// En sık kullanılan 4 hedef için alt çubuk (başparmak erişimi). İkincil her
// şey üstteki ☰ menüde kalır. Katılımcı dışı/tam ekran rotalarda gizlenir.
const SEKMELER: { href: string; ikon: IkonAd; etiket: string }[] = [
  { href: "/", ikon: "ana", etiket: t.ana },
  { href: "/degerlendir", ikon: "degerlendir", etiket: t.degerlendir },
  { href: "/gorevler", ikon: "gorevler", etiket: t.gorevler },
  { href: "/duvar", ikon: "duvar", etiket: t.duvar },
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

  return (
    <nav className="alt-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-midnight/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden">
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
        {SEKMELER.map((s) => {
          const aktif = aktifMi(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-label={s.etiket}
              aria-current={aktif ? "page" : undefined}
              className={`relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors ${
                aktif ? "text-gold-light" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {/* Aktif sekme üst çizgisi — "neredesin?" işareti */}
              {aktif && (
                <span className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-gold" />
              )}
              <Ikon
                ad={s.ikon}
                className={`h-6 w-6 transition-transform ${aktif ? "scale-105" : ""}`}
              />
              {s.etiket}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
