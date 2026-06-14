import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir } from "@/lib/push";
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
  const { data: kisiler } = await db
    .from("participants")
    .select("id")
    .eq("role", "participant");
  if (!kisiler?.length) {
    return NextResponse.json({ hata: "Katılımcı yok" }, { status: 400 });
  }

  const due = new Date(Date.now() + gun * 86_400_000).toISOString();
  const satirlar = kisiler.map((k) => ({
    participant_id: k.id,
    kind: "odev",
    title: baslik.slice(0, 120),
    body: govde.slice(0, 1000),
    difficulty: 2,
    due_at: due,
  }));
  const { error } = await db.from("missions").insert(satirlar);
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });

  await herkeseBildir(
    db,
    `📋 Yeni ödev: ${baslik}`,
    govde.length > 120 ? govde.slice(0, 117) + "…" : govde,
    "/gorevler"
  );
  await yazAuditLog(db, session.sub, "odev_gonderildi", { hedef: satirlar.length, baslik }, req);

  return NextResponse.json({ tamam: true, gonderilen: satirlar.length });
}
