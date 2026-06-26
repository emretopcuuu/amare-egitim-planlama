// /lider/:id sayfası için dinamik OG önizleme (WhatsApp/FB/Twitter/LinkedIn/Telegram).
// Crawler tespit edilirse Firestore REST'ten konuşmacı bilgisi çekilir ve head'e
// <meta og:*> / <meta twitter:*> enjekte edilir (foto + isim + güncel kariyer).
// İnsan kullanıcı için: normal SPA döner.

const CRAWLERS = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|skypeuripreview|pinterest|redditbot|googlebot|bingbot/i;

const FIREBASE_PROJECT = 'amare-egitim-planlama';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

const escapeHtml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Firestore doc → düz obje (string/number/bool + arrayValue içindeki map'ler)
const parseFirestoreDoc = (doc) => {
  const fields = doc.fields || {};
  const out = { id: doc.name.split('/').pop() };
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.arrayValue !== undefined) {
      out[k] = (v.arrayValue.values || []).map(item => {
        if (item.mapValue) {
          const m = {};
          for (const [mk, mv] of Object.entries(item.mapValue.fields || {})) {
            m[mk] = mv.stringValue ?? mv.integerValue ?? mv.doubleValue ?? mv.booleanValue ?? '';
          }
          return m;
        }
        return item.stringValue ?? item.integerValue ?? '';
      });
    }
  }
  return out;
};

export default async (request, context) => {
  const userAgent = request.headers.get('user-agent') || '';
  if (!CRAWLERS.test(userAgent)) return context.next();

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/lider\/([^\/]+)/);
  if (!match) return context.next();
  const liderId = decodeURIComponent(match[1]);

  try {
    const res = await fetch(`${FIRESTORE_BASE}/konusmacilar/${encodeURIComponent(liderId)}`);
    if (!res.ok) return context.next();
    const lider = parseFirestoreDoc(await res.json());

    const spaResponse = await context.next();
    let html = await spaResponse.text();

    const ad = lider.ad || liderId.replace(/_/g, ' ').toUpperCase();
    // Güncel kariyer = kariyerGecmis'in en sonuncusu, yoksa unvan
    let guncelKariyer = lider.unvan || '';
    if (Array.isArray(lider.kariyerGecmis) && lider.kariyerGecmis.length) {
      const son = lider.kariyerGecmis[lider.kariyerGecmis.length - 1];
      if (son && son.kariyer) guncelKariyer = son.kariyer;
    }

    const aciklama = [
      guncelKariyer,
      lider.biyografi ? String(lider.biyografi).replace(/\s+/g, ' ').slice(0, 160) : 'Amare Global · One Team lider profili',
    ].filter(Boolean).join(' • ').slice(0, 200);

    // og:image — sadece HTTPS URL; base64/data: ise One Team logosu fallback
    let ogImage = 'https://egitimtakvimi.oneteamglobal.ai/logos/oneteam%20logo.JPG';
    if (lider.fotoURL && /^https?:\/\//.test(lider.fotoURL)) ogImage = lider.fotoURL;

    const canonicalUrl = `https://egitimtakvimi.oneteamglobal.ai/lider/${encodeURIComponent(liderId)}`;
    const safeTitle = escapeHtml(`${ad}${guncelKariyer ? ` · ${guncelKariyer}` : ''} — One Team`);
    const safeDesc = escapeHtml(aciklama);
    const safeImage = escapeHtml(ogImage);

    const metaInjection = `
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:width" content="1080" />
    <meta property="og:image:height" content="1080" />
    <meta property="og:site_name" content="One Team Eğitim Takvimi" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImage}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <title>${safeTitle}</title>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": ${JSON.stringify(ad)},
      ${guncelKariyer ? `"jobTitle": ${JSON.stringify(guncelKariyer)},` : ''}
      "image": ${JSON.stringify(ogImage)},
      "url": ${JSON.stringify(canonicalUrl)},
      "worksFor": { "@type": "Organization", "name": "Amare Global - One Team" }
    }
    </script>`;

    html = html
      .replace(/<title>[^<]*<\/title>/, '')
      .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
      .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
      .replace(/<link\s+rel="canonical"[^>]*>/gi, '');
    html = html.replace('</head>', `${metaInjection}\n</head>`);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    console.error('[lider-og]', err);
    return context.next();
  }
};

export const config = {
  path: '/lider/*',
};
