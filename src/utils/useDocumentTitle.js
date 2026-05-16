// useDocumentTitle — sayfa başlığını dinamik güncelle
// Tarayıcı sekmesinde + paylaşılan link önizlemesinde + accessibility için kritik

import { useEffect } from 'react';

const SITE_ADI = 'One Team Eğitim Takvimi';

/**
 * @param {string} title — sayfa başlığı (ör. "Eğitim Yolum")
 * @param {string} [aciklama] — opsiyonel kısa açıklama (meta description için)
 */
export function useDocumentTitle(title, aciklama) {
  useEffect(() => {
    const oncekiTitle = document.title;
    document.title = title ? `${title} · ${SITE_ADI}` : SITE_ADI;

    let oncekiDesc;
    if (aciklama) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        oncekiDesc = meta.getAttribute('content');
        meta.setAttribute('content', aciklama);
      }
    }

    return () => {
      document.title = oncekiTitle;
      if (oncekiDesc) {
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', oncekiDesc);
      }
    };
  }, [title, aciklama]);
}
