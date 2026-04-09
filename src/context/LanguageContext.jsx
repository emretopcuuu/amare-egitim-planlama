import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext();

const SUPPORTED_LANGS = ['tr', 'en', 'de'];

function getInitialLang() {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang && SUPPORTED_LANGS.includes(urlLang)) {
    localStorage.setItem('ot_lang', urlLang);
    return urlLang;
  }
  const stored = localStorage.getItem('ot_lang');
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  return 'tr';
}

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = useCallback((newLang) => {
    if (SUPPORTED_LANGS.includes(newLang)) {
      localStorage.setItem('ot_lang', newLang);
      setLangState(newLang);
      document.documentElement.lang = newLang;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key) => {
    return (translations[lang] && translations[lang][key]) || translations.tr[key] || key;
  }, [lang]);

  // Locale string for date formatting
  const locale = lang === 'de' ? 'de-DE' : lang === 'en' ? 'en-US' : 'tr-TR';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, locale, SUPPORTED_LANGS }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
};

export default LanguageContext;
