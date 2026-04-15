import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext();

const SUPPORTED_LANGS = ['tr', 'en', 'de'];
const CACHE_KEY = 'amare_dyn_translations';
const BATCH_SIZE = 20; // Her API çağrısında max metin sayısı
const BATCH_DELAY = 1500; // İstekler arası bekleme (ms)

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

// Diziyi parçalara böl
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
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

  // Çeviri kilidi — aynı anda birden fazla translateBatch çağrısını engelle
  const translatingRef = useRef(false);

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

  // Statik çeviri
  const t = useCallback((key) => {
    return (translations[lang] && translations[lang][key]) || translations.tr[key] || key;
  }, [lang]);

  const locale = lang === 'de' ? 'de-DE' : lang === 'en' ? 'en-US' : 'tr-TR';

  // ─── DİNAMİK ÇEVİRİ ───────────────────────────────────────────────────────

  // Gemini API — tek parça çeviri
  const callGeminiTranslate = useCallback(async (texts, targetLang) => {
    const apiKey = localStorage.getItem('geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey || targetLang === 'tr') return null;

    const langName = targetLang === 'en' ? 'English' : 'German';
    const prompt = `Translate the following Turkish texts to ${langName}. Return ONLY a JSON array of translated strings in the same order. Keep proper nouns, brand names (Amare, One Team, Diamond), city names, and technical terms as-is. Do not add explanations.

Input: ${JSON.stringify(texts)}`;

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

    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = responseText.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length === texts.length) return parsed;
    }
    throw new Error('Invalid response format');
  }, []);

  // delay helper
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Toplu çeviri — TEK GİRİŞ NOKTASI
  // Parçalara böl, sırayla gönder, başarısızları cache'leme
  const translateBatch = useCallback(async (texts) => {
    if (!texts?.length || lang === 'tr') return texts;

    // Zaten çalışıyorsa atla
    if (translatingRef.current) return texts;
    translatingRef.current = true;

    try {
      // Cache'de olmayanları filtrele
      const uncached = texts.filter(text => text && !cacheRef.current[lang]?.[text]);
      const unique = [...new Set(uncached)];

      if (unique.length === 0) return texts;

      console.log(`[i18n] ${unique.length} metin çevrilecek (${lang})...`);

      // Parçalara böl
      const chunks = chunk(unique, BATCH_SIZE);
      const newCache = { ...cacheRef.current };
      if (!newCache[lang]) newCache[lang] = {};

      let totalTranslated = 0;

      for (let i = 0; i < chunks.length; i++) {
        const batch = chunks[i];

        try {
          const translated = await callGeminiTranslate(batch, lang);

          if (translated) {
            batch.forEach((text, j) => {
              const result = translated[j];
              if (result && result !== text) {
                newCache[lang][text] = result;
                totalTranslated++;
              }
            });

            // Her başarılı parçadan sonra cache güncelle (kullanıcı hemen görsün)
            setDynamicCache({ ...newCache });
          }
        } catch (err) {
          console.warn(`[i18n] Parça ${i + 1}/${chunks.length} başarısız:`, err.message);
          // Bu parçayı atla, sonraki parçaya devam et
        }

        // Son parça değilse bekle (rate limit'e takılmamak için)
        if (i < chunks.length - 1) {
          await wait(BATCH_DELAY);
        }
      }

      console.log(`[i18n] ${totalTranslated}/${unique.length} metin çevrildi.`);
    } finally {
      translatingRef.current = false;
    }

    return texts;
  }, [lang, callGeminiTranslate]);

  // Senkron dinamik çeviri — SADECE cache'den oku
  const tDynamic = useCallback((text) => {
    if (!text || lang === 'tr') return text;
    const cached = dynamicCache[lang]?.[text];
    return cached || text;
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
