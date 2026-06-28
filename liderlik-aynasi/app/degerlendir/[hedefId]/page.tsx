import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  acikDalga,
  aktifOzellikler,
  ozPuanTamamMi,
} from "@/lib/degerlendirme";
import { kampKilitliMi } from "@/lib/pusula";
import PuanlamaFormu from "./PuanlamaFormu";

export const metadata = { title: "Puanla — Liderlik Aynası" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PuanlaPage({
  params,
}: {
  params: Promise<{ hedefId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const { hedefId } = await params;
  if (!UUID_RE.test(hedefId)) notFound();

  const db = supabaseAdmin();
  const dalga = await acikDalga(db);
  const ozellikler = await aktifOzellikler(db);
  const kendisi = hedefId === session.sub;

  // Hangi değerlendirmeye yazılıyor: açıksa o; kapalıysa kamp öncesi (FAZ 0)
  // yalnız öz-puan Kamp Değerlendirmesine (id=1). Başkasını puanlama kampta açılır.
  let dalgaId: number;
  let dalgaAdi: string;
  if (dalga) {
    dalgaId = dalga.id;
    dalgaAdi = dalga.name;
    // Öz-puan kapısı sunucuda da uygulanır: URL'i bilen biri kapıyı atlayamaz.
    if (!kendisi && !(await ozPuanTamamMi(db, session.sub, dalga.id, ozellikler.length))) {
      redirect("/degerlendir");
    }
  } else if (kendisi && (await kampKilitliMi(db, session.sub))) {
    dalgaId = 1;
    const { data: d1 } = await db.from("waves").select("name").eq("id", 1).maybeSingle();
    dalgaAdi = d1?.name ?? "İlk İzlenim";
  } else {
    redirect("/degerlendir");
  }

  const { data: hedef, error } = await db
    .from("participants")
    .select("id, full_name, team, profil_foto_path")
    .eq("id", hedefId)
    .eq("role", "participant")
    .maybeSingle();
  if (error) throw error;
  if (!hedef) notFound();

  let hedefFotoUrl: string | null = null;
  if (hedef.profil_foto_path) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(hedef.profil_foto_path, 3600);
    hedefFotoUrl = imzali?.signedUrl ?? null;
  }

  const { data: mevcut, error: mevcutHata } = await db
    .from("ratings")
    .select("trait_id, score, comment")
    .eq("rater_id", session.sub)
    .eq("target_id", hedefId)
    .eq("wave", dalgaId);
  if (mevcutHata) throw mevcutHata;

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      {/* Okunabilirlik: içerik açık arka plan (orman) üstünde opak kart içinde.
          Üst pill boşluğu KimsinBant'taki global spacer ile halledilir. */}
      <div className="mx-auto my-auto w-full max-w-md px-4 pb-6 pt-5">
      <div className="koyu-alan rounded-3xl bg-midnight-card/80 p-5 shadow-xl ring-1 ring-white/10 backdrop-blur-md">
      <PuanlamaFormu
        dalgaId={dalgaId}
        dalgaAdi={dalgaAdi}
        hedefId={hedef.id}
        hedefAd={hedef.full_name}
        hedefTakim={hedef.team}
        hedefFotoUrl={hedefFotoUrl}
        kendisi={kendisi}
        ozellikler={ozellikler}
        mevcut={mevcut.map((m) => ({
          ozellikId: m.trait_id,
          puan: m.score,
          yorum: m.comment ?? "",
        }))}
      />
      </div>
      </div>
    </main>
  );
}
