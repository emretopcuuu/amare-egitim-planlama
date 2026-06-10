// src/components/XPBar.jsx
// ─────────────────────────────────────────────────────────────────────────
// "2.340 / 2.500 XP · Seviye 25'e 160 XP" + ince ilerleme çubuğu.
// XPHalka'nın altında, hero bölgesinde gösterilir.
// ─────────────────────────────────────────────────────────────────────────

import React from 'react';
import { seviyeHesapla, seviyeRenk } from '../utils/xp';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');

const XPBar = ({ xp = 0 }) => {
  const sv = seviyeHesapla(xp);
  const renk = seviyeRenk(sv.kusak);
  const pct = Math.round(sv.ilerleme * 100);

  return (
    <div className="max-w-xs mx-auto mt-5 w-full">
      <div className="flex items-center justify-between text-[11px] mb-1.5 px-0.5">
        <span className="text-white/60 font-semibold">{fmt(xp)} XP</span>
        {sv.maxMi ? (
          <span className="font-bold" style={{ color: renk.ring }}>Maksimum seviye 👑</span>
        ) : (
          <span className="font-bold" style={{ color: renk.ring }}>
            Sv {sv.seviye + 1}'e {fmt(sv.kalanXP)} XP
          </span>
        )}
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: renk.ring,
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: `0 0 8px ${renk.ring}88`,
          }}
        />
      </div>
    </div>
  );
};

export default XPBar;
