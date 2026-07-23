import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { tumKayitlar } from "@/lib/tumKayitlar";

// AI TOKEN/MALİYET RAPORU — ai_istek_log'a aynaClient wrapper'ının yazdığı gerçek
// usage'dan (tahmin değil) günlük/24s token ve tahmini USD maliyet çıkarır.
//
// ÖNEMLİ: aiLimit (ses_yaz/plan-danis/kocu) çağrı ÖNCESİ token'sız bir işaret
// satırı atar; onları çift saymamak için YALNIZ girdi_token IS NOT NULL satırları
// okunur — bunlar gerçekten gerçekleşmiş (usage dönmüş) çağrılardır.

type Db = SupabaseClient<Database>;

// Milyon token başına USD (Anthropic yayınlanan fiyatları). Model adı prefix'e
// göre eşlenir; bilinmeyen model Opus varsayılır (üst sınır ~ güvenli tahmin).
const FIYAT: { on: string; girdi: number; cikti: number }[] = [
  { on: "claude-opus", girdi: 15, cikti: 75 },
  { on: "claude-sonnet", girdi: 3, cikti: 15 },
  { on: "claude-haiku", girdi: 1, cikti: 5 },
  { on: "claude-3-5-haiku", girdi: 0.8, cikti: 4 },
  { on: "claude-3-haiku", girdi: 0.25, cikti: 1.25 },
];

function fiyatBul(model: string | null): { girdi: number; cikti: number } {
  if (model) {
    // En uzun eşleşen prefix kazanır (3-5-haiku, 3-haiku gibi özel durumlar).
    const eslesme = FIYAT.filter((f) => model.startsWith(f.on)).sort(
      (a, b) => b.on.length - a.on.length
    )[0];
    if (eslesme) return { girdi: eslesme.girdi, cikti: eslesme.cikti };
  }
  return { girdi: 15, cikti: 75 }; // bilinmeyen → Opus (muhafazakâr üst sınır)
}

function usd(girdiTok: number, ciktiTok: number, model: string | null): number {
  const f = fiyatBul(model);
  return (girdiTok / 1_000_000) * f.girdi + (ciktiTok / 1_000_000) * f.cikti;
}

export type TokenSatir = {
  anahtar: string; // kaynak veya model
  cagri: number;
  girdi: number;
  cikti: number;
  maliyet: number; // USD
};

export type TokenOzet = {
  baslik: string;
  cagri: number;
  girdi: number;
  cikti: number;
  maliyet: number;
  kaynaklar: TokenSatir[]; // kaynağa göre kırılım (çoktan aza)
  modeller: TokenSatir[]; // modele göre kırılım
};

type LogSatir = {
  kaynak: string;
  model: string | null;
  girdi_token: number | null;
  cikti_token: number | null;
  created_at: string;
};

function pencereOzetle(baslik: string, satirlar: LogSatir[]): TokenOzet {
  const kaynakMap = new Map<string, TokenSatir>();
  const modelMap = new Map<string, TokenSatir>();
  let cagri = 0;
  let girdiTop = 0;
  let ciktiTop = 0;
  let maliyetTop = 0;

  for (const s of satirlar) {
    const girdi = s.girdi_token ?? 0;
    const cikti = s.cikti_token ?? 0;
    const m = usd(girdi, cikti, s.model);
    cagri += 1;
    girdiTop += girdi;
    ciktiTop += cikti;
    maliyetTop += m;

    const kk = s.kaynak || "bilinmiyor";
    const kmevcut = kaynakMap.get(kk) ?? { anahtar: kk, cagri: 0, girdi: 0, cikti: 0, maliyet: 0 };
    kmevcut.cagri += 1;
    kmevcut.girdi += girdi;
    kmevcut.cikti += cikti;
    kmevcut.maliyet += m;
    kaynakMap.set(kk, kmevcut);

    const mk = s.model ?? "bilinmiyor";
    const mmevcut = modelMap.get(mk) ?? { anahtar: mk, cagri: 0, girdi: 0, cikti: 0, maliyet: 0 };
    mmevcut.cagri += 1;
    mmevcut.girdi += girdi;
    mmevcut.cikti += cikti;
    mmevcut.maliyet += m;
    modelMap.set(mk, mmevcut);
  }

  const sirala = (m: Map<string, TokenSatir>) =>
    [...m.values()].sort((a, b) => b.maliyet - a.maliyet);

  return {
    baslik,
    cagri,
    girdi: girdiTop,
    cikti: ciktiTop,
    maliyet: maliyetTop,
    kaynaklar: sirala(kaynakMap),
    modeller: sirala(modelMap),
  };
}

// İki pencere döndürür: son 24 saat + bugün (Europe/Istanbul takvim günü).
export async function tokenRaporu(db: Db): Promise<{ son24: TokenOzet; bugun: TokenOzet }> {
  // Son 24 saati sınır alıp bir kez çekeriz; "bugün" bunun alt kümesidir (bugün
  // başlangıcı en fazla 24s öncesi olabileceğinden 24s penceresi onu kapsar...
  // hariç yerel gün 00:00 bazen 24s'ten eski olur → güvenli olması için 48s çek).
  const simdi = new Date();
  const esik = new Date(simdi.getTime() - 48 * 3_600_000).toISOString();

  const satirlar = await tumKayitlar<LogSatir>((bas, son) =>
    db
      .from("ai_istek_log")
      .select("kaynak, model, girdi_token, cikti_token, created_at")
      .not("girdi_token", "is", null)
      .gte("created_at", esik)
      .order("created_at", { ascending: false })
      .range(bas, son)
  );

  const son24Esik = simdi.getTime() - 24 * 3_600_000;
  // Bugün 00:00 (Europe/Istanbul, UTC+3) → UTC ms.
  const trAd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(simdi); // YYYY-MM-DD
  const bugunBasi = new Date(`${trAd}T00:00:00+03:00`).getTime();

  const son24Satir = satirlar.filter((s) => new Date(s.created_at).getTime() >= son24Esik);
  const bugunSatir = satirlar.filter((s) => new Date(s.created_at).getTime() >= bugunBasi);

  return {
    son24: pencereOzetle("Son 24 saat", son24Satir),
    bugun: pencereOzetle("Bugün", bugunSatir),
  };
}
