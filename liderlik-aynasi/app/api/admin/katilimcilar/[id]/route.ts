import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { telefonAyikla } from "@/lib/telefon";
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
    full_name?: string;
    team?: string | null;
    city?: string | null;
    phone?: string | null;
    login_code?: string;
    kariyer_seviyesi?: string | null;
  };
  const guncelleme: Guncelleme = {};

  if ("ad" in body) {
    const v = temiz(body.ad);
    if (v === null) {
      return Response.json({ hata: t.hataAdEksik }, { status: 400 });
    }
    guncelleme.full_name = v.slice(0, 120);
  }
  if ("takim" in body) {
    const v = temiz(body.takim);
    guncelleme.team = v ? v.slice(0, 60) : null;
  }
  if ("sehir" in body) {
    const v = temiz(body.sehir);
    guncelleme.city = v ? v.slice(0, 100) : null;
  }
  if ("telefon" in body) {
    const tel = telefonAyikla(temiz(body.telefon));
    if (tel.durum === "bozuk") {
      return Response.json({ hata: t.hataTelefon }, { status: 400 });
    }
    guncelleme.phone = tel.durum === "gecerli" ? tel.numara : null;
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

  if ("kariyer_seviyesi" in body) {
    const GECERLI = ["leader", "senior_leader", "exec_leader", "diamond"];
    const v = temiz(body.kariyer_seviyesi);
    if (v !== null && !GECERLI.includes(v)) {
      return Response.json({ hata: t.hataSunucu }, { status: 400 });
    }
    guncelleme.kariyer_seviyesi = v;
  }

  // Ses profili sıfırlama — voice_profiles satırını sil
  if (body?.sesSifirla === true) {
    const { error } = await db.from("voice_profiles").delete().eq("participant_id", id);
    if (error) return Response.json({ hata: t.sesSifirlaHata }, { status: 500 });
    return Response.json({ sesSifirlandı: 1 });
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

// Tek katılımcıyı siler — puanları ve atamaları cascade ile gider.
// Admin hesabı bu uçtan silinemez (yalnız role=participant).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return Response.json({ hata: t.hataSunucu }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("participants")
    .delete()
    .eq("id", id)
    .eq("role", "participant")
    .select("id");

  if (error) {
    return Response.json({ hata: t.hataSunucu }, { status: 500 });
  }

  return Response.json({ silinen: data.length });
}
