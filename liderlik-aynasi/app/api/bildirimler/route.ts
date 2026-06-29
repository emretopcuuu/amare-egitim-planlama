import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hepsiniOkunduYap, okunmamisSayisi } from "@/lib/bildirim";

export const dynamic = "force-dynamic";

// Canlı rozet: okunmamış bildirim sayısı (çip periyodik/odakta yoklar).
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ okunmamis: 0 }, { status: 401 });
  }
  const okunmamis = await okunmamisSayisi(supabaseAdmin(), session.sub);
  return NextResponse.json({ okunmamis });
}

// Gelen kutusu açılınca tüm okunmamışları okundu işaretle (zil rozetini sıfırlar).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await hepsiniOkunduYap(supabaseAdmin(), session.sub);
  return NextResponse.json({ ok: true });
}
