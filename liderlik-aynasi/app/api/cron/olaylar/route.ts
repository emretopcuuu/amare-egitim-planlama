import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { bekleyenTaahhutler } from "@/lib/ilk72";
import { katilimciyaBildir } from "@/lib/push";
import { cesaretPushGonder } from "@/lib/cesaret";
import { onboardingHatirlat, onboardingWhatsAppHatirlat } from "@/lib/onboardingTakip";
import { nabizVur, nabizBekcisi, NABIZ_OLAYLAR, NABIZ_TIK } from "@/lib/nabiz";

// Supabase pg_cron DAKİKADA BİR çağırır ('ayna-olaylar' job'u — bkz. migration
// 0110; Netlify'da Vercel cron YOK, buradaki zamanlayıcı pg_cron'dur). İşler:
// scheduled_events (dalga/rapor zamanlama) + E2 taahhut kişisel push'ları +
// E5 cesaret fısıltısı push'ları. CRON_SECRET yoksa da çalışır.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const simdi = new Date().toISOString();

  // [FAZ1-B] Nabız damgası — NabizSeridi "son olaylar-cron X dk önce"yi okur.
  await nabizVur(db, NABIZ_OLAYLAR);
  // [ADMIN-UX6] Çapraz bekçi: tik (5 dk'lık) 12 dk'dır sessizse adminlere push.
  await nabizBekcisi(db, NABIZ_TIK, 12);

  // Ateşlenecek olayları al (geçmişi de yakala: sunucu gecikme durumu)
  const { data: olaylar, error } = await db
    .from("scheduled_events")
    .select("id, event_type, wave_id")
    .eq("fired", false)
    .eq("cancelled", false)
    .lte("fire_at", simdi);

  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });

  let islem = 0;
  for (const olay of olaylar ?? []) {
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

  // [E2] İlk 72 Saat kişisel taahhütleri: zamanı gelmiş, gönderilmemiş olanları
  // push'la. push_gonderildi'yi ÖNCE işaretle (yarış/çift push guard'ı), sonra gönder.
  let taahhutPush = 0;
  for (const t of await bekleyenTaahhutler(db)) {
    const { data: sahiplenilen } = await db
      .from("taahhut")
      .update({ push_gonderildi: true })
      .eq("id", t.id)
      .eq("push_gonderildi", false)
      .select("id")
      .maybeSingle();
    if (!sahiplenilen) continue; // başka bir tik aldı
    await katilimciyaBildir(db, t.participant_id, "⏰ Kendine söz vermiştin", t.metin, "/gorevler").catch(() => {});
    taahhutPush++;
  }

  // [E5] Başladım → ~60 sn sonra cesaret fısıltısı push'u (arkaplandaki telefona).
  const cesaretPush = await cesaretPushGonder(db);

  // [E6] Onboarding'i yarıda bırakana tek seferlik hatırlatma. Saat başı en
  // fazla bir tarama (kendi settings damgasıyla korunur) ve KAMP AÇIKKEN
  // (ayna_aktif=true) hiç çalışmaz — yalnız kamp öncesi dönemin dürtmesi.
  const onboardingPush = await onboardingHatirlat(db).catch(() => 0);

  // Girmiş ama onboarding'i bitirmemişe otomatik WhatsApp — VARSAYILAN KAPALI,
  // yalnız admin `onboarding_wa_oto`=true yaptıysa çalışır (kamp öncesi dönem).
  const onboardingWa = await onboardingWhatsAppHatirlat(db).catch(() => 0);

  return NextResponse.json({ islem, taahhutPush, cesaretPush, onboardingPush, onboardingWa });
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
