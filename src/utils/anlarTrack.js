// Popüler an tıklama tracker — VideoTranscriptChunks, VideoBookmarklar
// gibi yerlerden çağrılır. Fire-and-forget, hatayı sessizce yutar.
//
// Throttle: aynı an'ın aynı kullanıcı tarafından son 60sn'de gönderilmesini
// engeller (localStorage). Backend zaten bucket'lıyor ama gereksiz trafiği
// önler.

import { auth } from './firebase';

const SENT_KEY = 'amare_anlar_sent_v1';
const THROTTLE_MS = 60 * 1000;

function loadSent() {
  try {
    const raw = sessionStorage.getItem(SENT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveSent(map) {
  try { sessionStorage.setItem(SENT_KEY, JSON.stringify(map)); } catch {}
}

export async function trackAnTikla(vimeoId, start, kaynak = 'chunk') {
  if (!vimeoId || start == null || start < 0) return;
  try {
    const bucket = Math.floor(start / 10) * 10;
    const key = `${vimeoId}__${bucket}`;
    const sent = loadSent();
    const now = Date.now();
    if (sent[key] && now - sent[key] < THROTTLE_MS) return; // throttle
    sent[key] = now;
    // Eski entry'leri temizle (>1h)
    for (const k of Object.keys(sent)) {
      if (now - sent[k] > 60 * 60 * 1000) delete sent[k];
    }
    saveSent(sent);

    const u = auth.currentUser;
    if (!u) return; // auth yoksa sessizce çık (backend zaten reddediyor)
    const token = await u.getIdToken();
    // Fire-and-forget
    fetch('/.netlify/functions/anlar-popularla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ vimeoId, start: Math.floor(start), kaynak }),
    }).catch(() => {});
  } catch {}
}
