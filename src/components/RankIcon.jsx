// Rank logo gösterici — public/logos/ranks/{key}.png arar
// Eğer dosya yoksa fallback olarak harf + yıldız sayısı ile gradient daire
//
// Kullanım:
//   <RankIcon rank={rankObj} size={40} kilitli={false} />

import React, { useState } from 'react';
import { rankRenkClass } from '../utils/rankSchema';
import { Lock, Star } from 'lucide-react';

// Fallback için rank kısaltması
function rankShort(rank) {
  if (!rank) return '?';
  const k = rank.key;
  if (k === 'brand_partner') return 'BP';
  if (k === 'brand_builder') return 'BB';
  if (k === 'bronze') return 'B';
  if (k === 'silver') return 'S';
  if (k === 'gold') return 'G';
  if (k === 'platinum') return 'P';
  if (k === 'leader') return 'L';
  if (k === 'senior_leader') return 'SL';
  if (k === 'executive_leader') return 'EL';
  if (k === 'diamond') return 'D';
  if (k === 'one_star_diamond') return 'D';
  if (k === 'two_star_diamond') return 'D';
  if (k === 'three_star_diamond') return 'D';
  if (k === 'presidential_diamond') return 'PD';
  return rank.label?.[0] || '?';
}

// Star Diamond rank'ler için yıldız sayısı
function starCount(rank) {
  if (rank?.key === 'one_star_diamond') return 1;
  if (rank?.key === 'two_star_diamond') return 2;
  if (rank?.key === 'three_star_diamond') return 3;
  return 0;
}

const RankIcon = ({ rank, size = 40, kilitli = false }) => {
  const [imgError, setImgError] = useState(false);
  const renk = rankRenkClass(rank);
  const logoPath = rank ? `/logos/ranks/${rank.key}.png` : null;

  // Kilitli rank için sade gri daire + lock
  if (kilitli) {
    return (
      <div className="rounded-full bg-white/10 border border-white/15 flex items-center justify-center"
        style={{ width: size, height: size }}>
        <Lock className="text-white/40" style={{ width: size * 0.4, height: size * 0.4 }} />
      </div>
    );
  }

  // Logo PNG denenecek, hata olursa fallback
  if (logoPath && !imgError) {
    return (
      <div className="rounded-full bg-white p-1 shadow-md flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}>
        <img
          src={logoPath}
          alt={rank.label}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
          style={{ width: size - 8, height: size - 8 }}
        />
      </div>
    );
  }

  // Fallback: gradient daire + initials + yıldız (varsa)
  const stars = starCount(rank);
  const fontSize = stars > 0 ? size * 0.32 : size * 0.4;
  return (
    <div className={`rounded-full bg-gradient-to-br ${renk.bg} flex items-center justify-center text-white font-bold shadow-md relative`}
      style={{ width: size, height: size }}>
      <span style={{ fontSize: `${fontSize}px`, letterSpacing: '-0.02em' }}>
        {rankShort(rank)}
      </span>
      {stars > 0 && (
        <div className="absolute -top-0.5 right-0.5 flex gap-[1px]">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} className="text-amber-300 fill-amber-300" style={{ width: size * 0.15, height: size * 0.15 }} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RankIcon;
