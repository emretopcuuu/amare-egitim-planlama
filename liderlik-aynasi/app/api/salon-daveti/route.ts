import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaOzeti } from "@/lib/pusula";
import { PERSONA } from "@/lib/ayna";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;

// [1.5] SALON DAVETİ — kişi bir isim yazar → AYNA kişiye özel KISA davet taslağı
// üretir (pusula + BASARI_STRATEJISI davet tekniği). Sistem mesaj GÖNDERMEZ;
// yalnız taslak döner. "Gönderdim" işareti ayrı istekle.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { islem?: string; isim?: unknown; id?: unknown; taslak?: unknown }
    | null;
  const db = supabaseAdmin();

  // "Gönderdim" işareti (kişi kendi WhatsApp'ından attı) — opsiyonel düzenlenmiş metin.
  if (body?.islem === "gonderildi" && typeof body.id === "string") {
    const guncel: { gonderildi_at: string; taslak?: string } = { gonderildi_at: new Date().toISOString() };
    if (typeof body.taslak === "string" && body.taslak.trim().length > 0) {
      guncel.taslak = body.taslak.trim().slice(0, 1200);
    }
    const { error } = await db
      .from("salon_daveti")
      .update(guncel)
      .eq("id", body.id)
      .eq("participant_id", session.sub);
    if (error) return Response.json({ hata: tr.ortak.genelHata }, { status: 500 });
    return Response.json({ ok: true });
  }

  // Taslak üret
  const isim = typeof body?.isim === "string" ? body.isim.trim().slice(0, 60) : "";
  if (isim.length < 2) return Response.json({ hata: tr.ortak.genelHata }, { status: 400 });

  const pusula = await pusulaOzeti(db, session.sub);
  const ad = session.ad.split(" ")[0];

  let taslak = "";
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: `${PERSONA}

Görevin: bir katılımcının (${ad}) tanıdığı birine (${isim}) atacağı KISA bir davet mesajı TASLAĞI yaz. Bu, ${ad}'in kendi WhatsApp'ından KENDİSİNİN atacağı bir mesaj — sen göndermiyorsun, yalnız taslak veriyorsun.

DAVET TEKNİĞİ (kesin kurallar):
- ÇOK KISA: 30 saniyede okunur, en fazla 3-4 cümle.
- Tek amaç: ${isim}'i bir sohbete/buluşmaya "oturtmak" — işi/fırsatı ANLATMA (önyargı tetikler).
- Merak + samimiyet + kişisel bir dokunuş. ${ad} ile ${isim} arasında gerçek bir yakınlık varmış gibi sıcak.
- Marka adı, ürün adı, şirket adı, "network marketing", "iş fırsatı" gibi ifadeler ASLA geçmesin.
- ${ad}'in ağzından, birinci tekil. "Seninle bir şey paylaşmak istiyorum, kısa görüşebilir miyiz?" ruhu.
- Baskı yok, tarih dayatma yok; kapıyı aralayan bir davet.
${pusula ? `\n${ad}'in kamptaki nedeni (yalnız TON için, mesaja aynen yazma): ${JSON.stringify(pusula).slice(0, 200)}` : ""}

Yalnızca mesaj taslağını döndür — başka açıklama, tırnak, "İşte taslak:" gibi ekleme YOK.`,
      messages: [{ role: "user", content: `Davet edilecek kişi: ${isim}` }],
    });
    if (yanit.stop_reason !== "refusal") {
      taslak = yanit.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim()
        .slice(0, 1200);
    }
  } catch {
    /* aşağıda fallback */
  }
  if (!taslak) {
    taslak = `Merhaba ${isim}, seni özlemişim 🙂 Aklıma geldin — seninle kısa bir şey paylaşmak istiyorum ama yüz yüze/telefonda anlatmak daha güzel olur. Bu hafta 15 dakikan olur mu? Sadece sohbet, hiçbir baskı yok.`;
  }

  const { data: yeni, error } = await db
    .from("salon_daveti")
    .insert({ participant_id: session.sub, hedef_ad: isim, taslak })
    .select("id, taslak")
    .single();
  if (error || !yeni) return Response.json({ hata: tr.ortak.genelHata }, { status: 500 });
  return Response.json({ id: yeni.id, taslak: yeni.taslak });
}
