// useFocusTrap — modal/dialog içinde Tab ile gezinmeyi sınırlar
// Açıldığında ilk focusable elemente odaklanır
// ESC ile onClose çağrılır
// Tab/Shift+Tab modal dışına çıkmaz

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(',');

/**
 * @param {boolean} acik — modal açık mı
 * @param {function} onClose — ESC ile çağrılacak callback
 * @returns ref — modal root'a verilmesi gereken ref
 */
export function useFocusTrap(acik, onClose) {
  const ref = useRef(null);
  const onceOdaklananRef = useRef(null);

  useEffect(() => {
    if (!acik || !ref.current) return;

    // Modal açılmadan önce focus olan elementi sakla (kapanınca geri ver)
    onceOdaklananRef.current = document.activeElement;

    // Modal içindeki ilk focusable'a odak
    const focusables = ref.current.querySelectorAll(FOCUSABLE);
    if (focusables.length > 0) {
      // İlk focusable bazen close butonu olabilir, eğer "autoFocus" varsa onu tercih et
      const autoFocus = ref.current.querySelector('[autoFocus]');
      (autoFocus || focusables[0])?.focus?.();
    }

    function handler(e) {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;

      const items = Array.from(ref.current.querySelectorAll(FOCUSABLE)).filter(
        el => el.offsetParent !== null // visible
      );
      if (items.length === 0) return;
      const ilk = items[0];
      const son = items[items.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === ilk) {
          e.preventDefault();
          son.focus();
        }
      } else {
        if (document.activeElement === son) {
          e.preventDefault();
          ilk.focus();
        }
      }
    }

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      // Modal kapanınca önceki focus'a dön
      if (onceOdaklananRef.current?.focus) {
        try { onceOdaklananRef.current.focus(); } catch {}
      }
    };
  }, [acik, onClose]);

  return ref;
}
