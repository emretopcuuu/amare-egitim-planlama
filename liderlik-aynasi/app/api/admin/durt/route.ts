import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga, aktifOzellikler } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

// #9 Eksikleri tek dokunuşla dürt: açık dalgada kendini henüz puanlamamış
// katılımcılara "kendini puanla" hatırlatma push'u gönderir. Eksik listesi
// sunucuda taze hesaplanır (istemciye güvenilmez).
export async function POST() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const db = supabaseAdmin();
  const dalga = await acikDalga(db);
  if (!dalga) {
    return Response.json({ hata: tr.admin.durt.dalgaYok }, { status: 400 });
  }
  const ozellikler = await aktifOzellikler(db);

  const [{ data: kisiler }, { data: puanlar }] = await Promise.all([
    db.from("participants").select("id").eq("role", "participant"),
    db.from("ratings").select("rater_id, target_id").eq("wave", dalga.id),
  ]);

  // Öz-puan "tamam" = (rater == target) çifti tüm aktif özellikleri kapsıyor.
  const ozSayilari = new Map<string, number>();
  for (const p of puanlar ?? []) {
    if (p.rater_id === p.target_id) {
      ozSayilari.set(p.rater_id, (ozSayilari.get(p.rater_id) ?? 0) + 1);
    }
  }
  const eksikler = (kisiler ?? []).filter(
    (k) => (ozSayilari.get(k.id) ?? 0) < ozellikler.length
  );

  await Promise.all(
    eksikler.map((k) =>
      katilimciyaBildir(
        db,
        k.id,
        tr.admin.durt.bildirimBaslik,
        tr.admin.durt.bildirimGovde,
        `/degerlendir/${k.id}`
      )
    )
  );

  return Response.json({ gonderildi: eksikler.length });
}
