import { headers } from "next/headers";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { davetGonder, epostaYapilandirildiMi } from "@/lib/eposta";
import { sozSeslendir } from "@/lib/yansima";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

const PARTI = 10;

// Dalga 4 davetleri: her çağrı en fazla PARTI e-posta gönderir; istemci
// offset ile döngüler (mektup üretimiyle aynı desen — süre sınırına takılmaz,
// ilerleme görünür). Son partide gönderim zamanı settings'e yazılır.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  if (!epostaYapilandirildiMi()) {
    return Response.json({ hata: tr.admin.doksanGun.anahtarYok }, { status: 503 });
  }

  let offset = 0;
  try {
    const govde = await req.json();
    if (Number.isInteger(govde?.offset) && govde.offset >= 0) offset = govde.offset;
  } catch {
    // gövdesiz çağrı: baştan başla
  }

  const db = supabaseAdmin();
  const [{ data: alicilar, error }, { data: sozler }] = await Promise.all([
    db
      .from("participants")
      .select("id, full_name, email, login_code")
      .eq("role", "participant")
      .not("email", "is", null)
      .order("created_at"),
    db
      .from("missions")
      .select("participant_id, response_text")
      .eq("kind", "soz")
      .not("response_text", "is", null),
  ]);
  if (error) {
    return Response.json({ hata: tr.admin.doksanGun.hata }, { status: 500 });
  }
  // Kampın son gecesi verilen SÖZ'ler davetle sahibine geri döner
  const sozHaritasi = new Map(
    (sozler ?? []).map((s) => [s.participant_id, s.response_text])
  );

  const istekBasliklari = await headers();
  const host = istekBasliklari.get("host") ?? "localhost:3000";
  const proto = istekBasliklari.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  // SÖZ'ü olan ve klonu hazır alıcılar için sesli SÖZ (idempotent: varsa atla)
  const { data: sesliler } = await db
    .from("voice_profiles")
    .select("participant_id, soz_path")
    .eq("status", "klonlandi");
  const sozSesi = new Map((sesliler ?? []).map((s) => [s.participant_id, s.soz_path]));

  const dilim = (alicilar ?? []).slice(offset, offset + PARTI);
  let basarisiz = 0;
  for (const a of dilim) {
    const soz = sozHaritasi.get(a.id);
    if (soz && sozSesi.has(a.id) && !sozSesi.get(a.id)) {
      await sozSeslendir(db, a.id, soz);
    }
    const oldu = await davetGonder(
      a.email!,
      a.full_name,
      a.login_code,
      origin,
      sozHaritasi.get(a.id) ?? null
    );
    if (!oldu) basarisiz++;
  }

  const sonraki = offset + dilim.length;
  const bitti = sonraki >= alicilar.length;

  if (bitti && alicilar.length > 0) {
    await db.from("settings").upsert({
      key: "wave4_davet_gonderildi",
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return Response.json({
    gonderilen: dilim.length - basarisiz,
    basarisiz,
    sonraki,
    toplam: alicilar.length,
    bitti,
  });
}
