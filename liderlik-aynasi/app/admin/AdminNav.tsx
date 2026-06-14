"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

const n = tr.admin.nav;
const g = tr.admin.navGrup;

// #3 14 düz sekme yerine: Panel + 4 kategori (açılır menü). Yatay kaydırmada
// kaybolan sekme kalmaz; yönetici aradığı aracı kategorisinden bulur.
type NavLink = { href: string; etiket: string };
const PANEL: NavLink = { href: "/admin", etiket: n.panel };
const GRUPLAR: { ad: string; ikon: string; linkler: NavLink[] }[] = [
  {
    ad: g.kurulum,
    ikon: "🧰",
    linkler: [
      { href: "/admin/kurulum", etiket: n.kurulum },
      { href: "/admin/katilimcilar", etiket: n.katilimcilar },
      { href: "/admin/eslestirme", etiket: n.eslestirme },
      { href: "/admin/qr", etiket: n.qr },
      { href: "/admin/kiosk", etiket: n.kiosk },
    ],
  },
  {
    ad: g.canli,
    ikon: "🎛",
    linkler: [
      { href: "/admin/ayna-direktoru", etiket: n.ayna },
      { href: "/admin/komutan", etiket: n.komutan },
      { href: "/admin/sahne-kumanda", etiket: n.sahne },
    ],
  },
  {
    ad: g.icerik,
    ikon: "🖼",
    linkler: [
      { href: "/admin/moderasyon", etiket: n.moderasyon },
      { href: "/admin/foto", etiket: n.foto },
      { href: "/admin/sozler", etiket: n.sozler },
    ],
  },
  {
    ad: g.ayarlar,
    ikon: "⚙️",
    linkler: [
      { href: "/admin/program", etiket: n.program },
      { href: "/admin/test", etiket: n.test },
    ],
  },
];

export default function AdminNav({
  ad,
  dalgaAdi,
  aynaUyanik,
  tamYetki = true,
  provaAcik = false,
}: {
  ad: string;
  dalgaAdi: string | null;
  aynaUyanik: boolean;
  tamYetki?: boolean;
  provaAcik?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [cikiliyor, setCikiliyor] = useState(false);
  const [acikGrup, setAcikGrup] = useState<string | null>(null);

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
    <nav className="sticky top-0 z-30 border-b border-royal/30 bg-midnight/90 backdrop-blur print:hidden">
      {/* Dışarı tıklayınca açık menü kapanır */}
      {acikGrup && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => setAcikGrup(null)}
          className="fixed inset-0 z-0 cursor-default"
        />
      )}
      <div className="scrollbar-gizle relative z-10 mx-auto flex w-full max-w-4xl items-center gap-1 overflow-x-auto p-3">
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

        {/* Kategori açılır menüleri — yalnız tam yetkili admin */}
        {tamYetki &&
          GRUPLAR.map((grup) => {
            const acik = acikGrup === grup.ad;
            const grupAktif = grup.linkler.some((l) => pathname === l.href);
            return (
              <div key={grup.ad} className="relative shrink-0">
                <button
                  onClick={() => setAcikGrup(acik ? null : grup.ad)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
                {acik && (
                  <div className="absolute left-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-royal/40 bg-midnight-card shadow-2xl">
                    {grup.linkler.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setAcikGrup(null)}
                        className={`block px-4 py-2.5 text-sm transition-colors ${
                          pathname === l.href
                            ? "bg-royal/40 text-gold-light"
                            : "text-slate-300 hover:bg-royal/20"
                        }`}
                      >
                        {l.etiket}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {/* Canlı durum rozetleri: hangi sekmede olursan ol kokpit görünür */}
        {/* #9 Prova rozeti: test ortamı her an net görünür */}
        {provaAcik && (
          <span className="ml-auto shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
            ⚠️ {g.prova}
          </span>
        )}
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            provaAcik ? "" : "ml-auto"
          } ${
            dalgaAdi
              ? "bg-emerald-400/15 text-emerald-400"
              : "bg-slate-500/15 text-slate-400"
          }`}
        >
          🌊 {dalgaAdi ?? "Dalga kapalı"}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            aynaUyanik ? "bg-gold/15 text-gold-light" : "bg-slate-500/15 text-slate-400"
          }`}
        >
          🤖 {aynaUyanik ? "uyanık" : "uyuyor"}
        </span>
        <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{ad}</span>
        <button
          onClick={cikis}
          disabled={cikiliyor}
          className="shrink-0 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-midnight-card hover:text-slate-200 disabled:opacity-50"
        >
          {tr.anaSayfa.cikisYap}
        </button>
      </div>
    </nav>
  );
}
