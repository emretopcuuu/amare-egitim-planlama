"use client";

import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

// #8 Tek elle kullanım: kamp alanında telefonla dolaşan yönetici 12 bölümü
// scroll'lamadan, başparmağının eriştiği yerde o anki TEK önerilen adıma
// dokunabilsin. Yalnız mobilde (sm altı) ve yalnız vurgulu (kritik) öneride
// görünür; sakin durumlarda gürültü yapmaz. Asistan kartının aynası.
export default function AltAksiyonCubugu({
  baslik,
  href,
  ikon,
}: {
  baslik: string;
  href: string;
  ikon: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-midnight/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden print:hidden">
      <p className="mb-1.5 px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
        {tr.admin.altAksiyon.etiket}
      </p>
      <Link
        href={href}
        className="btn-kor parilti flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold"
      >
        <span aria-hidden>{ikon}</span>
        <span className="truncate">{baslik}</span>
      </Link>
    </div>
  );
}
