import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

const f = tr.admin.funnel;

// FUNNEL OMURGASI — panelin tepesinde kampın 5 aşamasını tek şeritte gösterir:
// Hazırlık → Katılım → Kamp Canlı → Final → Sonrası. Aktif aşama vurgulu;
// öncekiler "tamam", sonrakiler "sırada". Her aşama, o aşamanın yönetildiği
// yere (sayfa ya da panel bölümü) atlar. Operatör tüm süreci buradan sürer.
const ASAMALAR: { no: number; anahtar: keyof typeof f.asamalar; ikon: string; href: string }[] = [
  { no: 1, anahtar: "hazirlik", ikon: "🧰", href: "/admin/kurulum" },
  { no: 2, anahtar: "katilim", ikon: "🎯", href: "#fazsifir" },
  { no: 3, anahtar: "canli", ikon: "🎛", href: "#ilerleme" },
  { no: 4, anahtar: "final", ikon: "🪞", href: "#muhur" },
  { no: 5, anahtar: "sonrasi", ikon: "📦", href: "#araclar" },
];

export default function FunnelOmurga({ aktif }: { aktif: number }) {
  return (
    <section aria-label={f.baslik} className="rounded-2xl bg-midnight-card/40 p-3 ring-1 ring-royal/20">
      <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
        {f.baslik}
      </p>
      <ol className="flex items-stretch gap-1.5 overflow-x-auto">
        {ASAMALAR.map((a, i) => {
          const durum = a.no < aktif ? "tamam" : a.no === aktif ? "simdi" : "bekliyor";
          const renk =
            durum === "simdi"
              ? "border-gold/60 bg-gold/10 text-gold-light"
              : durum === "tamam"
                ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300/90"
                : "border-white/10 bg-white/[0.02] text-slate-400";
          return (
            <li key={a.no} className="flex min-w-0 flex-1 items-center gap-1.5">
              <Link
                href={a.href}
                className={`flex min-w-[7rem] flex-1 flex-col rounded-xl border px-3 py-2 transition-colors hover:brightness-125 ${renk}`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span aria-hidden>{durum === "tamam" ? "✓" : a.ikon}</span>
                  <span className="truncate">{f.asamalar[a.anahtar]}</span>
                </span>
                <span className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-wide opacity-80">
                  {durum === "simdi" ? f.simdi : durum === "tamam" ? f.tamam : f.bekliyor}
                </span>
              </Link>
              {i < ASAMALAR.length - 1 && (
                <span className="shrink-0 text-slate-600" aria-hidden>
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
