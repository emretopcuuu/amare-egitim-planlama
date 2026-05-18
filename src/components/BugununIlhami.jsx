// Bugünün İlhamı — günlük rastgele aha moment widget
// Public — herkes görür (anon dahil)
// Profil/anasayfa/takvim sayfalarında embedded olabilir

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, Loader2, Quote, ArrowRight, Calendar } from 'lucide-react';

const STORAGE_KEY = 'amare_ilham_gun';

const BugununIlhami = ({ kompakt = false }) => {
  const navigate = useNavigate();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/bugunun-ilhami');
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!data.ilham?.text) throw new Error('Ilham yok');
        setVeri(data);
      } catch {
        setHata(true);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, []);

  if (yukleniyor) {
    return kompakt ? (
      <div className="h-16 bg-white/5 rounded-xl skeleton-shimmer" />
    ) : (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 text-white/40 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (hata || !veri?.ilham) return null;

  const { ilham, video } = veri;

  function git() {
    if (ilham.vimeoId && ilham.start != null) {
      navigate(`/kayitli-egitimler?v=${encodeURIComponent(ilham.vimeoId)}&t=${Math.floor(ilham.start)}`);
    } else if (ilham.vimeoId) {
      navigate(`/kayitli-egitimler?v=${encodeURIComponent(ilham.vimeoId)}`);
    }
  }

  if (kompakt) {
    return (
      <button onClick={git}
        className="w-full bg-gradient-to-br from-amber-400/15 via-orange-500/10 to-amber-400/15 backdrop-blur-md border border-amber-300/30 hover:border-amber-300/60 rounded-xl p-3 text-left transition spring-tap group">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-amber-300 text-[10px] uppercase tracking-wider font-bold mb-0.5">Bugünün İlhamı</div>
            <p className="text-white text-xs line-clamp-2 italic">"{ilham.text}"</p>
            {video?.egitmenAdlari?.[0] && (
              <p className="text-amber-200/70 text-[10px] mt-1">— {video.egitmenAdlari[0]}</p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-amber-300/60 group-hover:translate-x-1 group-hover:text-amber-300 transition flex-shrink-0" />
        </div>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-400/20 via-orange-500/15 to-amber-400/20 backdrop-blur-md border border-amber-300/40 rounded-2xl p-5 sm:p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-amber-300" />
        <div>
          <h3 className="text-white font-extrabold text-base">Bugünün İlhamı</h3>
          <p className="text-amber-200/70 text-[11px] inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />Her gün yeni bir Aha! moment
          </p>
        </div>
      </div>

      <div className="bg-black/20 border border-amber-400/20 rounded-xl p-4 mb-3 relative">
        <Quote className="w-5 h-5 text-amber-400/40 absolute -top-2 -left-1" />
        <p className="text-white text-base leading-relaxed italic">{ilham.text}</p>
        {ilham.sebep && (
          <p className="text-amber-200/80 text-xs mt-3 italic">— {ilham.sebep}</p>
        )}
      </div>

      {video && (
        <div className="flex items-center gap-3">
          {video.thumbnailUrl && (
            <img src={video.thumbnailUrl} alt="" loading="lazy"
              className="w-16 h-10 rounded object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{video.baslik}</div>
            <div className="text-amber-200/70 text-[10px] truncate">
              {(video.egitmenAdlari || []).join(', ')}
            </div>
          </div>
          <button onClick={git}
            className="bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5 spring-tap flex-shrink-0">
            <Play className="w-3 h-3" fill="currentColor" />
            İzle
          </button>
        </div>
      )}
    </div>
  );
};

export default BugununIlhami;
