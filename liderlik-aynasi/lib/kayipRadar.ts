import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { whatsAppYapilandirildiMi, whatsAppGonder, sablonSidleri } from "@/lib/whatsapp";

type Db = ReturnType<typeof supabaseAdmin>;

// [E8] KAMP İÇİ KAYIP RADARI — kamp modunda sessizleşenler. Mevcut churn_radar
// (nudged_at, admin_alerted_at) + son aktivite ile admin'e "kim kayıyor + ne
// zamandır sessiz + önerilen insan dokunuşu" tablosu. (Kamp SONRASI churn
// merdiveni /admin/kapanis'te ayrı yaşar — bu kamp İÇİ operasyon.)

export type KayipSatiri = {
  id: string;
  ad: string;
  takim: string | null;
  sessizSaat: number | null; // son aktiviteden bu yana saat (null = hiç)
  waGonderildi: boolean;
  oneri: string; // önerilen insan dokunuşu
};

function oneriSec(sessizSaat: number | null): string {
  if (sessizSaat == null) return "Hiç görev yapmadı — yüz yüze bul, kaybı önle.";
  if (sessizSaat >= 24) return "Kişisel ara. Mola/kriz olabilir; insan sesi lazım.";
  if (sessizSaat >= 12) return "Yüz yüze bul, hâlini sor (görevi değil).";
  return "Kısa bir dokunuş: yanına git, bir şey iyi mi diye sor.";
}

export async function kayipRadarListesi(db: Db): Promise<KayipSatiri[]> {
  const [{ data: kisiler }, { data: radar }, { data: sonYanit }, { data: sonPuan }] =
    await Promise.all([
      db.from("participants").select("id, full_name, team").eq("role", "participant"),
      db.from("churn_radar").select("participant_id, admin_alerted_at, wa_sent_at"),
      db.from("missions").select("participant_id, responded_at").not("responded_at", "is", null),
      db.from("ratings").select("rater_id, created_at"),
    ]);

  // Son aktivite: en yeni responded_at veya rating.
  const sonEtkinlik = new Map<string, number>();
  for (const y of sonYanit ?? []) {
    if (!y.responded_at) continue;
    const t = Date.parse(y.responded_at);
    if (t > (sonEtkinlik.get(y.participant_id) ?? 0)) sonEtkinlik.set(y.participant_id, t);
  }
  for (const p of sonPuan ?? []) {
    const t = Date.parse(p.created_at);
    if (t > (sonEtkinlik.get(p.rater_id) ?? 0)) sonEtkinlik.set(p.rater_id, t);
  }

  const adMap = new Map((kisiler ?? []).map((k) => [k.id, { ad: k.full_name, takim: k.team }]));
  const simdi = Date.now();

  // Yalnız admin'e işaretlenmiş (drift onaylı = "3+ sessiz") kişileri göster.
  const satirlar: KayipSatiri[] = [];
  for (const r of radar ?? []) {
    if (!r.admin_alerted_at) continue;
    const kisi = adMap.get(r.participant_id);
    if (!kisi) continue;
    const son = sonEtkinlik.get(r.participant_id);
    const sessizSaat = son ? Math.floor((simdi - son) / 3_600_000) : null;
    satirlar.push({
      id: r.participant_id,
      ad: kisi.ad,
      takim: kisi.takim,
      sessizSaat,
      waGonderildi: !!r.wa_sent_at,
      oneri: oneriSec(sessizSaat),
    });
  }
  // En uzun sessizlik önce (null = hiç aktivite = en riskli).
  return satirlar.sort((a, b) => (b.sessizSaat ?? 1e9) - (a.sessizSaat ?? 1e9));
}

// [E8] Kamp modunda drift onaylanınca kişiye WhatsApp "seni özledik" dokunuşu
// (duyuru şablonu; serbest metin). Meta-onaylı şablon + Twilio. Webhook'a
// DOKUNULMAZ. Tek seferlik guard'ı çağıran taraf (tik) wa_sent_at ile yönetir.
export async function kampKayipWhatsApp(
  db: Db,
  ad: string,
  telefon: string | null
): Promise<boolean> {
  if (!telefon || !whatsAppYapilandirildiMi()) return false;
  const sid = (await sablonSidleri(db))["duyuru"];
  if (!sid) return false;
  const govde =
    "Bugün seni sahada az gördük 🙂 Küçük bir adım bile yeter — telefonunu aç, " +
    "AYNA seni bekliyor. İyi olduğunu bilelim yeter.";
  return whatsAppGonder(telefon, sid, { "1": ad.split(" ")[0], "2": govde });
}
