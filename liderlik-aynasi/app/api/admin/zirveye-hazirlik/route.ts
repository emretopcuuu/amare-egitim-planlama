import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hazirlikDurumu, birEksigiTamamla } from "@/lib/zirveHazirlik";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// [E1-a] ZİRVEYE HAZIRLIK — toplu ön-üretim. GET: canlı durum (N/29). POST: bir
// eksik varlığı üret (istemci kalan 0 olana dek döngüyle çağırır — tek istek süre
// sınırına takılmaz, ilerleme görünür). İdempotent: üretilmişi atlar.
export async function GET() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const durum = await hazirlikDurumu(supabaseAdmin());
  return Response.json(durum);
}

export async function POST() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ hata: tr.admin.aynaAni.mektupAnahtarYok }, { status: 503 });
  }
  const db = supabaseAdmin();
  const sonuc = await birEksigiTamamla(db);
  if (sonuc.yapilan === "hata") {
    return Response.json({ hata: tr.admin.aynaAni.mektupHata, kalan: sonuc.kalan }, { status: 503 });
  }
  const durum = await hazirlikDurumu(db);
  return Response.json({ sonuc, durum });
}
