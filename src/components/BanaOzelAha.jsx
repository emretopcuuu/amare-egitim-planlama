// Bana Özel Aha — kişiselleştirilmiş aha moment
// Kullanıcının izlemediği videolardan rank/profil bazlı bir tane seçer
// AUTH gerekir. 12 saat cache (backend).

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Play, Loader2, Quote, ArrowRight, Sparkles } from 'lucide-react';
import { auth } from '../utils/firebase';

const BanaOzelAha = ({ kompakt = false }) => {
  const navigate = useNavigate();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const u = auth.currentUser;
        if (!u) { setHata(true); return; }
        const token = await u.getIdToken();
        const res = await fetch('/.netlify/functions/bana-ozel-aha', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!aktif) return;
        if (!data.ilham?.text) { setHata(true); return; }
        setVeri(data);
      } catch {
        if (aktif) setHata(true);
      } finally {
        if (aktif) setYukleniyor(false);
      }
    })();
    return () => { aktif = false; };
  }, []);

  if (yukleniyor) {
    return kompakt ? (
      <div className="h-16 bg-white/5 rounded-xl skeleton-shimmer" />
    ) : (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 text-white/40 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Sana özel ilham hazırlanıyor…
      </div>
    );
  }

  if (hata || !veri?.ilham) return null;

  const { ilham, video, anaTema } = veri;

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
        className="w-full bg-gradient-to-br from-sky-400/15 via-cyan-500/10 to-sky-400/15 backdrop-blur-md border border-sky-300/30 hover:border-sky-300/60 rounded-xl p-3 text-left transition spring-tap group">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-400/20 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-sky-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sky-300 text-[10px] uppercase tracking-wider font-bold mb-0.5">Sana Özel</div>
            <p className="text-white text-xs line-clamp-2 italic">"{ilham.text}"</p>
            {video?.egitmenAdlari?.[0] && (
              <p className="text-sky-200/70 text-[10px] mt-1">— {video.egitmenAdlari[0]}</p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-sky-300/60 group-hover:translate-x-1 group-hover:text-sky-300 transition flex-shrink-0" />
        </div>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-sky-400/20 via-cyan-500/15 to-sky-400/20 backdrop-blur-md border border-sky-300/40 rounded-2xl p-5 sm:p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-sky-300" />
        <div className="flex-1">
          <h3 className="text-white font-extrabold text-base">Sana Özel İlham</h3>
          <p className="text-sky-200/70 text-[11px] inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {anaTema ? `${anaTema} · ` : ''}İzlemediğin bir eğitimden
          </p>
        </div>
      </div>

      <div className="bg-black/20 border border-sky-400/20 rounded-xl p-4 mb-3 relative">
        <Quote className="w-5 h-5 text-sky-400/40 absolute -top-2 -left-1" />
        <p className="text-white text-base leading-relaxed italic">{ilham.text}</p>
        {ilham.sebep && (
          <p className="text-sky-200/80 text-xs mt-3 italic">— {ilham.sebep}</p>
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
            <div className="text-sky-200/70 text-[10px] truncate">
              {(video.egitmenAdlari || []).join(', ')}
            </div>
          </div>
          <button onClick={git}
            className="bg-sky-400 hover:bg-sky-300 text-purple-900 font-bold text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5 spring-tap flex-shrink-0">
            <Play className="w-3 h-3" fill="currentColor" />
            İzle
          </button>
        </div>
      )}
    </div>
  );
};

export default BanaOzelAha;
