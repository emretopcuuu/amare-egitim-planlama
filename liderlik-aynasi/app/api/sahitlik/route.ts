import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { takipEttiklerim, durtmeGonder } from "@/lib/sozTakip";
import { katilimciyaBildir } from "@/lib/push";

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
  if (typeof g.sahibi !== "string" || typeof g.tip !== "string") {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  // Yetki: yalnız gerçekten şahit olunan kişiye dürtme gönderilebilir.
  const { data: tanik } = await db
    .from("soz_tanik")
    .select("id")
    .eq("soz_sahibi", g.sahibi)
    .eq("witness_id", session.sub)
    .maybeSingle();
  if (!tanik) return Response.json({ hata: "yetkisiz" }, { status: 403 });

  // [Faz 10] ŞAHİT ALKIŞI — dürtme değil, takdir. kudos'a yazılır (mevcut
  // takdir/geri bildirim akışına akar) + kişiye anında sıcak bir push.
  if (g.tip === "alkis") {
    const ilkAd = session.ad.split(" ")[0];
    const { error } = await db.from("kudos").insert({
      from_id: session.sub,
      to_id: g.sahibi,
      message: `${ilkAd} (şahidin) seni alkışlıyor — gidişin güzel!`,
    });
    if (!error) {
      try {
        await katilimciyaBildir(
          db,
          g.sahibi,
          "👏 Şahidin seni alkışlıyor",
          `${ilkAd} ilerlemeni gördü ve seni alkışlıyor.`,
          "/takdir"
        );
      } catch {
        // push yapılandırılmamış olabilir — takdir yine de kaydedildi
      }
    }
    return Response.json({ ok: !error });
  }

  await durtmeGonder(
    db,
    g.sahibi,
    session.sub,
    g.tip,
    typeof g.mesaj === "string" ? g.mesaj : null,
    session.ad.split(" ")[0]
  );
  return Response.json({ ok: true });
}
