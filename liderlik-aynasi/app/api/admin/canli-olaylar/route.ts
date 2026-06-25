import { NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";

// UX #2 — Canlı olay akışı kaynağı. İstemci her ~20sn yoklar; yeni audit_log
// kayıtlarını panelde küçük bildirim (toast) olarak gösterir. Yalnız admin.
export async function GET() {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("audit_log")
    .select("id, eylem, created_at, participants(full_name)")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });

  const olaylar = (data ?? []).map((k) => ({
    id: String(k.id),
    eylem: k.eylem as string,
    zaman: k.created_at as string,
    kim: (k.participants as { full_name: string } | null)?.full_name ?? null,
  }));
  return NextResponse.json({ olaylar });
}
