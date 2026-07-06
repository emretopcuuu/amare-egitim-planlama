import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// KİŞİ KİMLİĞİ — katılımcının kendi cinsiyeti + yaşı. Ses ritüelinin başında
// sorulur; ayarlar çekmecesinden de değiştirilebilir (idempotent update).
// Tüm AI motorları bunu okuyup doğru hitap eder (bkz. lib/kisiKimligi.ts).

// Ayarlar çekmecesindeki düzenleyici mevcut değerleri buradan yükler.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const { data } = await supabaseAdmin()
    .from("participants")
    .select("cinsiyet, yas")
    .eq("id", session.sub)
    .maybeSingle();
  return Response.json({ cinsiyet: data?.cinsiyet ?? null, yas: data?.yas ?? null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = await req.json().catch(() => null);

  const cinsiyet = body?.cinsiyet;
  if (cinsiyet !== "kadin" && cinsiyet !== "erkek" && cinsiyet !== "diger") {
    return Response.json({ hata: "Geçersiz seçim." }, { status: 400 });
  }

  // Yaş isteğe bağlı: verilmişse 13–120 aralığında bir tam sayı olmalı; yoksa null.
  let yas: number | null = null;
  if (body?.yas !== undefined && body?.yas !== null && body?.yas !== "") {
    const n = Number(body.yas);
    if (!Number.isInteger(n) || n < 13 || n > 120) {
      return Response.json({ hata: "Geçersiz yaş." }, { status: 400 });
    }
    yas = n;
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("participants")
    .update({ cinsiyet, yas })
    .eq("id", session.sub);
  if (error) {
    return Response.json({ hata: "Kaydedilemedi." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
