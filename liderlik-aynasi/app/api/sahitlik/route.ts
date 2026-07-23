import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { takipEttiklerim, durtmeGonder } from "@/lib/sozTakip";
import { katilimciyaBildir } from "@/lib/push";

// [B#15] İzin verilen tek dokunuş emoji tepkileri (serbest metin değil).
const TEPKI_EMOJILERI = ["🔥", "👏", "💪", "✨"];

// Şahit paneli — GET: şahit olunan kişiler + ilerlemeleri. POST: dürtme gönder.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const kisiler = await takipEttiklerim(db, session.sub);
  return Response.json({ kisiler });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { sahibi?: unknown; tip?: unknown; mesaj?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  if (typeof g.tip !== "string") {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const benId = session.sub;
  const ilkAd = session.ad.split(" ")[0];

  // Tek kişiyi alkışla (kudos + sıcak push). Hem "alkis" hem "hepsini alkışla".
  async function alkisla(sahibiId: string) {
    const { error } = await db.from("kudos").insert({
      from_id: benId,
      to_id: sahibiId,
      message: `${ilkAd} (şahidin) seni alkışlıyor — gidişin güzel!`,
    });
    if (!error) {
      await katilimciyaBildir(
        db,
        sahibiId,
        "👏 Şahidin seni alkışlıyor",
        `${ilkAd} ilerlemeni gördü ve seni alkışlıyor.`,
        "/takdir"
      ).catch(() => {});
    }
    return !error;
  }

  // [B#16] HEPSİNİ ALKIŞLA — tek dokunuşla şahit olunan herkese alkış.
  if (g.tip === "alkis_hepsi") {
    const kisiler = await takipEttiklerim(db, session.sub);
    let n = 0;
    for (const k of kisiler) {
      if (await alkisla(k.sahibiId)) n++;
    }
    return Response.json({ ok: true, alkislanan: n });
  }

  // Buradan sonrası tek bir "sahibi"ye yöneliktir — yalnız gerçekten şahit
  // olunan kişiye gönderilebilir.
  if (typeof g.sahibi !== "string") {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const { data: tanik } = await db
    .from("soz_tanik")
    .select("id")
    .eq("soz_sahibi", g.sahibi)
    .eq("witness_id", session.sub)
    .maybeSingle();
  if (!tanik) return Response.json({ hata: "yetkisiz" }, { status: 403 });

  // [Faz 10] ŞAHİT ALKIŞI — dürtme değil, takdir.
  if (g.tip === "alkis") {
    const ok = await alkisla(g.sahibi);
    return Response.json({ ok });
  }

  // [B#15] EMOJİ TEPKİSİ — hafif tek dokunuş (🔥/👏/💪/✨). soz_durtme'ye
  // tip="tepki" + emoji olarak yazılır (karşılıklılık/loglama için) + kişiye
  // nazik bir push. Serbest metin DEĞİL; yalnız izinli emojiler.
  if (g.tip === "tepki") {
    const emoji = typeof g.mesaj === "string" && TEPKI_EMOJILERI.includes(g.mesaj) ? g.mesaj : "🔥";
    await db
      .from("soz_durtme")
      .insert({ sahibi: g.sahibi, gonderen: session.sub, tip: "tepki", mesaj: emoji });
    await katilimciyaBildir(
      db,
      g.sahibi,
      `${emoji} Şahidinden bir tepki`,
      `${ilkAd} adımını gördü: ${emoji}`,
      "/takip"
    ).catch(() => {});
    return Response.json({ ok: true });
  }

  await durtmeGonder(
    db,
    g.sahibi,
    session.sub,
    g.tip,
    typeof g.mesaj === "string" ? g.mesaj : null,
    ilkAd
  );
  return Response.json({ ok: true });
}
