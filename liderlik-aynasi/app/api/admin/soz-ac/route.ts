import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

// KAMP SÖZÜNÜ AÇ/KAPAT (FAZ 1 — tek söz). Admin sahneden basar: `soz_v2_acik`
// çevrilir → katılımcıların ana ekranı "90 Günlük Oyun Planını Kur" akışına döner.
// Açılışta herkese push + gelen kutusu bildirimi düşer (sahnede "yenileyin"
// derken telefonu kapalı/uzakta olan da yakalanır).
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  let govde: { acik?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.kapanisSoz.hata }, { status: 400 });
  }
  if (typeof govde.acik !== "boolean") {
    return Response.json({ hata: tr.kapanisSoz.hata }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db.from("settings").upsert({
    key: "soz_v2_acik",
    value: String(govde.acik),
    updated_at: new Date().toISOString(),
  });
  if (error) return Response.json({ hata: tr.kapanisSoz.hata }, { status: 500 });

  if (govde.acik === true) {
    // Sahne anı: senkron düşüş için push + gelen kutusu. Best-effort — düşerse
    // ayar yine açık, kişiler yenileyince kartı görür.
    try {
      await herkeseBildir(
        db,
        "🤝 Söz zamanı",
        "90 Günlük Oyun Planını kur ve sözünü ver. Ekranını aç — sıra sende.",
        "/"
      );
    } catch {
      // yut
    }
  }
  return Response.json({ ok: true });
}
