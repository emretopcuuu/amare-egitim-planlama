import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Kayıt masası kiosk'u için canlı sayaç: kaç kişi kayıtlı, kaçı uygulamaya
// girip yansıma ritüeline başladı (voice_profiles satırı = katıldı sayılır).
export async function GET() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const db = supabaseAdmin();
  const [{ count: toplam }, { count: katildi }] = await Promise.all([
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant"),
    db.from("voice_profiles").select("participant_id", { count: "exact", head: true }),
  ]);
  return Response.json({ toplam: toplam ?? 0, katildi: katildi ?? 0 });
}
