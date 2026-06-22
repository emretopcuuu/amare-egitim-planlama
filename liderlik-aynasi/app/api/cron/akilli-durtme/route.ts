import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { akilliDurtmeleriGonder } from "@/lib/akilliDurtme";

// #9 Akıllı zamanlı bildirimler cron'u — günde bir kez (vercel.json) akşam
// çalışır; bugün gözlemlenen katılımcılara "N kişi seni gördü" bildirimini
// yollar. CRON_SECRET varsa Bearer ile korunur.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const sonuc = await akilliDurtmeleriGonder(db);
  return NextResponse.json(sonuc);
}

// Admin panelinden manuel tetikleme — cron secret olmadan, admin oturumuyla.
// "zorla" ile günlük tekrar korumasını aşar (test/canlı gösterim için).
export async function POST() {
  if (!(await adminOturumu()))
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 403 });
  const db = supabaseAdmin();
  const sonuc = await akilliDurtmeleriGonder(db, true);
  return NextResponse.json(sonuc);
}
