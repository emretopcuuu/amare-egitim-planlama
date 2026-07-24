// Çerezsiz olay sayacı — Cloudflare Pages Function.
// KV binding OLAY_KV yoksa hiçbir şey yazmaz (204 döner). Kişisel veri tutulmaz;
// yalnız günlük olay adı sayacı: "2026-07-18:soz-paylas" -> "12".
interface Ortam {
  OLAY_KV?: KVNamespace;
}

const IZINLI = new Set([
  "soz-paylas",
  "soz-story",
  "proj-paylas",
  "sim-tamam",
  "test-bitti",
  "emreye-sor",
  "salon-qr",
  "plan-indir",
]);

export const onRequestPost: PagesFunction<Ortam> = async ({ request, env }) => {
  try {
    const { o } = (await request.json()) as { o?: unknown };
    if (typeof o === "string" && IZINLI.has(o) && env.OLAY_KV) {
      const gun = new Date().toISOString().slice(0, 10);
      const anahtar = `${gun}:${o}`;
      const mevcut = Number((await env.OLAY_KV.get(anahtar)) || "0");
      await env.OLAY_KV.put(anahtar, String(mevcut + 1), {
        expirationTtl: 60 * 60 * 24 * 120,
      });
    }
  } catch {
    /* yoksay */
  }
  return new Response(null, { status: 204 });
};
