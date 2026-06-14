"use client";

import { useEffect } from "react";
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

// Bu önekler katılımcı deneyimi değil (admin/büyük ekran/tam ekran) — çubuk yok
const GIZLI = ["/giris", "/admin", "/ekran", "/sahne", "/yansiman"];

export default function AltNav() {
  const pathname = usePathname();
  const gizli = GIZLI.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Çubuk görünürken içerik altına nefes payı bırak (sabit çubuk içeriği örtmesin)
  useEffect(() => {
    document.body.classList.toggle("alt-nav-acik", !gizli);
    return () => document.body.classList.remove("alt-nav-acik");
  }, [gizli]);

  if (gizli) return null;

  function aktifMi(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-midnight/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden">
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
