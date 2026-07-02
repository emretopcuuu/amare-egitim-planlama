import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { mektupGetirVeyaUret } from "@/lib/mektup";
import { mektupSeslendir } from "@/lib/yansima";
import { katilimciyaBildir } from "@/lib/push";
import { yazAuditLog } from "@/lib/auditLog";

type Db = ReturnType<typeof supabaseAdmin>;

// [E1] ZİRVEYE HAZIRLIK — reveal öncesi teknik sigorta. Kapanışta 29 telefon aynı
// anda rapor+mektup+ses açtığında API yükünü sıfıra indirmek için tüm ağır
// varlıkları (Ayna Mektubu = LLM, mektup sesi = TTS) ÖNCEDEN üretiriz. Üretim
// idempotenttir (mektupGetirVeyaUret / mektupSeslendir zaten "varsa atla"). Rapor
// VERİSİ ratings/missions'tan anlık hesaplanır (ucuz) — ön-üretim gerektirmez.

export type HazirlikDurumu = {
  toplam: number; // katılımcı sayısı
  mektupVar: number; // mirror_letters kaydı olan
  klonlu: number; // kendi ses klonu (voice_profiles klonlandi) olan
  sesVar: number; // mektup sesi (voice_path) üretilmiş
  hazir: boolean; // mektuplar tam + klonlulara ses tam
};

export async function hazirlikDurumu(db: Db): Promise<HazirlikDurumu> {
  const [{ data: kisiler }, { data: mektuplar }, { data: klonlar }] = await Promise.all([
    db.from("participants").select("id").eq("role", "participant"),
    db.from("mirror_letters").select("participant_id, voice_path"),
    db.from("voice_profiles").select("participant_id").eq("status", "klonlandi"),
  ]);
  const toplam = (kisiler ?? []).length;
  const mektupSet = new Set((mektuplar ?? []).map((m) => m.participant_id));
  const sesSet = new Set((mektuplar ?? []).filter((m) => m.voice_path).map((m) => m.participant_id));
  const klonSet = new Set((klonlar ?? []).map((k) => k.participant_id));
  // Klonu olup mektubu olan kişilerden kaçının sesi üretilmiş.
  const klonluSesBekleyen = [...klonSet].filter((id) => mektupSet.has(id));
  const klonluSesVar = klonluSesBekleyen.filter((id) => sesSet.has(id)).length;

  return {
    toplam,
    mektupVar: mektupSet.size,
    klonlu: klonSet.size,
    sesVar: sesSet.size,
    hazir: toplam > 0 && mektupSet.size >= toplam && klonluSesVar >= klonluSesBekleyen.length,
  };
}

export type EksikSonuc =
  | { yapilan: "mektup+ses" | "ses"; ad: string; kalan: number }
  | { yapilan: null; kalan: 0 }
  | { yapilan: "hata"; kalan: number };

// Bir eksik varlığı tamamlar (idempotent, tek adım): önce mektubu eksik birini,
// yoksa klonu olup mektup sesi eksik birini tamamlar. İstemci/ön-uçuş bunu döngüyle
// çağırır — böylece tek istek fonksiyon süre sınırına takılmaz, ilerleme görünür.
export async function birEksigiTamamla(db: Db): Promise<EksikSonuc> {
  const [{ data: kisiler }, { data: mektuplar }, { data: klonlar }] = await Promise.all([
    db.from("participants").select("id, full_name").eq("role", "participant"),
    db.from("mirror_letters").select("participant_id, voice_path"),
    db.from("voice_profiles").select("participant_id").eq("status", "klonlandi"),
  ]);
  const kisi = kisiler ?? [];
  const mektupMap = new Map((mektuplar ?? []).map((m) => [m.participant_id, m.voice_path]));
  const klonSet = new Set((klonlar ?? []).map((k) => k.participant_id));

  // 1) Mektubu hiç olmayan biri → mektup (LLM) + ses (TTS, klonu varsa).
  const mektupEksik = kisi.filter((k) => !mektupMap.has(k.id));
  if (mektupEksik.length > 0) {
    const sirada = mektupEksik[0];
    const sonuc = await mektupGetirVeyaUret(db, sirada.id, sirada.full_name);
    if (sonuc.durum !== "hazir") return { yapilan: "hata", kalan: mektupEksik.length };
    if (klonSet.has(sirada.id)) await mektupSeslendir(db, sirada.id, sonuc.icerik);
    return { yapilan: "mektup+ses", ad: sirada.full_name, kalan: mektupEksik.length - 1 };
  }

  // 2) Mektubu var ama klonu olup mektup sesi eksik biri → yalnız ses.
  const sesEksik = kisi.filter(
    (k) => klonSet.has(k.id) && mektupMap.has(k.id) && !mektupMap.get(k.id)
  );
  if (sesEksik.length > 0) {
    const sirada = sesEksik[0];
    const { data: m } = await db
      .from("mirror_letters")
      .select("content")
      .eq("participant_id", sirada.id)
      .maybeSingle();
    if (m?.content) await mektupSeslendir(db, sirada.id, m.content);
    return { yapilan: "ses", ad: sirada.full_name, kalan: sesEksik.length - 1 };
  }

  return { yapilan: null, kalan: 0 };
}

// [E1-b] Ön-uçuş kancası: orkestratör kritik satırdan önce çağırır. Kapasite kadar
// eksiği tamamlar (tik başına birkaç), sonra hazırlık durumunu döndürür. Süre
// sınırına takılmamak için kapasiteyle sınırlı; her tikte tekrar çalışır.
export async function zirveHazirlikOnUcus(
  db: Db,
  kapasite = 3
): Promise<HazirlikDurumu> {
  for (let i = 0; i < kapasite; i++) {
    const sonuc = await birEksigiTamamla(db);
    if (sonuc.yapilan === null || sonuc.yapilan === "hata") break;
  }
  return hazirlikDurumu(db);
}

// Ön-uçuş gideremezse adminlere uyarı push'u. Yalnız dar uyarı penceresinde
// (ateşlemeye ~15 dk kala) çağrılır; her tikte tekrar → yaklaşan son teslime
// dair birkaç hatırlatma. Settings kilidi yok (reset'e bağımlılık olmasın).
export async function zirveHazirlikUyar(db: Db, mesaj: string): Promise<void> {
  const { data: adminler } = await db.from("participants").select("id").eq("role", "admin");
  for (const a of adminler ?? []) {
    await katilimciyaBildir(db, a.id, "⚠️ Zirveye Hazırlık", mesaj, "/admin/zirveye-hazirlik").catch(() => {});
  }
  await yazAuditLog(db, null, "zirve_hazirlik_uyari", { mesaj });
}
