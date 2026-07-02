import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// AYNA SESİ SEÇİMİ — kişinin erkek/kadın tercihini kaydeder. Onboarding'de
// zorunlu geçiş (ayna_ses_secildi_at ilk kez yazılır); ayarlar çekmecesinden
// istediği an tekrar çağrılıp tercihi değiştirebilir (idempotent upsert).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const ses = body?.ses;
  if (ses !== "erkek" && ses !== "kadin") {
    return Response.json({ hata: "Geçersiz seçim." }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db
    .from("participants")
    .update({ ayna_ses: ses, ayna_ses_secildi_at: new Date().toISOString() })
    .eq("id", session.sub);
  if (error) return Response.json({ hata: "Kaydedilemedi." }, { status: 500 });
  return Response.json({ ok: true });
}
