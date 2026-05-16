import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext();

const SUPPORTED_LANGS = ['tr', 'en', 'de', 'nl'];
const CACHE_KEY = 'amare_dyn_translations';
const BATCH_SIZE = 20; // Her API çağrısında max metin sayısı
const BATCH_DELAY = 1500; // İstekler arası bekleme (ms)

function getInitialLang() {
  // 1. ÖNCE localStorage — kullanıcı zaten tercih ettiyse buna saygı duy
  // (Firebase magic link'i URL'e lang=en ekliyor, bunu yoksay)
  const stored = localStorage.getItem('ot_lang');
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  // 2. localStorage boşsa URL parametresine bak (paylaşılan link senaryosu)
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang && SUPPORTED_LANGS.includes(urlLang)) {
    localStorage.setItem('ot_lang', urlLang);
    return urlLang;
  }
  // 3. Default Türkçe
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
      const oldLang = localStorage.getItem('ot_lang') || 'tr';
      localStorage.setItem('ot_lang', newLang);
      setLangState(newLang);
      document.documentElement.lang = newLang;
      // Analytics — dil değişimi
      if (oldLang !== newLang) {
        import('../utils/analytics').then(m => m.trackLangChange(oldLang, newLang)).catch(()=>{});
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Statik çeviri
  const t = useCallback((key) => {
    return (translations[lang] && translations[lang][key]) || translations.tr[key] || key;
  }, [lang]);

  const locale = lang === 'de' ? 'de-DE' : lang === 'en' ? 'en-US' : lang === 'nl' ? 'nl-NL' : 'tr-TR';

  // ─── DİNAMİK ÇEVİRİ ───────────────────────────────────────────────────────

  // Backend çeviri proxy'si — OpenRouter Netlify Function üzerinden
  // Eski: Gemini API key bundle'a gömülüyordu (SIZINTI riski) → key suspend oldu
  // Yeni: Backend Function çağırır, key asla bundle'a girmez
  const callTranslate = useCallback(async (texts, targetLang, retryCount = 0) => {
    if (targetLang === 'tr') return null;

    const res = await fetch('/.netlify/functions/dil-cevir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, targetLang }),
    });

    // 502/503 backend hatası → retry (max 3 kez, artan bekleme)
    if ((res.status === 502 || res.status === 503) && retryCount < 3) {
      const delay = (retryCount + 1) * 2000;
      console.warn(`[i18n] Çeviri ${res.status}, ${delay/1000}s sonra tekrar denenecek...`);
      await wait(delay);
      return callTranslate(texts, targetLang, retryCount + 1);
    }

    if (!res.ok) throw new Error(`Çeviri API ${res.status}`);

    const data = await res.json();
    const arr = data?.translations;
    if (Array.isArray(arr) && arr.length === texts.length) return arr;
    throw new Error('Invalid response format');
  }, []);

  // delay helper
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Toplu çeviri — TEK GİRİŞ NOKTASI
  // Parçalara böl, sırayla gönder, başarısızları cache'leme
  const translateBatch = useCallback(async (texts) => {
    if (!texts?.length || lang === 'tr') return texts;

    // Zaten çalışıyorsa atla
    if (translatingRef.current) {
      console.log('[i18n] translateBatch zaten çalışıyor, atlandı.');
      return texts;
    }
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
          const translated = await callTranslate(batch, lang);

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
  }, [lang, callTranslate]);

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
