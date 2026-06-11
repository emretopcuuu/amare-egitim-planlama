"use client";

import { tr } from "@/lib/i18n/tr";

export default function YazdirButonu() {
  return (
    <button
      onClick={() => window.print()}
      className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light"
    >
      🖨 {tr.admin.qr.yazdir}
    </button>
  );
}
