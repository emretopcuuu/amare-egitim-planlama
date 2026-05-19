// BentoCard — Profil sayfasının bento grid'inde kullanılan kart wrapper'ı
// Tutarlı stil + opsiyonel başlık + col/row span kontrolü
import React from 'react';

const SPAN_MAP = {
  // Mobile her zaman col-span-1, md+ ayarlanır
  // Klassik bento boyutları
  1:  '',
  2:  'md:col-span-2',
  3:  'md:col-span-2 lg:col-span-3',
  'lg2': 'md:col-span-2 lg:col-span-2', // lg'de orta boy
  'wide': 'md:col-span-2 lg:col-span-3',  // full row
};

const ROW_MAP = {
  1: '',
  2: 'lg:row-span-2',
};

/**
 * <BentoCard
 *   span="lg2"           // optional: kaç sütun kaplar (1, 2, 3, 'lg2', 'wide')
 *   rowSpan={2}          // optional: lg'de kaç satır
 *   tema="purple"        // optional: amber / purple / emerald / rose / sky / slate (default slate)
 *   icon={Sparkles}      // optional
 *   title="Eğitim Yolum" // optional
 *   subtitle="..."       // optional
 *   action={<button>}    // optional sağ üst köşe
 *   noPadding            // optional
 * >
 *   {children}
 * </BentoCard>
 */
const TEMA_RENK = {
  purple:  { kart: 'from-purple-500/10 via-indigo-500/10 to-purple-500/10 border-purple-400/30', baslik: 'text-purple-200', icon: 'text-purple-300' },
  amber:   { kart: 'from-amber-400/15 via-orange-500/10 to-amber-400/15 border-amber-300/40', baslik: 'text-amber-200', icon: 'text-amber-300' },
  emerald: { kart: 'from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-emerald-300/30', baslik: 'text-emerald-200', icon: 'text-emerald-300' },
  rose:    { kart: 'from-rose-500/15 via-orange-500/10 to-rose-500/15 border-rose-300/30', baslik: 'text-rose-200', icon: 'text-rose-300' },
  sky:     { kart: 'from-sky-400/15 via-cyan-500/10 to-sky-400/15 border-sky-300/30', baslik: 'text-sky-200', icon: 'text-sky-300' },
  slate:   { kart: 'from-white/10 to-white/5 border-white/15', baslik: 'text-white/80', icon: 'text-white/70' },
};

const BentoCard = ({
  span = 1,
  rowSpan = 1,
  tema = 'slate',
  icon: Icon,
  title,
  subtitle,
  action,
  noPadding,
  id,
  children,
  className = '',
}) => {
  const renk = TEMA_RENK[tema] || TEMA_RENK.slate;
  const spanCls = SPAN_MAP[span] || '';
  const rowCls = ROW_MAP[rowSpan] || '';
  return (
    <div id={id}
      className={`bg-gradient-to-br ${renk.kart} backdrop-blur-md border rounded-2xl shadow-lg overflow-hidden flex flex-col ${spanCls} ${rowCls} ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className={`w-4 h-4 ${renk.icon} flex-shrink-0`} />}
            <div className="min-w-0">
              <h3 className={`${renk.baslik} text-[10px] uppercase tracking-wider font-extrabold truncate`}>{title}</h3>
              {subtitle && <p className="text-white/50 text-[10px] truncate">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={`${noPadding ? '' : 'p-4'} flex-1 ${rowCls ? 'overflow-y-auto' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default BentoCard;
