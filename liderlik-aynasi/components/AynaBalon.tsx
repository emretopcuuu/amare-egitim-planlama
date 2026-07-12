import type { ReactNode } from "react";
import AynaYuzu from "@/components/AynaYuzu";

// UX #4 — Tutarlı AYNA varlığı. AYNA'nın konuştuğu HER yerde aynı görsel dil:
// karakter avatarı + altın aksanlı konuşma balonu. Görev nedeni, koç, fısıltı,
// rapor… hepsi aynı "varlık" hissini taşısın.
// UX paketi #7: 👁 emoji avatarı MASKOTLA değiştirildi — bu bileşeni kullanan
// her yüzey (görev nedeni, koç kartları, fısıltılar) otomatik karakter kazandı.
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
      {/* AYNA'nın yüzü — marka işareti (Faz 1 maskotu) */}
      <AynaYuzu durum="konusuyor" boyut={36} hareketli={false} sinif="mt-0.5 shrink-0" />
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
