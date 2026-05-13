// /e/:id sayfası için dinamik OG önizleme
// WhatsApp/Facebook/Twitter/LinkedIn/Telegram crawler tespit edilirse
// Firestore REST API'sinden eğitim bilgisi çekilir ve HTML'in head'ine
// dinamik <meta og:*> ve <meta twitter:*> enjekte edilir.
// İnsan kullanıcılar için: değişiklik yok, normal SPA döner.

const CRAWLERS = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|skypeuripreview|pinterest|redditbot|googlebot|bingbot/i;

const FIREBASE_PROJECT = 'amare-egitim-planlama';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

const escapeHtml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const parseFirestoreDoc = (doc) => {
  const fields = doc.fields || {};
  const out = { id: doc.name.split('/').pop() };
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
  }
  return out;
};

export default async (request, context) => {
  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = CRAWLERS.test(userAgent);

  // Normal kullanıcı: SPA'yı olduğu gibi döndür
  if (!isCrawler) {
    return context.next();
  }

  // Crawler: eğitim ID'sini URL'den al
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/e\/([^\/]+)/);
  if (!match) return context.next();
  const egitimId = decodeURIComponent(match[1]);

  try {
    // Firestore REST API'den dokümanı çek
    const docUrl = `${FIRESTORE_BASE}/takvim/${egitimId}`;
    const res = await fetch(docUrl);
    if (!res.ok) return context.next();
    const doc = await res.json();
    const egitim = parseFirestoreDoc(doc);

    // SPA HTML'ini al
    const spaResponse = await context.next();
    let html = await spaResponse.text();

    // Meta bilgilerini hazırla
    const baslik = egitim.egitim || 'Eğitim';
    const tarih = egitim.tarih || '';
    const gun = egitim.gun || '';
    const saat = egitim.saat ? `${egitim.saat}${egitim.bitisSaati ? `-${egitim.bitisSaati}` : ''}` : '';
    const egitmen = egitim.egitmen || '';

    const aciklama = [
      `${tarih} ${gun}${saat ? ` - ${saat}` : ''}`,
      egitmen ? `Eğitmen: ${egitmen}` : '',
      egitim.aciklama || 'One Team eğitim takvimi - Amare Global',
    ].filter(Boolean).join(' • ').slice(0, 200);

    // og:image — sadece HTTPS URL olabilir. base64 data: URL ise (Firestore inline)
    // WhatsApp/FB preview gösteremez, fallback olarak One Team logosu kullan
    let ogImage = 'https://egitimtakvimi.oneteamglobal.ai/logos/oneteam%20logo.JPG';
    if (egitim.gorselUrl && /^https?:\/\//.test(egitim.gorselUrl)) {
      ogImage = egitim.gorselUrl;
    }
    const canonicalUrl = `https://egitimtakvimi.oneteamglobal.ai/e/${encodeURIComponent(egitimId)}`;
    const safeTitle = `${escapeHtml(baslik)} - One Team Eğitim Takvimi`;
    const safeDesc = escapeHtml(aciklama);
    const safeImage = escapeHtml(ogImage);

    // Yeni meta etiketleri
    const metaInjection = `
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:type" content="event" />
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
      "@type": "Event",
      "name": ${JSON.stringify(baslik)},
      "description": ${JSON.stringify(aciklama)},
      "image": ${JSON.stringify(ogImage)},
      "url": ${JSON.stringify(canonicalUrl)},
      ${egitmen ? `"performer": { "@type": "Person", "name": ${JSON.stringify(egitmen)} },` : ''}
      "organizer": { "@type": "Organization", "name": "Amare Global - One Team" },
      "eventAttendanceMode": "${(egitim.yer || '').toUpperCase().includes('ZOOM') ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode'}",
      "location": ${(egitim.yer || '').toUpperCase().includes('ZOOM')
        ? '{ "@type": "VirtualLocation", "url": "https://zoom.us" }'
        : `{ "@type": "Place", "name": ${JSON.stringify(egitim.yer || 'TBA')} }`}
    }
    </script>`;

    // Mevcut OG meta'ları temizle, yenilerini ekle
    html = html
      .replace(/<title>[^<]*<\/title>/, '')
      .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
      .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
      .replace(/<link\s+rel="canonical"[^>]*>/gi, '');

    // </head> öncesi inject
    html = html.replace('</head>', `${metaInjection}\n</head>`);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=600', // 10dk cache crawler için
      },
    });
  } catch (err) {
    console.error('[event-og]', err);
    return context.next();
  }
};

export const config = {
  path: '/e/*',
};
