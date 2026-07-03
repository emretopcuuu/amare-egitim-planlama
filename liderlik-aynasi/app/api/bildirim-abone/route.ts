import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { rozetVer, ROZETLER } from "@/lib/rozet";
import { tr } from "@/lib/i18n/tr";

// PWA push aboneliği kaydı. Aynı endpoint yeniden gelirse sahibi güncellenir
// (cihaz başka katılımcıya geçtiyse eski eşleşme kalmasın).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  let govde: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.bildirim.hata }, { status: 400 });
  }

  const { endpoint, keys } = govde;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    return Response.json({ hata: tr.bildirim.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  // [KUR-2] Hoş geldin fısıltısı: kişinin İLK aboneliği mi? (Cihaz eklemede
  // tekrar fısıldamayalım — yalnız ilk kez bildirime kavuşana.)
  const { count: mevcutAbonelik } = await db
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", session.sub);

  const { error } = await db.from("push_subscriptions").upsert(
    {
      participant_id: session.sub,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    return Response.json({ hata: tr.bildirim.hata }, { status: 500 });
  }

  // [KUR-2] İzin verilen saniyede ilk push düşer: soyut bir ayar değil, büyülü
  // bir an — kişi push'un ÇALIŞTIĞINI o an görür (sessizce bozuk izin de yakalanır).
  // [KUR-7] İlk Işık rozeti + kıvılcım — ilk aboneliğe bir kez (rozetVer idempotent;
  // aboneliği silip tekrar açsa da tekrar kıvılcım vermez).
  let ilkIsik: { ad: string; ikon: string; kivilcim: number } | null = null;
  if ((mevcutAbonelik ?? 0) === 0) {
    const ilkAd = session.ad.split(" ")[0];
    await katilimciyaBildir(
      db,
      session.sub,
      `👁 Seni duyuyorum, ${ilkAd}`,
      "Bildirimlerin açık. Yolculuk boyunca sana buradan fısıldayacağım.",
      "/"
    ).catch(() => {});
    try {
      const { yeni } = await rozetVer(db, session.sub, "ilk_isik");
      if (yeni) {
        const r = ROZETLER.ilk_isik;
        ilkIsik = { ad: r.ad, ikon: r.ikon, kivilcim: r.kivilcim };
      }
    } catch {
      /* rozet verilemezse abonelik yine de başarılı */
    }
  }
  return Response.json({ ok: true, ilkIsik });
}

// Aboneliği kaldır (menüdeki "Bildirimler: Kapat"). Yalnız kişinin kendi
// endpoint kaydını siler; istemci ayrıca pushManager.unsubscribe() çağırır.
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  let govde: { endpoint?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.bildirim.hata }, { status: 400 });
  }
  const { endpoint } = govde;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return Response.json({ hata: tr.bildirim.hata }, { status: 400 });
  }
  await supabaseAdmin()
    .from("push_subscriptions")
    .delete()
    .eq("participant_id", session.sub)
    .eq("endpoint", endpoint);
  return Response.json({ ok: true });
}
