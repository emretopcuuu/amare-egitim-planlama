// OpenAI Image Edit Proxy — /api/openai-image-edit
// Client → Netlify Function → OpenAI (api.openai.com)
// Sebep: bazı kullanıcı ağlarında ad blocker / firewall / antivirüs
// browser'dan api.openai.com'a direkt erişimi engelliyor.
// Bu proxy üzerinden same-origin istek atılır, hiçbir block çalışmaz.

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Sadece POST destekleniyor' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Client'ten gelen Bearer token'ı al
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authorization header eksik' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Client'in gönderdiği FormData'yı al, OpenAI'ye olduğu gibi forward et
    const formData = await request.formData();

    const openaiRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': auth, // client'ten geldiği gibi
      },
      body: formData,
    });

    const text = await openaiRes.text();
    return new Response(text, {
      status: openaiRes.status,
      headers: {
        'Content-Type': openaiRes.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: `Proxy hata: ${err.message}` } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config = {
  path: '/api/openai-image-edit',
};
