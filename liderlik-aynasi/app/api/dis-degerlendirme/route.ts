import { supabaseAdmin } from "@/lib/supabase/server";
import { disDegerlendirmeKaydet } from "@/lib/eylulDis";

// [E11] Dış değerlendirici — OTURUMSUZ. Yetki jeton ile: tek kullanımlık, 14 gün.
// KVKK onayı şart. Kimlik istenmez; kayıt anonimdir.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    token?: unknown;
    cevaplar?: unknown;
    yorum?: unknown;
    kvkk?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const cevaplar = (body?.cevaplar ?? {}) as Record<string, number>;
  const yorum = typeof body?.yorum === "string" ? body.yorum : "";
  const kvkk = body?.kvkk === true;

  const sonuc = await disDegerlendirmeKaydet(supabaseAdmin(), token, cevaplar, yorum, kvkk);
  if (!sonuc.ok) {
    const durum = sonuc.sebep === "kvkk" || sonuc.sebep === "cevap" ? 400 : 409;
    return Response.json({ hata: "Kaydedilemedi", sebep: sonuc.sebep }, { status: durum });
  }
  return Response.json({ ok: true });
}
