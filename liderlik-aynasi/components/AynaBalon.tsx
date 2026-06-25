import type { ReactNode } from "react";

// UX #4 — Tutarlı AYNA varlığı. AYNA'nın konuştuğu HER yerde aynı görsel dil:
// göz avatarı + altın aksanlı konuşma balonu. Görev nedeni, koç, fısıltı,
// rapor… hepsi aynı "varlık" hissini taşısın. Saf sunucu/istemci-uyumlu.
export default function AynaBalon({
  baslik,
  children,
  vurgu = false,
}: {
  /** Üstte küçük etiket — ör. "Sana özel", "AYNA Koçu" */
  baslik?: string;
  children: ReactNode;
  /** Daha güçlü altın çerçeve (öne çıkan anlar için) */
  vurgu?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* AYNA göz avatarı — marka işareti */}
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-royal/30 text-lg ring-1 ring-gold/40"
        aria-hidden
      >
        👁
      </span>
      <div
        className={`min-w-0 flex-1 rounded-2xl rounded-tl-sm border p-4 ${
          vurgu
            ? "border-gold/40 bg-gold/[0.08]"
            : "border-royal-light/25 bg-white/[0.03]"
        }`}
      >
        {baslik && (
          <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-widest text-gold-light">
            {baslik}
          </p>
        )}
        <div className="text-sm leading-relaxed text-slate-200">{children}</div>
      </div>
    </div>
  );
}
