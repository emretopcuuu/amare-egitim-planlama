import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// [1.4] Canlı Yolculuk sahne kişisi yönetimi:
// islem 'onay' → sahne_onay aç/kapat; 'sec' → sahne_yolculuk_kisi ayarını yaz
// (yalnız sahne_onay=true kişi seçilebilir); 'temizle' → seçimi kaldır.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as
    | { islem?: string; id?: string; deger?: boolean }
    | null;
  const db = supabaseAdmin();

  if (body?.islem === "onay" && body.id) {
    await db.from("participants").update({ sahne_onay: !!body.deger }).eq("id", body.id);
    // Onay kaldırıldıysa ve seçili kişiyse seçimi de temizle.
    if (!body.deger) {
      const { data: sec } = await db.from("settings").select("value").eq("key", "sahne_yolculuk_kisi").maybeSingle();
      if (sec?.value === body.id) await db.from("settings").upsert({ key: "sahne_yolculuk_kisi", value: "" });
    }
    return Response.json({ ok: true });
  }

  if (body?.islem === "sec" && body.id) {
    const { data: k } = await db.from("participants").select("sahne_onay").eq("id", body.id).maybeSingle();
    if (!k?.sahne_onay) return Response.json({ hata: "Onaysız kişi sahnede gösterilemez." }, { status: 409 });
    await db.from("settings").upsert({ key: "sahne_yolculuk_kisi", value: body.id });
    return Response.json({ ok: true });
  }

  if (body?.islem === "temizle") {
    await db.from("settings").upsert({ key: "sahne_yolculuk_kisi", value: "" });
    return Response.json({ ok: true });
  }

  return Response.json({ hata: tr.ortak.genelHata }, { status: 400 });
}
