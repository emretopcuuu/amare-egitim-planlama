import Link from "next/link";
import type { Uyari } from "@/lib/adminUyarilar";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "./Ipucu";

const STIL: Record<Uyari["tip"], string> = {
  uyari: "border-gold/40 bg-gold/10",
  bilgi: "border-royal-light/40 bg-royal/15",
};

// #8 Proaktif uyarı kartları: dikkat isteyen durumları admin'in önüne koyar.
// Boşsa hiç render etmez (gürültü yok).
export default function Uyarilar({ uyarilar }: { uyarilar: Uyari[] }) {
  if (uyarilar.length === 0) return null;
  return (
    <section className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {tr.admin.uyarilar.baslik}
        <Ipucu {...tr.admin.yardim.panelUyari} />
      </p>
      {uyarilar.map((u, i) => (
        <Link
          key={i}
          href={u.href}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:brightness-110 ${STIL[u.tip]}`}
        >
          <span className="text-xl" aria-hidden>
            {u.ikon}
          </span>
          <span className="text-sm font-medium text-slate-100">{u.mesaj}</span>
        </Link>
      ))}
    </section>
  );
}
