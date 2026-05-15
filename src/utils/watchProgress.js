// Watch progress — localStorage tabanlı.
// Her video için { t, duration, pct, lastSeen } saklar.
// Cross-device sync YOK — sadece o tarayıcıda kalıcı.

import { useEffect, useState } from 'react';

const KEY = 'amare_watch_progress_v1';
const COMPLETED_PCT = 95;  // % bu üstündeyse "tamamlandı" sayılır, devam etme listesinden çıkar
const MIN_TRACK_SEC = 8;   // çok kısa izlemeleri sayma (tıklamış kapatmış vs.)

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function saveAll(obj) {
  try {
    // Max 200 video sakla (eski olanları temizle)
    const entries = Object.entries(obj);
    if (entries.length > 200) {
      entries.sort((a, b) => (b[1].lastSeen || 0) - (a[1].lastSeen || 0));
      obj = Object.fromEntries(entries.slice(0, 200));
    }
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {}
}

export function getProgress(videoId) {
  return loadAll()[videoId] || null;
}

export function updateProgress(videoId, t, duration) {
  if (!videoId || !duration || duration < 5) return;
  const all = loadAll();
  all[videoId] = {
    t: Math.round(t),
    duration: Math.round(duration),
    pct: Math.min(100, Math.round((t / duration) * 100)),
    lastSeen: Date.now(),
  };
  saveAll(all);
}

export function removeProgress(videoId) {
  const all = loadAll();
  if (all[videoId]) {
    delete all[videoId];
    saveAll(all);
  }
}

// Tamamlanmış (>=%95) video'ları temizle — manuel call
export function clearCompleted() {
  const all = loadAll();
  const filtered = {};
  for (const [id, p] of Object.entries(all)) {
    if (p.pct < COMPLETED_PCT) filtered[id] = p;
  }
  saveAll(filtered);
}

// Toplam izleme saati (saniye) — engagement metric
// Tamamlanmış videolar için duration sayar, yarım kalanlar için t sayar
export function getTotalWatchedSeconds() {
  const all = loadAll();
  let total = 0;
  for (const p of Object.values(all)) {
    if (!p) continue;
    // Tamamlanmış (>= COMPLETED_PCT) → duration kadar
    // Yarım → t (mevcut konum) kadar
    total += (p.pct >= COMPLETED_PCT) ? (p.duration || 0) : (p.t || 0);
  }
  return total;
}

// Bu hafta izlenen saat (engagement loop için — hedef vs gerçek)
export function getWeeklyWatchedSeconds() {
  const all = loadAll();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let total = 0;
  for (const p of Object.values(all)) {
    if (!p || !p.lastSeen || p.lastSeen < sevenDaysAgo) continue;
    total += (p.pct >= COMPLETED_PCT) ? (p.duration || 0) : (p.t || 0);
  }
  return total;
}

// Tamamlanmış video sayısı
export function getCompletedCount() {
  const all = loadAll();
  let n = 0;
  for (const p of Object.values(all)) {
    if (p && p.pct >= COMPLETED_PCT) n++;
  }
  return n;
}

// "Yarıda kaldıkların" listesi (lastSeen desc, max N)
export function getResumableList(allVideos, max = 12) {
  if (!allVideos?.length) return [];
  const progress = loadAll();
  const videoMap = new Map(allVideos.map(v => [v.id, v]));
  const list = [];
  for (const [id, p] of Object.entries(progress)) {
    if (p.pct >= COMPLETED_PCT) continue;       // tamamlanmış
    if (p.t < MIN_TRACK_SEC) continue;          // çok kısa
    const v = videoMap.get(id);
    if (!v) continue;                            // video listede yok
    list.push({ video: v, progress: p });
  }
  list.sort((a, b) => (b.progress.lastSeen || 0) - (a.progress.lastSeen || 0));
  return list.slice(0, max);
}

// React hook — progress state'i ve helper'ları döner.
// localStorage'da değişiklik olduğunda (diğer sekme veya manuel) güncellenir.
export function useWatchProgress() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setVersion(v => v + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Aynı sekmedeki update'leri tetiklemek için custom event de dinle
  useEffect(() => {
    const onUpdate = () => setVersion(v => v + 1);
    window.addEventListener('amare-watch-progress-changed', onUpdate);
    return () => window.removeEventListener('amare-watch-progress-changed', onUpdate);
  }, []);

  return {
    version, // re-render trigger
    get: (id) => getProgress(id),
    update: (id, t, dur) => {
      updateProgress(id, t, dur);
      window.dispatchEvent(new Event('amare-watch-progress-changed'));
    },
    remove: (id) => {
      removeProgress(id);
      window.dispatchEvent(new Event('amare-watch-progress-changed'));
    },
    getResumable: (allVideos, max) => getResumableList(allVideos, max),
  };
}
