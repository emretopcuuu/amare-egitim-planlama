import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pratikKapat, pratikTamamla } from "@/lib/protokolMotor";
import { PRATIKLER, type PratikKodu } from "@/lib/protokol";

// 90 GÜN PROTOKOLÜ ucu: pratiği bugün "yapıldı" işaretle ya da "bana göre değil"
// ile kapat (gönüllülük). Yalnız katılımcı, yalnız kendi protokolü.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const g = (await req.json().catch(() => ({}))) as { aksiyon?: string; kod?: string };
  if (typeof g.kod !== "string" || !PRATIKLER[g.kod as PratikKodu]) {
    return Response.json({ hata: "Geçersiz pratik" }, { status: 400 });
  }
  const kod = g.kod as PratikKodu;
  const db = supabaseAdmin();

  if (g.aksiyon === "kapat") {
    await pratikKapat(db, session.sub, kod);
    return Response.json({ ok: true });
  }
  if (g.aksiyon === "yapildi") {
    const bugun = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
    await pratikTamamla(db, session.sub, kod, bugun);
    return Response.json({ ok: true });
  }
  return Response.json({ hata: "Geçersiz aksiyon" }, { status: 400 });
}
