import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ayMektubuGetirVeyaUret } from "@/lib/ayMektubu";
import { yolculukGunuHesapla } from "@/lib/davranis";

export const maxDuration = 60; // AI üretimi ilk çağrıda ~birkaç saniye

// [D#33] AY DÖNÜMÜ MEKTUBU — kişi mektubunu açınca lazy üretilir (ilk çağrı) veya
// cache'ten döner. Yalnız kişinin KENDİ mektubu.
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: bas } = await db
    .from("settings")
    .select("value")
    .eq("key", "yolculuk_baslangic")
    .maybeSingle();
  if (!bas?.value) return Response.json({ durum: "erken" });
  const yolGun = Math.max(1, Math.min(90, yolculukGunuHesapla(bas.value, new Date())));
  const sonuc = await ayMektubuGetirVeyaUret(db, session.sub, session.ad, yolGun);
  return Response.json(sonuc);
}
