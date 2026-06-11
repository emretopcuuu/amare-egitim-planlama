import "server-only";
import webpush from "web-push";
import type { Db } from "@/lib/degerlendirme";

// Web Push (PWA) gönderimi. VAPID anahtarları yoksa sessizce no-op:
// AYNA çalışmaya devam eder, görevler yalnızca uygulama içinde görünür.

let yapilandirildi = false;

function hazirla(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!yapilandirildi) {
    webpush.setVapidDetails("mailto:ayna@liderlik-aynasi.app", pub, priv);
    yapilandirildi = true;
  }
  return true;
}

type AboneSatiri = { id: string; endpoint: string; p256dh: string; auth: string };

async function aboneyeGonder(
  db: Db,
  abone: AboneSatiri,
  yuk: string
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: abone.endpoint,
        keys: { p256dh: abone.p256dh, auth: abone.auth },
      },
      yuk
    );
  } catch (e) {
    // 404/410: abonelik ölmüş (uygulama silinmiş, izin geri alınmış) — temizle
    const durum = (e as { statusCode?: number }).statusCode;
    if (durum === 404 || durum === 410) {
      await db.from("push_subscriptions").delete().eq("id", abone.id);
    }
  }
}

export async function katilimciyaBildir(
  db: Db,
  participantId: string,
  baslik: string,
  govde: string,
  url = "/gorevler"
): Promise<void> {
  if (!hazirla()) return;
  const { data } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("participant_id", participantId);
  if (!data?.length) return;
  const yuk = JSON.stringify({ baslik, govde, url });
  await Promise.all(data.map((a) => aboneyeGonder(db, a, yuk)));
}

export async function herkeseBildir(
  db: Db,
  baslik: string,
  govde: string,
  url = "/program"
): Promise<void> {
  if (!hazirla()) return;
  const { data } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (!data?.length) return;
  const yuk = JSON.stringify({ baslik, govde, url });
  // Kamp ölçeğinde (≤ ~100 abone) paralel gönderim sorunsuz
  await Promise.all(data.map((a) => aboneyeGonder(db, a, yuk)));
}
