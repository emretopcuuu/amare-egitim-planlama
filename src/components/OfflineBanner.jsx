// Offline indicator — network kesilince banner göster
// PWA olduğu için kullanıcı offline'da bile cache'lenmiş içeriği görebilir
// Ama davranış değişeceği için belirt: "Çevrimdışısın, gönderim sınırlı"

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineBanner = () => {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [yenidenAcildi, setYenidenAcildi] = useState(false);

  useEffect(() => {
    const offlineHandler = () => { setOnline(false); setYenidenAcildi(false); };
    const onlineHandler = () => {
      setOnline(true);
      setYenidenAcildi(true);
      // 3 saniye sonra "yeniden bağlandın" mesajını kaldır
      setTimeout(() => setYenidenAcildi(false), 3000);
    };
    window.addEventListener('offline', offlineHandler);
    window.addEventListener('online', onlineHandler);
    return () => {
      window.removeEventListener('offline', offlineHandler);
      window.removeEventListener('online', onlineHandler);
    };
  }, []);

  if (online && !yenidenAcildi) return null;

  return (
    <div role="status" aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[400] flex items-center justify-center gap-2 py-2 text-xs font-bold shadow-lg animate-slide-down ${
        online
          ? 'bg-emerald-500 text-white'
          : 'bg-rose-500 text-white'
      }`}>
      {online ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          Tekrar çevrimiçisin
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          Çevrimdışısın · Bazı özellikler sınırlı
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
