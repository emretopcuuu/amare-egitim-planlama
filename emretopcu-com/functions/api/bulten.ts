// Pazartesi Notları kaydı — Cloudflare Pages Function.
// KV'ye e-posta yazar. Turnstile secret TANIMLIYSA doğrular; değilse basit
// bal küpü (web alanı) yeterli — kişisel site bülteni için pragmatik denge.
// KV bağlaması yoksa 501 döner; istemci mailto'ya düşer (hiçbir şey bozulmaz).
import { aboneCoz, postaGonder, type Abone, type PostaOrtam } from "./_posta";

interface Ortam extends PostaOrtam {
  TURNSTILE_SECRET?: string;
}

export const onRequestPost: PagesFunction<Ortam> = async ({ request, env }) => {
  if (!env.BULTEN_KV) {
    return json(501, { ok: false, sebep: "yapilandirilmadi" });
  }
  let eposta = "";
  let token = "";
  let tuzak = "";
  let kaynak = "bulten";
  try {
    const govde = (await request.json()) as {
      eposta?: string;
      token?: string;
      web?: string; // bal küpü — insanlar boş bırakır, botlar doldurur
      kaynak?: string;
    };
    eposta = (govde.eposta || "").trim().toLowerCase();
    token = govde.token || "";
    tuzak = govde.web || "";
    kaynak = String(govde.kaynak || "bulten").slice(0, 40);
  } catch {
    return json(400, { ok: false, sebep: "govde" });
  }
  if (tuzak) return json(200, { ok: true }); // botu sessizce yoksay
  if (eposta.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) {
    return json(400, { ok: false, sebep: "eposta" });
  }
  // Turnstile yalnız yapılandırıldıysa zorunlu
  if (env.TURNSTILE_SECRET) {
    const dogrula = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token }),
      },
    )
      .then((r) => r.json() as Promise<{ success: boolean }>)
      .catch(() => ({ success: false }));
    if (!dogrula.success) return json(400, { ok: false, sebep: "turnstile" });
  }

  // Evergreen dizi kaydı: yeni abone 0. noktadan başlar; tekrar kayıt
  // olan mevcut abonenin İLERLEMESİ EZİLMEZ (iptal ettiyse yeniden açılır).
  const eskiHam = await env.BULTEN_KV.get(`abone:${eposta}`);
  let abone: Abone;
  if (eskiHam) {
    abone = aboneCoz(eskiHam);
    abone.durum = "aktif";
  } else {
    abone = {
      katilim: new Date().toISOString(),
      sira: 0,
      durum: "aktif",
      kaynak,
      sonGonderim: null,
    };
    // Hoş geldin maili anında gitsin (motor açıksa); olmadıysa günlük
    // görev ertesi koşuda gönderir — kayıt asla gönderime bağımlı değil.
    const oldu = await postaGonder(env, eposta, 0);
    if (oldu) {
      abone.sira = 1;
      abone.sonGonderim = new Date().toISOString();
    }
  }
  await env.BULTEN_KV.put(`abone:${eposta}`, JSON.stringify(abone));
  return json(200, { ok: true });
};

function json(status: number, veri: unknown) {
  return new Response(JSON.stringify(veri), {
    status,
    headers: { "content-type": "application/json" },
  });
}
