// Şablonlu Afiş için YZ arka planı — sağlayıcı seçilebilir.
//   gemini → Gemini görsel (sunucu proxy: gemini-afis)
//   openai → OpenAI gpt-image (sunucu proxy: openai-gorsel)
//   claude → Anthropic Claude, arka planı SVG kodu olarak tasarlar (sunucu: claude-arkaplan, OpenRouter)
// Hepsi YALNIZ arka plan üretir (yazı/insan yok). Fotoğraf ve metinler Canvas motorunda gerçek haliyle bindirilir.
// Dönüş: görselin blob URL'si (kısa → durum JSON'una güvenle girer).

export const YZ_SAGLAYICILAR = [
  { id: 'claude', ad: 'Claude (Anthropic)', not: 'Vektör (SVG) tasarım · temiz çizgi, hafif', tahmin: '≈ $0,05-0,08' },
  { id: 'gemini', ad: 'Gemini', not: 'Gerçekçi/sinematik görsel', tahmin: '≈ $0,04-0,08' },
  { id: 'openai', ad: 'OpenAI', not: 'Temiz kompozisyon, biraz yavaş', tahmin: '≈ $0,02-0,06' },
];

const b64Blob = (b64, mime) => {
  const bin = atob(String(b64).replace(/-/g, '+').replace(/_/g, '/'));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
};

const gorselPrompt = ({ renk, tema, konu, istek }) => [
  'Vertical 9:16 event poster BACKGROUND ONLY.',
  'Absolutely NO text, NO letters, NO numbers, NO people, NO faces, NO logos.',
  `Dominant color: ${renk}. Overall ${tema === 'koyu' ? 'dark, moody' : 'light, airy'} tone.`,
  `Atmosphere inspired by: ${konu || 'a professional seminar'}.`,
  'Cinematic layered shapes, soft light beams, subtle texture, depth.',
  'Keep the top 30% and bottom 25% calm and low-detail (text will be overlaid); the middle 45% subtle and low-contrast (photos will be placed there).',
  istek ? `Extra direction: ${istek}` : '',
].filter(Boolean).join(' ');

const hata = async (res, ad) => {
  const e = await res.json().catch(() => ({}));
  // Hata metni anahtarın bir parçasını içerebilir (sk-proj-…) → ekrana/ekran görüntüsüne sızmasın
  const m = String(e?.error || `${ad} ${res.status}`).replace(/sk-[A-Za-z0-9_*.\-]{4,}/g, 'sk-…');
  if (/credits are depleted|billing|quota|insufficient/i.test(m) || res.status === 429) {
    throw new Error(`${ad} hesabının kredisi/kotası bitmiş. Başka bir yapay zekâyı seç ya da ${ad} hesabına kredi yükle.`);
  }
  throw new Error(m);
};

export const arkaPlanUret = async ({ saglayici, idToken, renk, tema, konu, istek, openaiApiKey }) => {
  if (!idToken) throw new Error('Yapay zekâ için admin girişi gerekli.');
  const yetki = { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` };

  if (saglayici === 'claude') {
    const res = await fetch('/.netlify/functions/claude-arkaplan', {
      method: 'POST', headers: yetki, body: JSON.stringify({ renk, tema, konu, istek }),
    });
    if (!res.ok) await hata(res, 'Claude');
    const { svg } = await res.json();
    if (!svg) throw new Error('Claude SVG döndürmedi.');
    return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  }

  const prompt = gorselPrompt({ renk, tema, konu, istek });
  if (saglayici === 'openai') {
    const dene = (apiKey) => fetch('/.netlify/functions/openai-gorsel', {
      method: 'POST', headers: yetki,
      body: JSON.stringify({ apiKey: apiKey || undefined, prompt, size: '1024x1536', quality: 'low' }),
    });
    // Ayarlar'daki kişisel anahtar geçersizse (eski/yanlış) sunucudaki anahtarla bir kez daha dene.
    let res = await dene(openaiApiKey);
    if (!res.ok && openaiApiKey && (res.status === 401 || res.status === 400 || res.status === 502)) {
      const yedek = await dene('');
      if (yedek.ok) res = yedek;
    }
    if (!res.ok) await hata(res, 'OpenAI');
    const d = await res.json();
    if (!d?.b64) throw new Error('OpenAI görsel döndürmedi.');
    return b64Blob(d.b64, 'image/png');
  }

  const res = await fetch('/.netlify/functions/gemini-afis', {
    method: 'POST', headers: yetki, body: JSON.stringify({ prompt }),
  });
  if (!res.ok) await hata(res, 'Gemini');
  const d = await res.json();
  if (!d?.b64) throw new Error('Gemini görsel döndürmedi.');
  return b64Blob(d.b64, d.mimeType || 'image/png');
};
