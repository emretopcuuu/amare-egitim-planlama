// /liderler — Public leaderboard sayfası
// 3 kategori: Sponsor / İzleyen / Video

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trophy, Crown, Medal, Award, Users, Eye, Flame, Star,
  Video as VideoIcon, Loader2, AlertCircle,
} from 'lucide-react';
import { useDocumentTitle } from '../utils/useDocumentTitle';

const SIRA_ICON = {
  1: { Icon: Crown,  renk: 'text-amber-300', bg: 'bg-amber-500/20' },
  2: { Icon: Medal,  renk: 'text-slate-200', bg: 'bg-slate-400/20' },
  3: { Icon: Award,  renk: 'text-orange-300', bg: 'bg-orange-500/20' },
};

const KATEGORILER = [
  { kod: 'sponsor', label: 'Sponsorlar', Icon: Users, renk: 'amber' },
  { kod: 'izleyen', label: 'İzleyenler', Icon: Flame, renk: 'emerald' },
  { kod: 'video',   label: 'Videolar',   Icon: Star,  renk: 'purple' },
];

const LiderlerSayfasi = () => {
  useDocumentTitle('Liderler', 'En aktif sponsorlar, izleyiciler ve videolar');
  const navigate = useNavigate();
  const [veri, setVeri] = useState(null);
  const [aktifKat, setAktifKat] = useState('sponsor');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/liderler-public');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
        setVeri(data);
      } catch (e) {
        setHata(e.message);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-24">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 pt-6">
        <button onClick={() => navigate('/takvim')}
          className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Takvim
        </button>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-300/40 mb-3">
          <Trophy className="w-8 h-8 text-amber-300" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Liderler</h1>
        <p className="text-purple-200 mt-2 text-sm">Bu haftanın en aktif sponsorları, izleyicileri ve videoları</p>
      </div>

      {/* Kategori sekmeleri */}
      <div className="max-w-5xl mx-auto px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {KATEGORILER.map(k => (
            <button key={k.kod} onClick={() => setAktifKat(k.kod)}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm spring-tap whitespace-nowrap inline-flex items-center gap-2 transition ${
                aktifKat === k.kod
                  ? 'bg-amber-400 text-purple-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}>
              <k.Icon className="w-4 h-4" />
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {yukleniyor && (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
        )}
        {hata && (
          <div className="bg-rose-500/15 border border-rose-400/30 text-rose-100 text-xs rounded-xl px-3 py-2.5 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{hata}</span>
          </div>
        )}

        {veri && (
          <>
            {aktifKat === 'sponsor' && <SponsorListesi liste={veri.topSponsorlar} />}
            {aktifKat === 'izleyen' && <IzleyenListesi liste={veri.topIzleyen} />}
            {aktifKat === 'video'   && <VideoListesi liste={veri.topVideo} navigate={navigate} />}
          </>
        )}
      </div>

      <p className="text-center text-purple-300/40 text-[10px] mt-12 px-4">
        Privacy: isimler maskelidir (Mehmet T.). Her hafta yenilenir.
      </p>
    </div>
  );
};

const SiraRozeti = ({ sira }) => {
  const ikon = SIRA_ICON[sira];
  if (ikon) {
    const I = ikon.Icon;
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ikon.bg}`}>
        <I className={`w-5 h-5 ${ikon.renk}`} />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10 text-white font-bold text-sm">
      {sira}
    </div>
  );
};

const SponsorListesi = ({ liste }) => {
  if (!liste?.length) return <Bos baslik="Henüz sponsor karnesi yok" />;
  return (
    <div className="space-y-2">
      {liste.map((s, i) => (
        <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border ${
          i < 3 ? 'bg-amber-500/10 border-amber-400/40' : 'bg-white/5 border-white/10'
        }`}>
          <SiraRozeti sira={i + 1} />
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm truncate">{s.ad}</div>
            <div className="text-purple-200/60 text-[11px]">{s.ekipSayisi} üye · {s.aktif} aktif</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-amber-300 font-extrabold text-lg leading-none">{s.skor}</div>
            <div className="text-purple-300/60 text-[9px] uppercase tracking-wider font-bold mt-1">Skor</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const IzleyenListesi = ({ liste }) => {
  if (!liste?.length) return <Bos baslik="Henüz izleme verisi yok" />;
  return (
    <div className="space-y-2">
      {liste.map((u, i) => (
        <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border ${
          i < 3 ? 'bg-emerald-500/10 border-emerald-400/40' : 'bg-white/5 border-white/10'
        }`}>
          <SiraRozeti sira={i + 1} />
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm truncate">{u.ad}</div>
            <div className="text-purple-200/60 text-[11px] flex gap-2 flex-wrap">
              <span><Flame className="w-2.5 h-2.5 inline" /> En uzun {u.enUzunStreak}g</span>
              {u.mevcutStreak > 0 && <span className="text-emerald-300">Şu an {u.mevcutStreak}g</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-emerald-300 font-extrabold text-lg leading-none">{u.izlemeSayisi}</div>
            <div className="text-purple-300/60 text-[9px] uppercase tracking-wider font-bold mt-1">İzleme</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const VideoListesi = ({ liste, navigate }) => {
  if (!liste?.length) return <Bos baslik="Henüz puanlanmış video yok" />;
  return (
    <div className="space-y-2">
      {liste.map((v, i) => (
        <button key={v.vimeoId} onClick={() => navigate(`/kayitli-egitimler?v=${encodeURIComponent(v.vimeoId)}`)}
          className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left hover:scale-[1.01] transition spring-tap ${
            i < 3 ? 'bg-purple-500/10 border-purple-400/40' : 'bg-white/5 border-white/10'
          }`}>
          <SiraRozeti sira={i + 1} />
          {v.thumbnailUrl && (
            <img src={v.thumbnailUrl} alt="" loading="lazy"
              className="w-16 h-10 sm:w-20 sm:h-12 rounded object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm line-clamp-2 leading-tight">{v.baslik}</div>
            <div className="text-purple-200/60 text-[11px] truncate mt-0.5">
              {(v.egitmenAdlari || []).join(', ')}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-amber-300 font-extrabold inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5" fill="currentColor" />{v.puanOrt}
            </div>
            <div className="text-purple-300/60 text-[9px] uppercase tracking-wider font-bold mt-1">{v.puanSayisi} oy</div>
          </div>
        </button>
      ))}
    </div>
  );
};

const Bos = ({ baslik }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
    <Trophy className="w-10 h-10 mx-auto mb-3 text-white/30" />
    <p className="text-purple-300/60 text-sm">{baslik}</p>
    <p className="text-purple-300/40 text-[11px] mt-1">Veri biriktikçe burada görünür.</p>
  </div>
);

export default LiderlerSayfasi;
