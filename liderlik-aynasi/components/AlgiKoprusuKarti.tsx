import type { AlgiKoprusu } from "@/lib/algiKoprusu";
import { tr } from "@/lib/i18n/tr";

const t = tr.deney;

// ALGI KÖPRÜSÜ kartı — kamp boyunca AYNA'nın deneyini canlı hissettiren İKİNCİL
// kart. Görev + program birincil kalsın diye sade, küçük; kör nokta içeriği YOK.
// Yalnız soyut ilerleme + Gün 3 beklentisi.
export default function AlgiKoprusuKarti({ veri }: { veri: AlgiKoprusu }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-royal/25 bg-gradient-to-br from-royal/[0.12] to-midnight-card/50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden>🔬</span>
        <h2 className="text-sm font-semibold text-slate-100">{t.baslik}</h2>
        <span className="ml-auto flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wide text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          {t.canli}
        </span>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t.aciklama}</p>

      {/* Soyut köprü ilerlemesi — içerik yok, yalnız "kuruluyor" hissi */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[0.65rem] font-medium">
          <span className="text-royal-light">{t.kopru}</span>
          <span className="tabular-nums text-gold-light">%{veri.yuzde}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-royal to-gold transition-all duration-700"
            style={{ width: `${veri.yuzde}%` }}
          />
        </div>
      </div>

      {/* Hacim göstergeleri (içerik değil) */}
      <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem]">
        <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-slate-300">
          👁 {t.gozlem(veri.gozlemSayisi)}
        </span>
        {veri.gorevSayisi > 0 && (
          <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-slate-300">
            🤖 {t.gorev(veri.gorevSayisi)}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs font-medium text-gold-light/90">{t.beklenti}</p>
    </section>
  );
}
