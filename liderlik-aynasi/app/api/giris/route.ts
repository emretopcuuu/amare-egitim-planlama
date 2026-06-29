import { supabaseAdmin } from "@/lib/supabase/server";
import { createSession } from "@/lib/auth/session";
import { clientIp, isRateLimited, recordAttempt } from "@/lib/auth/rate-limit";
import { tr } from "@/lib/i18n/tr";

export async function POST(req: Request) {
  const ip = clientIp(req);

  let kod: unknown;
  try {
    ({ kod } = await req.json());
  } catch {
    return Response.json({ hata: tr.giris.hataGecersizBicim }, { status: 400 });
  }

  if (typeof kod !== "string" || !/^[0-9]{6}$/.test(kod)) {
    return Response.json({ hata: tr.giris.hataGecersizBicim }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: katilimci, error } = await db
    .from("participants")
    .select("id, full_name, role")
    .eq("login_code", kod)
    .maybeSingle();

  if (error) {
    return Response.json({ hata: tr.giris.hataSunucu }, { status: 500 });
  }

  // Admin rolündeki kayıtlar kodla giremez; admin /admin/giris kullanır.
  const basarili = !!katilimci && katilimci.role === "participant";
  await recordAttempt(ip, basarili);

  // Hız-sınırı YALNIZ yanlış kodu durdurur: kampta ~100 kişi tek paylaşımlı
  // NAT IP'si ardında olduğundan, DOĞRU kod her zaman geçmeli — birkaç kişinin
  // yanlış denemesi aynı IP'deki diğerlerini (doğru kod girenleri) kilitlemesin.
  // Brute-force tahmini hâlâ yanlış-deneme tarafında 429 ile sınırlanır.
  if (!basarili) {
    if (await isRateLimited(ip)) {
      return Response.json({ hata: tr.giris.hataCokFazlaDeneme }, { status: 429 });
    }
    return Response.json({ hata: tr.giris.hataKodHatali }, { status: 401 });
  }

  // İlk girişte first_login_at kaydedilir (sonrakiler güncellenmez).
  await db
    .from("participants")
    .update({ first_login_at: new Date().toISOString() })
    .eq("id", katilimci.id)
    .is("first_login_at", null);

  await createSession({
    sub: katilimci.id,
    ad: katilimci.full_name,
    rol: "participant",
  });
  return Response.json({ ad: katilimci.full_name });
}
