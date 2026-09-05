// Günlük posta görevi — dış tetikleyici (cron) çağırır.
// Tüm aboneleri tarar; sırası gelen (katılımından bu yana geçen gün,
// dizideki sıradaki mailin gününe ulaşan) herkese TEK mail gönderir.
// Evergreen: herkes kendi takviminde ilerler. Gönderim başarısızsa sıra
// ilerletilmez — ertesi gün yeniden denenir. Koşu başına gönderim tavanı
// var (ücretsiz Resend kotasına saygı).
import {
  aboneCoz,
  DIZI,
  postaGonder,
  type Abone,
  type PostaOrtam,
} from "./_posta";

const KOSU_TAVANI = 80;

export const onRequestPost: PagesFunction<PostaOrtam> = async ({
  request,
  env,
}) => {
  if (!env.BULTEN_KV) return json(501, { ok: false, sebep: "yapilandirilmadi" });
  if (
    !env.POSTA_GOREV_ANAHTARI ||
    request.headers.get("x-gorev-anahtar") !== env.POSTA_GOREV_ANAHTARI
  ) {
    return json(401, { ok: false, sebep: "yetki" });
  }

  const simdi = Date.now();
  let tarandi = 0;
  let gonderildi = 0;
  let hata = 0;
  let bitti = 0; // diziyi tamamlamış aboneler
  const motorUyuyor = !env.RESEND_API_KEY;

  let imlec: string | undefined;
  for (let sayfa = 0; sayfa < 5; sayfa++) {
    const liste = await env.BULTEN_KV.list({ prefix: "abone:", cursor: imlec });
    for (const anahtar of liste.keys) {
      if (gonderildi >= KOSU_TAVANI) break;
      const ham = await env.BULTEN_KV.get(anahtar.name);
      if (!ham) continue;
      tarandi++;
      const abone = aboneCoz(ham);
      if (abone.durum === "iptal") continue;
      if (abone.sira >= DIZI.length) {
        bitti++;
        continue;
      }
      const gunFarki = Math.floor(
        (simdi - Date.parse(abone.katilim)) / 86400000,
      );
      if (!Number.isFinite(gunFarki) || gunFarki < DIZI[abone.sira].gun) continue;
      if (motorUyuyor) continue; // anahtar gelince kaldığı yerden akar
      const eposta = anahtar.name.slice("abone:".length);
      const oldu = await postaGonder(env, eposta, abone.sira);
      if (oldu) {
        gonderildi++;
        const yeni: Abone = {
          ...abone,
          sira: abone.sira + 1,
          sonGonderim: new Date(simdi).toISOString(),
        };
        await env.BULTEN_KV.put(anahtar.name, JSON.stringify(yeni));
      } else {
        hata++;
      }
    }
    if (liste.list_complete || gonderildi >= KOSU_TAVANI) break;
    imlec = liste.cursor;
  }

  return json(200, {
    ok: true,
    motor: motorUyuyor ? "uykuda" : "acik",
    tarandi,
    gonderildi,
    hata,
    diziyiBitiren: bitti,
  });
};

function json(status: number, veri: unknown) {
  return new Response(JSON.stringify(veri), {
    status,
    headers: { "content-type": "application/json" },
  });
}
