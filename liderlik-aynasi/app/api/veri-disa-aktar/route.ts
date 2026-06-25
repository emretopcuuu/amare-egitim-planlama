import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// #10 — GDPR/KVKK veri taşınabilirliği. Katılımcı KENDİ verisini JSON olarak
// indirir. GİZLİLİK SINIRI: yalnız kişinin kendi ürettiği/kendisine ait veri
// döner — BAŞKA katılımcıların kimliği ASLA sızmaz (kendisi hakkındaki puanların
// rater_id'si, kim takdir etti gibi alanlar dışarıda bırakılır).
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  const pid = session.sub;

  const [
    { data: kisi },
    { data: pusula },
    { data: gorevler },
    { data: verdigiPuanlar },
    { data: hakkindaPuanlar },
    { data: verdigiTakdirler },
    { data: aldigiTakdirler },
    { data: hedef },
    { data: soz },
  ] = await Promise.all([
    db
      .from("participants")
      .select("full_name, team, city, phone, email, kariyer_seviyesi, kariyer_durumu, consent_at, created_at")
      .eq("id", pid)
      .maybeSingle(),
    db
      .from("pusula")
      .select("oncelikler, cekirdek_neden, mevcut_bosluk, ic_engel, ozet, slogan, tamamlandi_at")
      .eq("participant_id", pid)
      .maybeSingle(),
    db
      .from("missions")
      .select("kind, title, body, status, ai_score, ai_comment, response_text, reflection_text, spark_points, issued_at, scored_at")
      .eq("participant_id", pid)
      .order("issued_at", { ascending: true }),
    // Kişinin BAŞKALARINA verdiği puanlar (kendi eylemi — kişinin verisi).
    db
      .from("ratings")
      .select("target_id, trait_id, score, comment, wave, created_at")
      .eq("rater_id", pid),
    // Kişi HAKKINDA gelen puanlar — rater_id ASLA dahil edilmez (anonimlik).
    db
      .from("ratings")
      .select("trait_id, score, wave, is_self, created_at")
      .eq("target_id", pid),
    // Verdiği takdirler.
    db.from("kudos").select("to_id, message, created_at").eq("from_id", pid),
    // Aldığı takdirler — from_id (kim verdi) dahil EDİLMEZ.
    db.from("kudos").select("message, created_at").eq("to_id", pid).eq("is_hidden", false),
    db.from("hedef").select("ozet, plan, tamamlandi_at").eq("participant_id", pid).maybeSingle(),
    db.from("pledges").select("created_at").eq("participant_id", pid).maybeSingle(),
  ]);

  const disaAktarim = {
    aciklama:
      "Liderlik Aynası — kişisel veri dışa aktarımı (KVKK/GDPR). Bu dosya yalnız size ait veriyi içerir; diğer katılımcıların kimliği gizlilik gereği dahil edilmemiştir.",
    olusturma: new Date().toISOString(),
    profil: kisi ?? null,
    pusula: pusula ?? null,
    hedef: hedef ?? null,
    soz_verdi: !!soz,
    gorevler: gorevler ?? [],
    benim_verdigim_puanlar: verdigiPuanlar ?? [],
    hakkimdaki_puanlar_anonim: hakkindaPuanlar ?? [],
    benim_verdigim_takdirler: verdigiTakdirler ?? [],
    aldigim_takdirler_anonim: aldigiTakdirler ?? [],
  };

  const ad = (kisi?.full_name ?? "veri").replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
  return new Response(JSON.stringify(disaAktarim, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="liderlik-aynasi-${ad}.json"`,
    },
  });
}
