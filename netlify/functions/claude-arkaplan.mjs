// netlify/functions/claude-arkaplan.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/claude-arkaplan   (Auth: admin Bearer ID token)
//   Body: { renk, tema, konu, istek }
//   → Claude (Anthropic, OpenRouter üzerinden) afiş ARKA PLANINI SVG kodu olarak tasarlar → { svg }
//
// NEDEN SVG: Claude görsel (piksel) üretmez; ama dekoratif vektör arka planı kodla çizebilir.
// Yüz/yazı YOK — fotoğraf ve metinler Canvas motorunda gerçek haliyle bindirilir.
// Anahtar: mevcut OPENROUTER_API_KEY (functions env bütçesi dolu → YENİ değişken eklenmez).
// Endpoint ADMIN-KİLİTLİ; yoksa herkes kotamızı yakar.
// ─────────────────────────────────────────────────────────────────────────
import admin from 'firebase-admin';
import { isAdminToken } from './_adminEmails.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const jsonRes = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

// OpenRouter model kimliği. Değişirse yalnız burası güncellenir.
const MODEL = 'anthropic/claude-sonnet-4.5';

const SISTEM = `Sen bir afiş arka planı tasarımcısısın. Çıktın TEK bir SVG belgesidir, başka hiçbir şey yazma.
Kurallar:
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920"> ile başla, </svg> ile bitir.
- YALNIZ dekoratif arka plan: gradyanlar, ışık huzmeleri, geometrik/organik şekiller, ince çizgiler, dokular, parıltılar.
- ASLA metin (<text>), insan, yüz, logo, simge, harf çizme.
- <script>, <foreignObject>, <image>, harici href/url, olay özniteliği (onload vb.) YASAK.
- Kompozisyon: üst %25 ve alt %20 sade olsun (başlık ve bilgi yazısı oraya binecek). Orta bölgede fotoğraf olacak, ama KENARLARDA ve köşelerde güçlü, doygun, dramatik şekiller kullan: büyük ışık huzmeleri, çapraz bantlar, iç içe daireler, parlak lekeler.
- Soluk ve pastel KAÇIN: ana rengin koyu ve parlak tonlarını yüksek kontrastla kullan, zeminle belirgin ayrışan en az 4 katman olsun.
- Derinlik ve sinematik his ver: katmanlı yarı saydam şekiller, güçlü ışık odağı, vinyet.
- Verilen ana rengin tonlarını kullan; zemin tema "koyu" ise koyu, "acik" ise açık ton ağırlıklı çalış.
- Dosya 12 KB'ı geçmesin.`;

// Güvenlik: modelin döndürdüğü SVG'yi temizle (img olarak yüklenince script zaten çalışmaz; yine de savunma).
const temizle = (raw) => {
  const m = String(raw || '').match(/<svg[\s\S]*<\/svg>/i);
  if (!m) return null;
  let s = m[0];
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<image[\s\S]*?(\/>|<\/image>)/gi, '')
    .replace(/<text[\s\S]*?<\/text>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/(xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '');
  return s.length > 200 && s.length < 60000 ? s : null;
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes({ error: 'POST only' }, 405);

  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return jsonRes({ error: 'Token gerekli' }, 401);
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(m[1]); }
  catch { return jsonRes({ error: 'Geçersiz token' }, 401); }
  if (!isAdminToken(decoded)) return jsonRes({ error: 'Admin yetkisi yok' }, 403);

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return jsonRes({ error: 'Sunucuda OPENROUTER_API_KEY tanımlı değil' }, 500);

  let govde;
  try { govde = await req.json(); } catch { return jsonRes({ error: 'Geçersiz gövde' }, 400); }
  const renk = /^#[0-9a-f]{6}$/i.test(govde.renk || '') ? govde.renk : '#e8312f';
  const tema = govde.tema === 'koyu' ? 'koyu' : 'acik';
  const konu = String(govde.konu || '').slice(0, 120);
  const istek = String(govde.istek || '').slice(0, 300);

  const kullanici = `Ana renk: ${renk}\nZemin teması: ${tema}\nEtkinlik konusu (yalnız atmosfer için ilham, yazma): ${konu || 'genel'}\nEk istek: ${istek || 'yok'}\nBu afişin arka planını SVG olarak tasarla.`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://egitimtakvimi.oneteamglobal.ai',
        'X-Title': 'One Team Education',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SISTEM }, { role: 'user', content: kullanici }],
        temperature: 1,
        max_tokens: 7000,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const e = (await res.text()).slice(0, 250);
      return jsonRes({ error: `Claude (OpenRouter ${res.status}): ${e}` }, res.status === 429 ? 429 : 502);
    }
    const data = await res.json();
    const svg = temizle(data?.choices?.[0]?.message?.content);
    if (!svg) return jsonRes({ error: 'Claude geçerli bir SVG döndürmedi, tekrar dene.' }, 502);
    return jsonRes({ svg });
  } catch (e) {
    return jsonRes({ error: e.name === 'AbortError' ? 'Claude zaman aşımı' : ('Claude isteği başarısız: ' + e.message) }, 502);
  } finally {
    clearTimeout(t);
  }
};
