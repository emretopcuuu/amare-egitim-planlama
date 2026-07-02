import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// KUTSAL ALAN / HAZIRLIK onayı — KVKK rızasını kayıtla al. consent_at yalnız
// boşsa yazılır (idempotent). Rıza artık en başta alınıyor; Pusula'daki eski
// rıza adımı bu değeri zaten dolu bulur (çift onay istemez).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { error } = await db
    .from("participants")
    .update({ consent_at: new Date().toISOString() })
    .eq("id", session.sub)
    .is("consent_at", null);
  if (error) return Response.json({ hata: "Kaydedilemedi." }, { status: 500 });
  return Response.json({ ok: true });
}
