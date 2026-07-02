import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { halkaDurumu, HALKA_DILIM } from "@/lib/halka";

export const metadata = { title: "40 Gün Halkası — Liderlik Aynası" };
export const revalidate = 60;

// [4.1] 40 GÜN HALKASI — kamp sonrası 40 günün tek bakışta görünümü. Her aktif
// gün (bir görev tamamlanmış) halkadan bir dilim doldurur. Baskı yok: az dolu
// olan da "kaldığın yerden devam" diliyle karşılanır.
export default async function HalkaPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const d = await halkaDurumu(db, session.sub);

  // Halkayı 40 nokta olarak çemberde diz.
  const R = 130;
  const merkez = 150;
  const noktalar = Array.from({ length: HALKA_DILIM }, (_, i) => {
    const aci = (i / HALKA_DILIM) * 2 * Math.PI - Math.PI / 2; // tepeden başla
    const dolu = d.aktifGunler.includes(i + 1);
    return {
      cx: merkez + R * Math.cos(aci),
      cy: merkez + R * Math.sin(aci),
      dolu,
    };
  });

  const yuzde = Math.round((d.dolan / HALKA_DILIM) * 100);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-5 p-5">
        <header className="text-center">
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">🔵 40 Gün Halkası</h1>
          <p className="mt-1 text-sm text-slate-400">
            Kamptan sonraki 40 gün. Her adım attığın gün halkandan bir dilim dolar.
          </p>
        </header>

        <div className="relative mx-auto aspect-square w-full max-w-[300px]">
          <svg viewBox="0 0 300 300" className="h-full w-full">
            {noktalar.map((n, i) => (
              <circle
                key={i}
                cx={n.cx}
                cy={n.cy}
                r={n.dolu ? 7 : 4}
                className={n.dolu ? "fill-gold" : "fill-white/15"}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-5xl font-bold text-gold-light">{d.dolan}</span>
            <span className="text-sm text-slate-400">/ {HALKA_DILIM} dilim</span>
            <span className="mt-1 text-xs text-slate-500">%{yuzde} dolu</span>
          </div>
        </div>

        {d.seri >= 2 && (
          <p className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-3 text-center text-sm text-slate-200">
            🔥 En uzun serin: <span className="font-bold text-gold-light">{d.seri} gün</span> üst üste.
          </p>
        )}

        <p className="rounded-2xl border border-white/10 bg-midnight-card/50 p-4 text-center text-sm text-slate-300">
          {d.dolan === 0
            ? "Halkan seni bekliyor. Bugün tek bir adım at — ilk dilim dolsun."
            : d.dolan >= HALKA_DILIM
              ? "Halkan tamamlandı. 40 günü bir bütün olarak yaşadın — bu bir kimlik artık."
              : d.dolan >= 20
                ? "Yarıyı geçtin. Halkanın dolmasına az kaldı — ritmini koru."
                : "Güzel başladın. Kaçırdığın günler kayıp değil; kaldığın yerden devam et."}
        </p>
      </div>
    </main>
  );
}
