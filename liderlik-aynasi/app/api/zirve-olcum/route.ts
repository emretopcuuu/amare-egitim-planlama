import { getSession } from "@/lib/auth/session";
import { bayatOturumYaniti } from "@/lib/auth/bayatOturum";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// [10] ZİRVEYİ ÖLÇ — kamp doruğunun ardından tek kelime + 0-10 slider. Peak-End
// "peak" ölçümü. Kişi başına write-once (PK participant_id).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { kelime?: unknown; puan?: unknown } | null;
  const kelime = typeof body?.kelime === "string" ? body.kelime.trim().slice(0, 40) : "";
  const puan = Number(body?.puan);
  if (kelime.length < 2 || !Number.isInteger(puan) || puan < 0 || puan > 10) {
    return Response.json({ hata: tr.zirve.hata }, { status: 400 });
  }
  const db = supabaseAdmin();
  // Write-once: ilk kayıt kalır (upsert ile ikinci gönderim son değeri yazar —
  // kişi slider'ı düzeltebilsin diye upsert bilinçli).
  const { error } = await db
    .from("zirve_olcum")
    .upsert(
      { participant_id: session.sub, kelime, puan, created_at: new Date().toISOString() },
      { onConflict: "participant_id" }
    );
  if (error) {
    const bayat = await bayatOturumYaniti(error);
    if (bayat) return bayat;
    return Response.json({ hata: tr.zirve.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}
