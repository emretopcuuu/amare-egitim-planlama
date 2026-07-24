// Pazartesi Notları kaydı — Cloudflare Pages Function.
// Turnstile ile bot koruması + KV'ye e-posta. Gerekli bağlamalar yoksa 501
// döner; istemci mailto'ya düşer (hiçbir şey bozulmaz).
interface Ortam {
  BULTEN_KV?: KVNamespace;
  TURNSTILE_SECRET?: string;
}

export const onRequestPost: PagesFunction<Ortam> = async ({ request, env }) => {
  if (!env.BULTEN_KV || !env.TURNSTILE_SECRET) {
    return new Response(JSON.stringify({ ok: false, sebep: "yapilandirilmadi" }), {
      status: 501,
      headers: { "content-type": "application/json" },
    });
  }
  let eposta = "";
  let token = "";
  try {
    const govde = (await request.json()) as { eposta?: string; token?: string };
    eposta = (govde.eposta || "").trim().toLowerCase();
    token = govde.token || "";
  } catch {
    return json(400, { ok: false, sebep: "govde" });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) {
    return json(400, { ok: false, sebep: "eposta" });
  }
  // Turnstile doğrulama
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

  await env.BULTEN_KV.put(
    `abone:${eposta}`,
    new Date().toISOString(),
  );
  return json(200, { ok: true });
};

function json(status: number, veri: unknown) {
  return new Response(JSON.stringify(veri), {
    status,
    headers: { "content-type": "application/json" },
  });
}
