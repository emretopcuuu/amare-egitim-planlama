import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { telefonAyikla } from "@/lib/telefon";
import { tr } from "@/lib/i18n/tr";
import { KARIYER_RANK, kariyerHalKisidenTuret } from "@/lib/persona";

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
    en_yuksek_kariyer?: string | null;
    gecen_ay_kariyer?: string | null;
    kidem_ay?: number | null;
  };
  const guncelleme: Guncelleme = {};
  // Kariyer alanlarından biri değişirse durumu yeniden türetmek için işaret.
  let kariyerDokunuldu = false;

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

  // Kariyer basamak alanları (mevcut / en yüksek / geçen ay) — ladder doğrulaması.
  const seviyeAlan = (
    anahtar: "kariyer_seviyesi" | "en_yuksek_kariyer" | "gecen_ay_kariyer"
  ): "ok" | "hata" => {
    if (!(anahtar in body)) return "ok";
    const v = temiz((body as Record<string, unknown>)[anahtar]);
    if (v !== null && !KARIYER_RANK[v]) return "hata";
    guncelleme[anahtar] = v;
    kariyerDokunuldu = true;
    return "ok";
  };
  if (seviyeAlan("kariyer_seviyesi") === "hata")
    return Response.json({ hata: t.hataSunucu }, { status: 400 });
  if (seviyeAlan("en_yuksek_kariyer") === "hata")
    return Response.json({ hata: t.hataSunucu }, { status: 400 });
  if (seviyeAlan("gecen_ay_kariyer") === "hata")
    return Response.json({ hata: t.hataSunucu }, { status: 400 });

  if ("kidem_ay" in body) {
    const raw = body.kidem_ay;
    if (raw === null || raw === "") {
      guncelleme.kidem_ay = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 600) {
        return Response.json({ hata: t.hataSunucu }, { status: 400 });
      }
      guncelleme.kidem_ay = Math.round(n);
    }
    kariyerDokunuldu = true;
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

  // Kariyer verisi değiştiyse persona hâlini (A/B/C/A+) yeniden türet ve yaz.
  if (kariyerDokunuldu) {
    const { data: k } = await db
      .from("participants")
      .select("kariyer_seviyesi, en_yuksek_kariyer, gecen_ay_kariyer, kidem_ay")
      .eq("id", id)
      .maybeSingle();
    if (k) {
      const persona = kariyerHalKisidenTuret(k);
      await db
        .from("participants")
        .update({ kariyer_durumu: persona?.hal ?? null })
        .eq("id", id);
    }
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
