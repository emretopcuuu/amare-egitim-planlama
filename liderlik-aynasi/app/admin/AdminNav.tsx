"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

const LINKLER = [
  { href: "/admin", etiket: tr.admin.nav.panel },
  { href: "/admin/kurulum", etiket: tr.admin.nav.kurulum },
  { href: "/admin/ayna-direktoru", etiket: tr.admin.nav.ayna },
  { href: "/admin/komutan", etiket: tr.admin.nav.komutan },
  { href: "/admin/sahne-kumanda", etiket: tr.admin.nav.sahne },
  { href: "/admin/program", etiket: tr.admin.nav.program },
  { href: "/admin/katilimcilar", etiket: tr.admin.nav.katilimcilar },
  { href: "/admin/eslestirme", etiket: tr.admin.nav.eslestirme },
  { href: "/admin/qr", etiket: tr.admin.nav.qr },
  { href: "/admin/kiosk", etiket: tr.admin.nav.kiosk },
  { href: "/admin/moderasyon", etiket: tr.admin.nav.moderasyon },
  { href: "/admin/foto", etiket: tr.admin.nav.foto },
  { href: "/admin/sozler", etiket: tr.admin.nav.sozler },
  { href: "/admin/test", etiket: tr.admin.nav.test },
];

export default function AdminNav({
  ad,
  dalgaAdi,
  aynaUyanik,
}: {
  ad: string;
  dalgaAdi: string | null;
  aynaUyanik: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [cikiliyor, setCikiliyor] = useState(false);

  async function cikis() {
    setCikiliyor(true);
    try {
      await fetch("/api/cikis", { method: "POST" });
    } finally {
      router.replace("/admin/giris");
      router.refresh();
    }
  }

  return (
    <nav className="sticky top-0 z-10 border-b border-royal/30 bg-midnight/90 backdrop-blur print:hidden">
      <div className="scrollbar-gizle mx-auto flex w-full max-w-4xl items-center gap-1 overflow-x-auto p-3">
        <span className="mr-2 hidden shrink-0 text-sm font-bold text-gold sm:block">
          {tr.app.name}
        </span>
        {LINKLER.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === l.href
                ? "bg-royal/40 text-gold-light"
                : "text-slate-300 hover:bg-midnight-card"
            }`}
          >
            {l.etiket}
          </Link>
        ))}
        {/* Canlı durum rozetleri: hangi sekmede olursan ol kokpit görünür */}
        <span
          className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            dalgaAdi
              ? "bg-emerald-400/15 text-emerald-400"
              : "bg-slate-500/15 text-slate-400"
          }`}
        >
          🌊 {dalgaAdi ?? "Dalga kapalı"}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            aynaUyanik
              ? "bg-gold/15 text-gold-light"
              : "bg-slate-500/15 text-slate-400"
          }`}
        >
          🤖 {aynaUyanik ? "uyanık" : "uyuyor"}
        </span>
        <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
          {ad}
        </span>
        <button
          onClick={cikis}
          disabled={cikiliyor}
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-midnight-card hover:text-slate-200 disabled:opacity-50"
        >
          {tr.anaSayfa.cikisYap}
        </button>
      </div>
    </nav>
  );
}
