import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// KVKK: katılımcı kendi verisinin silinmesini talep eder. Talep yöneticiye
// iletilir (deletion_requested_at). Asıl silme admin tarafından yapılır.
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const { error } = await supabaseAdmin()
    .from("participants")
    .update({ deletion_requested_at: new Date().toISOString() })
    .eq("id", session.sub)
    .is("deletion_requested_at", null);
  if (error) {
    return Response.json({ hata: tr.kvkk.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}
