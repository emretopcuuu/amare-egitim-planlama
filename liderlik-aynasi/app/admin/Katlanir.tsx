import type { ReactNode } from "react";

// #1 Progresif açığa çıkarma: faz dışı ikincil araçları tek bir katlanır
// bölümde toplar. Varsayılan KAPALI — panel açıldığında yalnız o anki işe
// odaklanılır; derine inmek isteyen "Tüm araçlar"ı açar. Native <details>
// kullanır (JS'siz, erişilebilir, sağlam).
export default function Katlanir({
  baslik,
  aciklama,
  ikon = "🧰",
  varsayilanAcik = false,
  children,
}: {
  baslik: string;
  aciklama?: string;
  ikon?: string;
  varsayilanAcik?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={varsayilanAcik}
      className="kart-3d group rounded-2xl bg-midnight-card/40 shadow-xl ring-1 ring-royal/20 backdrop-blur [&[open]>summary_.ok]:rotate-90"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <span className="text-xl" aria-hidden>
          {ikon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-slate-200">{baslik}</span>
          {aciklama && (
            <span className="mt-0.5 block text-sm text-slate-500">{aciklama}</span>
          )}
        </span>
        <span
          className="ok shrink-0 text-slate-500 transition-transform duration-200"
          aria-hidden
        >
          ▶
        </span>
      </summary>
      <div className="space-y-6 px-5 pb-5">{children}</div>
    </details>
  );
}
