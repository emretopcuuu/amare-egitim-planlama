// src/components/XPHalka.jsx
// ─────────────────────────────────────────────────────────────────────────
// Avatar etrafında XP ilerleme halkası + seviye rozeti + XP bar.
// McGonigal FIX #2: sürekli görsel geri bildirim (Tetris tarzı tight loop).
//
// children olarak ProfilAvatar alır — foto upload mantığına dokunmaz, sadece
// etrafına SVG progress ring + altına seviye rozeti çizer.
// ─────────────────────────────────────────────────────────────────────────

import React from 'react';
import { seviyeHesapla, seviyeRenk } from '../utils/xp';

/**
 * @param {object} props
 * @param {number} props.xp - toplam XP
 * @param {React.ReactNode} props.children - ProfilAvatar
 * @param {number} [props.boyut=140] - halka dış çapı (px)
 */
const XPHalka = ({ xp = 0, children, boyut = 140 }) => {
  const sv = seviyeHesapla(xp);
  const renk = seviyeRenk(sv.kusak);

  const strokeW = 5;
  const r = (boyut - strokeW) / 2;
  const cevre = 2 * Math.PI * r;
  const dolu = cevre * sv.ilerleme;

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative" style={{ width: boyut, height: boyut }}>
        {/* SVG halka — avatar'ın üstüne biner */}
        <svg
          width={boyut} height={boyut}
          viewBox={`0 0 ${boyut} ${boyut}`}
          className="absolute inset-0 pointer-events-none -rotate-90"
          aria-hidden="true"
        >
          {/* Arka iz */}
          <circle cx={boyut / 2} cy={boyut / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeW} />
          {/* Dolu kısım */}
          <circle cx={boyut / 2} cy={boyut / 2} r={r}
            fill="none" stroke={renk.ring} strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${dolu} ${cevre - dolu}`}
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${renk.ring}66)` }} />
        </svg>

        {/* İç avatar — halkadan biraz küçük tut */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ padding: strokeW + 4 }}>
          {children}
        </div>

        {/* Seviye rozeti — alt orta */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 z-10">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap"
            style={{ background: renk.rozet, color: renk.rozetBg }}
          >
            SV {sv.seviye}
            <span className="opacity-80 font-bold">· {sv.kusak}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default XPHalka;
