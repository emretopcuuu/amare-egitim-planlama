// /ekibim — Sponsor dashboard (v2)
// 4 metrik + üye başına akıllı aksiyon kartı + toplu davet
//
// Yeni:
//   - Her üye için aksiyon önerisi (davet et / kontrol et / tebrik et / vb)
//   - Toplu seç + toplu davet
//   - Magic link email + WhatsApp deep link
//   - Davet log'u: "3g önce gönderildi" rozeti

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, MessageCircle, RefreshCw, Loader2, Send,
  CheckSquare, Square, AlertCircle, Sparkles, LogOut, Network,
  Trophy, TrendingUp, TrendingDown, Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../utils/firebase';
import { signOut } from 'firebase/auth';
import { normalizePhoneForWa } from '../utils/mask';
import RankIcon from '../components/RankIcon';
import { getRankByKey, rankStringToKey } from '../utils/rankSchema';
import TopluDavetModal from '../components/TopluDavetModal';
import EkipAgaciModal from '../components/EkipAgaciModal';
import OnboardingYolu from '../components/OnboardingYolu';
import AiAsistanModal from '../components/AiAsistanModal';
import LeaderboardModal from '../components/LeaderboardModal';
import EkipBildirimAyar from '../components/EkipBildirimAyar';
import AylikRaporPdf from '../components/AylikRaporPdf';

const Ekibim = () => {
  const navigate = useNavigate();
  const { currentUser, isAnonymous, ready } = useAuth();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [filter, setFilter] = useState('hepsi');
  const [arama, setArama] = useState('');
  const [secili, setSecili] = useState(new Set()); // amareId set
  const [davetModalAcik, setDavetModalAcik] = useState(false);
  const [davetUyeleri, setDavetUyeleri] = useState([]);
  const [agacAcik, setAgacAcik] = useState(false);
  const [aiAcik, setAiAcik] = useState(false);
  const [leaderboardAcik, setLeaderboardAcik] = useState(false);

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
    if (filter !== 'hepsi') {
      if (filter === 'davet') arr = arr.filter(e => !e.siteSet);
      else arr = arr.filter(e => e.risk.etiket === filter);
    }
    if (arama.trim()) {
      const q = arama.toLowerCase().trim();
      arr = arr.filter(e =>
        (e.adSoyad || '').toLowerCase().includes(q) ||
        (e.amareId || '').includes(q)
      );
    }
    return arr;
  }, [veri, filter, arama]);

  function tumSecimToggle() {
    if (secili.size === filtreli.length) {
      setSecili(new Set());
    } else {
      setSecili(new Set(filtreli.map(u => u.amareId)));
    }
  }

  function secimToggle(amareId) {
    const yeni = new Set(secili);
    if (yeni.has(amareId)) yeni.delete(amareId);
    else yeni.add(amareId);
    setSecili(yeni);
  }

  function topluDavetAc() {
    const uyeler = filtreli.filter(u => secili.has(u.amareId));
    if (uyeler.length === 0) return;
    setDavetUyeleri(uyeler);
    setDavetModalAcik(true);
  }

  function tekDavetAc(uye) {
    setDavetUyeleri([uye]);
    setDavetModalAcik(true);
  }

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
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-32">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 pt-6">
        <button onClick={() => navigate('/profil')} className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Profil
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiAcik(true)}
            className="bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-purple-900 p-2 rounded-xl transition spring-tap inline-flex items-center gap-1.5 font-bold"
            title="AI asistan — bu hafta ne yapmalısın?">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">AI</span>
          </button>
          <button onClick={() => setAgacAcik(true)}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-xl transition spring-tap inline-flex items-center gap-1.5"
            title="Ekip ağacı (3 nesil)">
            <Network className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">Ağaç</span>
          </button>
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
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ekibim</h1>
        {veri && <p className="text-purple-200 mt-2 text-sm">{veri.toplam} üye altındasında</p>}
        {hata && (
          <p className="text-red-300 text-xs mt-3 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2 inline-block">
            {hata}
          </p>
        )}
      </div>

      {/* Lider karnesi */}
      {veri?.karne && (
        <div className="max-w-5xl mx-auto px-4 mb-5">
          <LiderKarne karne={veri.karne} ekipSayisi={veri.toplam} onLeaderboard={() => setLeaderboardAcik(true)} />
        </div>
      )}

      {/* Yeni üyeler — onboarding yolu */}
      {veri?.ekip && (
        <div className="max-w-5xl mx-auto px-4 mb-5">
          <OnboardingYolu uyeler={veri.ekip} />
        </div>
      )}

      {/* Bildirim ayarı + PDF rapor */}
      <div className="max-w-5xl mx-auto px-4 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <EkipBildirimAyar />
        {veri && <AylikRaporPdf veri={veri} sponsorAd={currentUser?.displayName || 'Sponsor'} />}
      </div>

      {/* Özet kartları */}
      {veri?.ozet && (
        <div className="max-w-5xl mx-auto px-4 mb-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <OzetKart label="Toplam" sayi={veri.toplam} renk="white" aktif={filter === 'hepsi'} onClick={() => setFilter('hepsi')} />
            <OzetKart label="🟢 Aktif" sayi={veri.ozet.aktif} renk="emerald" aktif={filter === 'aktif'} onClick={() => setFilter('aktif')} />
            <OzetKart label="🟡 Yavaşladı" sayi={veri.ozet.yavasladi} renk="amber" aktif={filter === 'yavasladi'} onClick={() => setFilter('yavasladi')} />
            <OzetKart label="🔴 Risk" sayi={veri.ozet.risk} renk="rose" aktif={filter === 'risk'} onClick={() => setFilter('risk')} />
            <OzetKart label="⚫ Pasif" sayi={veri.ozet.pasif} renk="slate" aktif={filter === 'pasif'} onClick={() => setFilter('pasif')} />
            <OzetKart label="📩 Davet" sayi={veri.toplam - (veri.ozet.siteyiKullanan || 0)} renk="sky" aktif={filter === 'davet'} onClick={() => setFilter('davet')} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-purple-200/70 text-[11px]">
            <span><strong className="text-emerald-300">{veri.ozet.siteyiKullanan}</strong> / {veri.toplam} site kullanıyor</span>
            <span className="text-white/30">·</span>
            <span><strong className="text-sky-300">{veri.ozet.davetEdilen}</strong> davet gönderildi</span>
            {veri.ozet.eksikVeri > 0 && (
              <>
                <span className="text-white/30">·</span>
                <span><strong className="text-rose-300">{veri.ozet.eksikVeri}</strong> iletişim eksik</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Arama */}
      <div className="max-w-5xl mx-auto px-4 mb-3">
        <input type="text" value={arama} onChange={e => setArama(e.target.value)}
          placeholder="İsim veya Amare ID ile ara..."
          className="w-full bg-white/10 backdrop-blur border border-white/20 focus:border-amber-300/60 text-white placeholder-purple-300/60 rounded-xl px-4 py-3 text-sm outline-none transition" />
      </div>

      {/* Toplu seçim bar */}
      {filtreli.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 mb-3 flex items-center justify-between gap-2">
          <button onClick={tumSecimToggle}
            className="text-white/70 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 spring-tap">
            {secili.size === filtreli.length && filtreli.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-amber-300" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {secili.size > 0 ? `${secili.size} seçili` : `Tümünü seç`}
          </button>
          {secili.size > 0 && (
            <button onClick={topluDavetAc}
              className="bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold px-4 py-2 rounded-xl spring-tap text-xs inline-flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              {secili.size} kişiye davet gönder
            </button>
          )}
        </div>
      )}

      {/* Yükleniyor */}
      {yukleniyor && !veri && (
        <div className="max-w-5xl mx-auto px-4 space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-32 rounded-2xl border border-white/10 skeleton-shimmer" />
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
        {filtreli.map(uye => (
          <UyeKart key={uye.amareId}
            uye={uye}
            secili={secili.has(uye.amareId)}
            onSec={() => secimToggle(uye.amareId)}
            onDavet={() => tekDavetAc(uye)} />
        ))}
      </div>

      {/* Toplu davet modal */}
      <TopluDavetModal
        acik={davetModalAcik}
        uyeler={davetUyeleri}
        onClose={() => setDavetModalAcik(false)}
        onTamamlandi={() => {
          // Davet gönderildi, listeyi yenile ve seçimi temizle
          setTimeout(() => fetchEkip(), 800);
          setSecili(new Set());
        }} />

      {/* Ekip ağacı modal */}
      <EkipAgaciModal acik={agacAcik} onClose={() => setAgacAcik(false)} />

      {/* AI asistan modal */}
      <AiAsistanModal acik={aiAcik} ekip={veri?.ekip} onClose={() => setAiAcik(false)} />

      {/* Leaderboard modal */}
      <LeaderboardModal acik={leaderboardAcik} onClose={() => setLeaderboardAcik(false)} />
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
    sky:     { bg: 'bg-sky-500/15', border: 'border-sky-400/30', text: 'text-sky-100' },
  }[renk] || { bg: 'bg-white/10', border: 'border-white/20', text: 'text-white' };
  return (
    <button onClick={onClick}
      className={`${renkMap.bg} backdrop-blur-md border-2 ${aktif ? renkMap.border : 'border-transparent'} rounded-xl p-2.5 text-center transition spring-tap hover:scale-[1.03]`}>
      <div className={`${renkMap.text} font-extrabold text-xl leading-none`}>{sayi}</div>
      <div className={`${renkMap.text} text-[9px] uppercase tracking-wider mt-1 font-semibold opacity-80`}>{label}</div>
    </button>
  );
};

// ─── Tek üye kartı (v2 — aksiyon önerisi ile) ───
const UyeKart = ({ uye, secili, onSec, onDavet }) => {
  const sponsorWa = normalizePhoneForWa(uye.phone);
  const rankObj = rankStringToKey(uye.rank) ? getRankByKey(rankStringToKey(uye.rank)) : null;
  const initials = (uye.adSoyad || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const riskRenk = uye.risk?.renk || 'slate';

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

  const aksiyonRenk = {
    amber:   { bg: 'bg-amber-400/15 border-amber-400/40', text: 'text-amber-200', btn: 'bg-amber-400 hover:bg-amber-300 text-purple-900' },
    emerald: { bg: 'bg-emerald-500/15 border-emerald-400/40', text: 'text-emerald-200', btn: 'bg-emerald-500 hover:bg-emerald-400 text-white' },
    rose:    { bg: 'bg-rose-500/15 border-rose-400/40', text: 'text-rose-200', btn: 'bg-rose-500 hover:bg-rose-400 text-white' },
    sky:     { bg: 'bg-sky-500/15 border-sky-400/40', text: 'text-sky-200', btn: 'bg-sky-500 hover:bg-sky-400 text-white' },
    slate:   { bg: 'bg-white/5 border-white/15', text: 'text-purple-200', btn: 'bg-white/15 hover:bg-white/25 text-white' },
  }[uye.aksiyon?.renk || 'slate'];

  return (
    <div className={`${riskBg} backdrop-blur-md border rounded-2xl p-3 transition ${secili ? 'ring-2 ring-amber-400/60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Seçim kutusu */}
        <button onClick={onSec} className="flex-shrink-0 mt-1 spring-tap" aria-label={secili ? 'Seçimi kaldır' : 'Seç'}>
          {secili ? (
            <CheckSquare className="w-5 h-5 text-amber-300" />
          ) : (
            <Square className="w-5 h-5 text-white/40 hover:text-white/70" />
          )}
        </button>

        {/* Avatar */}
        <div className="flex-shrink-0 relative">
          {uye.fotoURL ? (
            <img src={uye.fotoURL} alt={uye.adSoyad} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
              {initials}
            </div>
          )}
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
            {uye.davet && (
              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-100 border border-sky-400/30">
                📩 {uye.davet.gunFarki === 0 ? 'Bugün' : `${uye.davet.gunFarki}g`}
              </span>
            )}
          </div>
          <div className="text-purple-200/70 text-[10px] mt-0.5 flex items-center gap-2 flex-wrap">
            {uye.rank && <span>{uye.rank}</span>}
            {uye.amareId && <span>· #{uye.amareId}</span>}
            {uye.kayitGunFarki !== null && uye.kayitGunFarki < 60 && (
              <span className="text-emerald-300">· Yeni · {uye.kayitGunFarki}g</span>
            )}
          </div>

          {/* Metrikler */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Metrik
              label="Curriculum"
              value={uye.curriculumPct !== null ? `%${uye.curriculumPct}` : '—'}
              progress={uye.curriculumPct} />
            <Metrik
              label="Son aktivite"
              value={uye.sonAktiviteGun === null ? 'Hiç' : uye.sonAktiviteGun === 0 ? 'Bugün' : `${uye.sonAktiviteGun}g önce`} />
            <Metrik
              label="Seri"
              value={uye.streak?.current ? `🔥 ${uye.streak.current}g` : '—'} />
          </div>

          {/* Amare metrikleri (PV/GV/sipariş/rank uzaklığı) */}
          {uye.amare && (uye.amare.pv > 0 || uye.amare.gv > 0 || uye.amare.sonSiparis || uye.amare.toplamAlt > 0) && (
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-[10px]">
              {uye.amare.pv > 0 && (
                <div className="bg-black/20 rounded-md px-1.5 py-1 text-center">
                  <div className="text-purple-300/60 uppercase tracking-wider text-[8px]">PV</div>
                  <div className="text-white font-bold text-[10px]">{uye.amare.pv}</div>
                </div>
              )}
              {uye.amare.gv > 0 && (
                <div className="bg-black/20 rounded-md px-1.5 py-1 text-center">
                  <div className="text-purple-300/60 uppercase tracking-wider text-[8px]">GV</div>
                  <div className="text-white font-bold text-[10px]">{formatBigNum(uye.amare.gv)}</div>
                </div>
              )}
              {uye.amare.sonSiparisGun !== null && (
                <div className={`rounded-md px-1.5 py-1 text-center ${uye.amare.sonSiparisGun > 60 ? 'bg-rose-500/20' : uye.amare.sonSiparisGun > 30 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                  <div className="text-purple-300/60 uppercase tracking-wider text-[8px]">Sipariş</div>
                  <div className="text-white font-bold text-[10px]">{uye.amare.sonSiparisGun}g</div>
                </div>
              )}
              {uye.amare.toplamAlt > 0 && (
                <div className="bg-black/20 rounded-md px-1.5 py-1 text-center">
                  <div className="text-purple-300/60 uppercase tracking-wider text-[8px]">Alt</div>
                  <div className="text-white font-bold text-[10px]">{uye.amare.toplamAlt}</div>
                </div>
              )}
            </div>
          )}

          {/* Bir sonraki rank progress bar */}
          {uye.amare?.sonrakiRank && uye.amare.sonrakiRank.gvYuzde > 0 && uye.amare.sonrakiRank.gvYuzde < 100 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-purple-200/70 uppercase tracking-wider font-semibold">
                  → {uye.amare.sonrakiRank.sonrakiKey.replace(/_/g, ' ')}
                </span>
                <span className="text-amber-300 font-bold">%{uye.amare.sonrakiRank.gvYuzde}</span>
              </div>
              <div className="h-1 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all"
                  style={{ width: `${uye.amare.sonrakiRank.gvYuzde}%` }} />
              </div>
            </div>
          )}

          {/* Akıllı aksiyon kartı */}
          {uye.aksiyon && (
            <div className={`mt-2.5 ${aksiyonRenk.bg} border rounded-xl px-3 py-2 flex items-center justify-between gap-2`}>
              <div className="min-w-0 flex-1">
                <div className={`${aksiyonRenk.text} text-xs font-bold leading-tight`}>{uye.aksiyon.baslik}</div>
                <div className={`${aksiyonRenk.text} text-[10px] opacity-80 mt-0.5 truncate`}>{uye.aksiyon.detay}</div>
              </div>
              <AksiyonBtn uye={uye} renk={aksiyonRenk.btn} onDavet={onDavet} sponsorWa={sponsorWa} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Aksiyon türüne göre buton — davet / WhatsApp / vb
const AksiyonBtn = ({ uye, renk, onDavet, sponsorWa }) => {
  const tip = uye.aksiyon?.tur;

  // Davet türü → modal aç
  if (tip === 'davet' || tip === 'bekle') {
    if (!uye.emailVar && !uye.phoneVar) {
      return (
        <span className="bg-rose-500/30 text-rose-100 text-[10px] font-bold px-2 py-1.5 rounded-md inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />Eksik
        </span>
      );
    }
    return (
      <button onClick={onDavet}
        className={`${renk} text-xs font-bold px-3 py-1.5 rounded-md inline-flex items-center gap-1 spring-tap whitespace-nowrap`}>
        <Send className="w-3 h-3" />Davet
      </button>
    );
  }

  // Kontrol / iletişim / tebrik / egitim → WhatsApp
  if (sponsorWa) {
    const onAd = (uye.adSoyad || '').split(' ')[0] || 'merhaba';
    const text = {
      kontrol: `Selam ${onAd}, bir süredir görüşmedik. Nasıl gidiyor? 🙏`,
      tebrik:  `${onAd}, harikasın! Curriculum'da %${uye.curriculumPct} ilerlemişsin — tebrikler 🎉`,
      egitim:  `Selam ${onAd}, bu hafta yeni eğitimler var. Birlikte göz atalım: https://egitimtakvimi.oneteamglobal.ai`,
      iletisim: `Selam ${onAd} 👋`,
    }[tip] || `Selam ${onAd}`;
    return (
      <a href={`https://wa.me/${sponsorWa}?text=${encodeURIComponent(text)}`}
        target="_blank" rel="noopener noreferrer"
        className={`${renk} text-xs font-bold px-3 py-1.5 rounded-md inline-flex items-center gap-1 spring-tap whitespace-nowrap`}>
        <MessageCircle className="w-3 h-3" />WhatsApp
      </a>
    );
  }
  return null;
};

// ─── Lider karnesi (skor + sparkline) ───────────────────────────────────
const LiderKarne = ({ karne, ekipSayisi, onLeaderboard }) => {
  const skorRenk = karne.skor >= 75 ? 'emerald' : karne.skor >= 50 ? 'amber' : karne.skor >= 25 ? 'orange' : 'rose';
  const renkler = {
    emerald: { ring: 'text-emerald-300', bg: 'from-emerald-500/20 to-emerald-900/20', label: 'Mükemmel' },
    amber:   { ring: 'text-amber-300', bg: 'from-amber-500/20 to-amber-900/20', label: 'İyi' },
    orange:  { ring: 'text-orange-300', bg: 'from-orange-500/20 to-orange-900/20', label: 'Geliştir' },
    rose:    { ring: 'text-rose-300', bg: 'from-rose-500/20 to-rose-900/20', label: 'Acil' },
  }[skorRenk];

  // Önceki haftaya göre değişim
  const gecmis = karne.gecmis || [];
  const sonuncu = gecmis[gecmis.length - 1];
  const oncekiHafta = gecmis[gecmis.length - 2];
  const degisim = (sonuncu && oncekiHafta) ? sonuncu.skor - oncekiHafta.skor : 0;

  return (
    <div className={`bg-gradient-to-br ${renkler.bg} border border-white/15 backdrop-blur-md rounded-2xl p-4 sm:p-5`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Skor halkası */}
          <KarneHalkasi skor={karne.skor} renk={renkler.ring} />
          <div>
            <div className="text-amber-300 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
              <Trophy className="w-3 h-3" />Lider Karnesi
            </div>
            <div className="text-white font-extrabold text-2xl sm:text-3xl">{karne.skor}<span className="text-white/40 text-lg">/100</span></div>
            <div className={`text-xs font-bold ${renkler.ring} flex items-center gap-1.5 mt-0.5`}>
              {renkler.label}
              {degisim !== 0 && (
                <span className={`text-[10px] inline-flex items-center gap-0.5 ${degisim > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {degisim > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {degisim > 0 ? '+' : ''}{degisim}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div className="flex-1 min-w-[140px]">
          <div className="text-purple-200/60 text-[10px] uppercase tracking-wider font-semibold mb-1">Son 12 Hafta</div>
          <Sparkline data={gecmis.map(g => g.skor)} renk={renkler.ring} />
        </div>
      </div>

      {/* Skor bileşenleri */}
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        <SkorBilesen baslik="Aktiflik" puan={karne.aktifPuan} max={40} />
        <SkorBilesen baslik="Site Kullanım" puan={karne.sitePuan} max={25} />
        <SkorBilesen baslik="Curriculum" puan={karne.curriculumPuan} max={20} />
        <SkorBilesen baslik="Davet Hızı" puan={karne.davetPuan} max={15} />
      </div>

      {/* Leaderboard CTA */}
      {onLeaderboard && (
        <button onClick={onLeaderboard}
          className="mt-4 w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold py-2.5 rounded-xl spring-tap inline-flex items-center justify-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-300" />
          Tüm sponsorlar arasında sıralanı gör
        </button>
      )}
    </div>
  );
};

const KarneHalkasi = ({ skor, renk }) => {
  const r = 28;
  const c = 2 * Math.PI * r;
  const ofs = c - (skor / 100) * c;
  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="5" fill="none" />
        <circle cx="32" cy="32" r={r} stroke="currentColor" strokeWidth="5" fill="none"
          strokeLinecap="round"
          className={renk}
          strokeDasharray={c} strokeDashoffset={ofs}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Award className={`w-6 h-6 ${renk}`} />
      </div>
    </div>
  );
};

const Sparkline = ({ data, renk }) => {
  if (!data || data.length < 2) {
    return <div className="h-10 flex items-center text-purple-200/40 text-[10px]">Veri birikiyor, her hafta güncellenecek</div>;
  }
  const w = 200, h = 40;
  const maxVal = Math.max(...data, 100);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${h - ((v - minVal) / range) * h}`).join(' ');
  const sonNoktaX = (data.length - 1) * stepX;
  const sonNoktaY = h - ((data[data.length - 1] - minVal) / range) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        points={points} className={renk} />
      <circle cx={sonNoktaX} cy={sonNoktaY} r="3" fill="currentColor" className={renk} />
    </svg>
  );
};

const SkorBilesen = ({ baslik, puan, max }) => {
  const yuzde = max > 0 ? (puan / max) * 100 : 0;
  return (
    <div className="bg-black/20 rounded-xl p-2 sm:p-2.5">
      <div className="text-purple-200/70 text-[9px] uppercase tracking-wider font-semibold mb-1 truncate">{baslik}</div>
      <div className="text-white font-bold text-sm">{puan}<span className="text-white/40 text-[10px]">/{max}</span></div>
      <div className="h-1 bg-black/30 rounded-full overflow-hidden mt-1">
        <div className="h-full bg-amber-400 transition-all" style={{ width: `${yuzde}%` }} />
      </div>
    </div>
  );
};

// Büyük sayıları kısalt: 1500 → 1.5K, 1000000 → 1M
function formatBigNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

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
