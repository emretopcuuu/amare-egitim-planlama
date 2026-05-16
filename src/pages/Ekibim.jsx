// /ekibim — Sponsor dashboard
// Login user'ın altındaki ekip üyelerini 4 metrik ile gösterir:
// - Curriculum tamamlanma %
// - Son aktivite (gün)
// - Risk skoru (renk kodlu)
// - Streak

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, MessageCircle, RefreshCw, Loader2, Filter,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Flame, Trophy, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { auth } from '../utils/firebase';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { maskPhone, normalizePhoneForWa } from '../utils/mask';
import RankIcon from '../components/RankIcon';
import { getRankByKey, rankStringToKey } from '../utils/rankSchema';

const FILTER_LABELLERI = {
  hepsi:     { label: 'Hepsi', renk: 'white' },
  aktif:     { label: 'Aktif', renk: 'emerald' },
  yavasladi: { label: 'Yavaşladı', renk: 'amber' },
  risk:      { label: 'Risk', renk: 'rose' },
  pasif:     { label: 'Pasif', renk: 'slate' },
};

const Ekibim = () => {
  const navigate = useNavigate();
  const { currentUser, isAnonymous, ready } = useAuth();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [filter, setFilter] = useState('hepsi');
  const [arama, setArama] = useState('');

  const fetchEkip = async () => {
    if (!currentUser || isAnonymous) return;
    setYukleniyor(true);
    setHata('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/ekibim', {
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
  };

  useEffect(() => {
    if (ready && !isAnonymous) fetchEkip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isAnonymous, currentUser?.uid]);

  const filtreli = useMemo(() => {
    if (!veri?.ekip) return [];
    let arr = veri.ekip;
    if (filter !== 'hepsi') arr = arr.filter(e => e.risk.etiket === filter);
    if (arama.trim()) {
      const q = arama.toLowerCase().trim();
      arr = arr.filter(e =>
        (e.adSoyad || '').toLowerCase().includes(q) ||
        (e.amareId || '').includes(q)
      );
    }
    return arr;
  }, [veri, filter, arama]);

  if (!ready) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (isAnonymous) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center max-w-md">
          <Users className="w-12 h-12 text-amber-300 mx-auto mb-3" />
          <h1 className="text-white font-bold text-xl mb-2">Üye girişi gerekir</h1>
          <p className="text-purple-200 text-sm mb-4">Ekibini görmek için önce giriş yap.</p>
          <button onClick={() => navigate('/profil')}
            className="bg-amber-400 text-purple-900 font-bold px-5 py-2.5 rounded-xl">
            Profile Git
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-24">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 pt-6">
        <button onClick={() => navigate('/profil')} className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Profil
        </button>
        <div className="flex items-center gap-2">
          <button onClick={fetchEkip} disabled={yukleniyor}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-xl transition disabled:opacity-50 spring-tap"
            title="Yenile">
            <RefreshCw className={`w-4 h-4 ${yukleniyor ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => signOut(auth).then(() => navigate('/takvim'))}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-xl transition spring-tap"
            title="Çıkış yap">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-300/40 mb-3">
          <Users className="w-8 h-8 text-amber-300" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Ekibim
        </h1>
        {veri && <p className="text-purple-200 mt-2 text-sm">{veri.toplam} üye altındasında</p>}
        {hata && (
          <p className="text-red-300 text-xs mt-3 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2 inline-block">
            {hata}
          </p>
        )}
      </div>

      {/* Özet kartları */}
      {veri?.ozet && (
        <div className="max-w-5xl mx-auto px-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <OzetKart label="Toplam" sayi={veri.toplam} renk="white" aktif={filter === 'hepsi'} onClick={() => setFilter('hepsi')} />
            <OzetKart label="🟢 Aktif" sayi={veri.ozet.aktif} renk="emerald" aktif={filter === 'aktif'} onClick={() => setFilter('aktif')} />
            <OzetKart label="🟡 Yavaşladı" sayi={veri.ozet.yavasladi} renk="amber" aktif={filter === 'yavasladi'} onClick={() => setFilter('yavasladi')} />
            <OzetKart label="🔴 Risk" sayi={veri.ozet.risk} renk="rose" aktif={filter === 'risk'} onClick={() => setFilter('risk')} />
            <OzetKart label="⚫ Pasif" sayi={veri.ozet.pasif} renk="slate" aktif={filter === 'pasif'} onClick={() => setFilter('pasif')} />
          </div>
          <div className="mt-3 text-center text-purple-200/70 text-xs">
            {veri.ozet.siteyiKullanan} / {veri.toplam} üye siteyi kullanıyor
          </div>
        </div>
      )}

      {/* Arama */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <input type="text" value={arama} onChange={e => setArama(e.target.value)}
          placeholder="İsim veya Amare ID ile ara..."
          className="w-full bg-white/10 backdrop-blur border border-white/20 focus:border-amber-300/60 text-white placeholder-purple-300/60 rounded-xl px-4 py-3 text-sm outline-none transition" />
      </div>

      {/* Yükleniyor */}
      {yukleniyor && !veri && (
        <div className="max-w-5xl mx-auto px-4 space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-24 rounded-2xl border border-white/10 skeleton-shimmer" />
          ))}
        </div>
      )}

      {/* Üye kartları */}
      {filtreli.length === 0 && veri && !yukleniyor && (
        <div className="max-w-5xl mx-auto px-4 text-center py-16">
          <Users className="w-12 h-12 text-purple-300/50 mx-auto mb-3" />
          <p className="text-purple-300/70 text-sm">
            {arama || filter !== 'hepsi'
              ? 'Filtreye uyan üye yok'
              : 'Henüz altında ekip üyen yok. Davet ettiğinde burada görünecek.'}
          </p>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 space-y-2">
        {filtreli.map(uye => <UyeKart key={uye.amareId} uye={uye} />)}
      </div>
    </div>
  );
};

// ─── Özet kartı (filter chip) ───
const OzetKart = ({ label, sayi, renk, aktif, onClick }) => {
  const renkMap = {
    white:   { bg: 'bg-white/15', border: 'border-white/30', text: 'text-white' },
    emerald: { bg: 'bg-emerald-500/15', border: 'border-emerald-400/30', text: 'text-emerald-100' },
    amber:   { bg: 'bg-amber-500/15', border: 'border-amber-400/30', text: 'text-amber-100' },
    rose:    { bg: 'bg-rose-500/15', border: 'border-rose-400/30', text: 'text-rose-100' },
    slate:   { bg: 'bg-slate-500/15', border: 'border-slate-400/30', text: 'text-slate-100' },
  }[renk] || { bg: 'bg-white/10', border: 'border-white/20', text: 'text-white' };
  return (
    <button onClick={onClick}
      className={`${renkMap.bg} backdrop-blur-md border-2 ${aktif ? renkMap.border : 'border-transparent'} rounded-xl p-3 text-center transition spring-tap hover:scale-[1.03]`}>
      <div className={`${renkMap.text} font-extrabold text-2xl leading-none`}>{sayi}</div>
      <div className={`${renkMap.text} text-[10px] uppercase tracking-wider mt-1.5 font-semibold opacity-80`}>{label}</div>
    </button>
  );
};

// ─── Tek üye kartı ───
const UyeKart = ({ uye }) => {
  const sponsorTel = uye.phone;
  const sponsorWa = normalizePhoneForWa(sponsorTel);
  const rankObj = rankStringToKey(uye.rank) ? getRankByKey(rankStringToKey(uye.rank)) : null;
  const initials = (uye.adSoyad || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const riskRenk = uye.risk?.renk || 'slate';

  // Renk → Tailwind class
  const riskBg = {
    emerald: 'bg-emerald-500/10 border-emerald-400/30',
    amber:   'bg-amber-500/10 border-amber-400/30',
    rose:    'bg-rose-500/10 border-rose-400/30',
    slate:   'bg-white/5 border-white/10',
  }[riskRenk];

  const riskBadgeBg = {
    emerald: 'bg-emerald-500 text-white',
    amber:   'bg-amber-500 text-white',
    rose:    'bg-rose-500 text-white',
    slate:   'bg-slate-500 text-white',
  }[riskRenk];

  const riskEtiket = {
    aktif: 'Aktif',
    yavasladi: 'Yavaşladı',
    risk: 'Risk',
    pasif: 'Pasif',
  }[uye.risk?.etiket] || '?';

  return (
    <div className={`${riskBg} backdrop-blur-md border rounded-2xl p-4 transition`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 relative">
          {uye.fotoURL ? (
            <img src={uye.fotoURL} alt={uye.adSoyad} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
              {initials}
            </div>
          )}
          {/* Rank ikonu — sağ alt mini */}
          {rankObj && (
            <div className="absolute -bottom-1 -right-1">
              <RankIcon rank={rankObj} size={20} />
            </div>
          )}
        </div>

        {/* Bilgi */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-sm truncate">{uye.adSoyad}</h3>
            <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${riskBadgeBg}`}>
              {riskEtiket}
            </span>
          </div>
          <div className="text-purple-200/70 text-[10px] mt-0.5 flex items-center gap-2">
            {uye.rank && <span>{uye.rank}</span>}
            {uye.amareId && <span>· #{uye.amareId}</span>}
          </div>

          {/* Metrikler */}
          <div className="grid grid-cols-3 gap-2 mt-2.5">
            <Metrik
              label="Curriculum"
              value={uye.curriculumPct !== null ? `%${uye.curriculumPct}` : '—'}
              progress={uye.curriculumPct}
            />
            <Metrik
              label="Son aktivite"
              value={uye.sonAktiviteGun === null ? 'Hiç' : uye.sonAktiviteGun === 0 ? 'Bugün' : `${uye.sonAktiviteGun}g önce`}
            />
            <Metrik
              label="Seri"
              value={uye.streak?.current ? `🔥 ${uye.streak.current}g` : '—'}
            />
          </div>
        </div>

        {/* CTA */}
        {sponsorWa && (
          <a href={`https://wa.me/${sponsorWa}?text=${encodeURIComponent(`Merhaba ${uye.adSoyad?.split(' ')[0] || ''}, nasılsın?`)}`}
            target="_blank" rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-400 text-white p-2.5 rounded-xl shadow flex-shrink-0 spring-tap"
            title="WhatsApp'tan mesaj gönder">
            <MessageCircle className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};

const Metrik = ({ label, value, progress = null }) => (
  <div>
    <div className="text-purple-200/60 text-[9px] uppercase tracking-wider font-semibold">{label}</div>
    <div className="text-white text-xs font-bold mt-0.5">{value}</div>
    {progress !== null && (
      <div className="h-1 bg-black/30 rounded-full overflow-hidden mt-1">
        <div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
      </div>
    )}
  </div>
);

export default Ekibim;
