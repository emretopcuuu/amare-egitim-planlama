// AvatarOverlap — birkaç fotoğrafı üst üste kayık göster
// Kullanım: <AvatarOverlap items={[{ad, fotoURL}, ...]} max={6} />
// Kullanılan: Hakkımızda kart önizleme

import React from 'react';
import { User as UserIcon } from 'lucide-react';

const AvatarOverlap = ({ items = [], max = 6, size = 'w-9 h-9 sm:w-10 sm:h-10' }) => {
  const list = items.slice(0, max);
  const fazla = Math.max(0, items.length - max);

  return (
    <div className="flex items-center -space-x-2.5">
      {list.map((it, i) => (
        <div
          key={(it.coreId || it.ad || '') + i}
          className={`${size} rounded-full border-2 border-purple-950 bg-purple-800 overflow-hidden flex items-center justify-center shadow-md transition-transform group-hover:translate-x-0.5`}
          style={{ zIndex: max - i }}
          title={it.ad}
        >
          {it.fotoURL ? (
            <img src={it.fotoURL} alt={it.ad}
              loading="lazy" decoding="async"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 25%' }} />
          ) : (
            <span className="text-amber-200 font-bold text-[10px] sm:text-xs">
              {(it.ad || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      ))}
      {fazla > 0 && (
        <div className={`${size} rounded-full border-2 border-purple-950 bg-amber-400/90 text-purple-900 flex items-center justify-center shadow-md font-extrabold text-[10px] sm:text-xs`}
          style={{ zIndex: 0 }}>
          +{fazla}
        </div>
      )}
      {list.length === 0 && (
        <div className={`${size} rounded-full border-2 border-purple-950 bg-purple-800 flex items-center justify-center shadow-md`}>
          <UserIcon className="w-4 h-4 text-purple-300" />
        </div>
      )}
    </div>
  );
};

export default AvatarOverlap;
