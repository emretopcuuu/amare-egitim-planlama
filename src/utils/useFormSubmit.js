// useFormSubmit — form submit'lerinin loading state'ini standartlaştırır
//
// Kullanım:
//   const { gonderiliyor, hata, basari, gonder } = useFormSubmit();
//   <button onClick={() => gonder(async () => await api.save())}>
//     {gonderiliyor ? 'Gönderiyor...' : 'Kaydet'}
//   </button>

import { useState, useCallback } from 'react';

export function useFormSubmit({ basariResetMs = 2500 } = {}) {
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState(false);

  const gonder = useCallback(async (fn, opts = {}) => {
    setGonderiliyor(true);
    setHata('');
    setBasari(false);
    try {
      const result = await fn();
      setBasari(true);
      if (basariResetMs > 0) {
        setTimeout(() => setBasari(false), basariResetMs);
      }
      opts.onBasari?.(result);
      return result;
    } catch (e) {
      const mesaj = e?.message || 'Bir hata oluştu';
      setHata(mesaj);
      opts.onHata?.(e);
      throw e;
    } finally {
      setGonderiliyor(false);
    }
  }, [basariResetMs]);

  return { gonderiliyor, hata, basari, gonder, hataTemizle: () => setHata('') };
}
