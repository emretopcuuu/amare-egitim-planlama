import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import KimsinBantClient from "./KimsinBantClient";

// Onboarding/Pusula/Kamp ekranlarında "kimin sayfasındayız" göstergesi.
// Üst-orta küçük bir bant; isim + (varsa) avatar + YARDIM (çipe dokununca açılır).
// Aday akışında oryantasyon kaybını önler. Veri sunucuda; etkileşim istemcide.
export default async function KimsinBant() {
  const session = await getSession();
  if (!session || session.rol !== "participant") return null;

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("full_name, profil_foto_path")
    .eq("id", session.sub)
    .maybeSingle();

  if (!kisi?.full_name) return null;

  let avatarUrl: string | null = null;
  if (kisi.profil_foto_path) {
    const { data } = await db.storage
      .from("sesler")
      .createSignedUrl(kisi.profil_foto_path, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  const ilkHarf = kisi.full_name.trim().charAt(0).toUpperCase();

  return <KimsinBantClient ad={kisi.full_name} avatarUrl={avatarUrl} ilkHarf={ilkHarf} />;
}
