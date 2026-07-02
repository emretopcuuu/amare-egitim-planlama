import { supabaseAdmin } from "@/lib/supabase/server";
import { KARIYER_ETIKET, KARIYER_SECENEKLER } from "@/lib/persona";

export const metadata = { title: "PD2026 — Kolektif Taahhüt" };
export const revalidate = 20;

// [1.3] PD2026 KOLEKTİF TAAHHÜT EKRANI — Gün 3 sahne slaytı. Hedef tablosundan
// salon toplamı: kimin hangi rütbeyi hedeflediği İSİMSİZ, yalnız agregalar.
// (/ekran public — bu sayfa da yalnız sayı/dağılım döndürür, kimlik taşımaz.)
export default async function Pd2026Page() {
  const db = supabaseAdmin();
  const { data: hedefler } = await db.from("hedef").select("hedef_rutbe, sure_ay");

  const dagilim = new Map<string, number>();
  for (const h of hedefler ?? []) {
    if (!h.hedef_rutbe) continue;
    dagilim.set(h.hedef_rutbe, (dagilim.get(h.hedef_rutbe) ?? 0) + 1);
  }
  const toplamHedef = [...dagilim.values()].reduce((a, b) => a + b, 0);
  // Diamond ve üzeri (rank ≥ 4) toplamı — sahnenin vurucu cümlesi.
  const diamondUstu = [...dagilim.entries()]
    .filter(([r]) => (KARIYER_SECENEKLER.indexOf(r as (typeof KARIYER_SECENEKLER)[number]) + 1) >= 4)
    .reduce((a, [, n]) => a + n, 0);
  const execSayi = dagilim.get("exec_leader") ?? 0;
  const enBuyuk = Math.max(1, ...dagilim.values());
  const sirali = KARIYER_SECENEKLER.map((r) => ({ rutbe: r, ad: KARIYER_ETIKET[r], sayi: dagilim.get(r) ?? 0 })).filter(
    (d) => d.sayi > 0
  );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#050a16] p-10 text-center text-slate-100">
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-gold-light/70">PD2026 · Kolektif Taahhüt</p>
      {toplamHedef === 0 ? (
        <p className="mt-8 text-2xl text-slate-400">Hedefler girildikçe bu salon konuşacak.</p>
      ) : (
        <>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-tight text-gold-light sm:text-6xl">
            Bu salon 90 günde toplam{" "}
            <span className="text-gold">{diamondUstu}</span> yeni Diamond+
            {execSayi > 0 && (
              <>
                {" "}ve <span className="text-gold">{execSayi}</span> Executive
              </>
            )}{" "}
            hedefledi.
          </h1>
          <p className="mt-3 text-lg text-slate-400">{toplamHedef} kişi hedefini mühürledi</p>

          <div className="mt-10 w-full max-w-2xl space-y-3">
            {sirali.map((d) => (
              <div key={d.rutbe} className="flex items-center gap-4">
                <span className="w-44 shrink-0 text-right text-lg font-medium text-slate-200">{d.ad}</span>
                <div className="h-8 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-gold/40 to-gold pr-3 text-sm font-bold text-[#050a16] transition-all"
                    style={{ width: `${Math.max(8, (d.sayi / enBuyuk) * 100)}%` }}
                  >
                    {d.sayi}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
