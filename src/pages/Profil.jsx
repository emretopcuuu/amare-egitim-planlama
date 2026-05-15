// /profil — Tek scroll, 4 blok.
// Anonim kullanıcı → "Üye Girişi" CTA placeholder
// Login kullanıcı → Hero + Üyelik / Onboarding / Favoriler / Aktivite

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, LogIn, LogOut, Phone, Mail, Hash, CalendarDays, Award,
  MessageCircle, Heart, Video, Bell, Clock, ChevronRight, Loader2,
  RefreshCw, Trophy, TrendingUp, Sparkles, Edit3, User,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import UyeGirisModal from '../components/UyeGirisModal';
import ProfilAvatar from '../components/ProfilAvatar';
import { egitmenFotosuBul } from '../utils/egitmenFotoMatch';
import { maskPhone, normalizePhoneForWa } from '../utils/mask';
import { useTakipEgitmenler } from '../utils/takip';
import { parseFunnelAnswers } from '../utils/onboardingLabels';
import { useWatchProgress } from '../utils/watchProgress';
import { webPushDestekli, webPushIzinDurumu, webPushKaydolu, webPushIptal } from '../utils/webPush';
import BultenModal from '../components/BultenModal';

const PROFIL_CACHE_KEY = 'amare_profil_v1';
const PROFIL_CACHE_TTL = 5 * 60 * 1000; // 5dk

function loadProfilCache(amareId) {
  try {
    const raw = localStorage.getItem(PROFIL_CACHE_KEY + '_' + amareId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed._ts || 0) > PROFIL_CACHE_TTL) return null;
    return parsed.data;
  } catch { return null; }
}
function saveProfilCache(amareId, data) {
  try {
    localStorage.setItem(PROFIL_CACHE_KEY + '_' + amareId, JSON.stringify({ _ts: Date.now(), data }));
  } catch {}
}

function formatTarih(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

const Profil = () => {
  const navigate = useNavigate();
  const { currentUser, uid, isAnonymous, isAuthenticated, displayName, email, ready } = useAuth();
  const { konusmacilar } = useData();
  const { t } = useTranslation();
  const { takipSet } = useTakipEgitmenler();
  const watchProgress = useWatchProgress();

  const [girisModalAcik, setGirisModalAcik] = useState(false);
  const [profilVerisi, setProfilVerisi] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [userDoc, setUserDoc] = useState(null);
  const [abonelikler, setAbonelikler] = useState({ bulten: false, bultenDocId: null, push: false, takip: 0 });
  const [bultenModalAcik, setBultenModalAcik] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [hatirlatmalar, setHatirlatmalar] = useState([]);
  const [videoFav, setVideoFav] = useState(new Set());
  const [yarimKalan, setYarimKalan] = useState([]); // [{videoId, pct, t, baslik, thumbnailUrl}]
  const [favVideoMeta, setFavVideoMeta] = useState([]); // [{id, baslik, thumbnailUrl, egitmenAdlari}]

  // Local favori eğitimler
  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('amare_video_favoriler') || '[]');
      setVideoFav(new Set(arr));
    } catch {}
  }, []);

  // Yarım kalan eğitimler (watch progress) + favori video meta'sını Firestore'dan çek
  // watchProgress.version değiştiğinde tekrar fetch — kullanıcı bir video izledikten sonra geri dönerse güncel olur
  useEffect(() => {
    let progressMap = {};
    try { progressMap = JSON.parse(localStorage.getItem('amare_watch_progress_v1') || '{}'); } catch {}

    // En son 3 yarım kalan (pct < 95, t > 10)
    const yarimIds = Object.entries(progressMap)
      .filter(([id, p]) => p && p.pct >= 1 && p.pct < 95 && p.t > 10)
      .sort((a, b) => (b[1].lastSeen || 0) - (a[1].lastSeen || 0))
      .slice(0, 3)
      .map(([id, p]) => ({ id, ...p }));

    // Favori video ID'leri (max 4)
    let favIds = [];
    try { favIds = JSON.parse(localStorage.getItem('amare_video_favoriler') || '[]').slice(0, 4); } catch {}

    const allIds = [...new Set([...yarimIds.map(x => x.id), ...favIds])];
    if (allIds.length === 0) {
      setYarimKalan([]); setFavVideoMeta([]);
      return;
    }

    (async () => {
      try {
        const docs = await Promise.allSettled(
          allIds.map(id => getDoc(doc(db, 'kayitli_egitimler', id)))
        );
        const metaMap = {};
        docs.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value.exists()) {
            const d = res.value.data();
            metaMap[allIds[i]] = {
              id: allIds[i],
              baslik: d.baslik,
              thumbnailUrl: d.thumbnailUrl,
              egitmenAdlari: d.egitmenAdlari || [],
              sure: d.sure,
            };
          }
        });
        setYarimKalan(yarimIds.map(yk => ({ ...yk, ...(metaMap[yk.id] || {}) })).filter(x => x.baslik));
        setFavVideoMeta(favIds.map(fid => metaMap[fid]).filter(Boolean));
      } catch (e) {
        console.warn('[profil] video meta fetch err:', e.message);
      }
    })();
  }, [watchProgress.version, videoFav]);

  // users/{uid} dinle — fotoURL, amareId, displayName güncel kalır
  useEffect(() => {
    if (!uid || isAnonymous) { setUserDoc(null); return; }
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(ref, (snap) => {
      setUserDoc(snap.exists() ? snap.data() : null);
    }, (err) => console.warn('[profil] users snapshot err:', err.message));
    return () => unsub();
  }, [uid, isAnonymous]);

  // Profil-veri backend çağrısı
  const profilVerisiFetch = async (force = false) => {
    if (!currentUser || isAnonymous) return;
    const amareId = userDoc?.amareId;
    if (!amareId) return;

    // Cache
    if (!force) {
      const cached = loadProfilCache(amareId);
      if (cached) { setProfilVerisi(cached); return; }
    }

    setYukleniyor(true);
    setHata('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/profil-veri', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setHata(data.error || 'Profil verisi yüklenemedi');
        setProfilVerisi(null);
      } else {
        setProfilVerisi(data);
        saveProfilCache(amareId, data);
      }
    } catch (err) {
      console.error('[profil] fetch hata:', err);
      setHata(err.message || 'Bağlantı hatası');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    if (userDoc?.amareId) profilVerisiFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc?.amareId]);

  // Firestore — bülten + hatırlatmalar (email ile filtreli)
  // Web push: Notification.permission ile kontrol (browser tabanlı, email değil)
  useEffect(() => {
    if (!email) return;
    (async () => {
      try {
        const [bultenSnap, hatSnap] = await Promise.all([
          getDocs(query(collection(db, 'bulten_aboneleri'), where('email', '==', email))),
          getDocs(query(collection(db, 'hatirlatmalar'), where('email', '==', email))),
        ]);
        const bultenDoc = bultenSnap.docs[0];
        const pushIzin = webPushDestekli() && webPushIzinDurumu() === 'granted';
        setAbonelikler({
          bulten: !!bultenDoc,
          bultenDocId: bultenDoc?.id || null,
          push: pushIzin,
          takip: takipSet.size,
        });
        setHatirlatmalar(hatSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('[profil] abonelik fetch:', e.message);
      }
    })();
  }, [email, takipSet.size]);

  // Bülten toggle
  const toggleBulten = async () => {
    if (abonelikler.bulten && abonelikler.bultenDocId) {
      // Aboneliği iptal et
      if (!window.confirm('Haftalık bülten aboneliğini iptal etmek istediğinden emin misin?')) return;
      try {
        await deleteDoc(doc(db, 'bulten_aboneleri', abonelikler.bultenDocId));
        setAbonelikler(prev => ({ ...prev, bulten: false, bultenDocId: null }));
      } catch (e) {
        alert('İptal başarısız: ' + e.message);
      }
    } else {
      setBultenModalAcik(true);
    }
  };

  // Web push toggle
  const togglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (abonelikler.push) {
        await webPushIptal();
        setAbonelikler(prev => ({ ...prev, push: false }));
      } else {
        await webPushKaydolu();
        setAbonelikler(prev => ({ ...prev, push: true }));
      }
    } catch (e) {
      alert(e.message || 'İşlem başarısız');
    } finally {
      setPushBusy(false);
    }
  };

  // Bülten modal kapandığında durumu refresh et
  const handleBultenClose = () => {
    setBultenModalAcik(false);
    // Email ile yeniden sorgu
    if (email) {
      getDocs(query(collection(db, 'bulten_aboneleri'), where('email', '==', email)))
        .then(snap => {
          const bd = snap.docs[0];
          setAbonelikler(prev => ({ ...prev, bulten: !!bd, bultenDocId: bd?.id || null }));
        })
        .catch(() => {});
    }
  };

  // Avatar foto kaynağı (3 fallback)
  const fullName = profilVerisi?.amare?.full_name || profilVerisi?.member?.full_name || userDoc?.displayName || displayName || '';
  const userFoto = userDoc?.fotoURL || null;
  const egitmenFoto = useMemo(() => egitmenFotosuBul(fullName, konusmacilar), [fullName, konusmacilar]);
  const finalFoto = userFoto || egitmenFoto || null;

  // Career data parse
  const careerData = useMemo(() => {
    const cd = profilVerisi?.member?.career_data;
    if (!cd) return null;
    if (typeof cd === 'string') { try { return JSON.parse(cd); } catch { return null; } }
    return cd;
  }, [profilVerisi]);

  // Loading state — auth henüz hazır değilse
  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  // Anonim placeholder
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 pb-24">
        <button onClick={() => navigate(-1)} className="text-purple-200 hover:text-white text-sm font-semibold inline-flex items-center gap-1 mb-6 mt-4">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <div className="max-w-md mx-auto mt-12 bg-gradient-to-br from-purple-800/40 to-indigo-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-white/20">
            <LogIn className="w-10 h-10 text-amber-300" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Profilini gör</h1>
          <p className="text-purple-200 text-sm mb-8 leading-relaxed">
            Favoriler, kurduğun hatırlatmalar, onboarding ilerlemen ve üyelik bilgilerin burada görünür.
          </p>
          <button onClick={() => setGirisModalAcik(true)}
            className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3.5 rounded-xl spring-tap inline-flex items-center justify-center gap-2 shadow-lg mb-3">
            <LogIn className="w-5 h-5" /> Üye Girişi Yap
          </button>
          <p className="text-purple-300/70 text-xs mt-4">
            Henüz Amare üyesi değilsen <a href="https://oneteamglobal.ai" className="text-amber-300 underline">oneteamglobal.ai</a>
          </p>
        </div>
        <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />
      </div>
    );
  }

  // Login state — full profile
  const a = profilVerisi?.amare;
  const m = profilVerisi?.member;
  const u = profilVerisi?.uyelikSuresi;
  const sponsorAd = a?.sponsor_full_name;
  const sponsorTel = a?.sponsor_phone;
  const sponsorWa = normalizePhoneForWa(sponsorTel);
  const onboardingTamamlandi = profilVerisi?.onboardingTamamlandi;
  const funnelCevaplari = useMemo(
    () => parseFunnelAnswers(profilVerisi?.progress?.funnel_answers),
    [profilVerisi]
  );

  // Rank rengini hesapla (Faz 4c)
  const rankGradient = useMemo(() => {
    const r = (a?.rank || '').toLowerCase();
    if (r.includes('presidential')) return { from: 'from-amber-400', via: 'via-orange-500', to: 'to-rose-600', bgClass: 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600', textClass: 'text-amber-100' };
    if (r.includes('crown')) return { from: 'from-purple-500', via: 'via-fuchsia-600', to: 'to-pink-600', bgClass: 'bg-gradient-to-br from-purple-500 via-fuchsia-600 to-pink-600', textClass: 'text-fuchsia-100' };
    if (r.includes('diamond')) return { from: 'from-cyan-400', via: 'via-blue-500', to: 'to-indigo-600', bgClass: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600', textClass: 'text-cyan-100' };
    if (r.includes('gold')) return { from: 'from-yellow-400', via: 'via-amber-500', to: 'to-yellow-600', bgClass: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600', textClass: 'text-yellow-100' };
    if (r.includes('platinum')) return { from: 'from-slate-300', via: 'via-slate-400', to: 'to-slate-500', bgClass: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500', textClass: 'text-slate-100' };
    if (r.includes('leader') || r.includes('executive')) return { from: 'from-emerald-400', via: 'via-emerald-500', to: 'to-teal-600', bgClass: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600', textClass: 'text-emerald-100' };
    return { from: 'from-purple-700', via: 'via-purple-800', to: 'to-indigo-900', bgClass: 'bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900', textClass: 'text-purple-100' };
  }, [a?.rank]);

  // Üyelik yıldönümü hesapla (Faz 4e)
  const yildonumu = useMemo(() => {
    if (!a?.register_date) return null;
    const reg = new Date(a.register_date);
    const now = new Date();
    const thisYear = new Date(now.getFullYear(), reg.getMonth(), reg.getDate());
    const diffDays = Math.round((thisYear - now) / (1000 * 60 * 60 * 24));
    if (diffDays >= -3 && diffDays <= 7) {
      const yas = now.getFullYear() - reg.getFullYear() + (diffDays < 0 ? 0 : 0);
      return { gunFarki: diffDays, yil: now.getFullYear() - reg.getFullYear() };
    }
    return null;
  }, [a?.register_date]);

  // ─── Faz 3: Onboarding zorunlu gate ───
  // Profil verisi yüklendi VE onboarding tamamlanmadı → büyük CTA göster
  if (profilVerisi && !onboardingTamamlandi) {
    const returnUrl = encodeURIComponent('https://egitimtakvimi.oneteamglobal.ai/profil');
    const onboardingUrl = `https://oneteamglobal.ai/?amid=${encodeURIComponent(profilVerisi.amareId)}&return=${returnUrl}`;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-24">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <button onClick={() => navigate('/takvim')} className="text-purple-200 hover:text-white text-sm font-semibold inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Takvim
          </button>
          <button onClick={() => signOut(auth).then(() => navigate('/takvim'))}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-xl transition" title="Çıkış yap">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-6 pb-8 text-center">
          <ProfilAvatar uid={uid} fullName={fullName} fotoURL={finalFoto} size="xl" editable={false} />
          <h1 className="text-2xl font-bold text-white mt-4">{fullName || 'Hoş geldin'}</h1>
          {a?.rank && (
            <span className="inline-flex items-center gap-1 bg-amber-400/20 border border-amber-300/40 text-amber-100 px-3 py-1 rounded-full text-xs font-semibold mt-2">
              <Trophy className="w-3 h-3" /> {a.rank}
            </span>
          )}
        </div>

        <div className="max-w-md mx-auto px-4">
          <div className="bg-gradient-to-br from-amber-400/20 to-orange-500/20 backdrop-blur-md border border-amber-300/40 rounded-3xl p-6 text-center shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-4 shadow-xl">
              <Sparkles className="w-8 h-8 text-purple-900" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Önce seni tanıyalım</h2>
            <p className="text-amber-100/90 text-sm leading-relaxed mb-5">
              5 dakikalık bir onboarding ile profilini tamamla. Sana özel kariyer planı, eğitim önerileri ve sponsor takip sistemi açılacak.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-5 text-left space-y-2">
              {[
                'Kişiselleştirilmiş eğitim takvimi',
                'Sponsor ve ekip iletişimi',
                'Hedef takibi + kariyer yol haritası',
                'Yıllık ilerlemeni gör',
              ].map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-purple-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            <a href={onboardingUrl}
              className="block w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3.5 rounded-xl shadow-lg transition-all spring-tap text-base">
              Profilini Tamamla →
            </a>
            <p className="text-purple-200/70 text-xs mt-3">5 dakika sürer • Atlanılamaz</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-24">
      {/* Rank gradient banner (Faz 4c) */}
      <div className={`absolute top-0 left-0 right-0 h-64 ${rankGradient.bgClass} opacity-40 pointer-events-none`} />

      {/* Header */}
      <div className="relative px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-white/90 hover:text-white text-sm font-semibold inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => profilVerisiFetch(true)} disabled={yukleniyor}
            className="bg-white/15 hover:bg-white/25 border border-white/20 text-white p-2 rounded-xl transition disabled:opacity-50 backdrop-blur"
            title="Yenile">
            <RefreshCw className={`w-4 h-4 ${yukleniyor ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => signOut(auth).then(() => navigate('/takvim'))}
            className="bg-white/15 hover:bg-white/25 border border-white/20 text-white p-2 rounded-xl transition backdrop-blur"
            title="Çıkış yap">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative px-4 pt-6 pb-8 text-center">
        <ProfilAvatar uid={uid} fullName={fullName} fotoURL={finalFoto} size="xl" editable={true} />
        <h1 className="text-2xl font-bold text-white mt-4 drop-shadow">{fullName || 'Profilim'}</h1>
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          {a?.rank && (
            <span className={`inline-flex items-center gap-1 ${rankGradient.bgClass} text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg`}>
              <Trophy className="w-3 h-3" /> {a.rank}
            </span>
          )}
          {u && (
            <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur border border-white/30 text-white px-3 py-1 rounded-full text-xs font-semibold">
              <CalendarDays className="w-3 h-3" /> {u.yil > 0 ? `${u.yil} yıl ${u.ay} ay` : `${u.toplamAy} ay`} üye
            </span>
          )}
        </div>
        {hata && (
          <p className="text-red-300 text-xs mt-3 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2 inline-block">
            {hata}
          </p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* Yıldönümü banner (Faz 4e) */}
        {yildonumu && (
          <section className="bg-gradient-to-r from-amber-400/30 via-amber-300/30 to-orange-400/30 backdrop-blur-md border border-amber-300/50 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">🎉</div>
            <div className="text-amber-100 font-bold text-sm">
              {yildonumu.gunFarki === 0
                ? `Bugün ${yildonumu.yil}. yılınız! Tebrikler!`
                : yildonumu.gunFarki > 0
                  ? `${yildonumu.gunFarki} gün sonra ${yildonumu.yil}. yılınız!`
                  : `${Math.abs(yildonumu.gunFarki)} gün önce ${yildonumu.yil}. yılınızı kutladınız 🌟`
              }
            </div>
            <div className="text-amber-200/80 text-xs mt-1">One Team yolculuğunda harika gidiyorsunuz</div>
          </section>
        )}

        {/* BLOK 0 — Hakkımda (onboarding cevapları + bio) — Faz 2 */}
        {(m?.bio || funnelCevaplari.length > 0 || careerData) && (
          <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4 text-purple-300" /> Hakkımda
              </h2>
              <a href={`https://oneteamglobal.ai/?amid=${encodeURIComponent(profilVerisi?.amareId || '')}&return=${encodeURIComponent('https://egitimtakvimi.oneteamglobal.ai/profil')}`}
                className="text-purple-300 hover:text-amber-300 p-1.5 rounded-lg hover:bg-white/5 transition" title="Cevapları güncelle">
                <Edit3 className="w-3.5 h-3.5" />
              </a>
            </div>

            {m?.bio && (
              <blockquote className="text-purple-100/90 text-sm italic leading-relaxed mb-4 pl-3 border-l-2 border-amber-400/50 bg-white/5 py-2 pr-3 rounded-r-lg">
                {m.bio}
              </blockquote>
            )}

            {funnelCevaplari.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {funnelCevaplari.map((q) => (
                  <div key={q.key} className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                    <div className="text-purple-300/70 text-[10px] uppercase tracking-wider">{q.soru}</div>
                    <div className="text-white font-semibold text-xs mt-0.5 line-clamp-2">{q.cevap}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* BLOK 1 — Üyelik bilgileri */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-amber-400" /> Üyelik Bilgilerim
          </h2>
          <div className="space-y-2.5 text-sm">
            <InfoRow icon={Phone} label="Telefon" value={a?.phone || '—'} />
            <InfoRow icon={Mail} label="E-posta" value={a?.email || email || '—'} />
            <InfoRow icon={Hash} label="Amare ID" value={profilVerisi?.amareId || userDoc?.amareId || '—'} />
            <InfoRow icon={CalendarDays} label="Kayıt tarihi" value={formatTarih(a?.register_date)} />
          </div>

          {/* Sponsor */}
          {sponsorAd && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="text-purple-300/80 text-xs uppercase tracking-wider mb-2">Sponsorum</div>
              <div className="flex items-center justify-between gap-3 bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(sponsorAd || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{sponsorAd}</div>
                    <div className="text-purple-300/70 text-xs">{maskPhone(sponsorTel) || 'Telefon yok'}</div>
                  </div>
                </div>
                {sponsorWa && (
                  <a href={`https://wa.me/${sponsorWa}`} target="_blank" rel="noopener noreferrer"
                    className="bg-green-500 hover:bg-green-400 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shrink-0">
                    <MessageCircle className="w-3.5 h-3.5" /> İletişime geç
                  </a>
                )}
              </div>
            </div>
          )}
        </section>

        {/* BLOK 2 — Onboarding kariyer planı (varsa) */}
        {(careerData || m?.onboarding_completed_at) && (
          <section className="bg-gradient-to-br from-amber-400/10 to-orange-500/10 backdrop-blur-md border border-amber-300/30 rounded-2xl p-5">
            <h2 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" /> Kariyer Planım
            </h2>
            {careerData && (
              <div className="space-y-2">
                {careerData.rank && (
                  <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-purple-300/80 text-xs">Hedef</div>
                      <div className="text-white font-bold text-lg">{careerData.rank}</div>
                    </div>
                    <Award className="w-8 h-8 text-amber-400" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {careerData.income && <Stat label="Aylık" value={`${careerData.income} TL`} />}
                  {careerData.time && <Stat label="Süre" value={careerData.time} />}
                  {careerData.hours && <Stat label="Günlük" value={careerData.hours} />}
                  {careerData.roi && <Stat label="ROI" value={`${careerData.roi} ay`} />}
                </div>
              </div>
            )}
            {m?.progress_pct != null && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-purple-200">Onboarding ilerleme</span>
                  <span className="text-amber-300 font-bold">%{m.progress_pct}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${m.progress_pct}%` }} />
                </div>
              </div>
            )}
          </section>
        )}

        {/* BLOK — Yarım kalan eğitimler (Faz 4a) */}
        {yarimKalan.length > 0 && (
          <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
              <Video className="w-4 h-4 text-amber-400" /> Devam Et — Yarım Kaldı
            </h2>
            <div className="space-y-2">
              {yarimKalan.map(v => (
                <button key={v.id}
                  onClick={() => navigate(`/kayitli-egitimler?v=${encodeURIComponent(v.id)}&t=${v.t}`)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl overflow-hidden text-left transition group flex gap-3 items-stretch">
                  <div className="relative w-28 sm:w-32 flex-shrink-0 aspect-video bg-black/30 overflow-hidden">
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt={v.baslik} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Video className="w-6 h-6 text-white/30" /></div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition">
                      <div className="w-9 h-9 rounded-full bg-amber-400/90 group-hover:bg-amber-300 flex items-center justify-center transition"><Video className="w-4 h-4 text-purple-900" /></div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                      <div className="h-full bg-amber-400" style={{ width: `${v.pct}%` }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-2 pr-2">
                    <div className="text-white text-xs font-bold line-clamp-2">{v.baslik}</div>
                    {v.egitmenAdlari?.[0] && <div className="text-purple-300/70 text-[10px] mt-0.5 truncate">{v.egitmenAdlari[0]}</div>}
                    <div className="text-amber-300 text-[10px] font-bold mt-1">%{v.pct} izlendi</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* BLOK 3 — Favorilerim */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" /> Favorilerim
          </h2>

          {/* Takip eğitmenleri */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-200 text-sm">Takip ettiğim eğitmenler</span>
              <span className="text-white font-bold text-sm">{takipSet.size}</span>
            </div>
            {takipSet.size > 0 ? (
              <button onClick={() => navigate('/konusmacilar?fav=1')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-purple-100 text-sm font-semibold flex items-center justify-between transition">
                <span>Tümünü gör</span> <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-purple-400/70 text-xs italic">Henüz takip ettiğin eğitmen yok</p>
            )}
          </div>

          {/* Video favorileri — preview grid (Faz 4b) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-200 text-sm">Favori kayıtlı eğitimler</span>
              <span className="text-white font-bold text-sm">{videoFav.size}</span>
            </div>
            {favVideoMeta.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {favVideoMeta.map(v => (
                    <button key={v.id}
                      onClick={() => navigate(`/kayitli-egitimler?v=${encodeURIComponent(v.id)}`)}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg overflow-hidden text-left transition group">
                      <div className="relative aspect-video bg-black/30">
                        {v.thumbnailUrl ? (
                          <img src={v.thumbnailUrl} alt={v.baslik} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Video className="w-5 h-5 text-white/30" /></div>
                        )}
                        <Heart className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-pink-400 fill-pink-400 drop-shadow" />
                      </div>
                      <div className="p-1.5">
                        <div className="text-white text-[10px] font-semibold line-clamp-2 leading-snug">{v.baslik}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {videoFav.size > 4 && (
                  <button onClick={() => navigate('/kayitli-egitimler?fav=1')}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-purple-100 text-xs font-semibold flex items-center justify-between transition">
                    <span>Tüm {videoFav.size} favoriyi gör</span> <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : videoFav.size > 0 ? (
              <button onClick={() => navigate('/kayitli-egitimler?fav=1')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-purple-100 text-sm font-semibold flex items-center justify-between transition">
                <span>Tümünü gör</span> <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-purple-400/70 text-xs italic">Henüz favori eğitimin yok</p>
            )}
          </div>
        </section>

        {/* BLOK 4 — Aktivitem */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" /> Aktivitem
          </h2>

          {/* Abonelikler — toggle aktif (Faz 4d) */}
          <div className="space-y-2 mb-4">
            <AbonelikChip aktif={abonelikler.bulten} label="Haftalık bülten" onClick={toggleBulten}
              actionLabel={abonelikler.bulten ? 'İptal' : 'Abone ol'} />
            <AbonelikChip aktif={abonelikler.push} label="Web push bildirimi" onClick={togglePush}
              busy={pushBusy}
              actionLabel={abonelikler.push ? 'Kapat' : 'Aç'} />
            <AbonelikChip aktif={abonelikler.takip > 0} label={`Konuşmacı takip (${abonelikler.takip})`} onClick={() => navigate('/konusmacilar?fav=1')}
              actionLabel="Yönet" />
          </div>

          {/* Hatırlatmalar */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-200 text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Kurduğum hatırlatmalar
              </span>
              <span className="text-white font-bold text-sm">{hatirlatmalar.length}</span>
            </div>
            {hatirlatmalar.length === 0 ? (
              <p className="text-purple-400/70 text-xs italic">Henüz hatırlatma kurmadın</p>
            ) : (
              <div className="space-y-1.5">
                {hatirlatmalar.slice(0, 5).map(h => (
                  <div key={h.id} className="bg-white/5 rounded-lg px-3 py-2 text-xs">
                    <div className="text-white font-semibold truncate">{h.egitimAdi || h.title || 'Eğitim'}</div>
                    <div className="text-purple-300/70 mt-0.5">
                      {h.zaman ? new Date(h.zaman).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      {h.tip && <span className="ml-2 text-purple-400">• {h.tip}</span>}
                    </div>
                  </div>
                ))}
                {hatirlatmalar.length > 5 && (
                  <p className="text-purple-400/70 text-xs text-center mt-2">+{hatirlatmalar.length - 5} daha</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />
      {bultenModalAcik && <BultenModal onClose={handleBultenClose} />}
    </div>
  );
};

// Helpers
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-1.5">
    <Icon className="w-4 h-4 text-purple-300 flex-shrink-0" />
    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
      <span className="text-purple-300/80 text-xs">{label}</span>
      <span className="text-white font-medium text-sm truncate">{value}</span>
    </div>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="bg-white/5 rounded-lg px-3 py-2">
    <div className="text-purple-300/70 text-[10px] uppercase tracking-wider">{label}</div>
    <div className="text-white font-bold text-sm mt-0.5">{value}</div>
  </div>
);

const AbonelikChip = ({ aktif, label, onClick, actionLabel, busy = false }) => (
  <button onClick={onClick} disabled={busy}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
      aktif ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/25' : 'bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10'
    } ${busy ? 'opacity-50 cursor-wait' : ''}`}>
    <span className="text-sm font-medium flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${aktif ? 'bg-emerald-400' : 'bg-purple-500/40'}`} />
      {label}
    </span>
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${
      aktif ? 'bg-white/10 text-emerald-200' : 'bg-amber-400/20 text-amber-200'
    }`}>
      {busy ? '...' : actionLabel}
    </span>
  </button>
);

export default Profil;
