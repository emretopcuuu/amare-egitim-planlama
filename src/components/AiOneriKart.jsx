// AI Öneri Kartı — Profil ya da Kayıtlı Eğitimler hero altında
// Kullanıcıya kişisel 5 video önerir, 12 saat cache

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, Loader2, RefreshCw, Star, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { metinTemizleDeep } from '../utils/metinTemizle';

function formatSure(s) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}dk` : `${Math.floor(m / 60)}sa ${m % 60}dk`;
}

const AiOneriKart = () => {
  const { currentUser, isAnonymous } = useAuth();
  const navigate = useNavigate();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  async function cek() {
    if (!currentUser || isAnonymous) return;
    setYukleniyor(true);
    setHata('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/ai-oneri', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setVeri(metinTemizleDeep(data));
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  useEffect(() => { cek(); /* eslint-disable-line */ }, [currentUser?.uid]);

  if (!currentUser || isAnonymous) return null;
  if (yukleniyor && !veri) {
    return (
      <div className="bg-purple-500/10 border border-purple-400/30 rounded-2xl p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-purple-300" />
        <span className="text-purple-200 text-sm">Sana özel öneriler hazırlanıyor...</span>
      </div>
    );
  }
  if (hata || !veri?.oneriler?.length) return null;

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-400/30 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="inline-flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-300" />
          <h3 className="text-white font-extrabold text-base">Sana Özel</h3>
          {veri.cached && <span className="text-purple-300/50 text-[10px]">cache</span>}
        </div>
        <button onClick={cek} disabled={yukleniyor}
          className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 spring-tap disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${yukleniyor ? 'animate-spin' : ''}`} />Yenile
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {veri.oneriler.map(o => (
          <button key={o.vimeoId}
            onClick={() => navigate(`/kayitli-egitimler?v=${encodeURIComponent(o.vimeoId)}`)}
            className="bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400/60 rounded-xl overflow-hidden text-left transition-all group">
            <div className="relative aspect-video bg-black/30">
              {o.thumbnailUrl && (
                <img src={o.thumbnailUrl} alt={o.baslik} loading="lazy"
                  className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/50 flex items-center justify-center transition">
                <Play className="w-7 h-7 text-white/0 group-hover:text-white" fill="currentColor" />
              </div>
              {o.sure && (
                <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />{formatSure(o.sure)}
                </span>
              )}
            </div>
            <div className="p-2.5">
              <h4 className="text-white text-xs font-bold line-clamp-2 leading-tight">{o.baslik}</h4>
              <p className="text-amber-300/90 text-[10px] mt-1 line-clamp-2 italic">
                <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />{o.sebep}
              </p>
              <div className="flex items-center justify-between mt-1.5 text-[10px]">
                <span className="text-purple-200/60 truncate">{o.egitmenAdlari?.[0] || ''}</span>
                {o.puanOrt && (
                  <span className="inline-flex items-center gap-0.5 text-amber-300">
                    <Star className="w-2.5 h-2.5" fill="currentColor" />{o.puanOrt}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AiOneriKart;
