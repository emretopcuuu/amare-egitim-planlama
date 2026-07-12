import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 15;

// Oyunlaştırma mekaniği bayrakları — hepsi varsayılan KAPALI, kamp günü açılır.
// Yeni mekanik eklendikçe bu listeye anahtarı ekle (whitelist güvenliği).
export const OYUN_BAYRAKLARI = ["market_acik", "sandik_acik", "rekorlar_acik", "cift_serisi_acik", "fisilti_acik", "hamle_acik", "radyo_kitlik_acik", "kayip_esya_acik"];

export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: "Yetkisiz" }, { status: 403 });
  }
  const g = (await req.json().catch(() => ({}))) as { key?: string; acik?: boolean };
  if (typeof g.key !== "string" || !OYUN_BAYRAKLARI.includes(g.key)) {
    return Response.json({ hata: "Geçersiz bayrak" }, { status: 400 });
  }
  const db = supabaseAdmin();
  await db.from("settings").upsert({
    key: g.key,
    value: g.acik ? "true" : "false",
    updated_at: new Date().toISOString(),
  });
  return Response.json({ ok: true, key: g.key, acik: !!g.acik });
}
