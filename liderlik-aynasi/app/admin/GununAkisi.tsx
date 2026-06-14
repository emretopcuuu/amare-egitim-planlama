import Link from "next/link";
import { kampGunu } from "@/lib/kampProgrami";
import { KAMP_ADMIN_AKISI } from "@/lib/kampAdminAkisi";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.akis;

// #2 Bugünün Akışı: kamp günündeyse o günün admin adımlarını sıralı checklist
// olarak gösterir. Kamp günü değilse (öncesi/sonrası) hiç görünmez.
export default function GununAkisi({ bugun }: { bugun: string }) {
  const gun = kampGunu(bugun);
  if (!gun) return null;
  const adimlar = KAMP_ADMIN_AKISI[gun];

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
      <h2 className="text-lg font-semibold text-gold-light">
        {t.baslik}
        <span className="ml-2 text-sm font-normal text-slate-400">· Gün {gun}/3</span>
      </h2>
      <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      <ol className="mt-4 space-y-2">
        {adimlar.map((a, i) => (
          <li key={i}>
            <Link
              href={a.href}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.07]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-royal/40 text-sm font-bold text-gold-light">
                {i + 1}
              </span>
              {a.saat && (
                <span className="shrink-0 rounded-md bg-gold/15 px-2 py-0.5 font-mono text-xs font-bold text-gold-light">
                  {a.saat}
                </span>
              )}
              <span className="text-sm font-medium text-slate-100">{a.etiket}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
