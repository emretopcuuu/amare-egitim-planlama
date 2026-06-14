"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.altNav;

// En sık kullanılan 4 hedef için alt çubuk (başparmak erişimi). İkincil her
// şey üstteki ☰ menüde kalır. Katılımcı dışı/tam ekran rotalarda gizlenir.
const SEKMELER = [
  { href: "/", simge: "🏠", etiket: t.ana },
  { href: "/degerlendir", simge: "⭐", etiket: t.degerlendir },
  { href: "/gorevler", simge: "🎯", etiket: t.gorevler },
  { href: "/duvar", simge: "📸", etiket: t.duvar },
];

// Bu önekler katılımcı deneyimi değil (admin/büyük ekran/tam ekran) — çubuk yok.
// /pusula tam ekran FAZ 0 akışıdır (Nedenler + "kampta görüşürüz" beklemesi);
// kamp açılmadan görev/değerlendirme sekmeleri görünmesin.
const GIZLI = ["/giris", "/admin", "/ekran", "/sahne", "/yansiman", "/pusula"];

type Kivilcim = {
  toplam: number;
  unvan: string;
  sonraki: string | null;
  kalan: number;
  yuzde: number;
};

export default function AltNav() {
  const pathname = usePathname();
  const gizli = GIZLI.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-midnight/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden">
      {/* #2 Kıvılcım ilerleme şeridi — toplam + unvan + sonraki rozete kalan */}
      {kiv && (
        <Link href="/gorevler" className="block border-b border-white/5 px-4 pb-1 pt-1.5">
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
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors ${
                aktif ? "text-gold-light" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className={`text-2xl transition-transform ${aktif ? "scale-110" : ""}`}>
                {s.simge}
              </span>
              {s.etiket}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
