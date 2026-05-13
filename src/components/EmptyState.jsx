// Boş durum görselleri — SVG illustrations
import React from 'react';

// "Arama sonucu yok" — büyüteç + soluk yıldız
export const EmptySearch = ({ title = 'Sonuç bulunamadı', desc = 'Filtreyi değiştirip tekrar dene', onReset, resetLabel = 'Filtreyi sıfırla' }) => (
  <div className="text-center py-12 px-4">
    <svg viewBox="0 0 200 200" className="w-32 h-32 mx-auto mb-4 opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Halkalar */}
      <circle cx="80" cy="80" r="48" stroke="rgba(245, 215, 122, 0.35)" strokeWidth="3" />
      <circle cx="80" cy="80" r="36" stroke="rgba(245, 215, 122, 0.5)" strokeWidth="2" />
      {/* Sap */}
      <line x1="118" y1="118" x2="150" y2="150" stroke="rgba(245, 215, 122, 0.7)" strokeWidth="8" strokeLinecap="round" />
      {/* Yıldızlar */}
      <path d="M 40 130 L 42 138 L 50 140 L 42 142 L 40 150 L 38 142 L 30 140 L 38 138 Z" fill="rgba(245, 215, 122, 0.6)" />
      <path d="M 150 50 L 152 56 L 158 58 L 152 60 L 150 66 L 148 60 L 142 58 L 148 56 Z" fill="rgba(245, 215, 122, 0.5)" />
      <path d="M 165 95 L 166 100 L 171 101 L 166 102 L 165 107 L 164 102 L 159 101 L 164 100 Z" fill="rgba(245, 215, 122, 0.4)" />
      {/* Soru işareti merkez */}
      <text x="80" y="92" textAnchor="middle" fontSize="36" fontWeight="bold" fill="rgba(245, 215, 122, 0.55)">?</text>
    </svg>
    <h3 className="text-white text-lg font-bold mb-1">{title}</h3>
    <p className="text-purple-200 text-sm mb-4">{desc}</p>
    {onReset && (
      <button onClick={onReset}
        className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 px-5 py-2.5 rounded-xl font-bold transition-all spring-tap">
        {resetLabel}
      </button>
    )}
  </div>
);

// "Tüm hafta tamamlandı" — kupa
export const EmptyCompleted = ({ title = 'Bu haftanın tüm eğitimleri tamamlandı', desc = 'Sonraki hafta için aşağı kaydır' }) => (
  <div className="text-center py-12 px-4">
    <svg viewBox="0 0 200 200" className="w-32 h-32 mx-auto mb-4" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Kupa gövdesi */}
      <path d="M 70 70 L 70 120 Q 70 140 100 140 Q 130 140 130 120 L 130 70 Z" fill="rgba(245, 215, 122, 0.85)" stroke="rgba(245, 215, 122, 1)" strokeWidth="2" />
      {/* Kulplar */}
      <path d="M 70 80 Q 50 80 50 100 Q 50 115 70 115" stroke="rgba(245, 215, 122, 0.85)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M 130 80 Q 150 80 150 100 Q 150 115 130 115" stroke="rgba(245, 215, 122, 0.85)" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Taban */}
      <rect x="80" y="140" width="40" height="8" rx="2" fill="rgba(245, 215, 122, 0.7)" />
      <rect x="70" y="148" width="60" height="6" rx="3" fill="rgba(245, 215, 122, 0.6)" />
      {/* Yıldız */}
      <path d="M 100 95 L 103 105 L 113 105 L 105 111 L 108 121 L 100 115 L 92 121 L 95 111 L 87 105 L 97 105 Z" fill="white" />
      {/* Parıltılar */}
      <circle cx="40" cy="40" r="3" fill="rgba(245, 215, 122, 0.7)" />
      <circle cx="160" cy="50" r="2.5" fill="rgba(245, 215, 122, 0.5)" />
      <circle cx="170" cy="120" r="3" fill="rgba(245, 215, 122, 0.6)" />
      <circle cx="30" cy="110" r="2" fill="rgba(245, 215, 122, 0.5)" />
    </svg>
    <h3 className="text-white text-lg font-bold mb-1">{title}</h3>
    <p className="text-purple-200 text-sm">{desc}</p>
  </div>
);

// Genel "Veri yok"
export const EmptyData = ({ title = 'Henüz eğitim eklenmemiş', desc = 'Yakında yeni eğitimler burada görünecek' }) => (
  <div className="text-center py-12 px-4">
    <svg viewBox="0 0 200 200" className="w-28 h-28 mx-auto mb-4" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="50" y="60" width="100" height="100" rx="10" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="3" />
      <line x1="50" y1="90" x2="150" y2="90" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="2" />
      <line x1="80" y1="50" x2="80" y2="70" stroke="rgba(245, 215, 122, 0.7)" strokeWidth="4" strokeLinecap="round" />
      <line x1="120" y1="50" x2="120" y2="70" stroke="rgba(245, 215, 122, 0.7)" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <h3 className="text-white text-lg font-bold mb-1">{title}</h3>
    <p className="text-purple-200 text-sm">{desc}</p>
  </div>
);

export default EmptySearch;
