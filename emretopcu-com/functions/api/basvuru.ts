// Ters Mülakat başvurusu — Cloudflare Pages Function.
// 5 cevabı doğrular, benzersiz dosya kodu üretir, KV'ye yazar (90 gün) ve
// varsa Workers AI ile EMRE'YE ÖZEL kısa bir ön okuma notu ekler. AI düşerse
// dosya AI'sız kaydedilir — başvuru asla AI'ya bağımlı değildir (radyo deseni).
interface AiCalistirici {
  run(model: string, girdi: unknown): Promise<unknown>;
}
interface Ortam {
  BULTEN_KV?: KVNamespace;
  AI?: AiCalistirici;
}

const KOD_ALFABE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O/1/I yok
const GUNLUK_BASVURU_SINIRI = 5;
const DOSYA_TTL_SANIYE = 90 * 24 * 3600;

function kodUret(): string {
  const dizi = new Uint8Array(6);
  crypto.getRandomValues(dizi);
  let kod = "";
  for (const b of dizi) kod += KOD_ALFABE[b % KOD_ALFABE.length];
  return `ET-${kod}`;
}

export const onRequestPost: PagesFunction<Ortam> = async ({ request, env }) => {
  if (!env.BULTEN_KV) return json(501, { ok: false, sebep: "yapilandirilmadi" });

  let govde: {
    cevaplar?: { soru?: string; cevap?: string }[];
    testProfil?: { neden?: string; zaman?: string; zorluk?: string };
    web?: string; // bal küpü
  };
  try {
    govde = (await request.json()) as typeof govde;
  } catch {
    return json(400, { ok: false, sebep: "govde" });
  }
  // Bal küpü: botlara gerçekmiş gibi davran, hiçbir şey yazma.
  if (govde.web) return json(200, { ok: true, kod: "ET-TESEKKUR" });

  const cevaplar = (govde.cevaplar ?? [])
    .filter((c) => typeof c.soru === "string" && typeof c.cevap === "string")
    .map((c) => ({
      soru: String(c.soru).slice(0, 300),
      cevap: String(c.cevap).trim().slice(0, 1200),
    }));
  if (cevaplar.length !== 5 || cevaplar.some((c) => c.cevap.length < 2)) {
    return json(400, { ok: false, sebep: "cevaplar" });
  }

  // IP başına günlük başvuru sınırı
  const ip = request.headers.get("cf-connecting-ip") ?? "bilinmiyor";
  const gun = new Date().toISOString().slice(0, 10);
  const rlAnahtar = `rl:b:${ip}:${gun}`;
  const sayi = Number((await env.BULTEN_KV.get(rlAnahtar)) ?? "0");
  if (sayi >= GUNLUK_BASVURU_SINIRI) return json(429, { ok: false, sebep: "sinir" });
  await env.BULTEN_KV.put(rlAnahtar, String(sayi + 1), { expirationTtl: 86400 });

  // Yapay zekâ ön okuması — YALNIZ Emre'nin dosya görünümü için; adaya
  // gösterilmez. Kurallar: yargı yok, gelir tahmini yok, kariyer adı yok.
  let onOkuma: string | null = null;
  try {
    if (env.AI) {
      const yanit = (await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          {
            role: "system",
            content:
              "Sen bir görüşme hazırlık asistanısın. Sana bir adayın 5 soruya verdiği cevaplar verilecek. Görüşmeyi yapacak kişi (Emre) için TÜRKÇE, en fazla 3 cümlelik bir ön okuma yaz: adayın ana motivasyonu, en büyük engeli ve görüşmede dikkat edilecek tek nokta. Kesinlikle yapma: gelir tahmini, başarı vaadi, yargılayıcı dil, kariyer basamağı adı. Yalnız cevaplarında yazandan yola çık; uydurma.",
          },
          {
            role: "user",
            content: cevaplar.map((c) => `S: ${c.soru}\nC: ${c.cevap}`).join("\n\n"),
          },
        ],
        max_tokens: 220,
      })) as {
        response?: string;
        choices?: { message?: { content?: string } }[];
      };
      const metin = (
        yanit?.response ??
        yanit?.choices?.[0]?.message?.content ??
        ""
      ).trim();
      if (metin.length > 20) onOkuma = metin.slice(0, 700);
    }
  } catch {
    onOkuma = null; // AI düştü — dosya yine de kaydedilir
  }

  const kod = kodUret();
  const dosya = {
    kod,
    tarih: new Date().toISOString(),
    cevaplar,
    testProfil: govde.testProfil ?? null,
    onOkuma,
  };
  await env.BULTEN_KV.put(`dosya:${kod}`, JSON.stringify(dosya), {
    expirationTtl: DOSYA_TTL_SANIYE,
  });
  return json(200, { ok: true, kod });
};

function json(status: number, veri: unknown) {
  return new Response(JSON.stringify(veri), {
    status,
    headers: { "content-type": "application/json" },
  });
}
