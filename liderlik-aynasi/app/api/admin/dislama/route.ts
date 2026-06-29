import { NextRequest } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.eslestirme;

// GET: tüm dışlama çiftlerini katılımcı isimleriyle döndür
export async function GET() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("excluded_pairs")
    .select(
      "id, a:participants!excluded_pairs_a_id_fkey(id, full_name), b:participants!excluded_pairs_b_id_fkey(id, full_name)"
    )
    .order("created_at", { ascending: false });

  if (error) return Response.json({ hata: t.hataSunucu }, { status: 500 });
  return Response.json({ satirlar: data ?? [] });
}

// POST: yeni dışlama çifti ekle
export async function POST(req: NextRequest) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const aId = typeof body?.aId === "string" ? body.aId : null;
  const bId = typeof body?.bId === "string" ? body.bId : null;
  if (!aId || !bId || aId === bId) {
    return Response.json({ hata: t.dislamaGecersiz }, { status: 400 });
  }

  const db = supabaseAdmin();
  // Çift yönlü çakışma kontrolü
  const { data: var_ } = await db
    .from("excluded_pairs")
    .select("id")
    .or(`and(a_id.eq.${aId},b_id.eq.${bId}),and(a_id.eq.${bId},b_id.eq.${aId})`)
    .maybeSingle();
  if (var_) return Response.json({ hata: t.dislamaZatenVar }, { status: 409 });

  const { data, error } = await db
    .from("excluded_pairs")
    .insert({ a_id: aId, b_id: bId })
    .select("id")
    .single();
  if (error) return Response.json({ hata: t.hataSunucu }, { status: 500 });
  return Response.json({ id: data.id });
}

// DELETE: dışlama çiftini kaldır
export async function DELETE(req: NextRequest) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return Response.json({ hata: t.dislamaGecersiz }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from("excluded_pairs").delete().eq("id", id);
  if (error) return Response.json({ hata: t.hataSunucu }, { status: 500 });
  return Response.json({ tamam: true });
}
