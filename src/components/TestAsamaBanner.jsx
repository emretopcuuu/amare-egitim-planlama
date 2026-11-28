// Test aşamasındadır banner — sayfa üstüne sticky kırmızı uyarı
// Profil ve Ekibim gibi henüz tamamlanmamış sayfalar için
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { gomuluMu } from '../utils/gomulu';

// Mağaza (28 Kas 2026): uygulamanın içinde "test aşamasında" şeridi gösterilmez
// (Apple 2.1: yarım/beta görünen içerik reddedilir). Gömülü çerçeve ya da
// iPhone/Android kabuğunun web görünümü (UA "OTKabuk/").
const uygulamaIcinde = () => {
  if (gomuluMu()) return true;
  try { return /OTKabuk\//.test(navigator.userAgent || ''); } catch { return false; }
};

const TestAsamaBanner = ({ aciklama }) => uygulamaIcinde() ? null : (
  <div className="sticky top-0 z-[55] bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 text-white shadow-lg border-b-2 border-red-700">
    <div className="container mx-auto max-w-7xl px-3 py-2 sm:py-2.5 flex items-center justify-center gap-2 flex-wrap text-center">
      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0" />
      <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wider">
        TEST AŞAMASINDADIR
      </span>
      {aciklama && (
        <span className="text-white/90 text-[10px] sm:text-xs font-normal">
          — {aciklama}
        </span>
      )}
    </div>
  </div>
);

export default TestAsamaBanner;
