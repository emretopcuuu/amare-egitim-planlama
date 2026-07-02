import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { odevPaketiGonder } from "@/lib/odevPaketi";
import { yazAuditLog } from "@/lib/auditLog";

// FAZ 2 — Ödev paketi: admin tüm katılımcılara yapılandırılmış bir ödev
// gönderir (10/15 gün, Ağustos...). Mevcut görev altyapısını kullanır:
// kind="odev" mission olarak düşer, katılımcı yanıtlar, AYNA puanlar.
export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const baslik = typeof body?.baslik === "string" ? body.baslik.trim() : "";
  const govde = typeof body?.govde === "string" ? body.govde.trim() : "";
  const gun = Math.min(60, Math.max(1, Number(body?.gun) || 7));
  if (!baslik || !govde) {
    return NextResponse.json({ hata: "Başlık ve metin gerekli" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const gonderilen = await odevPaketiGonder(db, { baslik, govde, gunSonra: gun });
  if (gonderilen === 0) {
    return NextResponse.json({ hata: "Katılımcı yok ya da gönderim başarısız" }, { status: 400 });
  }
  await yazAuditLog(db, session.sub, "odev_gonderildi", { hedef: gonderilen, baslik }, req);
  return NextResponse.json({ tamam: true, gonderilen });
}
