// Pazartesi Notları kaydı — Cloudflare Pages Function.
// KV'ye e-posta yazar. Turnstile secret TANIMLIYSA doğrular; değilse basit
// bal küpü (web alanı) yeterli — kişisel site bülteni için pragmatik denge.
// KV bağlaması yoksa 501 döner; istemci mailto'ya düşer (hiçbir şey bozulmaz).
interface Ortam {
  BULTEN_KV?: KVNamespace;
  TURNSTILE_SECRET?: string;
}

export const onRequestPost: PagesFunction<Ortam> = async ({ request, env }) => {
  if (!env.BULTEN_KV) {
    return json(501, { ok: false, sebep: "yapilandirilmadi" });
  }
  let eposta = "";
  let token = "";
  let tuzak = "";
  try {
    const govde = (await request.json()) as {
      eposta?: string;
      token?: string;
      web?: string; // bal küpü — insanlar boş bırakır, botlar doldurur
    };
    eposta = (govde.eposta || "").trim().toLowerCase();
    token = govde.token || "";
    tuzak = govde.web || "";
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

  await env.BULTEN_KV.put(`abone:${eposta}`, new Date().toISOString());
  return json(200, { ok: true });
};

function json(status: number, veri: unknown) {
  return new Response(JSON.stringify(veri), {
    status,
    headers: { "content-type": "application/json" },
  });
}
