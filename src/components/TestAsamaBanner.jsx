// Test aşamasındadır banner — sayfa üstüne sticky kırmızı uyarı
// Profil ve Ekibim gibi henüz tamamlanmamış sayfalar için
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const TestAsamaBanner = ({ aciklama }) => (
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
