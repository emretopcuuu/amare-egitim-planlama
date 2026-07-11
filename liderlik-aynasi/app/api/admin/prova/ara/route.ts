import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";

// Prova için TEK katılımcı arama — GÜVENLİK KİLİDİNİN UI tarafı (bkz.
// lib/prova.ts, lib/tik.ts). Yalnızca admin; isimden arar, en fazla 8 sonuç.
export async function GET(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: "Yetkisiz" }, { status: 403 });
  }
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ sonuclar: [] });

  const db = supabaseAdmin();
  const { data } = await db
    .from("participants")
    .select("id, full_name, team")
    .eq("role", "participant")
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(8);

  return Response.json({ sonuclar: data ?? [] });
}
