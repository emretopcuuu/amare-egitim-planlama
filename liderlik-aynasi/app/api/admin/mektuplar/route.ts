import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { mektupGetirVeyaUret } from "@/lib/mektup";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// Toplu mektup üretimi: her çağrı eksik mektubu olan BİR katılımcı için
// üretir ve kalan sayıyı döner. İstemci kalan 0 olana dek döngüyle çağırır —
// böylece tek istek fonksiyon süre sınırına takılmaz, ilerleme de görünür.
export async function POST() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  const db = supabaseAdmin();
  const [{ data: katilimcilar, error }, { data: mektuplar, error: mektupHatasi }] =
    await Promise.all([
      db.from("participants").select("id, full_name").eq("role", "participant"),
      db.from("mirror_letters").select("participant_id"),
    ]);
  if (error || mektupHatasi) {
    return Response.json({ hata: tr.admin.aynaAni.mektupHata }, { status: 500 });
  }

  const hazirlar = new Set(mektuplar.map((m) => m.participant_id));
  const eksikler = katilimcilar.filter((k) => !hazirlar.has(k.id));

  if (eksikler.length === 0) {
    return Response.json({ uretilen: null, kalan: 0, toplam: katilimcilar.length });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { hata: tr.admin.aynaAni.mektupAnahtarYok },
      { status: 503 }
    );
  }

  const sirada = eksikler[0];
  const sonuc = await mektupGetirVeyaUret(db, sirada.id, sirada.full_name);
  if (sonuc.durum !== "hazir") {
    return Response.json({ hata: tr.admin.aynaAni.mektupHata }, { status: 503 });
  }

  return Response.json({
    uretilen: sirada.full_name,
    kalan: eksikler.length - 1,
    toplam: katilimcilar.length,
  });
}
