import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
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

  const { error } = await supabaseAdmin().from("push_subscriptions").upsert(
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
  return Response.json({ ok: true });
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
