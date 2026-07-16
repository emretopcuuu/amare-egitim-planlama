import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { turBaslat } from "@/lib/kayipEsya";

export const maxDuration = 20;

// G8 — admin: yeni kayıp eşya turu başlat (konum + ipucu). Mit-duyurusu (bayrak
// açıksa) herkese gider.
export async function POST(req: Request) {
  if (!(await adminOturumu())) return Response.json({ hata: "Yetkisiz" }, { status: 403 });
  const g = (await req.json().catch(() => ({}))) as { konum?: string; ipucu?: string };
  if (typeof g.konum !== "string") return Response.json({ hata: "Konum gerekli" }, { status: 400 });
  const db = supabaseAdmin();
  const sonuc = await turBaslat(db, g.konum, typeof g.ipucu === "string" ? g.ipucu : "", new Date());
  if (!sonuc.ok) return Response.json({ hata: "Başlatılamadı (geçersiz konum?)." }, { status: 400 });
  return Response.json({ ok: true });
}
