// Eğitmen takip et — localStorage tabanlı.
// Set<coreId> formatında saklanır. Push notif veya cloud sync için
// ileride genişletilebilir.

import { useEffect, useState } from 'react';

const KEY = 'amare_takip_egitmenler_v1';

function loadSet() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); }
  catch { return new Set(); }
}
function saveSet(set) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
}

// Hook: takip listesi + toggle fonksiyonu
// Sayfa içinde takip durumu reaktif olarak güncellenir.
export function useTakipEgitmenler() {
  const [takipSet, setTakipSet] = useState(loadSet);

  // Aynı sekmedeki başka componentlerle senkron — storage event ile
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setTakipSet(loadSet());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = (coreId) => {
    if (!coreId) return false;
    setTakipSet(prev => {
      const next = new Set(prev);
      const wasTakip = next.has(coreId);
      if (wasTakip) next.delete(coreId);
      else next.add(coreId);
      saveSet(next);
      return next;
    });
  };

  const isTakip = (coreId) => takipSet.has(coreId);

  return { takipSet, toggle, isTakip, count: takipSet.size };
}
