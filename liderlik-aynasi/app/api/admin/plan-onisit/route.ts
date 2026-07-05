import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { planOnIsit } from "@/lib/oyunPlani";
import { tr } from "@/lib/i18n/tr";

// PLAN ÖN-ISITMA — admin sahne öncesi eksik planları batch batch üretir (her
// çağrıda en fazla 4, timeout güvenliği). Kalan atölyede kişi girince üretilir.
export async function POST() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const sonuc = await planOnIsit(supabaseAdmin(), 4);
  return Response.json({ ok: true, ...sonuc });
}
