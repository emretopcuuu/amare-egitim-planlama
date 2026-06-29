import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";

// Tek Ayna Eşi çiftindeki bir kişiyi başkasıyla değiştirir.
// body: { satirId, taraf: "a"|"b", yeniKisiId }
export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const satirId = typeof body?.satirId === "string" ? body.satirId : null;
  const taraf = body?.taraf === "a" || body?.taraf === "b" ? body.taraf as "a" | "b" : null;
  const yeniKisiId = typeof body?.yeniKisiId === "string" ? body.yeniKisiId : null;
  if (!satirId || !taraf || !yeniKisiId) {
    return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Mevcut satırı al
  const { data: satir } = await db
    .from("ayna_esi")
    .select("id, a_id, b_id, tur")
    .eq("id", satirId)
    .maybeSingle();
  if (!satir) return NextResponse.json({ hata: "Satır bulunamadı" }, { status: 404 });

  // Kendisiyle eşleşme engeli
  const digerTaraf = taraf === "a" ? satir.b_id : satir.a_id;
  if (yeniKisiId === digerTaraf) {
    return NextResponse.json({ hata: "Kişi kendisiyle eşleşemez." }, { status: 400 });
  }

  // Aynı turda yeni kişi zaten başka biriyle eşleşiyor mu?
  const { data: cakisma } = await db
    .from("ayna_esi")
    .select("id")
    .eq("tur", satir.tur)
    .or(`a_id.eq.${yeniKisiId},b_id.eq.${yeniKisiId}`)
    .neq("id", satirId)
    .maybeSingle();
  if (cakisma) {
    return NextResponse.json(
      { hata: "Bu kişi o turda zaten başka biriyle eşleşmiş." },
      { status: 409 }
    );
  }

  const guncelle = taraf === "a" ? { a_id: yeniKisiId } : { b_id: yeniKisiId };
  const { error } = await db.from("ayna_esi").update(guncelle).eq("id", satirId);
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });

  return NextResponse.json({ tamam: true });
}
