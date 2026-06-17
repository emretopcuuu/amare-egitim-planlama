import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.triyaj;

// UX #1 (2.tur): Komuta triyajı — "şu an ilgilen". En çok sessizleşmiş (dürtülmüş)
// adayları, doğrudan 360° kartına linkli gösterir. Kendi verisini çeker.
export default async function TriyajKart() {
  const { data } = await supabaseAdmin()
    .from("churn_radar")
    .select("participant_id, updated_at, kisi:participants!churn_radar_participant_id_fkey(full_name, team)")
    .not("nudged_at", "is", null)
    .order("updated_at", { ascending: true })
    .limit(5);

  const kayanlar = (data ?? []).filter((k) => k.kisi) as {
    participant_id: string;
    updated_at: string;
    kisi: { full_name: string; team: string | null };
  }[];
  if (kayanlar.length === 0) return null;

  return (
    <section className="kart-3d rounded-2xl bg-red-500/[0.06] p-5 shadow-xl ring-1 ring-red-400/30 backdrop-blur">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">🚨 {t.baslik}</h2>
      <p className="mt-0.5 text-xs text-slate-400">{t.aciklama}</p>
      <ul className="mt-3 divide-y divide-white/5">
        {kayanlar.map((k) => {
          const saat = Math.round((Date.now() - new Date(k.updated_at).getTime()) / 3_600_000);
          return (
            <li key={k.participant_id}>
              <Link
                href={`/admin/kisi/${k.participant_id}`}
                className="flex items-center justify-between gap-2 py-2 transition-colors hover:text-gold-light"
              >
                <span className="min-w-0 truncate text-sm font-medium text-slate-100">
                  {k.kisi.full_name}
                  {k.kisi.team && <span className="ml-2 text-xs text-slate-500">{k.kisi.team}</span>}
                </span>
                <span className="shrink-0 text-xs text-red-300/90">{t.saatOnce(saat)} →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
