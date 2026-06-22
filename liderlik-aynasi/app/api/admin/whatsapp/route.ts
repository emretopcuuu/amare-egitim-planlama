import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sablonBul, degiskenleriUret } from "@/lib/whatsappSablonlari";
import {
  whatsAppYapilandirildiMi,
  whatsAppGonder,
  sablonSidGetir,
  whatsAppAdresi,
} from "@/lib/whatsapp";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

type Kisi = { id: string; full_name: string; phone: string | null; login_code: string; team: string | null };

const t = tr.admin.whatsapp;

// PD101 WhatsApp gönderimi. Yüksek etkili (dış kanal, ücretli) → tam yetkili admin.
// Beden: { sablon, hedefTipi, takim?, kisiIds?, mesaj? }
//  hedefTipi: "genel" | "takim" | "kisiler" | "odevYapmayan"
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  if (!whatsAppYapilandirildiMi()) {
    return Response.json({ hata: t.api.yapilandirilmadi }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const sablon = sablonBul(body?.sablon);
  if (!sablon) return Response.json({ hata: t.api.sablonYok }, { status: 400 });

  const db = supabaseAdmin();

  const contentSid = await sablonSidGetir(db, sablon);
  if (!contentSid) {
    return Response.json({ hata: t.api.sablonKayitsiz(sablon.etiket) }, { status: 400 });
  }

  // Serbest metinli duyuruda mesaj zorunlu.
  const mesaj = typeof body?.mesaj === "string" ? body.mesaj.trim().slice(0, 600) : "";
  if (sablon.serbestMi && !mesaj) {
    return Response.json({ hata: t.api.mesajBos }, { status: 400 });
  }

  // Hedef kitleyi sunucuda taze çöz (istemciye güvenilmez).
  const alanlar = "id, full_name, phone, login_code, team";
  let kisiler: Kisi[] = [];

  if (body?.hedefTipi === "genel") {
    const { data } = await db.from("participants").select(alanlar).eq("role", "participant");
    kisiler = (data ?? []) as Kisi[];
  } else if (body?.hedefTipi === "takim") {
    const takim = typeof body?.takim === "string" ? body.takim : "";
    if (!takim) return Response.json({ hata: t.api.takimYok }, { status: 400 });
    const { data } = await db
      .from("participants")
      .select(alanlar)
      .eq("role", "participant")
      .eq("team", takim);
    kisiler = (data ?? []) as Kisi[];
  } else if (body?.hedefTipi === "kisiler") {
    const idler = Array.isArray(body?.kisiIds) ? body.kisiIds.filter((x: unknown) => typeof x === "string") : [];
    if (idler.length === 0) return Response.json({ hata: t.api.kisiYok }, { status: 400 });
    const { data } = await db
      .from("participants")
      .select(alanlar)
      .eq("role", "participant")
      .in("id", idler);
    kisiler = (data ?? []) as Kisi[];
  } else if (body?.hedefTipi === "odevYapmayan") {
    // Sistemde bekleyen (pending) görevi olan herkes.
    const { data: bekleyen } = await db
      .from("missions")
      .select("participant_id")
      .eq("status", "pending");
    const idler = [...new Set((bekleyen ?? []).map((m) => m.participant_id))];
    if (idler.length === 0) return Response.json({ hata: t.api.odevYok }, { status: 400 });
    const { data } = await db
      .from("participants")
      .select(alanlar)
      .eq("role", "participant")
      .in("id", idler);
    kisiler = (data ?? []) as Kisi[];
  } else {
    return Response.json({ hata: t.api.hedefYok }, { status: 400 });
  }

  // Telefonu geçerli olanlara gönder; geçersiz/eksik telefonları atla.
  const gecerli = kisiler.filter((k) => whatsAppAdresi(k.phone) !== null);
  const telefonsuz = kisiler.length - gecerli.length;

  let basarili = 0;
  let basarisiz = 0;
  // Twilio hız sınırını zorlamamak için küçük gruplar halinde gönder.
  const PARCA = 20;
  for (let i = 0; i < gecerli.length; i += PARCA) {
    const dilim = gecerli.slice(i, i + PARCA);
    const sonuclar = await Promise.all(
      dilim.map((k) =>
        whatsAppGonder(
          k.phone!,
          contentSid,
          degiskenleriUret(sablon, { ad: k.full_name, kod: k.login_code }, mesaj)
        )
      )
    );
    for (const ok of sonuclar) {
      if (ok) basarili++;
      else basarisiz++;
    }
  }

  return Response.json({ ok: true, basarili, basarisiz, telefonsuz });
}
