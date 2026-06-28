import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import { ileriAl, sifirla, durumOku } from "@/lib/simulasyon/motor";

// KAMP PROVA SİMÜLATÖRÜ — adım yürütme rotası.
// Yalnız tam yetkili admin. Her "İleri" mevcut adımı (AI adımlarında bir dilim)
// yürütür; "sıfırla" tüm sim verisini siler. Süre sınırını aşmamak için AI
// adımları batch'li ilerler (bkz. lib/simulasyon/motor.ts).
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await adminOturumu();
  if (!session || session.rol !== "admin") {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { eylem?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: "Geçersiz istek." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const eylem = govde.eylem;

  try {
    if (eylem === "ileri") {
      const { durum, mesaj } = await ileriAl(db);
      return Response.json({ ok: true, durum, mesaj });
    }
    if (eylem === "sifirla") {
      const { mesaj } = await sifirla(db);
      const durum = await durumOku(db);
      return Response.json({ ok: true, durum, mesaj });
    }
    return Response.json({ hata: "Bilinmeyen eylem." }, { status: 400 });
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : "Bilinmeyen hata.";
    return Response.json({ hata: `Simülasyon hatası: ${mesaj}` }, { status: 500 });
  }
}
