// Boş Liste Component — kişilikli, ilham veren, CTA içeren empty state
// Sıkıcı "Henüz yok" yerine: konuya özel, sıcak, çağrı içeren mesaj.
//
// Kullanım:
//   <BosListe
//     icon={Heart}
//     baslik="Henüz favorin yok"
//     mesaj="İlgini çeken eğitmenleri kalp ile takip et — burada birikecekler"
//     cta={{ label: 'Eğitmenleri Keşfet', onClick: () => navigate('/konusmacilar') }}
//   />

import React from 'react';
import { Sparkles } from 'lucide-react';

const BosListe = ({
  icon: Icon = Sparkles,
  baslik = 'Henüz boş',
  mesaj = 'Az sonra dolacak...',
  cta,
  varyant = 'mor', // mor | altın | sade
  className = '',
}) => {
  const stil = {
    mor: {
      iconBg: 'bg-gradient-to-br from-purple-500/20 to-indigo-500/10 border-purple-400/30',
      iconRenk: 'text-purple-300',
      baslikRenk: 'text-white',
      mesajRenk: 'text-purple-200/80',
      ctaBg: 'bg-amber-400 hover:bg-amber-300 text-purple-900',
      glowRenk: 'rgba(168, 85, 247, 0.25)',
    },
    altın: {
      iconBg: 'bg-gradient-to-br from-amber-400/30 to-amber-600/15 border-amber-300/40',
      iconRenk: 'text-amber-300',
      baslikRenk: 'text-white',
      mesajRenk: 'text-purple-200/80',
      ctaBg: 'bg-amber-400 hover:bg-amber-300 text-purple-900',
      glowRenk: 'rgba(251, 191, 36, 0.3)',
    },
    sade: {
      iconBg: 'bg-gray-100 border-gray-200',
      iconRenk: 'text-gray-400',
      baslikRenk: 'text-gray-900',
      mesajRenk: 'text-gray-500',
      ctaBg: 'bg-purple-600 hover:bg-purple-700 text-white',
      glowRenk: 'rgba(148, 163, 184, 0.2)',
    },
  };
  const s = stil[varyant] || stil.mor;

  return (
    <div className={`relative flex flex-col items-center justify-center py-12 sm:py-16 px-6 text-center ${className}`}>
      {/* Halo glow arka plan */}
      <div className="absolute -inset-4 blur-3xl pointer-events-none opacity-40"
        style={{ background: `radial-gradient(ellipse at center, ${s.glowRenk} 0%, transparent 70%)` }} />

      {/* İkon kutusu — büyük ve davetkar */}
      <div className={`relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl ${s.iconBg} border shadow-xl mb-5 animate-fade-in`}>
        <Icon className={`w-10 h-10 sm:w-12 sm:h-12 ${s.iconRenk}`} strokeWidth={1.5} />
        {/* Sparkle dekor */}
        <Sparkles className="absolute -top-1.5 -right-1.5 w-4 h-4 text-amber-300 opacity-80" fill="currentColor" />
      </div>

      {/* Başlık */}
      <h3 className={`text-lg sm:text-xl font-bold ${s.baslikRenk} mb-2 max-w-md leading-tight`}>
        {baslik}
      </h3>

      {/* Mesaj */}
      <p className={`text-sm sm:text-[15px] ${s.mesajRenk} max-w-md leading-relaxed mb-6`}>
        {mesaj}
      </p>

      {/* CTA */}
      {cta && (
        <button onClick={cta.onClick}
          className={`inline-flex items-center gap-2 ${s.ctaBg} font-bold text-sm px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all spring-tap`}>
          {cta.label}
          <span className="text-base">→</span>
        </button>
      )}
    </div>
  );
};

export default BosListe;
