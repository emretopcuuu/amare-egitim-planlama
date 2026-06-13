import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Kodunu kaybedeni isimle bul: kayıt masasında görevli, kişinin giriş kodunu
// hızlıca bulur. Yalnız admin (kodlar gizli kalmalı).
export async function GET(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const ad = (new URL(req.url).searchParams.get("ad") ?? "").trim();
  if (ad.length < 2) return Response.json({ sonuclar: [] });

  // ilike enjeksiyonuna karşı joker karakterleri temizle
  const temiz = ad.replace(/[%_]/g, " ");
  const { data } = await supabaseAdmin()
    .from("participants")
    .select("full_name, team, login_code")
    .eq("role", "participant")
    .ilike("full_name", `%${temiz}%`)
    .order("full_name")
    .limit(8);

  return Response.json({
    sonuclar: (data ?? []).map((k) => ({
      ad: k.full_name,
      takim: k.team,
      kod: k.login_code,
    })),
  });
}
