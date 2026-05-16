// useDynamicTranslate hook
// Dinamik string'leri (eğitim başlığı, kategori, vb) batch olarak çevirir
// Çeviri sonucu cache'lenir, dil değişince yeniden çeviri tetiklenir

import { useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';

/**
 * Verilen string array'ini hedef dile çevirir (cache + batch)
 * @param {string[]} texts — çevrilecek metinler
 */
export function useDynamicTranslate(texts) {
  const { lang, translateBatch } = useTranslation();

  useEffect(() => {
    if (lang === 'tr' || !texts?.length) return;
    // Boş ve null filtrele
    const valid = texts.filter(t => t && typeof t === 'string' && t.trim() && t.length < 500);
    if (valid.length === 0) return;
    // Async — backend cache'leyecek
    translateBatch(valid).catch(e => console.warn('[i18n] dynamic translate err:', e.message));
  }, [lang, texts?.length, translateBatch]);
}
