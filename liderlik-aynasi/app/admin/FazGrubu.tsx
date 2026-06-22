import type { ReactNode } from "react";
import { tr } from "@/lib/i18n/tr";

const f = tr.admin.funnel;

// Tehlike bölgesindeki kritik kontroller, ait oldukları funnel fazına göre
// katlanır gruplara ayrılır. Varsayılan: yalnız o anki fazın grubu AÇIK; gerisi
// katlı. Operatör 9 kontrol kartıyla aynı anda boğulmaz — "şimdi neredeysem o
// anahtarlar önümde" mantığı. Native <details> (JS'siz, erişilebilir); kapalı
// grubun içindeki çapaya atlanırsa CapaAcici onu açar.
export default function FazGrubu({
  no,
  ad,
  aktif = false,
  varsayilanAcik,
  children,
}: {
  no?: number;
  ad: string;
  aktif?: boolean; // bu grup şu anki funnel fazı mı (altın vurgu + "şu an")
  varsayilanAcik: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={varsayilanAcik}
      className={`group/faz rounded-xl border [&[open]>summary_.fok]:rotate-90 ${
        aktif
          ? "border-gold/40 bg-gold/[0.04]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        {no != null && (
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] ${
              aktif ? "bg-gold text-[#1a1206]" : "bg-white/10 text-slate-400"
            }`}
          >
            {no}
          </span>
        )}
        <span
          className={`text-[0.7rem] font-bold uppercase tracking-wide ${
            aktif ? "text-gold-light" : "text-slate-400"
          }`}
        >
          {ad}
        </span>
        {aktif && (
          <span className="text-[0.7rem] font-semibold text-gold-light">• {f.simdi}</span>
        )}
        {!varsayilanAcik && (
          <span className="text-[0.65rem] font-medium text-slate-500 group-open/faz:hidden">
            {tr.admin.tehlike.grupKapaliIpucu}
          </span>
        )}
        <span
          className="fok ml-auto shrink-0 text-slate-500 transition-transform duration-200"
          aria-hidden
        >
          ▶
        </span>
      </summary>
      <div className="space-y-4 px-3 pb-3">{children}</div>
    </details>
  );
}
