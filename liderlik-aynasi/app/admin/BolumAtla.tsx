import { tr } from "@/lib/i18n/tr";

const t = tr.admin.ux.atla;

// #7 Panel içi bölüm atlama: uzun panelde yapışkan bir mini "içindekiler".
// Native anchor (#id) ile zıplar; hedef bölümlerde scroll-mt ile yapışkan nav'ın
// altında kalmaz. KVKK gibi koşullu bölümler yalnız varsa listeye girer.
export default function BolumAtla({ bolumler }: { bolumler: { id: string; etiket: string }[] }) {
  return (
    <nav
      aria-label={t.baslik}
      className="scrollbar-gizle sticky top-[3.25rem] z-20 -mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-royal/20 bg-midnight/85 px-1 py-1.5 backdrop-blur"
    >
      {bolumler.map((b) => (
        <a
          key={b.id}
          href={`#${b.id}`}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-royal/25 hover:text-gold-light"
        >
          {b.etiket}
        </a>
      ))}
    </nav>
  );
}
