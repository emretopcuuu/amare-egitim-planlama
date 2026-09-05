// Tek dokunuşla listeden ayrılma — her mailin altındaki imzalı bağlantı.
// İmza (HMAC) doğruysa abone "iptal" işaretlenir; kimse başkasını
// listeden çıkaramaz. Yanıt, markaya yakışır sade bir sayfadır.
import { aboneCoz, imzala, type PostaOrtam } from "./_posta";

export const onRequestGet: PagesFunction<PostaOrtam> = async ({
  request,
  env,
}) => {
  if (!env.BULTEN_KV || !env.POSTA_GOREV_ANAHTARI) {
    return sayfa(501, "Sistem şu an yapılandırılmamış.", "");
  }
  const url = new URL(request.url);
  const eposta = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  const t = url.searchParams.get("t") ?? "";
  if (!eposta || !t || t !== (await imzala(eposta, env.POSTA_GOREV_ANAHTARI))) {
    return sayfa(400, "Bu bağlantı geçersiz ya da eksik.", "");
  }
  const ham = await env.BULTEN_KV.get(`abone:${eposta}`);
  if (ham) {
    const abone = aboneCoz(ham);
    abone.durum = "iptal";
    await env.BULTEN_KV.put(`abone:${eposta}`, JSON.stringify(abone));
  }
  return sayfa(
    200,
    "Listeden ayrıldın.",
    "Artık bu adrese not gelmeyecek. Fikrin değişirse, kapı emretopcu.ai'de her zaman açık.",
  );
};

function sayfa(status: number, baslik: string, metin: string) {
  return new Response(
    `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${baslik}</title></head>
<body style="margin:0;background:#f1efe9;font-family:Georgia,serif;color:#1a1a1d;">
<div style="max-width:480px;margin:0 auto;padding:96px 24px;text-align:center;">
  <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#9a7a2c;margin:0 0 20px;">Emre Topçu</p>
  <h1 style="font-size:28px;margin:0 0 14px;">${baslik}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5f5c55;margin:0;">${metin}</p>
  <p style="margin-top:28px;"><a href="https://emretopcu.ai" style="color:#9a7a2c;">emretopcu.ai</a></p>
</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
