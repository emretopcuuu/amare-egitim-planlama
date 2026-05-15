// Streak sistemi — kullanıcının kesintisiz giriş günü takibi
// Firestore users/{uid}.streak alanında saklanır:
//   { lastVisit: 'YYYY-MM-DD', current: number, longest: number, total: number }
//
// Tier 0 (anonim) kullanıcılar için localStorage fallback.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const LS_KEY = 'amare_streak_v1';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(d1, d2) {
  const a = new Date(d1 + 'T00:00:00');
  const b = new Date(d2 + 'T00:00:00');
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeLocal(streak) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(streak)); } catch {}
}

/**
 * Streak'i güncelle ve döndür.
 * @param {string|null} uid - Firebase uid (anonymous değilse Firestore'a da yaz)
 * @returns {Promise<{ current: number, longest: number, total: number, lastVisit: string, justUpdated: boolean }>}
 */
export async function updateStreak(uid, isAnonymous) {
  const today = todayStr();
  let streak;

  // Önce mevcut streak'i oku — Firestore varsa oradan, yoksa localStorage
  if (uid && !isAnonymous) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists() && snap.data().streak) {
        streak = snap.data().streak;
      }
    } catch (e) {
      console.warn('[streak] firestore read err:', e.message);
    }
  }
  if (!streak) streak = readLocal();
  if (!streak) streak = { lastVisit: null, current: 0, longest: 0, total: 0 };

  // Bugün zaten ziyaret etmiş mi?
  if (streak.lastVisit === today) {
    return { ...streak, justUpdated: false };
  }

  const diff = streak.lastVisit ? daysBetween(streak.lastVisit, today) : null;
  if (diff === 1) {
    // Üst üste — streak büyür
    streak.current += 1;
  } else if (diff === null || diff > 1) {
    // İlk giriş veya streak kırıldı — sıfırla, bugünden başla
    streak.current = 1;
  }
  // diff === 0 ise dokunma (zaten yukarıda yakalandı)

  streak.lastVisit = today;
  streak.longest = Math.max(streak.longest || 0, streak.current);
  streak.total = (streak.total || 0) + 1;

  // Yaz
  writeLocal(streak);
  if (uid && !isAnonymous) {
    try {
      await setDoc(doc(db, 'users', uid), { streak }, { merge: true });
    } catch (e) {
      console.warn('[streak] firestore write err:', e.message);
    }
  }

  return { ...streak, justUpdated: true };
}

/**
 * Streak'i sadece oku (güncelleme yapmadan).
 */
export async function getStreak(uid, isAnonymous) {
  if (uid && !isAnonymous) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists() && snap.data().streak) {
        return snap.data().streak;
      }
    } catch {}
  }
  return readLocal() || { lastVisit: null, current: 0, longest: 0, total: 0 };
}
