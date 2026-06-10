// src/components/KolektifHedef.jsx
// ─────────────────────────────────────────────────────────────────────────
// "OneTeam 2026: 100.000 saat hedefi" — McGonigal FIX #6: Epic Scale + Awe.
// global_stats/2026 cache'ini okur (public read). Kullanıcının kişisel katkısını
// da gösterir → "bir parçası olma" hissi.
// ─────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');

const KolektifHedef = ({ kullaniciSaat = 0 }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'global_stats', '2026'));
        if (snap.exists()) setStats(snap.data());
      } catch (e) {
        console.warn('[kolektif] read err:', e.message);
      }
    })();
  }, []);

  // Veri henüz yoksa gösterme (ilk scheduled run öncesi)
  if (!stats || !stats.hedefSaat) return null;

  const pct = Math.min(100, stats.yuzde || 0);

  return (
    <div className="bg-white/10 backdrop-blur-md border border-purple-300/30 rounded-2xl p-4 flex items-center gap-4 stagger-fade" style={{ animationDelay: '200ms' }}>
      <div className="w-11 h-11 rounded-2xl bg-purple-400/20 border border-purple-300/40 flex items-center justify-center flex-shrink-0">
        <Globe className="w-6 h-6 text-purple-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-white text-[13px] font-bold leading-tight">
            OneTeam 2026: {fmt(stats.hedefSaat)} saat hedefi
          </span>
          <span className="text-purple-200/70 text-[11px] font-semibold whitespace-nowrap">
            {fmt(stats.toplamSaat)} / {fmt(stats.hedefSaat)}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full"
            style={{ width: `${pct}%`, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-purple-200/60 text-[11px]">
            {kullaniciSaat > 0 ? `Senin katkın: ${fmt(kullaniciSaat)} saat` : 'İlk saatini ekle, sayaca katkı yap'}
          </span>
          <span className="text-purple-300/50 text-[10px]">%{pct}</span>
        </div>
      </div>
    </div>
  );
};

export default KolektifHedef;
