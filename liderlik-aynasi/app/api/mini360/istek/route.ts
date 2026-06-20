import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Mini 360 — "ekibimden değerlendirme iste" bayrağını aç/kapat (tur bazında).
// Bayrak, kişiyi henüz değerlendirmemiş ekip arkadaşlarına nudge olarak düşer.
// Öz-puan satırı yoksa bayrakla birlikte (boş puanlı) oluşturulur — upsert
// yalnız verilen kolonları yazar, mevcut puanlar korunur.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const istiyor = body?.istiyor === true;

  const db = supabaseAdmin();
  const { data: turAyar } = await db
    .from("settings")
    .select("value")
    .eq("key", "mini360_tur")
    .maybeSingle();
  const tur = Math.max(1, parseInt(turAyar?.value ?? "1", 10) || 1);

  const { error } = await db.from("mini360_oz").upsert(
    { participant_id: session.sub, tur, oylanma_istiyor: istiyor } as never,
    { onConflict: "participant_id,tur" }
  );
  if (error) return Response.json({ hata: tr.mini360.hata }, { status: 500 });
  return Response.json({ ok: true });
}
