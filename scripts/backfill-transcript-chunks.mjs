// scripts/backfill-transcript-chunks.mjs
// ─────────────────────────────────────────────────────────────────────────
// Mevcut videolarda transcript düz metin olarak saklanmıştı (timestamp'siz).
// Bu script Vimeo'dan VTT'yi yeniden çekip transcriptChunks alanını doldurur.
// Zaman atlatma özelliği için gerekli.
//
// Çalıştırma:
//   node backfill-transcript-chunks.mjs --dry-run --limit=10
//   node backfill-transcript-chunks.mjs --limit=100
//   node backfill-transcript-chunks.mjs                  # tümü
//
// Strateji: transcriptVar=true VE transcriptChunks=null olan kayıtları işle.
//          Hızı 1 sn/video — 1000 video ~17 dk.
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const DELAY_MS = 800; // Vimeo rate-limit dostu

const VIMEO_TOKEN = process.env.VIMEO_TOKEN || process.env.VIMEO_ACCESS_TOKEN;
const VIMEO_BASE = 'https://api.vimeo.com';

if (!VIMEO_TOKEN) {
  console.error('✗ VIMEO_TOKEN .env içinde tanımlı olmalı (scripts/.env)');
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

// ─── VTT parser (vimeo-yeni-cek.mjs ile aynı mantık) ─────────────────────
function parseVtt(vtt) {
  if (!vtt) return { text: '', chunks: [] };
  const tsRe = /^(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/;
  const lines = vtt.split(/\r?\n/);
  const raw = [];
  let cur = null;
  for (const line of lines) {
    const m = tsRe.exec(line);
    if (m) {
      if (cur && cur.text) raw.push(cur);
      const start = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
      const end   = (+m[5]) * 3600 + (+m[6]) * 60 + (+m[7]) + (+m[8]) / 1000;
      cur = { start: Math.round(start * 10) / 10, end: Math.round(end * 10) / 10, text: '' };
    } else if (cur && line.trim() && !/^WEBVTT/.test(line) && !/^\d+\s*$/.test(line.trim())) {
      cur.text = (cur.text ? cur.text + ' ' : '') + line.trim();
    } else if (!line.trim() && cur && cur.text) {
      raw.push(cur);
      cur = null;
    }
  }
  if (cur && cur.text) raw.push(cur);
  const merged = [];
  for (const c of raw) {
    const last = merged[merged.length - 1];
    if (last && c.start - last.end < 0.6 && (c.end - last.start) < 8) {
      last.end = c.end;
      last.text += ' ' + c.text;
    } else {
      merged.push({ ...c });
    }
  }
  return { text: merged.map(c => c.text).join('\n'), chunks: merged };
}

async function vimeoFetch(path) {
  const url = path.startsWith('http') ? path : `${VIMEO_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `bearer ${VIMEO_TOKEN}`,
      'Accept': 'application/vnd.vimeo.*+json;version=3.4',
    },
  });
  if (!res.ok) throw new Error(`Vimeo ${res.status}`);
  return res.json();
}

async function fetchTranscript(vimeoId) {
  const tracks = await vimeoFetch(`/videos/${vimeoId}/texttracks`);
  if (!tracks?.data?.length) return null;
  const tr = tracks.data.find(t => t.language === 'tr') || tracks.data[0];
  if (!tr?.link) return null;
  const vttRes = await fetch(tr.link);
  if (!vttRes.ok) return null;
  const vtt = await vttRes.text();
  return parseVtt(vtt);
}

async function main() {
  console.log(`[backfill] başladı | DRY=${DRY_RUN} | LIMIT=${LIMIT}`);

  // transcriptVar=true VE chunks henüz yok
  const snap = await db.collection('kayitli_egitimler')
    .where('transcriptVar', '==', true)
    .get();
  console.log(`[firestore] ${snap.size} doc'ta transcript var`);

  const hedefler = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (Array.isArray(data.transcriptChunks) && data.transcriptChunks.length > 0) continue;
    hedefler.push({ ref: d.ref, id: d.id, vimeoId: data.vimeoId, baslik: data.baslik });
    if (hedefler.length >= LIMIT) break;
  }
  console.log(`[hedef] ${hedefler.length} video backfill edilecek`);

  let ok = 0, fail = 0, empty = 0;
  for (let i = 0; i < hedefler.length; i++) {
    const h = hedefler[i];
    try {
      const tx = await fetchTranscript(h.vimeoId);
      if (!tx || !tx.chunks?.length) {
        empty++;
        if (i < 5) console.log(`  [${i+1}] ⊘ ${h.vimeoId} | ${h.baslik?.slice(0, 50)} → VTT yok`);
        await new Promise(r => setTimeout(r, DELAY_MS));
        continue;
      }
      const docBytes = JSON.stringify(tx.chunks).length;
      if (docBytes > 900_000) {
        console.warn(`  [${i+1}] ⚠ ${h.vimeoId} chunks çok büyük (${(docBytes/1024).toFixed(0)}KB) — atlandı`);
        fail++;
        continue;
      }
      if (!DRY_RUN) {
        await h.ref.update({
          transcript: tx.text,
          transcriptChunks: tx.chunks,
          guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      ok++;
      if ((i + 1) % 25 === 0 || i < 5) {
        console.log(`  [${i+1}/${hedefler.length}] ✓ ${h.vimeoId} | ${tx.chunks.length} chunk | ${(docBytes/1024).toFixed(0)}KB`);
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    } catch (err) {
      console.warn(`  [${i+1}] ✗ ${h.vimeoId}: ${err.message?.slice(0, 80)}`);
      fail++;
      await new Promise(r => setTimeout(r, DELAY_MS * 2));
    }
  }

  console.log('\n========================================');
  console.log(`✓ tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Başarılı:  ${ok}`);
  console.log(`  Boş VTT:   ${empty}`);
  console.log(`  Hatalı:    ${fail}`);
  console.log('========================================');
}

main().catch(err => { console.error(err); process.exit(1); });
