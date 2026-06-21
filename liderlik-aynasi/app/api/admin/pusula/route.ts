import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

// FAZ 0 admin kontrolü: Pusula penceresini aç/kapa + oda QR kodunu ayarla +
// tamamlanma istatistiği. Pencere açıkken kampa girmemiş katılımcı /pusula'ya
// yönlenir; oda QR kodu kilidi açar.

export async function GET() {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const db = supabaseAdmin();
  const [{ data: ayarlar }, { count: tamam }, { count: toplam }] = await Promise.all([
    db.from("settings").select("key, value").in("key", ["pusula_acik", "kamp_kilit_kodu"]),
    db
      .from("pusula")
      .select("participant_id", { count: "exact", head: true })
      .not("tamamlandi_at", "is", null),
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant"),
  ]);
  const harita = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  return NextResponse.json({
    acik: harita.get("pusula_acik") === "true",
    kilitKodu: harita.get("kamp_kilit_kodu") ?? "",
    tamam: tamam ?? 0,
    toplam: toplam ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const db = supabaseAdmin();
  const simdi = new Date().toISOString();

  if (typeof body?.acik === "boolean") {
    const { error } = await db.from("settings").upsert(
      { key: "pusula_acik", value: body.acik ? "true" : "false", updated_at: simdi },
      { onConflict: "key" }
    );
    if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
    await yazAuditLog(
      db,
      session.sub,
      body.acik ? "pusula_acildi" : "pusula_kapatildi",
      {},
      req
    );
  }

  if (typeof body?.kilitKodu === "string") {
    const { error } = await db.from("settings").upsert(
      { key: "kamp_kilit_kodu", value: body.kilitKodu.trim().slice(0, 64), updated_at: simdi },
      { onConflict: "key" }
    );
    if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
    await yazAuditLog(db, session.sub, "kamp_kilit_kodu_ayarlandi", {}, req);
  }

  // #13 Toplu kampı aç — oda QR'ı çalışmazsa (oturum/domain) görevli kampa
  // gelmemiş HERKESİN mührünü tek seferde kaldırır. Geri-al için kilitliyi de döner.
  if (body?.topluAc === true) {
    const { data, error } = await db
      .from("participants")
      .update({ camp_unlocked_at: simdi })
      .eq("role", "participant")
      .is("camp_unlocked_at", null)
      .select("id");
    if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
    const acilan = (data ?? []).length;
    await yazAuditLog(db, session.sub, "kamp_toplu_acildi", { acilan }, req);
    return NextResponse.json({ tamam: true, acilan });
  }

  return NextResponse.json({ tamam: true });
}
