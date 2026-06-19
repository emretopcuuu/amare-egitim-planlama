import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

// Admin: oyun seçimi giriş kapısını aç/kapa. Açıkken grubu olmayan katılımcı
// ana sayfada /oyun-secimi'ne yönlenir ve oyun tercihine göre gruba atanır.
export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (typeof body?.acik !== "boolean") {
    return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("settings").upsert(
    {
      key: "oyun_secimi_acik",
      value: body.acik ? "true" : "false",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });

  await yazAuditLog(
    db,
    session.sub,
    body.acik ? "oyun_secimi_acildi" : "oyun_secimi_kapatildi",
    {},
    req
  );
  return NextResponse.json({ tamam: true, acik: body.acik });
}
