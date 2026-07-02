import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

// FAZ 1 admin: Boşluk Anı penceresini aç/kapa + derinlik panosu.
// "Kim kanıtsız?" — organizatörün tek görevi: hiç kimse Boşluk Anı'na
// demolisyon-kalitesinde kanıt olmadan ulaşmasın (içi boş an = felaket).
const KANIT_ESIK = 3;

export async function GET() {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const db = supabaseAdmin();
  const [parts, rcmt, mcmt, kud, bos, ayar, kanitAyar] = await Promise.all([
    db.from("participants").select("id").eq("role", "participant"),
    db.from("ratings").select("target_id").eq("is_hidden", false).not("comment", "is", null),
    db.from("missions").select("participant_id").not("ai_comment", "is", null),
    db.from("kudos").select("to_id").eq("is_hidden", false),
    db.from("bosluk_ani").select("participant_id").not("yeni_cumle", "is", null),
    db.from("settings").select("value").eq("key", "bosluk_acik").maybeSingle(),
    db.from("settings").select("value").eq("key", "kanit_garantisi_acik").maybeSingle(),
  ]);

  const say = new Map<string, number>();
  const ekle = (id: string) => say.set(id, (say.get(id) ?? 0) + 1);
  (rcmt.data ?? []).forEach((r) => ekle(r.target_id));
  (mcmt.data ?? []).forEach((m) => ekle(m.participant_id));
  (kud.data ?? []).forEach((k) => ekle(k.to_id));

  const ids = (parts.data ?? []).map((p) => p.id);
  const kanitsiz = ids.filter((id) => (say.get(id) ?? 0) < KANIT_ESIK).length;

  return NextResponse.json({
    acik: ayar.data?.value === "true",
    kanitGarantisi: kanitAyar.data?.value === "true",
    toplam: ids.length,
    tamam: (bos.data ?? []).length,
    kanitsiz,
  });
}

export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const db = supabaseAdmin();

  // Kanıt Garantisi bayrağı (varsayılan kapalı): açıkken tik Gün 2 akşamı (21:00)
  // kanıtsızları tespit edip akranlara gözlem görevi verir.
  if (typeof body?.kanitGarantisi === "boolean") {
    const { error } = await db.from("settings").upsert(
      { key: "kanit_garantisi_acik", value: body.kanitGarantisi ? "true" : "false", updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
    await yazAuditLog(db, session.sub, body.kanitGarantisi ? "kanit_garantisi_acildi" : "kanit_garantisi_kapatildi", {}, req);
    return NextResponse.json({ tamam: true });
  }

  if (typeof body?.acik !== "boolean") {
    return NextResponse.json({ hata: "Geçersiz" }, { status: 400 });
  }
  const { error } = await db.from("settings").upsert(
    { key: "bosluk_acik", value: body.acik ? "true" : "false", updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
  await yazAuditLog(db, session.sub, body.acik ? "bosluk_acildi" : "bosluk_kapatildi", {}, req);
  return NextResponse.json({ tamam: true });
}
