// PWA install banner — kullanıcı 3+ ziyaretten sonra "Ana ekrana ekle" göster
// Service worker kurulur, beforeinstallprompt event yakalanır

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const ZIYARET_ESIK = 3;
const KARAR_KEY = 'amare_pwa_karar'; // 'kuruldu' | 'reddedildi' | 'sonra'
const ZIYARET_KEY = 'amare_pwa_ziyaret';

// iOS Safari beforeinstallprompt desteklemez → elle talimat gösteririz
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const zatenKurulu = () => window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;

const PwaInstallBanner = () => {
  const [promptEvent, setPromptEvent] = useState(null);
  const [gosterilsin, setGosterilsin] = useState(false);
  const [iosMod, setIosMod] = useState(false);

  useEffect(() => {
    // Service worker register
    if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
      navigator.serviceWorker.register('/sw-offline.js').catch(e =>
        console.warn('[pwa] sw register err:', e)
      );
    }

    // Ziyaret sayısını artır
    const ziyaret = parseInt(localStorage.getItem(ZIYARET_KEY) || '0', 10) + 1;
    localStorage.setItem(ZIYARET_KEY, String(ziyaret));

    // Karar verdiyse ya da zaten uygulama olarak açıldıysa hiç gösterme
    const karar = localStorage.getItem(KARAR_KEY);
    if (karar === 'kuruldu' || karar === 'reddedildi' || zatenKurulu()) return;

    // iOS: beforeinstallprompt yok → eşik geçildiyse talimat banner'ı göster
    if (isIOS()) {
      if (ziyaret >= ZIYARET_ESIK) {
        setIosMod(true);
        setTimeout(() => setGosterilsin(true), 2500);
      }
      return;
    }

    // beforeinstallprompt event'ini yakala
    const handler = (e) => {
      e.preventDefault();
      setPromptEvent(e);
      // Eşik üstündeyse hemen göster
      if (ziyaret >= ZIYARET_ESIK) {
        setTimeout(() => setGosterilsin(true), 2000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Kuruldu eventi
    const installedHandler = () => {
      localStorage.setItem(KARAR_KEY, 'kuruldu');
      setGosterilsin(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  async function kur() {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(KARAR_KEY, 'kuruldu');
    } else {
      localStorage.setItem(KARAR_KEY, 'reddedildi');
    }
    setGosterilsin(false);
  }

  function reddet() {
    localStorage.setItem(KARAR_KEY, 'reddedildi');
    setGosterilsin(false);
  }

  function sonra() {
    localStorage.setItem(KARAR_KEY, 'sonra');
    setGosterilsin(false);
  }

  if (!gosterilsin || (!promptEvent && !iosMod)) return null;

  // iOS: kurulum butonu yok — Paylaş → Ana Ekrana Ekle talimatı
  if (iosMod) {
    return (
      <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 max-w-md mx-auto z-[200] bg-gradient-to-br from-purple-900 to-indigo-950 border border-amber-400/40 rounded-2xl shadow-2xl p-4 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-purple-900" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm">Telefonuna Ekle</h4>
            <p className="text-purple-200/80 text-[11px] mt-0.5 leading-snug">
              Safari'de alttaki <b className="text-white">Paylaş</b> düğmesine (⬆️ kare-ok) bas, sonra <b className="text-white">"Ana Ekrana Ekle"</b>yi seç. One Team tek tıkla açılır.
            </p>
          </div>
          <button onClick={reddet} className="text-white/40 hover:text-white spring-tap" aria-label="Kapat">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button onClick={sonra} className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg spring-tap">
          Anladım
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 max-w-md mx-auto z-[200] bg-gradient-to-br from-purple-900 to-indigo-950 border border-amber-400/40 rounded-2xl shadow-2xl p-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
          <Download className="w-6 h-6 text-purple-900" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-bold text-sm">Telefonuna Ekle</h4>
          <p className="text-purple-200/80 text-[11px] mt-0.5 leading-snug">
            One Team uygulamasını ana ekrana ekle, tek tıkla aç. Daha hızlı, çevrimdışı modlu.
          </p>
        </div>
        <button onClick={reddet} className="text-white/40 hover:text-white spring-tap" aria-label="Kapat">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={sonra}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg spring-tap">
          Sonra
        </button>
        <button onClick={kur}
          className="flex-[2] bg-amber-400 hover:bg-amber-300 text-purple-900 text-xs font-bold py-2 rounded-lg spring-tap inline-flex items-center justify-center gap-1.5">
          <Download className="w-3.5 h-3.5" />Şimdi Ekle
        </button>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
