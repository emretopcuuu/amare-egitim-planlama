import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createSession } from "@/lib/auth/session";
import { clientIp, isRateLimited, recordAttempt } from "@/lib/auth/rate-limit";
import { tr } from "@/lib/i18n/tr";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(bb, bb);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const ip = clientIp(req);

  let sifre: unknown;
  try {
    ({ sifre } = await req.json());
  } catch {
    return Response.json({ hata: tr.adminGiris.hataSifre }, { status: 400 });
  }

  if (typeof sifre !== "string" || !sifre) {
    return Response.json({ hata: tr.adminGiris.hataSifre }, { status: 400 });
  }

  if (await isRateLimited(ip)) {
    return Response.json({ hata: tr.giris.hataCokFazlaDeneme }, { status: 429 });
  }

  // Tam admin mi, yoksa sınırlı yardımcı görevli mi? İki ayrı parola.
  const adminSifre = process.env.ADMIN_PASSWORD;
  const yardimciSifre = process.env.YARDIMCI_PASSWORD;
  const adminMi = !!adminSifre && safeEqual(sifre, adminSifre);
  const yardimciMi = !adminMi && !!yardimciSifre && safeEqual(sifre, yardimciSifre);
  const basarili = adminMi || yardimciMi;
  await recordAttempt(ip, basarili);

  if (!basarili) {
    return Response.json({ hata: tr.adminGiris.hataSifre }, { status: 401 });
  }

  const { data: admin } = await supabaseAdmin()
    .from("participants")
    .select("id, full_name")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (!admin) {
    return Response.json({ hata: tr.giris.hataSunucu }, { status: 500 });
  }

  const rol = adminMi ? "admin" : "yardimci";
  await createSession({ sub: admin.id, ad: admin.full_name, rol });
  return Response.json({ ad: admin.full_name });
}
