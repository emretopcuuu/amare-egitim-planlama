"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// [ADMIN-UX4] MOBİL ALT EYLEM ÇUBUĞU — kamp günü panel telefondan yönetilir;
// üst nav iki satıra kırılıp küçülüyor. En sık 4 hedef başparmak mesafesinde.
// Yalnız dar ekranda görünür (md:hidden); masaüstünde üst nav yeter.
const HEDEFLER = [
  { href: "/admin", ikon: "🎛", ad: "Bugün" },
  { href: "/admin/senaryo", ikon: "🎬", ad: "Senaryo" },
  { href: "/admin/katilimcilar", ikon: "👥", ad: "Kişiler" },
  { href: "/admin/gonder", ikon: "📣", ad: "Gönder" },
];

export default function AltEylemCubugu() {
  const yol = usePathname();
  return (
    <nav
      aria-label="Hızlı erişim"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-royal/30 bg-midnight/95 backdrop-blur md:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {HEDEFLER.map((h) => {
        const aktif = h.href === "/admin" ? yol === "/admin" : yol.startsWith(h.href);
        return (
          <Link
            key={h.href}
            href={h.href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem] font-semibold transition-colors ${
              aktif ? "text-gold-light" : "text-slate-400"
            }`}
            aria-current={aktif ? "page" : undefined}
          >
            <span className="text-lg leading-none" aria-hidden>{h.ikon}</span>
            {h.ad}
          </Link>
        );
      })}
    </nav>
  );
}
