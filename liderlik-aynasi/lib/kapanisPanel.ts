import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";
import { yazAuditLog } from "@/lib/auditLog";

// FAZ 6 — ADMIN OTOMASYONU veri katmanı. Üç karar yüzeyi:
//  [6.1] pazartesiRaporu  — haftalık kohort sağlık özeti
//  [6.2] churnMerdiveni   — sessizleşenler + müdahale basamağı
//  [6.3] eylulKapisi      — Eylül kapısı: kişi başına "devam/izle/risk" kararı
// Hepsi salt-okunur agregat; ~29 kişi ölçeğinde uygulama katmanında hesaplanır.

type Kisi = { id: string; full_name: string; team: string | null; phone: string | null };

async function kisiler(db: Db): Promise<Kisi[]> {
  const { data } = await db
    .from("participants")
    .select("id, full_name, team, phone")
    .eq("role", "participant");
  return (data ?? []) as Kisi[];
}

// Kişi başına en son görev tamamlama zamanı (ms). Tamamlama yoksa yok.
async function sonAktiflik(db: Db): Promise<Map<string, number>> {
  const { data } = await db
    .from("missions")
    .select("participant_id, responded_at")
    .not("responded_at", "is", null);
  const son = new Map<string, number>();
  for (const m of data ?? []) {
    if (!m.responded_at) continue;
    const t = Date.parse(m.responded_at);
    const onceki = son.get(m.participant_id) ?? 0;
    if (t > onceki) son.set(m.participant_id, t);
  }
  return son;
}

// ---- [6.1] PAZARTESİ KOMUTA RAPORU ----
export type PazartesiRaporu = {
  toplam: number;
  aktif7: number; // son 7 günde en az 1 görev tamamlayan
  sessiz7: number; // 7+ gündür hiç tamamlama yok (hiç yapmayanlar dahil)
  kivilcim7: number; // son 7 günde kazanılan kıvılcım
  muhurTeyit: number; // ara mühür zincirinde toplam teyit
  isVerisiGiren: number; // en az 1 hafta iş verisi giren kişi
  halkaOrtalama: number; // ortalama dolan dilim (aktif görev günü / kişi, ~)
};

export async function pazartesiRaporu(db: Db): Promise<PazartesiRaporu> {
  const now = Date.now();
  const s7 = now - 7 * 86_400_000;
  const [ks, son, sparkRes, muhurRes, isvRes] = await Promise.all([
    kisiler(db),
    sonAktiflik(db),
    db.from("missions").select("participant_id, spark_points, scored_at").gte("scored_at", new Date(s7).toISOString()),
    db.from("muhur_zinciri").select("id", { count: "exact", head: true }),
    db.from("is_verisi").select("participant_id"),
  ]);

  let aktif7 = 0;
  let sessiz7 = 0;
  for (const k of ks) {
    const t = son.get(k.id);
    if (t && t >= s7) aktif7++;
    else sessiz7++;
  }
  const kivilcim7 = (sparkRes.data ?? []).reduce((a, m) => a + (m.spark_points ?? 0), 0);
  const isVerisiGiren = new Set((isvRes.data ?? []).map((r) => r.participant_id)).size;

  return {
    toplam: ks.length,
    aktif7,
    sessiz7,
    kivilcim7,
    muhurTeyit: muhurRes.count ?? 0,
    isVerisiGiren,
    halkaOrtalama: 0, // ayrıntılı halka hesabı panelde gerekmiyor; ileride
  };
}

// [6.1] Orkestratör: haftalık raporu ADMINLERE bildirir + audit'e yazar.
// Senaryo satırı eylem_tipi='fonksiyon' + eylem_hedef='pazartesi_rapor'.
export async function pazartesiRaporuGonder(db: Db): Promise<void> {
  const r = await pazartesiRaporu(db);
  const govde = `Aktif ${r.aktif7}/${r.toplam} · Sessiz ${r.sessiz7} · Kıvılcım ${r.kivilcim7} · İş verisi ${r.isVerisiGiren}/${r.toplam}. Panele bak: /admin/kapanis`;
  const { data: adminler } = await db.from("participants").select("id").eq("role", "admin");
  for (const a of adminler ?? []) {
    await katilimciyaBildir(db, a.id, "📋 Pazartesi Komuta Raporu", govde, "/admin/kapanis").catch(() => {});
  }
  await yazAuditLog(db, null, "pazartesi_rapor", {
    aktif7: r.aktif7,
    sessiz7: r.sessiz7,
    kivilcim7: r.kivilcim7,
  });
}

// ---- [6.2] CHURN MÜDAHALE MERDİVENİ ----
// Basamak: 0 = aktif (<3g), 1 = uyar (3-6g), 2 = akran kurtarma (7-13g),
// 3 = elle ara (14g+ ya da hiç aktiflik yok).
export type ChurnSatiri = {
  id: string;
  ad: string;
  takim: string | null;
  telefon: string | null; // [F#43] tek-tık WhatsApp için (E.164)
  sessizGun: number | null; // null = hiç görev tamamlamamış
  basamak: 0 | 1 | 2 | 3;
  oneri: string;
};

const CHURN_ONERI: Record<0 | 1 | 2 | 3, string> = {
  0: "Aktif — dokunma.",
  1: "Nazik hatırlatma gönder.",
  2: "Kamp arkadaşını akran kurtarmaya çağır.",
  3: "Elle ara — kişisel temas şart.",
};

function churnBasamak(sessizGun: number | null): 0 | 1 | 2 | 3 {
  if (sessizGun == null || sessizGun >= 14) return 3;
  if (sessizGun >= 7) return 2;
  if (sessizGun >= 3) return 1;
  return 0;
}

export async function churnMerdiveni(db: Db): Promise<ChurnSatiri[]> {
  const now = Date.now();
  const [ks, son] = await Promise.all([kisiler(db), sonAktiflik(db)]);
  const satirlar: ChurnSatiri[] = ks.map((k) => {
    const t = son.get(k.id);
    const sessizGun = t == null ? null : Math.floor((now - t) / 86_400_000);
    const basamak = churnBasamak(sessizGun);
    return { id: k.id, ad: k.full_name, takim: k.team, telefon: k.phone, sessizGun, basamak, oneri: CHURN_ONERI[basamak] };
  });
  // En riskliden en aktife (basamak desc, sonra sessizGun desc).
  return satirlar.sort(
    (a, b) => b.basamak - a.basamak || (b.sessizGun ?? 9999) - (a.sessizGun ?? 9999)
  );
}

// ---- [6.3] EYLÜL KAPISI KARAR PANOSU ----
// Kişi başına Eylül hazırlığı: kanıt görevi yanıtı, iş verisi, Eylül Aynası puanı
// → önerilen karar (devam / izle / risk).
export type EylulKapiSatiri = {
  id: string;
  ad: string;
  isVerisi: boolean;
  eylulPuan: number | null;
  aktif: boolean; // son 14 günde aktif
  karar: "devam" | "izle" | "risk";
};

export async function eylulKapisi(db: Db): Promise<EylulKapiSatiri[]> {
  const now = Date.now();
  const s14 = now - 14 * 86_400_000;
  const [ks, son, isvRes, aynaRes] = await Promise.all([
    kisiler(db),
    sonAktiflik(db),
    db.from("is_verisi").select("participant_id"),
    db.from("eylul_aynasi").select("participant_id, puan"),
  ]);
  const isvSet = new Set((isvRes.data ?? []).map((r) => r.participant_id));
  const aynaMap = new Map((aynaRes.data ?? []).map((r) => [r.participant_id, r.puan as number]));

  const satirlar: EylulKapiSatiri[] = ks.map((k) => {
    const t = son.get(k.id);
    const aktif = t != null && t >= s14;
    const isVerisi = isvSet.has(k.id);
    const eylulPuan = aynaMap.has(k.id) ? (aynaMap.get(k.id) as number) : null;
    // Karar: 3 sinyalden kaçı olumlu (aktif, iş verisi, ayna puanı>=6)?
    let olumlu = 0;
    if (aktif) olumlu++;
    if (isVerisi) olumlu++;
    if (eylulPuan != null && eylulPuan >= 6) olumlu++;
    const karar = olumlu >= 2 ? "devam" : olumlu === 1 ? "izle" : "risk";
    return { id: k.id, ad: k.full_name, isVerisi, eylulPuan, aktif, karar };
  });
  const sira = { risk: 0, izle: 1, devam: 2 };
  return satirlar.sort((a, b) => sira[a.karar] - sira[b.karar]);
}
