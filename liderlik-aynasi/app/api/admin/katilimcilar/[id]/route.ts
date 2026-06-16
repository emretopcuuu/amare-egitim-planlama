import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.katilimcilar;

// Tek katılımcıyı güncelle: takım, şehir, telefon, giriş kodu.
// ad (full_name) kasıtlı olarak değiştirilemiyor — import sırasında belirlendi.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return Response.json({ hata: t.hataSunucu }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ hata: t.hataSunucu }, { status: 400 });
  }

  const temiz = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  type Guncelleme = {
    team?: string | null;
    city?: string | null;
    phone?: string | null;
    login_code?: string;
  };
  const guncelleme: Guncelleme = {};

  if ("takim" in body) {
    const v = temiz(body.takim);
    guncelleme.team = v ? v.slice(0, 60) : null;
  }
  if ("sehir" in body) {
    const v = temiz(body.sehir);
    guncelleme.city = v ? v.slice(0, 100) : null;
  }
  if ("telefon" in body) {
    const v = temiz(body.telefon);
    guncelleme.phone = v ? v.slice(0, 20) : null;
  }

  const db = supabaseAdmin();

  if ("login_code" in body) {
    const kod = temiz(body.login_code);
    if (kod !== null) {
      if (!/^\d{6}$/.test(kod)) {
        return Response.json({ hata: t.duzenleKodHata }, { status: 400 });
      }
      const { data: capisan } = await db
        .from("participants")
        .select("id")
        .eq("login_code", kod)
        .neq("id", id)
        .maybeSingle();
      if (capisan) {
        return Response.json({ hata: t.duzenleKodHata }, { status: 409 });
      }
      guncelleme.login_code = kod;
    }
  }

  if (Object.keys(guncelleme).length === 0) {
    return Response.json({ guncellendi: 0 });
  }

  const { error } = await db
    .from("participants")
    .update(guncelleme)
    .eq("id", id)
    .eq("role", "participant");

  if (error) {
    return Response.json({ hata: t.hataSunucu }, { status: 500 });
  }

  return Response.json({ guncellendi: 1 });
}
