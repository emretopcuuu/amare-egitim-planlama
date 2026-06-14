import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";

// Vercel Cron: her dakika çalışır, ateşlenecek scheduled_events'i işler.
// CRON_SECRET env değişkeni yoksa da çalışır (Vercel cron Bearer ile çağırır).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const simdi = new Date().toISOString();

  // Ateşlenecek olayları al (geçmişi de yakala: sunucu gecikme durumu)
  const { data: olaylar, error } = await db
    .from("scheduled_events")
    .select("id, event_type, wave_id")
    .eq("fired", false)
    .eq("cancelled", false)
    .lte("fire_at", simdi);

  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
  if (!olaylar?.length) return NextResponse.json({ islem: 0 });

  let islem = 0;
  for (const olay of olaylar) {
    try {
      await atesle(db, olay);
      await db
        .from("scheduled_events")
        .update({ fired: true, fired_at: simdi })
        .eq("id", olay.id);
      islem++;
    } catch {
      // tek olay başarısız olsa da diğerlerine devam et
    }
  }

  return NextResponse.json({ islem });
}

// Admin panelinden manuel tetikleme — cron secret olmadan, admin oturumuyla
export async function POST() {
  if (!(await adminOturumu())) return NextResponse.json({ hata: "Yetkisiz" }, { status: 403 });
  return GET(new NextRequest("http://localhost/api/cron/olaylar"));
}

type Olay = { id: number; event_type: string; wave_id: number | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function atesle(db: any, olay: Olay) {
  switch (olay.event_type) {
    case "wave_open":
      if (!olay.wave_id) throw new Error("wave_id gerekli");
      // Aynı anda yalnız bir dalga açık olur
      await db.from("waves").update({ is_open: false }).neq("id", olay.wave_id);
      await db
        .from("waves")
        .update({ is_open: true, opened_at: new Date().toISOString() })
        .eq("id", olay.wave_id);
      break;
    case "wave_close":
      if (!olay.wave_id) throw new Error("wave_id gerekli");
      await db.from("waves").update({ is_open: false }).eq("id", olay.wave_id);
      break;
    case "report_open":
      await db
        .from("settings")
        .upsert({ key: "reports_visible", value: "true", updated_at: new Date().toISOString() }, { onConflict: "key" });
      break;
    case "report_close":
      await db
        .from("settings")
        .upsert({ key: "reports_visible", value: "false", updated_at: new Date().toISOString() }, { onConflict: "key" });
      break;
    case "prova_off":
      await db
        .from("settings")
        .upsert({ key: "prova_modu", value: "false", updated_at: new Date().toISOString() }, { onConflict: "key" });
      break;
  }
}
