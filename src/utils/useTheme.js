// Theme toggle — dark (default), light, auto (system)
// localStorage persistence
//
// Şu an site büyük çoğunlukla dark designed; light tema sadece body/admin için
// işlevsel. Tam light support uzun süreceği için minimum başlangıç.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'amare_theme';

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'dark'; // default
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  function setTheme(yeni) {
    setThemeState(yeni);
  }

  function toggle() {
    setThemeState(t => (t === 'dark' ? 'light' : 'dark'));
  }

  return { theme, setTheme, toggle, isDark: theme === 'dark', isLight: theme === 'light' };
}
