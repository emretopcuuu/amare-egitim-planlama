import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kombinasyonAyarla } from "@/lib/oyunKapasite";

// Admin: bir oyun ikilisini (ör. "atv+hazine_avi") kapat/aç. Gruplar dolduğunda
// yeni katılımcıların o ikiliyi seçmesini engeller — zaten atanmış kişilere
// dokunmaz. Diğer ikililere etki etmez.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: "Yetkisiz" }, { status: 403 });
  }
  const g = (await req.json().catch(() => ({}))) as { anahtar?: string; kapali?: boolean };
  if (typeof g.anahtar !== "string" || !g.anahtar.includes("+")) {
    return Response.json({ hata: "Geçersiz kombinasyon" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const guncel = await kombinasyonAyarla(db, g.anahtar, !!g.kapali);
  return Response.json({ ok: true, kapaliKombolar: guncel });
}
