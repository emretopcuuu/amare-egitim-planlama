// scripts/re-analiz-egitmen.mjs
// ─────────────────────────────────────────────────────────────────────────
// Belirli bir eğitmenin tüm AI analizlerini LOCAL olarak yeniden üretir.
// (HTTP yerine OpenRouter'ı direkt çağırır, auth gereksiz)
//
// Çalıştırma:
//   node re-analiz-egitmen.mjs tunc_tuncer            # dry-run
//   node re-analiz-egitmen.mjs tunc_tuncer --apply    # uygula
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const coreId = args.find(a => !a.startsWith('--'));
const APPLY = args.includes('--apply');
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const PROMPT_VERSION = 4;

if (!coreId) {
  console.error('Kullanım: node re-analiz-egitmen.mjs <coreId> [--apply]');
  process.exit(1);
}
if (!OPENROUTER_KEY) {
  console.error('OPENROUTER_API_KEY .env\'de eksik');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// Sistem prompt (ai-transcript-analiz.mjs v4 ile birebir)
const SISTEM_PROMPT = `Sen Doğrudan Satış / liderlik eğitim videolarını analiz eden bir uzmansin.
Türkçe transcript verilir, 3 ÇIKTI üretirsin (sadece JSON):

{
  "ahaMoments": [
    { "start": 142.5, "text": "Tam alıntı 50-200 char", "etki": "Bu söz dinleyene şunu öğretir/hissettirir: ... (10-25 kelime, AKTİF cümle)" }
  ],
  "chapters": [
    { "start": 0, "baslik": "5-12 kelime bölüm başlığı" }
  ],
  "ozet": {
    "kisa": "3 cümle ozet (max 250 char)",
    "uzun": "1 paragraf detay (max 600 char)",
    "anaTema": "1 kelime ana tema (örn: liderlik, satış, motivasyon)"
  }
}

═══ ahaMoments KALİTE KURALLARI (EN ÖNEMLİ) ═══

ahaMoments: 3-5 adet GERÇEKTEN GÜÇLÜ alıntı.
TÜM VİDEO BOYUNCA dağıt (başı, ortası, sonu). Hepsi başta olmasın.

✓ KABUL — Quote şu kriterlere uymalı:
  1. SELF-CONTAINED: Önceki cümle gerekmesin. Kendi başına anlam taşısın.
     Yanlış: "Bunların yanında sıvı olması çok büyük fark yaratıyor."
     Doğru: "Kolajen takviyesinde sıvı form emilim açısından çok büyük fark yaratır."

  2. MANTIK KONTROLÜ: Rakam/oran/mantık tutarlı olmalı.
     Konuşmacı sürçtüyse veya Whisper rakamları karıştırmışsa DÜZELT.
     Yanlış: "8 insandan 10'u hastalıktan ölüyor" (matematiksel imkansız)
     Doğru: "10 insandan 8'i hastalıktan ölüyor" veya "İnsanların %80'i hastalıktan ölüyor"

  3. ETKİ TAŞISIN: Düşündürücü, sarsıcı, ders verici olmalı.
     Sıradan "biliyorsunuz", "şöyle düşünün" başlangıçlı muğlak ifadeleri ALMA.

  4. KONUŞMACI UZMANLIĞINA SAYGI: Konuşmacının kim olduğu prompt'ta verilirse
     (örn. "Dr. → doktor"), o alana özel quote'lar öncelikli olsun.
     Doktor sağlık/bilim quote'larını öne çıkar, satış cümlesini değil.

  5. SORU DEĞİL İFADE: "... değil mi?" gibi bitmesin. Net ifade olsun.

  6. UYGUN UZUNLUK: 60-200 karakter. Çok kısaysa havada kalır, çok uzunsa sıkıcı.

✗ RED — Şunları KESİNLİKLE ekleme:
  - Önceki/sonraki cümleye bağımlı kopuk alıntılar
  - "İşte böyle", "Şimdi anladık ki" tarzı geçiş cümleleri
  - Mantık/rakam hatası içeren (düzeltilemeyen) alıntılar
  - Konuşmacı uzmanlığı dışı genel cümleler
  - Marka adı (Amare, OneTeam, HL5, kolajen vb) içeren — bu reklam izlenimi verir

"etki" alanı yazımı:
  - "Vurguluyor" / "anlatıyor" / "bahsediyor" KULLANMA — pasif ve içeriksiz
  - Aktif tonda yaz: "X'i öğretir / hatırlatır / sarsar / değiştirir"
  - Dinleyicinin hayatına ne katacağına odaklan
  - 10-25 kelime arası

═══ TRANSCRIPT TEMİZLİĞİ ═══

Transcript Whisper (otomatik konuşma tanıma) ile üretildi. Türkçede yaygın hatalar:
  "sitres" → "stres", "ciharet" → "ticaret", "mademleri" → "maddemiz",
  "baspılıyor" → "başlıyor", "Burken" → "Buradan", "dürüdü" → "tüyo",
  "menüm" → "benim", "ki şı" → "kişi" vb.

ahaMoments[].text alanını yazarken:
  - Whisper hatalarını DÜZELT (yazım, kelime, rakam)
  - Konuşmacının üslubunu BOZMA (cümle yapısı kalsın)
  - Belirgin yanlış kelimeyi düzelt, şüpheliyi bırak
  - Sonuç DOĞRU Türkçe AKICI bir alıntı olmalı

═══ chapters KURALLARI ═══

- 5-10 adet, videoyu mantıksal parçalara böl. Her chapter min 60sn.
- chapters TÜM VİDEO SÜRESİNİ KAPSAMALI. Son chapter videonun son %15'i içinde olmalı.
  Örnek: 33dk video → son chapter en geç 28dk civarında başlamalı.
- chapters[0].start her zaman 0
- ozet.anaTema: liderlik, satış, motivasyon, kişisel gelişim, vizyon, sağlık, ürün, vb
- MARKA: "network marketing" terimini ASLA kullanma. Her zaman "Doğrudan Satış" yaz.
- Sadece JSON yaz, hiçbir açıklama EKLEME.`;

async function callLLM(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://egitimtakvimi.oneteamglobal.ai',
      'X-Title': 'One Team Education',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: SISTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Cevap JSON değil: ${text.slice(0, 100)}`);
  return JSON.parse(match[0]);
}

async function analizEt(vimeoId, videoData) {
  const chunks = Array.isArray(videoData.transcriptChunks) ? videoData.transcriptChunks : [];
  if (chunks.length === 0) throw new Error('Transcript chunks yok');

  // Transcript hazırla
  const FULL_LIMIT = 200000;
  let transcript = chunks.map(c => `[${Math.floor(c.start || 0)}s] ${c.text || ''}`).join('\n');
  if (transcript.length > FULL_LIMIT) {
    const bas = transcript.slice(0, FULL_LIMIT * 0.4);
    const son = transcript.slice(-FULL_LIMIT * 0.4);
    const orta = transcript.slice(FULL_LIMIT * 0.4, transcript.length - FULL_LIMIT * 0.4);
    const ortaSatirlar = orta.split('\n');
    const adim = Math.ceil(ortaSatirlar.length / (FULL_LIMIT * 0.2 / 50));
    const ortaSampled = ortaSatirlar.filter((_, i) => i % adim === 0).join('\n');
    transcript = bas + '\n[... orta seyrelt ...]\n' + ortaSampled + '\n' + son;
  }

  const sureSn = Math.floor(videoData.sure || 0);
  const sureMin = Math.floor(sureSn / 60);
  const sureMinSn = sureSn % 60;
  const sonChunkSn = Math.floor(chunks[chunks.length - 1]?.start || sureSn);
  const sonChapterMin = Math.floor(sonChunkSn * 0.85 / 60);

  const prompt = `Video: ${videoData.baslik || ''}
Eğitmen: ${(videoData.egitmenAdlari || []).join(', ')}
Süre: ${sureMin}:${String(sureMinSn).padStart(2, '0')} (${sureSn}sn)
Son chapter EN GEÇ ${sonChapterMin}dk civarında başlamalı (videonun son %15'i).

TRANSCRIPT:
${transcript}

3 ÇIKTI üret: ahaMoments + chapters + ozet (sistem prompt'taki format).`;

  const sonuc = await callLLM(prompt);
  if (!Array.isArray(sonuc.ahaMoments)) sonuc.ahaMoments = [];
  if (!Array.isArray(sonuc.chapters)) sonuc.chapters = [];
  if (sonuc.chapters[0]) sonuc.chapters[0].start = 0;
  return sonuc;
}

async function main() {
  console.log(`[re-analiz] coreId=${coreId} | APPLY=${APPLY}\n`);

  const snap = await db.collection('kayitli_egitimler')
    .where('egitmenler', 'array-contains', coreId)
    .where('kayeneFiltrelendi', '==', false)
    .get();

  console.log(`📚 ${snap.size} video bulundu\n`);
  if (snap.empty) return;

  const hedefler = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const aiRef = db.doc(`kayitli_egitimler/${doc.id}/ai_analiz/main`);
    const aiSnap = await aiRef.get();
    const promptVer = aiSnap.exists ? (aiSnap.data().promptVersion || 1) : 0;
    hedefler.push({
      vid: doc.id,
      baslik: data.baslik || '(başlık yok)',
      promptVer,
      transcriptVar: Array.isArray(data.transcriptChunks) && data.transcriptChunks.length > 0,
      data,
      ref: aiRef,
    });
  }

  const yenilemelik = hedefler.filter(h => h.promptVer < PROMPT_VERSION);
  console.log(`Yenilenecek: ${yenilemelik.length}\n`);
  yenilemelik.slice(0, 10).forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.baslik.slice(0, 60).padEnd(62)} v${h.promptVer} ${h.transcriptVar ? '✓' : '⏭️'}`);
  });

  if (!APPLY) {
    console.log('\n⚠️  DRY-RUN. --apply ile uygula.');
    return;
  }

  console.log('\n🔄 Yenileme başlıyor (LLM çağrıları ~10-30sn sürer)...\n');
  let basarili = 0, hatali = 0, transcriptYok = 0;

  for (let i = 0; i < yenilemelik.length; i++) {
    const h = yenilemelik[i];
    process.stdout.write(`  [${(i + 1).toString().padStart(3)}/${yenilemelik.length}] ${h.baslik.slice(0, 45).padEnd(47)} `);

    if (!h.transcriptVar) {
      process.stdout.write('⏭️  transcript yok\n');
      transcriptYok++;
      continue;
    }

    try {
      const start = Date.now();
      const sonuc = await analizEt(h.vid, h.data);
      const ms = Date.now() - start;
      // Firestore'a yaz
      await h.ref.set({
        ...sonuc,
        promptVersion: PROMPT_VERSION,
        model: OPENROUTER_MODEL,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      basarili++;
      process.stdout.write(`✓ ${sonuc.ahaMoments.length} aha (${(ms/1000).toFixed(1)}sn)\n`);
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      hatali++;
      process.stdout.write(`✗ ${e.message.slice(0, 60)}\n`);
    }
  }

  // Cache temizle
  console.log(`\n🧹 Quote cache temizleniyor...`);
  const cacheSnap = await db.collection('egitmen_quotes_cache').get();
  let silindi = 0;
  for (const c of cacheSnap.docs) {
    if (c.id === coreId || c.id.startsWith(coreId + '__')) {
      await c.ref.delete();
      silindi++;
    }
  }
  console.log(`✓ ${silindi} cache silindi`);

  console.log(`\n═══════════════════════════════════════`);
  console.log(`📊 ${basarili} başarılı, ${hatali} hata, ${transcriptYok} transcript yok`);
  console.log(`✅ Frontend'de yeni quote'lar 1-2 dk içinde görünür.`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
