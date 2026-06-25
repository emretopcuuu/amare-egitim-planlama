"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Alt navigasyonun gizli olduğu içerik sayfalarında (boş/bekleme ekranları)
// kişi sıkışmasın diye sol üstte sabit "← Ana sayfa" butonu. Altın dolgu her
// iki temada da nettir. Tam-ekran akışlarda (pusula, sahne, yansıman…) gösterilmez.
const GOSTER = ["/ayna-esi", "/takip", "/sahitlik", "/mini360", "/sozum", "/anlar", "/grup"];

export default function YuzenGeri() {
  const pathname = usePathname();
  const goster = GOSTER.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  if (!goster) return null;

  return (
    <Link
      href="/"
      aria-label="Ana sayfaya dön"
      className="fixed left-3 top-3 z-40 flex h-11 items-center gap-1.5 rounded-full bg-gold px-4 text-sm font-bold text-[#1a1206] shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
    >
      ← Ana sayfa
    </Link>
  );
}
