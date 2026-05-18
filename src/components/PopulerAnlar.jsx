// Popüler Anlar — topluluk tıklamalarına göre top N aha moment / chunk
// Public — herkes görür, /kayitli-egitimler ve profil widgetı olarak kullanılır

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Loader2, Play, Flame, ArrowRight } from 'lucide-react';
import { metinTemizleDeep } from '../utils/metinTemizle';

const PopulerAnlar = ({ limit = 5, kompakt = false }) => {
  const navigate = useNavigate();
  const [anlar, setAnlar] = useState(null);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const res = await fetch(`/.netlify/functions/anlar-popularla?limit=${limit}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!aktif) return;
        setAnlar(metinTemizleDeep(Array.isArray(data.anlar) ? data.anlar : []));
      } catch {
        if (aktif) setHata(true);
      }
    })();
    return () => { aktif = false; };
  }, [limit]);

  function git(an) {
    if (!an?.vimeoId) return;
    navigate(`/kayitli-egitimler?v=${encodeURIComponent(an.vimeoId)}&t=${Math.floor(an.start || 0)}`);
  }

  if (hata) return null;

  if (!anlar) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 text-white/40 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Popüler anlar yükleniyor…
      </div>
    );
  }

  if (anlar.length === 0) return null;

  return (
    <div className={kompakt ? '' : 'bg-gradient-to-br from-rose-500/15 via-orange-500/10 to-rose-500/15 backdrop-blur-md border border-rose-300/30 rounded-2xl p-4 sm:p-5'}>
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-rose-300" />
        <div className="flex-1">
          <h3 className="text-white font-extrabold text-sm sm:text-base">Topluluğun Favorileri</h3>
          <p className="text-rose-200/70 text-[11px] inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />En çok tıklanan anlar
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {anlar.map((an, i) => (
          <button key={`${an.vimeoId}-${an.start}`}
            onClick={() => git(an)}
            className="w-full text-left bg-black/20 hover:bg-rose-500/15 border border-white/5 hover:border-rose-300/40 rounded-xl p-3 transition spring-tap group flex items-start gap-3">
            {/* Sıra numarası */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-extrabold ${
              i === 0 ? 'bg-amber-400 text-purple-900' :
              i === 1 ? 'bg-slate-300 text-purple-900' :
              i === 2 ? 'bg-orange-400 text-purple-900' :
              'bg-white/10 text-white/70'
            }`}>{i + 1}</div>

            <div className="flex-1 min-w-0">
              {an.alintiText ? (
                <p className="text-white text-xs sm:text-sm line-clamp-2 italic">"{an.alintiText}"</p>
              ) : (
                <p className="text-white/70 text-xs sm:text-sm">
                  Popüler an — {Math.floor((an.start || 0) / 60)}:{String(Math.floor((an.start || 0) % 60)).padStart(2, '0')}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-[11px] text-rose-200/80 flex-wrap">
                {an.baslik && <span className="font-semibold truncate max-w-[50%]">{an.baslik}</span>}
                {an.egitmenAdlari?.[0] && <span>— {an.egitmenAdlari[0]}</span>}
                <span className="ml-auto inline-flex items-center gap-1 bg-rose-500/20 px-1.5 py-0.5 rounded">
                  <Flame className="w-2.5 h-2.5" />
                  {an.sayac}
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-300/40 group-hover:text-rose-300 group-hover:translate-x-1 transition flex-shrink-0 mt-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default PopulerAnlar;
