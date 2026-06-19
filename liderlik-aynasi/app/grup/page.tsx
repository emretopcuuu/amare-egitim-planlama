import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import CumartesiGrupHud from "@/components/CumartesiGrupHud";

export const metadata = { title: "Grubunun Ödevi — Liderlik Aynası" };

const t = tr.grup;

// Katılımcı: kendi grubunun aktif ödev(ler)ini görür (grup-içi + grup-birlikte).
export default async function GrupSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("team")
    .eq("id", session.sub)
    .maybeSingle();

  let odevler: { tip: string; baslik: string; govde: string; hedef: string | null }[] = [];
  if (kisi?.team) {
    const { data } = await db
      .from("grup_odev")
      .select("tip, baslik, govde, hedef")
      .eq("takim", kisi.team)
      .eq("aktif", true)
      .order("created_at", { ascending: false });
    odevler = data ?? [];
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.baslik}</h1>
        {kisi?.team && <p className="mt-1 text-sm text-slate-400">{t.altBaslik(kisi.team)}</p>}
      </header>

      {/* Slice 5 — Cumartesi grup HUD: grubunun gün 2 akışı (canlı now/next). */}
      <CumartesiGrupHud takim={kisi?.team ?? null} />

      {!kisi?.team ? (
        <p className="text-sm text-slate-400">{t.takimsiz}</p>
      ) : odevler.length === 0 ? (
        <div className="kart-cam rounded-3xl p-8 text-center">
          <p className="text-5xl" aria-hidden>👥</p>
          <p className="mt-4 text-base leading-relaxed text-slate-300">{t.yok}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {odevler.map((o) => (
            <section key={o.tip} className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-gold/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">
                {o.tip === "grup_ici" ? t.grupIci : t.grupBirlikte}
                {o.hedef ? ` · ${t.hedefEtiket}: ${o.hedef}` : ""}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-100">{o.baslik}</h2>
              <p className="mt-2 text-base leading-relaxed text-slate-300">{o.govde}</p>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
