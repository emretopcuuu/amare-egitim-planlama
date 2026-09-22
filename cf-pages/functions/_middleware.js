// Cloudflare Pages — egitimtakvimi.oneteamglobal.ai (ara yol, 22 Eyl 2026)
//
// Sayfalar/dosyalar Cloudflare'den sunulur. 70 Netlify fonksiyonu + 7 zamanlanmış iş
// Netlify'da OLDUĞU GİBİ kalır; buradan vekil (proxy) ile çağrılır.
// Bu dosya yalnız _routes.json'daki yollarda çalışır (statik dosyalar ücretsiz/doğrudan).
import eventOg from '../../netlify/edge-functions/event-og.mjs';
import liderOg from '../../netlify/edge-functions/lider-og.mjs';

const NETLIFY = 'https://marvelous-pasca-fbfa40.netlify.app';
// netlify.toml'daki "hassas yol" 404'leri
const HASSAS = /^\/(\.env$|\.git(\/|$)|swagger\.json$|metrics$|debug$)/;

async function spa(ctx) {
  const r = await ctx.next();
  if (r.status !== 404) return r;
  return ctx.env.ASSETS.fetch(new URL('/', ctx.request.url));
}

async function vekil(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const hedef = NETLIFY + url.pathname + url.search;
  const h = new Headers(request.headers);
  h.delete('host');
  const ip = request.headers.get('cf-connecting-ip') || '';
  if (ip && env.CF_PROXY_KEY) {
    h.set('x-ot-client-ip', ip);
    h.set('x-ot-proxy-key', env.CF_PROXY_KEY);
  }
  h.set('x-forwarded-host', url.host);
  const govdeli = !['GET', 'HEAD'].includes(request.method);
  const r = await fetch(hedef, {
    method: request.method,
    headers: h,
    body: govdeli ? request.body : undefined,
    redirect: 'manual',
  });
  const out = new Headers(r.headers);
  out.set('x-ot-backend', 'netlify');
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: out });
}

export async function onRequest(ctx) {
  const p = new URL(ctx.request.url).pathname;
  if (HASSAS.test(p)) {
    const nf = await ctx.env.ASSETS.fetch(new URL('/404.html', ctx.request.url));
    return new Response(nf.body, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  if (p.startsWith('/.netlify/') || p.startsWith('/d/')) return vekil(ctx);
  const og = p.startsWith('/e/') ? eventOg : p.startsWith('/lider/') ? liderOg : null;
  if (og) {
    try { return await og(ctx.request, { next: () => spa(ctx) }); }
    catch { return spa(ctx); }
  }
  return ctx.next();
}
