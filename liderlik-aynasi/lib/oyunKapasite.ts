import "server-only";
import type { Db } from "@/lib/degerlendirme";

// OYUN İKİLİSİ KAPASİTESİ — bir kombinasyon (ör. "atv+hazine_avi", grupların
// dolduğu ikili) admin panelinden KAPATILABİLİR: yeni katılımcılar o ikiliyi
// artık seçemez, diğer 2 ikiliye (Big Bubble'lı olanlara) yönlendirilir.
// Zaten atanmış kişiler ETKİLENMEZ — bu yalnız YENİ seçimi kapatır.
// settings.oyun_kapali_kombolar = JSON string[] (kanonik anahtarlar).

const AYAR_ANAHTARI = "oyun_kapali_kombolar";

export async function kapaliKombolar(db: Db): Promise<string[]> {
  const { data } = await db.from("settings").select("value").eq("key", AYAR_ANAHTARI).maybeSingle();
  if (!data?.value) return [];
  try {
    const ayr = JSON.parse(data.value);
    return Array.isArray(ayr) ? ayr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Bir kombinasyonu kapat/aç (admin). Diğerlerine dokunmaz.
export async function kombinasyonAyarla(db: Db, anahtar: string, kapali: boolean): Promise<string[]> {
  const mevcut = await kapaliKombolar(db);
  const yeni = kapali ? [...new Set([...mevcut, anahtar])] : mevcut.filter((k) => k !== anahtar);
  await db.from("settings").upsert({
    key: AYAR_ANAHTARI,
    value: JSON.stringify(yeni),
    updated_at: new Date().toISOString(),
  });
  return yeni;
}
