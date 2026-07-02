import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// AI ÇAĞRI LİMİTİ (maliyet sigortası) — ücretli AI uçlarında kullanıcı başına
// pencere-bazlı tavan. İnsan kullanımına bol bol yeter; bir istemci bug'ının
// (retry döngüsü) ya da kötü niyetli bir döngünün sınırsız Anthropic/ElevenLabs
// faturası üretmesini keser. Sayaç TÜM AI uçları arasında ortaktır (kaynak
// alanı yalnız telemetri için).
//
// Tasarım notları:
// - DB tabanlı (ai_istek_log, migration 0080): stateless lambda'da bellek sayaç
//   tutmaz (login rate-limit ile aynı desen).
// - Limit altyapısı DÜŞERSE kullanıcı engellenmez (best-effort) — sigorta,
//   deneyimin önüne geçmez.
const PENCERE_DK = 10;
const ESIK = 40; // 10 dakikada 40 AI çağrısı — insan hızının çok üstü

export async function aiLimitYaniti(
  participantId: string,
  kaynak: string
): Promise<Response | null> {
  try {
    const db = supabaseAdmin();
    const since = new Date(Date.now() - PENCERE_DK * 60_000).toISOString();
    const { count } = await db
      .from("ai_istek_log")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", participantId)
      .gte("created_at", since);
    if ((count ?? 0) >= ESIK) {
      return Response.json({ hata: tr.ortak.cokHizli }, { status: 429 });
    }
    await db.from("ai_istek_log").insert({ participant_id: participantId, kaynak });
    return null;
  } catch {
    return null; // sigorta düştü — kullanıcıyı engelleme
  }
}
