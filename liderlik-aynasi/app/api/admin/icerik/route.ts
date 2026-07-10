import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;

// GELİŞTİRME #10 (2.tur): İçerik Stüdyosu. Admin, koda dokunmadan kampı uyarlar.
// Yalnız beyaz-listedeki anahtarlar düzenlenebilir; değerler settings'e yazılır
// ve AYNA üretimine canlı yansır.
const DUZENLENEBILIR = new Set(["ayna_ek_ton", "gunun_temasi", "gunun_cumlesi", "ders_kavrami"]);

export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const anahtar = typeof body?.anahtar === "string" ? body.anahtar : "";
  const deger = typeof body?.deger === "string" ? body.deger.slice(0, 600) : "";
  if (!DUZENLENEBILIR.has(anahtar)) {
    return Response.json({ hata: tr.admin.icerik.hata }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from("settings")
    .upsert({ key: anahtar, value: deger, updated_at: new Date().toISOString() });
  if (error) return Response.json({ hata: tr.admin.icerik.hata }, { status: 500 });
  return Response.json({ ok: true });
}
