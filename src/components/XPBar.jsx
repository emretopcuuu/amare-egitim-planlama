// src/components/XPBar.jsx
// ─────────────────────────────────────────────────────────────────────────
// "2.340 / 2.500 XP · Seviye 25'e 160 XP" + ince ilerleme çubuğu.
// XPHalka'nın altında, hero bölgesinde gösterilir.
// ─────────────────────────────────────────────────────────────────────────

import React from 'react';
import { seviyeHesapla, seviyeRenk } from '../utils/xp';
import { useTranslation } from '../context/LanguageContext';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');

const XPBar = ({ xp = 0 }) => {
  const { t } = useTranslation();
  const sv = seviyeHesapla(xp);
  const renk = seviyeRenk(sv.kusak);
  const pct = Math.round(sv.ilerleme * 100);

  return (
    <div className="max-w-xs mx-auto mt-5 w-full">
      <div className="flex items-center justify-between text-[11px] mb-1.5 px-0.5">
        <span className="text-white/60 font-semibold">{fmt(xp)} XP</span>
        {sv.maxMi ? (
          <span className="font-bold" style={{ color: renk.ring }}>{t('xp_max')}</span>
        ) : (
          <span className="font-bold" style={{ color: renk.ring }}>
            {t('xp_sonraki').replace('{xp}', fmt(sv.kalanXP))}
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
      {/* 23 Eki 2026 (Ahmet Dursun'un sorusu): XP'nin ne olduğu ekranda yazsın — Amare puanı sanılmasın. */}
      <p className="text-white/45 text-[10.5px] text-center mt-1.5 leading-snug">{t('xp_not_amare')}</p>
    </div>
  );
};

export default XPBar;
