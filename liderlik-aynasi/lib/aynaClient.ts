import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/server";

// TEK MERKEZÎ AI İSTEMCİSİ — tüm modüller bunu kullanır.
//
// SDK varsayılanı 10 dakika timeout + 2 retry'dır: yoğun anda (etkinlik-sonrası
// yanıt patlaması, mentorluk sabahı) upstream/ağ takılmasında TEK bir asılı çağrı
// tik'i ya da kullanıcının "Gönder" butonunu dakikalarca bekletir; bu sırada cron
// yeni tikler başlatır (overlap). 45 sn timeout + 1 retry: başarısız olan çağrı
// zaten null-dönüş / ŞABLON fallback yollarına giriyor (sistem bunun için
// tasarlandı) — sadece 10 dk yerine 45 sn'de o yola girer.
//
// [TOKEN MUHASEBESİ] messages.create SARILDI: her (streaming olmayan) çağrının
// yanıt usage'ından model + girdi/çıktı token'ı ai_istek_log'a yazılır (best-
// effort, fire-and-forget — loglama düşse çağrı ETKİLENMEZ). Böylece kesin günlük
// token/maliyet raporu (tahmin değil) çıkar. Kaynak isteğe bağlı: aynaClient(kaynak).

function tokenLogla(
  kaynak: string,
  model: string | null,
  girdi: number,
  cikti: number,
  participantId?: string | null
): void {
  try {
    void supabaseAdmin()
      .from("ai_istek_log")
      .insert({
        participant_id: participantId ?? null,
        kaynak,
        model,
        girdi_token: girdi,
        cikti_token: cikti,
      })
      .then(
        () => {},
        () => {}
      );
  } catch {
    // muhasebe deneyimi asla kesmez
  }
}

export function aynaClient(kaynak = "bilinmiyor", participantId?: string | null): Anthropic {
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  const orijinal = client.messages.create.bind(client.messages);
  // Overload'lı metodu sarıyoruz; tip güvenliği için cast — davranış şeffaf.
  (client.messages as { create: unknown }).create = async (govde: unknown, secenek?: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yanit: any = await (orijinal as any)(govde, secenek);
    // Streaming yanıtta usage yok (Stream döner) → atla; normal Message'da var.
    const usage = yanit?.usage;
    if (usage && typeof usage.input_tokens === "number") {
      const model = yanit?.model ?? (govde as { model?: string })?.model ?? null;
      tokenLogla(kaynak, model, usage.input_tokens, usage.output_tokens ?? 0, participantId);
    }
    return yanit;
  };
  return client;
}
