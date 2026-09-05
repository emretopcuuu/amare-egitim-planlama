// Görüşme dosyası okuma — kod, taşıyıcı anahtardır (rastgele 6 harf/rakam).
// Emre WhatsApp mesajındaki bağlantıya dokunur, dosya açılır; aday da kendi
// kodusuyla kendi cevaplarını görebilir. IP başına okuma sınırı, kaba kod
// taramasını anlamsız kılar.
interface Ortam {
  BULTEN_KV?: KVNamespace;
}

const GUNLUK_OKUMA_SINIRI = 60;

export const onRequestGet: PagesFunction<Ortam> = async ({ request, env }) => {
  if (!env.BULTEN_KV) return json(501, { ok: false, sebep: "yapilandirilmadi" });

  const url = new URL(request.url);
  const kod = (url.searchParams.get("kod") ?? "").trim().toUpperCase();
  if (!/^ET-[A-Z2-9]{6}$/.test(kod)) return json(400, { ok: false, sebep: "kod" });

  const ip = request.headers.get("cf-connecting-ip") ?? "bilinmiyor";
  const gun = new Date().toISOString().slice(0, 10);
  const rlAnahtar = `rl:d:${ip}:${gun}`;
  const sayi = Number((await env.BULTEN_KV.get(rlAnahtar)) ?? "0");
  if (sayi >= GUNLUK_OKUMA_SINIRI) return json(429, { ok: false, sebep: "sinir" });
  await env.BULTEN_KV.put(rlAnahtar, String(sayi + 1), { expirationTtl: 86400 });

  const kayit = await env.BULTEN_KV.get(`dosya:${kod}`);
  if (!kayit) return json(404, { ok: false, sebep: "yok" });
  return new Response(kayit, {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

function json(status: number, veri: unknown) {
  return new Response(JSON.stringify(veri), {
    status,
    headers: { "content-type": "application/json" },
  });
}
