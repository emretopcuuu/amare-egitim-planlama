import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;

// KVKK: silme talebini yerine getir. Katılımcı satırını siler (puan/görev/ses
// profili/kudos FK cascade ile gider) + depolamadaki kişisel dosyaları temizler.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { id?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.kvkk.hata }, { status: 400 });
  }
  if (typeof govde.id !== "string") {
    return Response.json({ hata: tr.kvkk.hata }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Depolamadaki kişisel klasörü en iyi çabayla temizle (sub/ altındaki dosyalar)
  try {
    const { data: dosyalar } = await db.storage.from("sesler").list(govde.id);
    if (dosyalar && dosyalar.length > 0) {
      await db.storage
        .from("sesler")
        .remove(dosyalar.map((d) => `${govde.id as string}/${d.name}`));
    }
  } catch {
    // depolama temizliği başarısız olsa da DB silmesi devam eder
  }

  // Katılımcı satırı — ilişkili tüm veriler FK cascade ile gider
  const { error } = await db.from("participants").delete().eq("id", govde.id);
  if (error) {
    return Response.json({ hata: tr.kvkk.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}
