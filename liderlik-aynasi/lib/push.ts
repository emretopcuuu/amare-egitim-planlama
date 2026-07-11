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
  // 1) GELEN KUTUSU: push olsun olmasın her bildirim kalıcı saklanır (geçmiş +
  //    okunmamış sayısı + detay + bağlantı). Push gelmese de kişi buradan görür.
  try {
    await db.from("bildirimler").insert({ participant_id: participantId, baslik, govde, url });
  } catch {
    // kayıt başarısızsa push'u yine de dene
  }
  // 2) Anlık push (VAPID + abonelik varsa).
  if (!hazirla()) return;
  const { data } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("participant_id", participantId);
  if (!data?.length) return;
  const yuk = JSON.stringify({ baslik, govde, url });
  await Promise.all(data.map((a) => aboneyeGonder(db, a, yuk)));
}

// [ADMIN-UX6] Tüm adminlere push + gelen kutusu. zirveHazirlikUyar'daki elle
// tekrarlanan kalıbın ortak hali — sistem sağlığı alarmları da bunu kullanır.
export async function adminlereBildir(
  db: Db,
  baslik: string,
  govde: string,
  url = "/admin"
): Promise<void> {
  const { data: adminler } = await db.from("participants").select("id").eq("role", "admin");
  for (const a of adminler ?? []) {
    await katilimciyaBildir(db, a.id, baslik, govde, url).catch(() => {});
  }
}

export async function herkeseBildir(
  db: Db,
  baslik: string,
  govde: string,
  url = "/program"
): Promise<void> {
  // GÜVENLİK KİLİDİ: prova aktifse "herkese" duyuru gerçek onboarding'deki
  // kişilere GİTMEZ — yalnız prova'nın tek sabitlendiği katılımcıya düşer.
  // Merkezi burada (tek yerde) çünkü tik.ts/kampRadyosu.ts'teki her
  // herkeseBildir çağrısı otomatik bu korumayı miras alır (yeni çağrı
  // eklense bile tek tek hatırlamaya gerek kalmaz).
  let hedefKisiIdler: string[] | null = null; // null = herkes (normal davranış)
  try {
    const { data: provaAyar } = await db
      .from("settings")
      .select("key, value")
      .in("key", ["prova_aktif", "prova_katilimci_id"]);
    const m = new Map((provaAyar ?? []).map((a) => [a.key, a.value]));
    if (m.get("prova_aktif") === "true") {
      const pid = m.get("prova_katilimci_id");
      hedefKisiIdler = pid ? [pid] : []; // katılımcı yoksa kimseye gitmesin
    }
  } catch {
    // prova durumu okunamadıysa normal (herkese) davranışa düş
  }

  // 1) GELEN KUTUSU: kalıcı kaydet (push'tan bağımsız).
  try {
    let kisiIdler = hedefKisiIdler;
    if (kisiIdler === null) {
      const { data: kisiler } = await db
        .from("participants")
        .select("id")
        .eq("role", "participant");
      kisiIdler = (kisiler ?? []).map((k) => k.id);
    }
    if (kisiIdler.length) {
      await db
        .from("bildirimler")
        .insert(kisiIdler.map((id) => ({ participant_id: id, baslik, govde, url })));
    }
  } catch {
    // kayıt başarısızsa push'u yine de dene
  }
  // 2) Anlık push.
  if (!hazirla()) return;
  let sorgu = db.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (hedefKisiIdler !== null) sorgu = sorgu.in("participant_id", hedefKisiIdler);
  const { data } = await sorgu;
  if (!data?.length) return;
  const yuk = JSON.stringify({ baslik, govde, url });
  // Kamp ölçeğinde (≤ ~100 abone) paralel gönderim sorunsuz
  await Promise.all(data.map((a) => aboneyeGonder(db, a, yuk)));
}
