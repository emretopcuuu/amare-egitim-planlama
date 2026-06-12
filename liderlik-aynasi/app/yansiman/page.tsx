import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import YansimaOynatici from "./YansimaOynatici";

export const metadata = { title: "Yansıman — Liderlik Aynası" };

// "Aynan seni gördü": ritüel fotoğrafından üretilen kişisel yansıma videosu.
// Video yoksa sessizce ana sayfaya döner (push linkine geç tıklayan vs.).
export default async function YansimanPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: profil } = await db
    .from("voice_profiles")
    .select("video_path")
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!profil?.video_path) redirect("/");

  const { data: imzali } = await db.storage
    .from("sesler")
    .createSignedUrl(profil.video_path, 3600);
  if (!imzali) redirect("/");

  return <YansimaOynatici url={imzali.signedUrl} />;
}
