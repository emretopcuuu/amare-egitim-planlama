// Klavye kısayolları için hook + global yardımcılar.
// Kullanım:
//   useKeyboardShortcuts({
//     '/': () => inputRef.current?.focus(),
//     '?': () => setHelpAcik(true),
//     'Escape': () => onClose(),
//     'ArrowLeft': () => prev(),
//     'ArrowRight': () => next(),
//     'f': () => toggleFav(),
//   }, [deps...]);
//
// Input'ta yazarken (input/textarea/contenteditable) kısayollar TETİKLENMEZ
// — kullanıcı normal yazıyor. Tek istisna: Escape her zaman çalışır.

import { useEffect } from 'react';

export function useKeyboardShortcuts(bindings, deps = []) {
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const isTyping = (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) && e.key !== 'Escape';
      if (isTyping) return;

      for (const [key, handler] of Object.entries(bindings)) {
        // Multi-key support: "shift+/" gibi
        const parts = key.toLowerCase().split('+');
        const targetKey = parts[parts.length - 1];
        const needShift = parts.includes('shift');
        const needCtrl  = parts.includes('ctrl') || parts.includes('cmd');
        const needAlt   = parts.includes('alt');

        const evKey = e.key === '?' ? '?' : e.key.toLowerCase();
        if (evKey !== targetKey) continue;
        if (needShift !== e.shiftKey) continue;
        if (needCtrl !== (e.ctrlKey || e.metaKey)) continue;
        if (needAlt !== e.altKey) continue;

        e.preventDefault();
        handler(e);
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
