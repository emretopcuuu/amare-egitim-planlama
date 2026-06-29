import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hepsiniOkunduYap } from "@/lib/bildirim";

export const dynamic = "force-dynamic";

// Gelen kutusu açılınca tüm okunmamışları okundu işaretle (zil rozetini sıfırlar).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await hepsiniOkunduYap(supabaseAdmin(), session.sub);
  return NextResponse.json({ ok: true });
}
