import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;

// SAHNE KUMANDASI — host'un telefonundan canlı eylemler. Yalnız admin.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { eylem?: string; metin?: string };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.admin.sahne.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const simdi = new Date().toISOString();

  // 1) ANLIK DUYURU: herkesin telefonuna push + büyük ekranda 3 dk bant.
  // Push captive-portal'da ölebilir; ekran bandı güvenilir yedek kanaldır.
  if (govde.eylem === "duyuru") {
    const metin = (govde.metin ?? "").trim().slice(0, 200);
    if (metin.length < 2) {
      return Response.json({ hata: tr.admin.sahne.hata }, { status: 400 });
    }
    // Ekran bandı: "ts|metin" (metin iki nokta içerebilir diye boru ayraç)
    await db.from("settings").upsert({
      key: "sahne_duyuru",
      value: `${simdi}|${metin}`,
      updated_at: simdi,
    });
    await herkeseBildir(db, "📣 Duyuru", metin, "/");
    return Response.json({ ok: true });
  }

  // 2) ACİL DURDUR: AYNA'yı duraklat + açık tüm dalgaları kapat (tek dokunuş)
  if (govde.eylem === "acil-durdur") {
    await db
      .from("settings")
      .upsert({ key: "ayna_aktif", value: "false", updated_at: simdi });
    await db
      .from("waves")
      .update({ is_open: false, closed_at: simdi })
      .eq("is_open", true);
    return Response.json({ ok: true });
  }

  return Response.json({ hata: tr.admin.sahne.hata }, { status: 400 });
}
