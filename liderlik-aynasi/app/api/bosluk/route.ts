import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { boslukGetirVeyaUret, yeniCumleKaydet } from "@/lib/bosluk";
import { tr } from "@/lib/i18n/tr";

// FAZ 1 Boşluk Anı — demolisyon getir/üret (GET) + yeni cümleyi mühürle (POST).
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ durum: "hata" }, { status: 401 });
  }
  const sonuc = await boslukGetirVeyaUret(supabaseAdmin(), session.sub);
  return Response.json(sonuc);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.bosluk.hata }, { status: 401 });
  }
  let cumle: unknown;
  try {
    ({ cumle } = await req.json());
  } catch {
    return Response.json({ hata: tr.bosluk.hata }, { status: 400 });
  }
  if (typeof cumle !== "string" || !cumle.trim()) {
    return Response.json({ hata: tr.bosluk.hata }, { status: 400 });
  }
  const ok = await yeniCumleKaydet(supabaseAdmin(), session.sub, cumle);
  return ok
    ? Response.json({ tamam: true })
    : Response.json({ hata: tr.bosluk.hata }, { status: 500 });
}
