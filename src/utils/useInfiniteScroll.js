// useInfiniteScroll — IntersectionObserver ile sayfanın altına gelince daha fazla yükle
// Kullanım: tüm liste önceden alındıysa client-side sayfalama yapar (chunk by chunk render)

import { useEffect, useRef, useState, useMemo } from 'react';

/**
 * @param {Array} fullList — tüm liste
 * @param {number} batchSize — her seferinde gösterilecek item sayısı
 * @returns { visibleItems, sentinelRef, hasMore }
 */
export function useInfiniteScroll(fullList, batchSize = 24) {
  const [shown, setShown] = useState(batchSize);
  const sentinelRef = useRef(null);

  // Liste değişince başa dön
  useEffect(() => { setShown(batchSize); }, [fullList, batchSize]);

  // IntersectionObserver — sentinel ekrana girince shown++
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (shown >= fullList.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(s => Math.min(s + batchSize, fullList.length));
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [shown, fullList.length, batchSize]);

  const visibleItems = useMemo(() => fullList.slice(0, shown), [fullList, shown]);
  const hasMore = shown < fullList.length;

  return { visibleItems, sentinelRef, hasMore, shown, total: fullList.length };
}
