// Klavye kısayolları için hook.
// Binding'ler:
//   '?'         → e.key === '?'   (modifier umursanmaz — özel karakterler için)
//   '/'         → e.key === '/'   (modifier umursanmaz)
//   'Escape'    → e.key === 'Escape'
//   'ArrowLeft' → e.key === 'ArrowLeft'
//   'f'         → e.key.toLowerCase() === 'f' AND !shift
//   'shift+a'   → e.key.toLowerCase() === 'a' AND shift
//   'ctrl+s'    → e.key.toLowerCase() === 's' AND ctrl/cmd
//
// Input içinde yazarken kısayollar pasif (Escape hariç).

import { useEffect } from 'react';

// Özel karakter: harfler/rakamlar dışı tek karakter (örn. ?, /, !, @)
function isSpecialChar(s) {
  return s.length === 1 && !/[a-zA-Z0-9]/.test(s);
}

export function useKeyboardShortcuts(bindings, deps = []) {
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const isTyping = (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) && e.key !== 'Escape';
      if (isTyping) return;

      for (const [key, handler] of Object.entries(bindings)) {
        const parts = key.split('+').map(p => p.trim());
        const targetKey = parts[parts.length - 1];
        const explicitShift = parts.some(p => p.toLowerCase() === 'shift');
        const explicitCtrl  = parts.some(p => p.toLowerCase() === 'ctrl' || p.toLowerCase() === 'cmd');
        const explicitAlt   = parts.some(p => p.toLowerCase() === 'alt');

        let matchKey = false;
        if (isSpecialChar(targetKey)) {
          // ? / ! gibi karakterler — direkt karşılaştır, shift'i umursama
          matchKey = e.key === targetKey;
        } else if (targetKey.length === 1) {
          // Harf/rakam — küçük harfle karşılaştır
          matchKey = e.key.toLowerCase() === targetKey.toLowerCase();
        } else {
          // Escape, ArrowLeft vs — direkt karşılaştır
          matchKey = e.key === targetKey;
        }
        if (!matchKey) continue;

        // Modifier kontrolü — sadece harf/rakam veya çoklu kombinasyon için
        if (!isSpecialChar(targetKey)) {
          if (explicitShift !== e.shiftKey) continue;
        }
        if (explicitCtrl !== (e.ctrlKey || e.metaKey)) continue;
        if (explicitAlt !== e.altKey) continue;

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
