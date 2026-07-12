import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { satinAl } from "@/lib/market";

export const maxDuration = 20;

// G1 — market satın alma (yalnız katılımcı). Cüzdandan düşer; kazanç/unvan
// dokunulmaz. Market kapalıysa (bayrak yok) satın alma reddedilir.
const HATA: Record<string, string> = {
  kapali: "Market şu an kapalı.",
  urun_yok: "Ürün bulunamadı.",
  varyant_gerekli: "Bir seçenek seçmelisin.",
  yetersiz: "Cüzdanında yeterli kıvılcım yok.",
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const g = (await req.json().catch(() => ({}))) as { kod?: string; varyant?: string };
  if (typeof g.kod !== "string") return Response.json({ hata: "Eksik alan" }, { status: 400 });

  const db = supabaseAdmin();
  const sonuc = await satinAl(db, session.sub, g.kod, g.varyant ?? null);
  if (!sonuc.ok) {
    return Response.json({ hata: HATA[sonuc.sebep] ?? "Satın alınamadı." }, { status: 400 });
  }
  return Response.json({ ok: true, cuzdan: sonuc.cuzdan });
}
