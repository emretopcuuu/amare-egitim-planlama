// #4 — Rozet/madalya görsel sistemi. Düz emoji etiketi yerine ışıltılı, dairesel
// bir madalya: altın halka + iç parıltı + ikon + alt etiket. Kazanım hissi.
export default function Rozet({ ikon, ad }: { ikon: string; ad: string }) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 via-gold/10 to-royal/20 ring-1 ring-gold/45 shadow-[0_4px_18px_-4px_rgba(212,175,55,0.35)]">
        {/* İç ışıltı halkası */}
        <span className="absolute inset-1 rounded-full ring-1 ring-white/10" aria-hidden />
        <span className="text-2xl drop-shadow" aria-hidden>
          {ikon}
        </span>
      </div>
      <span className="mt-1.5 text-xs font-medium leading-tight text-slate-300">{ad}</span>
    </div>
  );
}
