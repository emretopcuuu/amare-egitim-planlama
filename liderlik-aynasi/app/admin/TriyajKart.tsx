import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.triyaj;

// UX #1 + #17: Komuta triyajı — "şu an ilgilen". Funnel aşamasına göre içerik:
//  • Kamp ÖNCESİ (aşama ≤ 2): hazırlık hunisinde TAKILANLAR (ses kaydetti ama
//    pusulasını kurmadı) — bir dürtme yeniden yola sokar.
//  • Kamp CANLI ve sonrası: en çok SESSİZLEŞEN (churn) adaylar.
// Her satır doğrudan 360° kartına linkli. Kendi verisini çeker.
export default async function TriyajKart({ aktifAsama = 3 }: { aktifAsama?: number }) {
  const db = supabaseAdmin();

  if (aktifAsama <= 2) {
    // Hazırlıkta takılanlar: ses ritüelini yapmış (başlamış) ama pusulasını
    // tamamlamamış kişiler — funnel'ın en kritik düşüş noktası.
    const [{ data: sesli }, { data: pusulali }] = await Promise.all([
      db.from("voice_profiles").select("participant_id"),
      db.from("pusula").select("participant_id").not("tamamlandi_at", "is", null),
    ]);
    const bitiren = new Set((pusulali ?? []).map((p) => p.participant_id));
    const takilanIds = (sesli ?? [])
      .map((s) => s.participant_id)
      .filter((id) => !bitiren.has(id));
    if (takilanIds.length === 0) return null;

    const { data: kisiler } = await db
      .from("participants")
      .select("id, full_name, team")
      .in("id", takilanIds.slice(0, 50))
      .eq("role", "participant")
      .limit(5);
    const liste = kisiler ?? [];
    if (liste.length === 0) return null;

    return (
      <Kutu baslik={t.hazirlikBaslik} aciklama={t.hazirlikAciklama}>
        {liste.map((k) => (
          <Satir
            key={k.id}
            id={k.id}
            ad={k.full_name}
            takim={k.team}
            sag={t.pusulaEksik}
          />
        ))}
      </Kutu>
    );
  }

  // Kamp canlı/sonrası: sessizleşen (churn) adaylar.
  const { data } = await db
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
    <Kutu baslik={t.baslik} aciklama={t.aciklama}>
      {kayanlar.map((k) => {
        const saat = Math.round((Date.now() - new Date(k.updated_at).getTime()) / 3_600_000);
        return (
          <Satir
            key={k.participant_id}
            id={k.participant_id}
            ad={k.kisi.full_name}
            takim={k.kisi.team}
            sag={t.saatOnce(saat)}
          />
        );
      })}
    </Kutu>
  );
}

function Kutu({
  baslik,
  aciklama,
  children,
}: {
  baslik: string;
  aciklama: string;
  children: React.ReactNode;
}) {
  return (
    <section className="kart-3d rounded-2xl bg-red-500/[0.06] p-5 shadow-xl ring-1 ring-red-400/30 backdrop-blur">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">🚨 {baslik}</h2>
      <p className="mt-0.5 text-xs text-slate-400">{aciklama}</p>
      <ul className="mt-3 divide-y divide-white/5">{children}</ul>
    </section>
  );
}

function Satir({
  id,
  ad,
  takim,
  sag,
}: {
  id: string;
  ad: string;
  takim: string | null;
  sag: string;
}) {
  return (
    <li>
      <Link
        href={`/admin/kisi/${id}`}
        className="flex items-center justify-between gap-2 py-2 transition-colors hover:text-gold-light"
      >
        <span className="min-w-0 truncate text-sm font-medium text-slate-100">
          {ad}
          {takim && <span className="ml-2 text-xs text-slate-500">{takim}</span>}
        </span>
        <span className="shrink-0 text-xs text-red-300/90">{sag} →</span>
      </Link>
    </li>
  );
}
