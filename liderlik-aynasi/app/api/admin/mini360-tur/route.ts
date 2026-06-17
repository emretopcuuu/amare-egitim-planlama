import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// GELİŞTİRME #9 (2.tur): Admin yeni Mini 360 turu başlatır (sayaç +1). Önceki
// turlar saklı kalır; herkes yeni turda yeniden puanlanır → algı trendi.
export async function POST() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const db = supabaseAdmin();
  const { data } = await db.from("settings").select("value").eq("key", "mini360_tur").maybeSingle();
  const yeni = Math.max(1, parseInt(data?.value ?? "1", 10) || 1) + 1;
  const { error } = await db
    .from("settings")
    .upsert({ key: "mini360_tur", value: String(yeni), updated_at: new Date().toISOString() });
  if (error) return Response.json({ hata: tr.admin.elmas.turHata }, { status: 500 });
  return Response.json({ ok: true, tur: yeni });
}
