// useLongPress — uzun basma ile aksiyon menüsü tetikle
// Mobile/touch için ideal; desktop'ta right-click ile de tetiklenir
//
// Kullanım:
//   const longPress = useLongPress(() => setMenuAcik(true), { delay: 500 });
//   <div {...longPress}> ... </div>

import { useCallback, useRef } from 'react';

export function useLongPress(onLongPress, { delay = 500, onClick } = {}) {
  const timerRef = useRef(null);
  const triggeredRef = useRef(false);

  const start = useCallback((e) => {
    triggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      // Haptic feedback
      if ('vibrate' in navigator) navigator.vibrate(50);
      onLongPress?.(e);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const click = useCallback((e) => {
    // Long-press tetiklendiyse normal click iptal
    if (triggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  }, [onClick]);

  const contextMenu = useCallback((e) => {
    // Desktop right-click → long press tetikle
    e.preventDefault();
    triggeredRef.current = true;
    onLongPress?.(e);
  }, [onLongPress]);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onClick: click,
    onContextMenu: contextMenu,
  };
}
