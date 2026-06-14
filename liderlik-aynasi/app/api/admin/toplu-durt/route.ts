import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const hedefler: string[] = Array.isArray(body?.hedefler) ? body.hedefler : [];
  if (hedefler.length === 0)
    return NextResponse.json({ hata: "Hedef listesi boş" }, { status: 400 });

  const db = supabaseAdmin();
  const baslik = tr.admin.durt.bildirimBaslik;
  const govde = tr.admin.durt.bildirimGovde;

  let gonderilen = 0;
  for (const id of hedefler) {
    try {
      await katilimciyaBildir(db, id, baslik, govde, "/degerlendir");
      gonderilen++;
    } catch {
      // bireysel başarısızlık toplu işlemi durdurmasın
    }
  }

  await yazAuditLog(
    db,
    session.sub,
    "toplu_durt",
    { hedef_sayisi: hedefler.length, gonderilen },
    req
  );

  return NextResponse.json({ gonderilen });
}
