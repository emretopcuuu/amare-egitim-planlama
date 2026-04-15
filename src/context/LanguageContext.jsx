import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext();

const SUPPORTED_LANGS = ['tr', 'en', 'de'];
const CACHE_KEY = 'amare_dyn_translations';

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

  // Dinamik çeviri cache'i (localStorage + state)
  const [dynamicCache, setDynamicCache] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const cacheRef = useRef(dynamicCache);
  cacheRef.current = dynamicCache;

  // Çeviri kilidi — aynı anda birden fazla API çağrısını engelle
  const translatingRef = useRef(false);
  const retryQueueRef = useRef([]);

  // Cache'i localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(dynamicCache));
  }, [dynamicCache]);

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

  // Statik çeviri (mevcut sistem — dokunulmadı)
  const t = useCallback((key) => {
    return (translations[lang] && translations[lang][key]) || translations.tr[key] || key;
  }, [lang]);

  // Locale string for date formatting
  const locale = lang === 'de' ? 'de-DE' : lang === 'en' ? 'en-US' : 'tr-TR';

  // ─── DİNAMİK ÇEVİRİ (eğitim başlıkları, kategori isimleri vb.) ───────────

  // Gemini API ile toplu çeviri — TEK SEFER, kilit mekanizmalı
  const callGeminiTranslate = useCallback(async (texts, targetLang) => {
    const apiKey = localStorage.getItem('geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey || targetLang === 'tr') return null;

    const langName = targetLang === 'en' ? 'English' : 'German';
    const prompt = `Translate the following Turkish texts to ${langName}. Return ONLY a JSON array of translated strings in the same order. Keep proper nouns, brand names (Amare, One Team, Diamond), city names, and technical terms as-is. Do not add explanations.

Input: ${JSON.stringify(texts)}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
          }),
        }
      );
      if (!res.ok) {
        console.warn(`Gemini API error: ${res.status}`);
        return null; // null = başarısız, cache'leme
      }
      const data = await res.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const match = responseText.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length === texts.length) return parsed;
      }
    } catch (err) {
      console.warn('Dynamic translation error:', err);
    }
    return null; // null = başarısız
  }, []);

  // Toplu çeviri — TEK GİRİŞ NOKTASI, kilit mekanizmalı
  const translateBatch = useCallback(async (texts) => {
    if (!texts?.length || lang === 'tr') return texts;

    // Zaten çevrilmişleri filtrele
    const toTranslate = [];
    const toTranslateIdx = [];
    const results = new Array(texts.length);

    texts.forEach((text, i) => {
      if (!text) { results[i] = text; return; }
      const cached = cacheRef.current[lang]?.[text];
      if (cached) { results[i] = cached; }
      else { toTranslate.push(text); toTranslateIdx.push(i); }
    });

    if (toTranslate.length === 0) return results;

    // Kilit kontrolü — eşzamanlı çağrıları engelle
    if (translatingRef.current) {
      // Kuyruğa ekle, sonra tekrar denenecek
      retryQueueRef.current.push(...toTranslate);
      return results;
    }

    translatingRef.current = true;

    try {
      const translated = await callGeminiTranslate(toTranslate, lang);

      if (translated) {
        // Başarılı — cache'e yaz
        const newCache = { ...cacheRef.current };
        if (!newCache[lang]) newCache[lang] = {};

        toTranslate.forEach((text, j) => {
          const result = translated[j] || text;
          // Sadece gerçekten çevrilmişleri cache'le
          if (result !== text) {
            results[toTranslateIdx[j]] = result;
            newCache[lang][text] = result;
          }
        });

        setDynamicCache(newCache);
      }
      // null dönerse (API hatası) → cache'leme, sonra tekrar denenecek
    } finally {
      translatingRef.current = false;

      // Kuyrukta bekleyen varsa tekrar dene
      if (retryQueueRef.current.length > 0) {
        const queued = [...new Set(retryQueueRef.current)];
        retryQueueRef.current = [];
        // Kısa gecikme ile tekrar dene (rate limit'e takılmamak için)
        setTimeout(() => translateBatch(queued), 2000);
      }
    }

    return results;
  }, [lang, callGeminiTranslate]);

  // Senkron dinamik çeviri — SADECE cache'den oku
  // translateBatch zaten useEffect'te çağrılıyor, burada API çağrısı YOK
  const tDynamic = useCallback((text) => {
    if (!text || lang === 'tr') return text;
    const cached = dynamicCache[lang]?.[text];
    if (cached) return cached;
    return text; // Cache'de yoksa orijinal döndür, translateBatch halleder
  }, [lang, dynamicCache]);

  return (
    <LanguageContext.Provider value={{
      lang, setLang, t, locale, SUPPORTED_LANGS,
      tDynamic, translateBatch,
    }}>
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
