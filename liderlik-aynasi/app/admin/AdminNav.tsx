"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

const LINKLER = [
  { href: "/admin", etiket: tr.admin.nav.panel },
  { href: "/admin/katilimcilar", etiket: tr.admin.nav.katilimcilar },
  { href: "/admin/eslestirme", etiket: tr.admin.nav.eslestirme },
  { href: "/admin/qr", etiket: tr.admin.nav.qr },
  { href: "/admin/moderasyon", etiket: tr.admin.nav.moderasyon },
];

export default function AdminNav({ ad }: { ad: string }) {
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
      <div className="mx-auto flex w-full max-w-4xl items-center gap-1 overflow-x-auto p-3">
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
        <span className="ml-auto hidden shrink-0 text-xs text-slate-400 sm:block">
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
