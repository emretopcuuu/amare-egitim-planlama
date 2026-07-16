import "server-only";
import { getSession } from "@/lib/auth/session";
import Anthropic from "@anthropic-ai/sdk";
import { aynaClient } from "@/lib/aynaClient";
import { aiLimitYaniti } from "@/lib/aiLimit";

export const maxDuration = 30;

const YEDEK_SORULAR: Record<number, string> = {
  2: "Bu değer sana somut olarak ne kazandırıyor? Hayatına nasıl yansıyor?",
  3: "Bu değer olmadan nasıl biri olurdun? İçinde ne eksik kalırdı?",
};

// Cevabın AI'ya gönderilmeye yeterince anlamlı olup olmadığını kontrol et:
// en az 20 karakter ve 3 kelime.
function anlamliMi(c: string): boolean {
  const temiz = c.trim();
  return temiz.length >= 20 && temiz.split(/\s+/).length >= 3;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ soru: null }, { status: 401 });
  }

  // Bozuk/eksik gövdede ham 500 yerine yedek soruya düş (istemci dayanıklı).
  const body = (await req.json().catch(() => null)) as {
    deger?: unknown;
    tur?: unknown;
    oncekiCevaplar?: unknown;
  } | null;
  const deger = typeof body?.deger === "string" ? body.deger : "";
  const tur = body?.tur === 3 ? 3 : 2;
  const oncekiCevaplar = Array.isArray(body?.oncekiCevaplar)
    ? (body.oncekiCevaplar as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  // Anlamlı cevap yoksa veya API key yoksa yedek kullan
  const anlamliCevap = oncekiCevaplar.find(anlamliMi);
  if (!deger || !anlamliCevap || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }

  // Maliyet sigortası (bkz. lib/aiLimit.ts) — limitteyse yedek soruyla devam
  // (akışı hiç bozma; sadece AI çağrısını atla).
  const limit = await aiLimitYaniti(session.sub, "neden-derinles");
  if (limit) return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });

  try {
    const client = aynaClient();
    const gecmis = oncekiCevaplar.map((c, i) => `${i + 1}. "${c}"`).join("\n");
    const turTalimat =
      tur === 2
        ? "Kişinin bu cevabının arkasındaki ihtiyaca veya duyguya dokunan kısa bir soru sor. Cevaptaki kelimeleri aynen kullanma."
        : "Bu değerin kişi için taşıdığı en derin anlamı ortaya çıkaran güçlü bir son soru sor.";

    // MALİYET: bu çağrı kişi başı en fazla 6 kez tetiklenir (3 değer × tur 2-3)
    // — düşük hacim, kalite önemli. Haiku'nun ürettiği sorularda ton kaçması
    // (resmi "-sunuz" çoğul hitap, garip gramer) görüldü; Sonnet'e yükseltildi.
    // Not: "Sevginin seni en çok kim hissettiriyor?" gibi iki yönlü okunabilen
    // sorular (kişi sevildiğini mi soruyor yoksa kendi sevdiklerini mi anlamıyor)
    // canlı kampta katılımcıyı durdurdu — netlik kuralı bunun için eklendi.
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: `Sen AYNA'sın — sıcak, meraklı bir koç. "${deger}" değeri hakkındaki bu cevapları oku:\n${gecmis}\n\n${turTalimat}\n\nKurallar: Türkçe, DOĞRU DİLBİLGİSİ, en fazla 10 kelime, soru işaretiyle bitsin. Kişiye MUTLAKA tekil "sen" diliyle hitap et — "-sunuz/-nız" gibi resmi çoğul ekler ASLA kullanma. Soru TEK bir açık anlamla okunmalı — kişi "bunu nasıl yani, ne demek istiyorsun?" diye sormak zorunda kalmamalı. Aynı anda birden fazla yöne çekilebilecek soyut/şiirsel kalıplardan kaçın (örn. "X'i sana en çok kim hissettiriyor?" gibi kimin kimi etkilediği belirsiz kurgular). Doğrudan, somut ve tek anlamlı sor — gerekiyorsa "sen" özneli düz bir cümle kur. Sadece soruyu yaz, başka hiçbir şey ekleme.`,
        },
      ],
    });

    const soru = msg.content[0].type === "text" ? msg.content[0].text.trim() : null;

    // Basit kalite kontrolü: çok uzun, ? ile bitmiyor, resmi çoğul hitap
    // ("musunuz", "-sınız" vb.) kaçmış ya da "kimim" gibi yanlış gramer.
    const resmiCogulKacagi = /\b\w*(sunuz|siniz|sünüz|sınız|nız|niz|nüz|nuz)\??$/i;
    const gecerli =
      soru &&
      soru.endsWith("?") &&
      soru.length <= 100 &&
      soru.split(/\s+/).length <= 15 &&
      !resmiCogulKacagi.test(soru);

    return Response.json({ soru: gecerli ? soru : YEDEK_SORULAR[tur] });
  } catch {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }
}
