// Akıllı geri navigasyon: kullanıcı sayfaya in-app navigasyonla geldiyse
// gerçek geri (history -1) yapar; doğrudan URL'den / yeni sekmeden geldiyse
// fallback sayfaya gider (genelde anasayfa).
import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useSmartBack(fallback = '/') {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    // React Router v6: location.key === 'default' → ilk yüklenen sayfa
    // (kullanıcı doğrudan URL'den geldi). Aksi halde in-app navigasyon var.
    if (location.key && location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }, [navigate, location.key, fallback]);
}
