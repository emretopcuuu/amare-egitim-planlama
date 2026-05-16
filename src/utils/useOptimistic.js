// useOptimistic — UI'ı önce güncelle, async işlem fail olursa geri al
//
// Kullanım:
//   const [count, optimisticCount] = useOptimistic(initialCount);
//   await optimisticCount(newValue, async () => {
//     await firestoreUpdate(...);
//   });
// Eğer firestoreUpdate throw atarsa value otomatik eski değere döner

import { useState, useCallback, useRef } from 'react';

export function useOptimistic(initialValue) {
  const [value, setValue] = useState(initialValue);
  const lastConfirmedRef = useRef(initialValue);

  // Confirmed (network'ten gelen) değer geldiğinde lastConfirmed güncelle
  const set = useCallback((next) => {
    setValue(next);
    lastConfirmedRef.current = next;
  }, []);

  // Optimistic — önce UI'ı güncelle, sonra async iş yap
  const optimisticSet = useCallback(async (next, asyncFn) => {
    const onceki = lastConfirmedRef.current;
    setValue(next);
    try {
      await asyncFn();
      lastConfirmedRef.current = next;
      return true;
    } catch (e) {
      // Hata: geri al
      setValue(onceki);
      throw e;
    }
  }, []);

  return [value, optimisticSet, set];
}
