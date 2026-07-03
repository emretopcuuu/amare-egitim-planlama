import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { rozetVer, ROZETLER } from "@/lib/rozet";
import { katilimciyaBildir } from "@/lib/push";

// [KURULUM 8] EL ELE — "yanındakinin telefonunu kontrol et". Kurulu bir kişi QR
// gösterir; komşusu okutup bu ucu çağırır. İKİSİNİN de push aboneliği varsa
// (kurulum kanıtı) ikisine de "El Ele" rozeti + kıvılcım. Söz şahitlik deseninin
// (lib/sozMuhur.ts sahitOl) kurulum-kanıtı varyantı.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Oturum gerekli." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) return Response.json({ hata: "Geçersiz kod." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: sahibi } = await db
    .from("participants")
    .select("id, full_name")
    .eq("camp_unlock_token", token)
    .eq("role", "participant")
    .maybeSingle();
  if (!sahibi) return Response.json({ hata: "Kişi bulunamadı." }, { status: 404 });
  if (sahibi.id === session.sub) {
    return Response.json({ hata: "Kendi kodunu okutamazsın — yanındakine göster." }, { status: 400 });
  }

  // KURULUM KANITI: ikisinin de push aboneliği olmalı (yoksa "kontrol" boş olur).
  const { data: aboneler } = await db
    .from("push_subscriptions")
    .select("participant_id")
    .in("participant_id", [sahibi.id, session.sub]);
  const abonluSet = new Set((aboneler ?? []).map((a) => a.participant_id));
  if (!abonluSet.has(sahibi.id)) {
    return Response.json(
      { hata: `${sahibi.full_name.split(" ")[0]} henüz bildirimini açmamış — önce birlikte açın.` },
      { status: 409 }
    );
  }
  if (!abonluSet.has(session.sub)) {
    return Response.json(
      { hata: "Önce SEN bildirimini aç — sonra birbirinizi doğrulayın." },
      { status: 409 }
    );
  }

  // İkisine de El Ele rozeti (idempotent — herkes bir kez kazanır).
  const [benimki] = await Promise.all([
    rozetVer(db, session.sub, "el_ele"),
    rozetVer(db, sahibi.id, "el_ele"),
  ]);
  // Karşı tarafa küçük bildirim (o an telefonda olmayabilir).
  await katilimciyaBildir(
    db,
    sahibi.id,
    "🤝 El Ele",
    `${session.ad.split(" ")[0]} kurulumunu doğruladı — ikiniz de hazırsınız.`,
    "/"
  ).catch(() => {});

  const r = ROZETLER.el_ele;
  return Response.json({
    ok: true,
    sahibiAd: sahibi.full_name.split(" ")[0],
    yeni: benimki.yeni,
    rozet: { ad: r.ad, ikon: r.ikon, kivilcim: r.kivilcim },
  });
}
