// Sponsor liderlik tablosu — bu haftanın en iyi karne skoru olan ilk 10 sponsoru

import React, { useEffect, useState } from 'react';
import { X, Trophy, Loader2, Crown, Medal, Award, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SIRA_ICON = {
  1: { icon: Crown,  renk: 'text-amber-300', bg: 'bg-amber-500/20' },
  2: { icon: Medal,  renk: 'text-slate-200', bg: 'bg-slate-400/20' },
  3: { icon: Award,  renk: 'text-orange-300', bg: 'bg-orange-500/20' },
};

const LeaderboardModal = ({ acik, onClose }) => {
  const { currentUser } = useAuth();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    if (acik && currentUser && !veri) cek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, currentUser?.uid]);

  async function cek() {
    setYukleniyor(true);
    setHata('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/ekip-leaderboard', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setVeri(data);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  if (!acik) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}>
      <div className="bg-gradient-to-br from-purple-900 to-indigo-950 border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[95dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-white font-extrabold text-lg sm:text-xl flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-300" />
              Liderlik Tablosu
            </h2>
            <p className="text-purple-200/70 text-xs mt-0.5">
              Bu haftanın en iyi sponsorları · {veri?.toplam || 0} aktif sponsor
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Caller pozisyonu */}
        {veri?.callerPos && veri.callerPos > 10 && (
          <div className="px-4 sm:px-5 py-3 border-b border-white/10 flex-shrink-0 bg-amber-500/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-amber-200 text-[10px] uppercase tracking-wider font-bold">Senin pozisyonun</div>
                <div className="text-white text-2xl font-extrabold">#{veri.callerPos}</div>
              </div>
              <div className="text-right">
                <div className="text-amber-200 text-[10px] uppercase tracking-wider font-bold">Skor</div>
                <div className="text-white text-2xl font-extrabold">{veri.callerSkor}</div>
              </div>
            </div>
          </div>
        )}

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {yukleniyor && !veri && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
          )}
          {hata && (
            <div className="bg-rose-500/15 border border-rose-400/30 text-rose-100 text-xs rounded-xl px-3 py-2.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{hata}</span>
            </div>
          )}
          {veri?.top && veri.top.length > 0 ? (
            <div className="space-y-2">
              {veri.top.map(item => <LeaderSatir key={item.sira} item={item} />)}
            </div>
          ) : veri && (
            <div className="text-center py-12 text-purple-300/70 text-sm">
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
              Bu hafta henüz veri yok
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <p className="text-purple-300/50 text-[10px] text-center">
            Privacy: Diğer sponsorların adı maskelidir. Sadece sen kendi adını net görürsün.
          </p>
        </div>
      </div>
    </div>
  );
};

const LeaderSatir = ({ item }) => {
  const ikonInfo = SIRA_ICON[item.sira];
  const Icon = ikonInfo?.icon;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${
      item.kendin
        ? 'bg-amber-500/15 border-amber-400/50'
        : 'bg-white/5 border-white/10'
    }`}>
      {/* Sıra */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ikonInfo?.bg || 'bg-white/10'}`}>
        {Icon ? (
          <Icon className={`w-5 h-5 ${ikonInfo.renk}`} />
        ) : (
          <span className="text-white font-bold text-sm">{item.sira}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        {item.fotoURL ? (
          <img src={item.fotoURL} alt={item.ad} className="w-9 h-9 rounded-full object-cover border-2 border-white/20" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xs border-2 border-white/20">
            {(item.ad || '?')[0]}
          </div>
        )}
      </div>

      {/* Bilgi */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-bold text-sm truncate">{item.ad}</span>
          {item.kendin && (
            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-400 text-purple-900">
              Sen
            </span>
          )}
        </div>
        <div className="text-purple-200/60 text-[10px] mt-0.5">
          {item.toplam} Marka Ortağı · {item.aktif} aktif · {item.siteKullanan} kullanıyor
        </div>
      </div>

      {/* Skor */}
      <div className="text-right flex-shrink-0">
        <div className="text-amber-300 font-extrabold text-lg">{item.skor}</div>
        <div className="text-purple-300/60 text-[9px] uppercase tracking-wider font-bold">Skor</div>
      </div>
    </div>
  );
};

export default LeaderboardModal;
