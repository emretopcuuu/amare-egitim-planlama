"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const k = tr.admin.komuta;

// KAMP KOMUTA sekmeleri (öneri #7): ayna-direktörü (sistem kontrol) + komutan
// (canlı sağlık) + sahne (vitrin) tek bölüm gibi gezilir. Üç sayfanın tepesine
// konur; aktif olan vurgulanır. Sayfalar ayrı kalır ama operatör için tek yer.
const SEKMELER = [
  { href: "/admin/ayna-direktoru", ad: k.direktor },
  { href: "/admin/senaryo", ad: k.senaryo },
  { href: "/admin/saglik", ad: k.komutan },
  { href: "/admin/sahne", ad: k.sahne },
  { href: "/admin/zirveye-hazirlik", ad: k.zirve },
  { href: "/admin/kayip-radari", ad: k.kayip },
  { href: "/admin/kapanis", ad: k.kapanis },
];

export default function KomutaSekme() {
  const yol = usePathname();
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{k.baslik}</p>
      <div className="flex flex-wrap gap-2">
        {SEKMELER.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              yol === s.href
                ? "bg-royal/40 text-gold-light"
                : "bg-midnight-card/60 text-slate-300 hover:bg-midnight-card"
            }`}
          >
            {s.ad}
          </Link>
        ))}
      </div>
    </div>
  );
}
