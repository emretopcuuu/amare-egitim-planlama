// /profil — Tek scroll, 4 blok.
// Anonim kullanıcı → "Üye Girişi" CTA placeholder
// Login kullanıcı → Hero + Üyelik / Onboarding / Favoriler / Aktivite

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, LogIn, LogOut, Phone, Mail, Hash, CalendarDays, Award,
  MessageCircle, Heart, Video, Bell, Clock, ChevronRight, Loader2,
  RefreshCw, Trophy, TrendingUp, Sparkles, Edit3, User, X,
  Briefcase, Cake, Flame, AlertTriangle, Users, Timer, Target, Hourglass,
  CheckCircle2, TrendingUp as TrendIcon, Zap, Medal, Crown, Star,
  Share2, Download, Layers,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import UyeGirisModal from '../components/UyeGirisModal';
import EgitmenAnalyticsKart from '../components/EgitmenAnalyticsKart';
import { useDocumentTitle } from '../utils/useDocumentTitle';
import ProfilAvatar from '../components/ProfilAvatar';
import { egitmenFotosuBul } from '../utils/egitmenFotoMatch';
import { maskPhone, normalizePhoneForWa } from '../utils/mask';
import { useTakipEgitmenler } from '../utils/takip';
import { parseFunnelAnswers, parseProfileAnswers } from '../utils/onboardingLabels';
import { useWatchProgress, getTotalWatchedSeconds, getWeeklyWatchedSeconds, getCompletedCount } from '../utils/watchProgress';
import { updateStreak } from '../utils/streak';
import { useCountUp } from '../utils/useCountUp';
import { usePullToRefresh } from '../utils/usePullToRefresh';
import { RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { webPushDestekli, webPushIzinDurumu, webPushKaydolu, webPushIptal } from '../utils/webPush';
import BultenModal from '../components/BultenModal';
import EgitimYolumBlok from '../components/EgitimYolumBlok';
import BugununIlhami from '../components/BugununIlhami';
import BanaOzelAha from '../components/BanaOzelAha';

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
  useDocumentTitle('Profilim', 'Eğitim yolun, ilerlemen, üyelik bilgilerin');
  const navigate = useNavigate();
  const { currentUser, uid, isAnonymous, isAuthenticated, displayName, email, ready } = useAuth();
  const { konusmacilar } = useData();
  const { t } = useTranslation();
  const { takipSet } = useTakipEgitmenler();
  const watchProgress = useWatchProgress();

  // URL'den ?giris=1 parametresi varsa modal otomatik açılsın (davet linkleri için)
  const [girisModalAcik, setGirisModalAcik] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('giris') === '1';
  });
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
  const [streak, setStreak] = useState({ current: 0, longest: 0, total: 0 });
  const [streakAciklamaAcik, setStreakAciklamaAcik] = useState(false);
  const [wrappedAcik, setWrappedAcik] = useState(false);
  const [waModalAcik, setWaModalAcik] = useState(false);

  // İzleme istatistikleri (re-compute on watchProgress.version change)
  const totalWatched = useMemo(() => getTotalWatchedSeconds(), [watchProgress.version]);
  const weeklyWatched = useMemo(() => getWeeklyWatchedSeconds(), [watchProgress.version]);
  const completedCount = useMemo(() => getCompletedCount(), [watchProgress.version]);

  // Pull-to-refresh callback'i ref'te tut — profilVerisiFetch tanımı sonradan
  const fetchRef = useRef(null);
  const { pullY, refreshing } = usePullToRefresh(async () => {
    if (fetchRef.current) await fetchRef.current(true);
  });

  // Local favori eğitimler
  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('amare_video_favoriler') || '[]');
      setVideoFav(new Set(arr));
    } catch {}
  }, []);

  // Streak'i güncelle — sayfa açılışında (login değilse de localStorage'a yazar)
  useEffect(() => {
    if (!ready || isAnonymous) return;
    updateStreak(uid, isAnonymous)
      .then(s => setStreak(s))
      .catch(e => console.warn('[profil] streak:', e.message));
  }, [ready, uid, isAnonymous]);

  // Yıldönümü konfeti — bugün ise (gunFarki === 0) ve daha önce tetiklenmediyse
  const yildonumuKonfetiAttiRef = useRef(false);
  useEffect(() => {
    if (yildonumuKonfetiAttiRef.current) return;
    if (!profilVerisi || !profilVerisi.amare?.register_date) return;
    const reg = new Date(profilVerisi.amare.register_date);
    const now = new Date();
    if (reg.getMonth() === now.getMonth() && reg.getDate() === now.getDate() && reg.getFullYear() !== now.getFullYear()) {
      yildonumuKonfetiAttiRef.current = true;
      setTimeout(() => {
        const duration = 3000;
        const end = Date.now() + duration;
        (function frame() {
          confetti({
            particleCount: 4,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FBB034', '#FFDD00', '#FF6B35', '#A855F7'],
          });
          confetti({
            particleCount: 4,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#FBB034', '#FFDD00', '#FF6B35', '#A855F7'],
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      }, 800);
    }
  }, [profilVerisi]);

  // Yıldönümü banner'a tıklayınca da konfeti
  const yildonumuKutla = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FBB034', '#FFDD00', '#FF6B35', '#A855F7'],
    });
  };

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

  // fetchRef'i güncel tut (pull-to-refresh'in çağıracağı son fonksiyon)
  useEffect(() => { fetchRef.current = profilVerisiFetch; });

  useEffect(() => {
    if (userDoc?.amareId) profilVerisiFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc?.amareId]);

  // Rank takip — login kullanıcı için anında kontrol (background, async)
  // Eğer rank değişmişse Firestore'da egitim_durumu güncellenir
  useEffect(() => {
    if (!currentUser || isAnonymous || !userDoc?.amareId) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await currentUser.getIdToken();
        await fetch(`/.netlify/functions/rank-takip?uid=${encodeURIComponent(uid)}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        // Sessiz arka plan işlemi — hata loglanır ama UI etkilenmez
      } catch (e) {
        if (!cancelled) console.warn('[rank-takip] arka plan:', e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser, isAnonymous, uid, userDoc?.amareId]);

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

  // ─── Hook'lar her render'da AYNI SIRADA çağrılmalı — early return'lerden ÖNCE ───
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

  const funnelCevaplari = useMemo(
    () => parseFunnelAnswers(profilVerisi?.progress?.funnel_answers),
    [profilVerisi]
  );

  // Profile soruları (yaş, meslek, heyecanlandıran, tanıtım) — bio_data'dan parse
  const profileCevaplari = useMemo(
    () => parseProfileAnswers(profilVerisi?.member?.bio_data),
    [profilVerisi]
  );

  // Rank rengini hesapla (Faz 4c)
  const rankGradient = useMemo(() => {
    const r = (profilVerisi?.amare?.rank || '').toLowerCase();
    if (r.includes('presidential')) return { bgClass: 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600' };
    if (r.includes('crown'))        return { bgClass: 'bg-gradient-to-br from-purple-500 via-fuchsia-600 to-pink-600' };
    if (r.includes('diamond'))      return { bgClass: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600' };
    if (r.includes('gold'))         return { bgClass: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600' };
    if (r.includes('platinum'))     return { bgClass: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500' };
    if (r.includes('leader') || r.includes('executive')) return { bgClass: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600' };
    return { bgClass: 'bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900' };
  }, [profilVerisi?.amare?.rank]);

  // Achievement rozetleri — milestone bazlı, motivasyon
  const rozetler = useMemo(() => {
    const uyelikYil = profilVerisi?.uyelikSuresi?.yil || 0;
    const all = [
      { key: 'ilk_video', icon: '🎓', label: 'İlk Adım', desc: 'İlk eğitimini izledin', kazanildi: completedCount >= 1 },
      { key: 'egitim_asigi', icon: '📚', label: 'Eğitim Aşığı', desc: '10+ eğitim tamamladı', kazanildi: completedCount >= 10 },
      { key: 'usta', icon: '🏆', label: 'Eğitim Ustası', desc: '50+ eğitim tamamladı', kazanildi: completedCount >= 50 },
      { key: 'sosyal', icon: '❤️', label: 'Sosyal Takipçi', desc: '5+ eğitmen takip ediyor', kazanildi: takipSet.size >= 5 },
      { key: 'streak_3', icon: '🔥', label: 'Tutkulu', desc: '3 gün üst üste', kazanildi: (streak.longest || 0) >= 3 },
      { key: 'streak_7', icon: '⚡', label: 'Disiplinli', desc: '7 gün üst üste', kazanildi: (streak.longest || 0) >= 7 },
      { key: 'streak_30', icon: '🌟', label: 'Efsane', desc: '30 gün üst üste', kazanildi: (streak.longest || 0) >= 30 },
      { key: 'yil_1', icon: '🎉', label: '1. Yıl', desc: 'One Team yolculuğun 1 yaşında', kazanildi: uyelikYil >= 1 },
      { key: 'yil_5', icon: '💎', label: 'Sadık Üye', desc: '5+ yıl One Team üyesi', kazanildi: uyelikYil >= 5 },
      { key: 'yil_10', icon: '👑', label: 'Veteran', desc: '10+ yıl One Team üyesi', kazanildi: uyelikYil >= 10 },
      { key: 'saat_10', icon: '⏱️', label: 'Adanmış', desc: '10+ saat eğitim izledi', kazanildi: totalWatched >= 10 * 3600 },
      { key: 'saat_50', icon: '🚀', label: 'Sıçrama', desc: '50+ saat eğitim izledi', kazanildi: totalWatched >= 50 * 3600 },
    ];
    return {
      kazanilan: all.filter(r => r.kazanildi),
      kazanilmamis: all.filter(r => !r.kazanildi).slice(0, 3), // sıradaki 3 hedefi göster
      toplam: all.length,
    };
  }, [completedCount, takipSet.size, streak.longest, profilVerisi?.uyelikSuresi?.yil, totalWatched]);

  // Profil tamamlama yüzdesi — engagement nudge için
  // Her check'in bir action'ı var: tıklayınca ilgili akış başlar
  const profilTamamlama = useMemo(() => {
    const amareIdStr = encodeURIComponent(profilVerisi?.amareId || '');
    const returnUrl = encodeURIComponent('https://egitimtakvimi.oneteamglobal.ai/profil');
    const onboardingUrl = `https://oneteamglobal.ai/?amid=${amareIdStr}&update=1&return=${returnUrl}`;

    // Fotoğraf kontrolü — birden çok kaynaktan kabul
    const fotoVar = !!(
      userDoc?.fotoURL ||
      profilVerisi?.amare?.foto_url ||
      profilVerisi?.amare?.fotoURL ||
      profilVerisi?.member?.foto_url ||
      currentUser?.photoURL
    );
    // Bio/tanıtım kontrolü — birden çok kaynaktan kabul
    const bioVar = !!(
      profilVerisi?.member?.bio_data?.tanitim ||
      (profilVerisi?.member?.bio && profilVerisi.member.bio.trim().length > 10) ||
      userDoc?.tanitim
    );

    const checks = [
      { key: 'avatar', label: 'Profil fotosu', done: fotoVar, weight: 20,
        action: () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => window.dispatchEvent(new Event('amare-open-avatar-picker')), 500);
        }
      },
      { key: 'bio', label: 'Tanıtım metni', done: bioVar, weight: 25,
        action: () => { window.location.href = onboardingUrl; }
      },
      { key: 'onboarding', label: 'Onboarding cevapları', done: !!profilVerisi?.onboardingTamamlandi, weight: 25,
        action: () => { window.location.href = onboardingUrl; }
      },
      { key: 'fav_egitmen', label: 'En az 1 takip eğitmen', done: takipSet.size > 0, weight: 10,
        action: () => navigate('/konusmacilar')
      },
      { key: 'fav_video', label: 'En az 1 favori eğitim', done: videoFav.size > 0, weight: 10,
        action: () => navigate('/kayitli-egitimler')
      },
      { key: 'video_izle', label: 'En az 1 video izle', done: completedCount > 0 || totalWatched > 60, weight: 10,
        action: () => navigate('/kayitli-egitimler')
      },
    ];
    const pct = checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
    const eksik = checks.filter(c => !c.done);
    return { pct, eksik, checks };
  }, [userDoc?.fotoURL, profilVerisi, takipSet.size, videoFav.size, completedCount, totalWatched, navigate]);

  // Üyelik yıldönümü hesapla (Faz 4e)
  const yildonumu = useMemo(() => {
    const regDate = profilVerisi?.amare?.register_date;
    if (!regDate) return null;
    const reg = new Date(regDate);
    const now = new Date();
    const thisYear = new Date(now.getFullYear(), reg.getMonth(), reg.getDate());
    const diffDays = Math.round((thisYear - now) / (1000 * 60 * 60 * 24));
    if (diffDays >= -3 && diffDays <= 7) {
      return { gunFarki: diffDays, yil: now.getFullYear() - reg.getFullYear() };
    }
    return null;
  }, [profilVerisi?.amare?.register_date]);

  // ─── Bütün hook'lar bitti — şimdi conditional render'lar ───

  // Loading state — auth henüz hazır değilse
  if (!ready) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  // Anonim placeholder
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-24">
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <button onClick={() => navigate('/takvim')} className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Takvim
          </button>
        </div>
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-9 h-9 text-amber-300" />
            </div>
            <h1 className="text-2xl font-light text-white mb-2 tracking-tight">Profilini gör</h1>
            <p className="text-purple-200 text-sm mb-8 leading-relaxed">
              Favoriler, kurduğun hatırlatmalar, onboarding ilerlemen ve üyelik bilgilerin burada görünür.
            </p>
            <button onClick={() => setGirisModalAcik(true)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3.5 rounded-xl shadow-lg spring-tap inline-flex items-center justify-center gap-2 mb-3">
              <LogIn className="w-5 h-5" /> Üye Girişi Yap
            </button>
            <p className="text-purple-300/70 text-xs mt-4">
              Henüz Amare üyesi değilsen <a href="https://oneteamglobal.ai" className="text-amber-300 hover:text-amber-200 underline font-semibold">oneteamglobal.ai</a>
            </p>
          </div>
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

  // ─── Faz 3: Onboarding zorunlu gate ───
  // Profil verisi yüklendi VE onboarding tamamlanmadı → büyük CTA göster
  if (profilVerisi && !onboardingTamamlandi) {
    const returnUrl = encodeURIComponent('https://egitimtakvimi.oneteamglobal.ai/profil');
    const onboardingUrl = `https://oneteamglobal.ai/?amid=${encodeURIComponent(profilVerisi.amareId)}&return=${returnUrl}`;
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-24">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 pt-6">
          <button onClick={() => navigate('/takvim')} className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Takvim
          </button>
          <button onClick={() => signOut(auth).then(() => navigate('/takvim'))}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-xl transition spring-tap" title="Çıkış yap">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 pt-10 pb-6 text-center">
          <ProfilAvatar uid={uid} fullName={fullName} fotoURL={finalFoto} size="xl" editable={false} />
          {a?.rank && (
            <div className="mt-6 mb-2 flex items-center justify-center gap-2.5">
              <div className="h-px w-8 bg-amber-400/40" />
              <span className="text-amber-300 text-[11px] uppercase tracking-[0.3em] font-bold">{a.rank}</span>
              <div className="h-px w-8 bg-amber-400/40" />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">{fullName || 'Hoş geldin'}</h1>
        </div>

        <div className="max-w-md mx-auto px-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-7 text-center shadow-2xl">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-400/20 border border-amber-300/40 mb-5">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Önce seni tanıyalım</h2>
            <p className="text-purple-200 text-sm leading-relaxed mb-6">
              5 dakikalık bir onboarding ile profilini tamamla. Sana özel kariyer planı, eğitim önerileri ve sponsor takip sistemi açılacak.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-6 text-left space-y-2">
              {[
                'Kişiselleştirilmiş eğitim takvimi',
                'Sponsor ve ekip iletişimi',
                'Hedef takibi + kariyer yol haritası',
                'Yıllık ilerlemeni gör',
              ].map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-purple-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 mt-0.5 flex-shrink-0" />
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-24">
      {/* Pull-to-refresh göstergesi (mobile) */}
      {pullY > 0 && (
        <div style={{ height: `${pullY}px` }}
          className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-end justify-center pb-2 bg-gradient-to-b from-purple-950 to-purple-900 transition-[height]">
          <RotateCw className={`w-6 h-6 text-amber-300 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? '' : `rotate(${Math.min(pullY * 3, 360)}deg)` }} />
        </div>
      )}

      {/* Header — takvim sayfasıyla aynı stil */}
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 pt-6">
        <button onClick={() => navigate('/takvim')} className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Takvim
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setWrappedAcik(true)}
            className="bg-amber-400/15 hover:bg-amber-400/30 border border-amber-300/40 text-amber-200 px-3 py-2 rounded-xl transition spring-tap inline-flex items-center gap-1.5 text-xs font-bold"
            title="Yıllık özet paylaş">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Özet</span>
          </button>
          <button onClick={() => profilVerisiFetch(true)} disabled={yukleniyor}
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

      {/* HERO — sade, premium */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-8 text-center">
        <div className="inline-block">
          <ProfilAvatar uid={uid} fullName={fullName} fotoURL={finalFoto} size="xl" editable={true} />
        </div>

        {/* Rank — kicker tarzı, ad'dan önce */}
        {a?.rank && (
          <div className="mt-6 mb-2 flex items-center justify-center gap-2.5">
            <div className="h-px w-8 bg-amber-400/40" />
            <span className="text-amber-300 text-[11px] uppercase tracking-[0.3em] font-bold">{a.rank}</span>
            <div className="h-px w-8 bg-amber-400/40" />
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
          {fullName || 'Profilim'}
        </h1>

        {u && (
          <p className="mt-2 text-purple-200 text-sm">
            One Team üyesi · {u.yil > 0 ? `${u.yil} yıl ${u.ay} ay` : `${u.toplamAy} ay`}
          </p>
        )}

        {/* Streak chip — hero altında, animated flame */}
        {streak.current > 0 && (
          <button onClick={() => setStreakAciklamaAcik(true)}
            className="mt-4 inline-flex items-center gap-2 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-400/40 px-3.5 py-1.5 rounded-full transition spring-tap group">
            <Flame className={`w-4 h-4 text-orange-400 ${streak.current >= 3 ? 'animate-pulse' : ''} group-hover:scale-110 transition-transform`} fill={streak.current >= 7 ? '#fb923c' : 'none'} />
            <span className="text-orange-200 text-sm font-bold">{streak.current} gün üst üste</span>
            {streak.longest > streak.current && (
              <span className="text-orange-300/60 text-[10px] font-semibold border-l border-orange-400/30 pl-2">rekor {streak.longest}</span>
            )}
          </button>
        )}

        {hata && (
          <p className="text-red-300 text-xs mt-4 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2 inline-block">
            {hata}
          </p>
        )}
      </div>

      {/* STATS ROW — 6 stat, sticky scroll'da üste yapışır, tıklanabilir */}
      <div className="max-w-3xl mx-auto px-4 mt-2 sticky top-2 z-30">
        <div className="bg-purple-900/80 backdrop-blur-xl border border-white/20 rounded-2xl grid grid-cols-3 sm:grid-cols-6 divide-x divide-white/10 shadow-2xl overflow-hidden">
          <StatCell label="Üyelik" suffix="y" value={u ? u.yil : '—'} delay={0}
            tooltip={u ? `${u.yil} yıl ${u.ay > 0 ? u.ay + ' ay ' : ''}One Team üyesisin` : 'Üyelik süresi'}
            scrollToId="section-uyelik" />
          <StatCell label="İzleme" suffix="sa" value={Math.floor(totalWatched / 3600) || 0}
            highlight={totalWatched > 0} delay={100}
            tooltip="Toplam izlediğin video saati"
            scrollToId="section-aktivite" />
          <StatCell label="Bitirdiğin" value={completedCount} delay={200}
            tooltip="Tamamen izlediğin video sayısı"
            scrollToId="section-aktivite" />
          <StatCell label="Favori" value={takipSet.size + videoFav.size} delay={300}
            tooltip={`${takipSet.size} eğitmen + ${videoFav.size} video takipte`}
            scrollToId="section-favoriler" />
          <StatCell label="Günlük Seri" suffix="g" value={streak.current}
            highlight={streak.current >= 3} delay={400}
            tooltip={streak.current > 0 ? `${streak.current} gündür üst üste site açıyorsun (en uzun: ${streak.longest || 0}g)` : 'Streak yok — bugün başlat'} />
          <StatCell label="Hatırlatma" value={hatirlatmalar.length} delay={500}
            tooltip="Kurduğun eğitim hatırlatmaları"
            scrollToId="section-aktivite" />
        </div>
      </div>

      {/* Skeleton — profilVerisi henüz yokken shimmer kartlar */}
      {!profilVerisi && (
        <div className="max-w-3xl mx-auto px-4 mt-8 space-y-4">
          {[120, 160, 100, 140].map((h, i) => (
            <div key={i} className="rounded-2xl border border-white/10 skeleton-shimmer"
              style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-6">

        {/* ═══ ÜYELİK — en üstte, tek bakışta bilgilere erişim ═══ */}
        <div id="section-uyelik" className="stagger-fade">
          <SectionTitle icon={Hash}>Üyelik</SectionTitle>
          <div className="mt-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 divide-y divide-white/10 shadow-xl">
            <InfoRow icon={Phone} label="Telefon" value={a?.phone || '—'} />
            <InfoRow icon={Mail} label="E-posta" value={a?.email || email || '—'} />
            <InfoRow icon={Hash} label="Amare ID" value={profilVerisi?.amareId || userDoc?.amareId || '—'} />
            <InfoRow icon={CalendarDays} label="Kayıt tarihi" value={formatTarih(a?.register_date)} />
          </div>
        </div>

        {/* Profil tamamlama banner — sadece eksik varsa göster */}
        {profilTamamlama.pct < 100 && profilTamamlama.eksik.length > 0 && (
          <section className="bg-gradient-to-r from-amber-400/15 via-amber-300/10 to-orange-400/15 backdrop-blur-md border border-amber-300/40 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <h3 className="text-white font-bold text-sm">Profilin %{profilTamamlama.pct} tamam</h3>
              </div>
              <span className="text-amber-200 text-xs font-semibold">%{100 - profilTamamlama.pct} kaldı</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500" style={{ width: `${profilTamamlama.pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profilTamamlama.eksik.map(e => (
                <button key={e.key} onClick={e.action}
                  className="text-amber-100 hover:text-white text-[11px] bg-white/5 hover:bg-amber-400/30 border border-amber-300/30 hover:border-amber-300/60 rounded-md px-2.5 py-1.5 transition-all spring-tap font-medium inline-flex items-center gap-1.5 group">
                  <span className="text-amber-300 group-hover:text-white">◯</span>
                  <span>{e.label}</span>
                  <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
            <p className="text-amber-200/60 text-[10px] mt-2.5">Tamamlamak için tıkla →</p>
          </section>
        )}

        {/* Yıldönümü banner (Faz 4e) — tıklayınca konfeti */}
        {yildonumu && (
          <button onClick={yildonumuKutla}
            className="w-full bg-gradient-to-r from-amber-400/20 via-amber-300/15 to-amber-400/20 backdrop-blur-md border border-amber-300/40 hover:border-amber-300/70 rounded-2xl p-4 text-center transition spring-tap">
            <div className="text-2xl mb-1">🎉</div>
            <div className="text-amber-100 font-bold text-sm">
              {yildonumu.gunFarki === 0
                ? `Bugün ${yildonumu.yil}. yılınız! Tebrikler!`
                : yildonumu.gunFarki > 0
                  ? `${yildonumu.gunFarki} gün sonra ${yildonumu.yil}. yılınız!`
                  : `${Math.abs(yildonumu.gunFarki)} gün önce ${yildonumu.yil}. yılınızı kutladınız 🌟`
              }
            </div>
            <div className="text-amber-200/80 text-xs mt-1">Tıkla — kutla 🎊</div>
          </button>
        )}

        {/* ═══ EĞİTİM YOLUM — sayfanın ana bölümü ═══ */}
        {a?.rank && (
          <div id="section-egitim-yolum" className="stagger-fade" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle icon={Trophy}>Eğitim Yolum</SectionTitle>
              <span className="text-purple-300/60 text-[10px] uppercase tracking-wider font-bold">Sana Özel</span>
            </div>
            <EgitimYolumBlok
              uid={uid}
              isAnonymous={isAnonymous}
              kullaniciRankString={a.rank}
            />
          </div>
        )}

        {/* ═══ İLHAM WIDGETLERİ — Bugünün İlhamı + Sana Özel ═══ */}
        <div className="stagger-fade grid sm:grid-cols-2 gap-3" style={{ animationDelay: '160ms' }}>
          <BugununIlhami />
          {!isAnonymous && <BanaOzelAha />}
        </div>

        {/* ═══ EĞİTMEN ANALYTİCS ═══ (sadece eğitmenler için) */}
        {userDoc?.egitmenCoreId && (
          <div className="stagger-fade" style={{ animationDelay: '180ms' }}>
            <EgitmenAnalyticsKart coreId={userDoc.egitmenCoreId} />
          </div>
        )}

        {/* ═══ HAKKIMDA ═══ */}
        {(m?.bio || m?.bio_data || funnelCevaplari.length > 0 || careerData || profileCevaplari.chips.length > 0) && (
          <div id="section-hakkimda" className="stagger-fade" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <SectionTitle icon={User}>Hakkımda</SectionTitle>
              <a href={`https://oneteamglobal.ai/?amid=${encodeURIComponent(profilVerisi?.amareId || '')}&update=1&return=${encodeURIComponent('https://egitimtakvimi.oneteamglobal.ai/profil')}`}
                className="text-purple-300 hover:text-amber-300 transition flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap" title="Cevapları yeniden doldur">
                <Edit3 className="w-3 h-3" /> Güncelle
              </a>
            </div>

            {/* Tanıtım metni — büyük tırnak editorial style (glass) */}
            {profileCevaplari.tanitim ? (
              <div className="mb-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
                <div className="absolute top-3 left-4 text-amber-300/30 text-8xl font-serif leading-none select-none">"</div>
                <p className="relative text-white text-lg leading-relaxed italic pl-8 pt-4 font-light">
                  {profileCevaplari.tanitim}
                </p>
                <div className="text-amber-300/70 text-[10px] font-bold uppercase tracking-[0.2em] mt-4 text-right">— Kendinden</div>
              </div>
            ) : m?.bio && (
              <div className="mb-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl">
                <p className="text-white/95 text-sm italic leading-relaxed">{m.bio}</p>
              </div>
            )}

            {/* Glass chip grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                // Profile cevapları (yaş, meslek, heyecan)
                ...profileCevaplari.chips.map(c => ({
                  ...c,
                  ...(c.key === 'yas' && { icon: Cake, renk: 'from-pink-500/20 to-rose-500/20 border-pink-400/30', iconColor: 'text-pink-300' }),
                  ...(c.key === 'meslek' && { icon: Briefcase, renk: 'from-slate-500/20 to-gray-500/20 border-slate-400/30', iconColor: 'text-slate-300' }),
                  ...(c.key === 'heyecan' && { icon: Flame, renk: 'from-orange-500/20 to-red-500/20 border-orange-400/30', iconColor: 'text-orange-300' }),
                })),
                // Funnel cevapları (motivasyon, endişe, çevre, saat)
                ...funnelCevaplari.map(c => ({
                  ...c,
                  ...(c.key === 'motivasyon' && { icon: Sparkles, renk: 'from-purple-500/20 to-indigo-500/20 border-purple-400/30', iconColor: 'text-purple-300' }),
                  ...(c.key === 'korku' && { icon: AlertTriangle, renk: 'from-yellow-500/20 to-amber-500/20 border-yellow-400/30', iconColor: 'text-yellow-300' }),
                  ...(c.key === 'cevre' && { icon: Users, renk: 'from-pink-500/20 to-fuchsia-500/20 border-pink-400/30', iconColor: 'text-pink-300' }),
                  ...(c.key === 'haftaSaat' && { icon: Timer, renk: 'from-blue-500/20 to-cyan-500/20 border-blue-400/30', iconColor: 'text-blue-300' }),
                })),
                // Kariyer (rank, süre, günlük çalışma)
                ...(careerData?.rank ? [{ key: 'hedef', soru: 'Hedef', cevap: careerData.rank, icon: Target, renk: 'from-amber-400/25 to-orange-500/25 border-amber-300/40', iconColor: 'text-amber-300' }] : []),
                ...(careerData?.time ? [{ key: 'sure', soru: 'Süre', cevap: careerData.time, icon: Hourglass, renk: 'from-cyan-500/20 to-teal-500/20 border-cyan-400/30', iconColor: 'text-cyan-300' }] : []),
                ...(careerData?.hours ? [{ key: 'gunluk', soru: 'Günlük', cevap: careerData.hours, icon: Clock, renk: 'from-emerald-500/20 to-green-500/20 border-emerald-400/30', iconColor: 'text-emerald-300' }] : []),
              ].map((q) => {
                const Icon = q.icon || User;
                return (
                  <div key={q.key}
                    className="group bg-white/10 backdrop-blur border border-white/20 hover:border-amber-300/50 rounded-xl px-3 py-3 chip-lift">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                      <div className="text-purple-200/70 text-[9px] uppercase tracking-[0.15em] font-bold truncate">{q.soru}</div>
                    </div>
                    <div className="text-white font-semibold text-[13px] leading-tight line-clamp-2">{q.cevap}</div>
                  </div>
                );
              })}
            </div>

            {/* Onboarding tamamlanma badge (A3) */}
            {m?.onboarding_completed_at && (
              <div className="mt-4 flex items-center justify-between text-[11px] px-1">
                <div className="flex items-center gap-1.5 text-green-300">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="font-semibold">Profil tamamlandı</span>
                </div>
                <span className="text-purple-300/60">{formatTarih(m.onboarding_completed_at)}</span>
              </div>
            )}
          </div>
        )}

        {/* ═══ HAFTALIK HEDEF (onboarding'te seçilen haftalık saat vs gerçek) ═══ */}
        {funnelCevaplari.find(c => c.key === 'haftaSaat') && (() => {
          const haftalikHedefRaw = funnelCevaplari.find(c => c.key === 'haftaSaat')?.cevap || '';
          const haftalikHedefSaat = parseInt(haftalikHedefRaw.match(/\d+/)?.[0] || '5', 10);
          const gercekSaat = weeklyWatched / 3600;
          const yuzde = haftalikHedefSaat > 0 ? Math.min(100, (gercekSaat / haftalikHedefSaat) * 100) : 0;
          const renkBg = yuzde >= 75 ? 'bg-green-500' : yuzde >= 40 ? 'bg-amber-400' : 'bg-rose-400';
          return (
            <div>
              <SectionTitle icon={Target}>Bu Hafta</SectionTitle>
              <div className="mt-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl">
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <div className="text-purple-200 text-xs uppercase tracking-wider">Hedefin</div>
                    <div className="text-white font-light text-2xl mt-0.5">{haftalikHedefRaw}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-200 text-xs uppercase tracking-wider">Gerçekleşen</div>
                    <div className={`font-light text-2xl mt-0.5 ${yuzde >= 75 ? 'text-green-300' : yuzde >= 40 ? 'text-amber-300' : 'text-rose-300'}`}>
                      {gercekSaat.toFixed(1)} saat
                    </div>
                  </div>
                </div>
                <div className="h-2.5 bg-black/30 rounded-full overflow-hidden">
                  <div className={`h-full ${renkBg} transition-all duration-500 shadow-lg`} style={{ width: `${yuzde}%` }} />
                </div>
                <p className="text-purple-200/70 text-xs mt-2 text-center">
                  {yuzde >= 100 ? '🎉 Hedefi aştın!' : yuzde >= 75 ? '🔥 Çok yakın, devam!' : yuzde >= 40 ? '💪 Yolundasın' : yuzde > 0 ? '⏱️ Başlangıç iyi, hızlan' : '🚀 Bu hafta hiç izlemedin'}
                </p>
              </div>
            </div>
          );
        })()}

        {/* ═══ ROZETLERİM ═══ */}
        {rozetler.kazanilan.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={Medal}>Rozetlerim</SectionTitle>
              <span className="text-purple-300/60 text-[10px] uppercase tracking-wider font-bold">{rozetler.kazanilan.length}/{rozetler.toplam}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {rozetler.kazanilan.map(r => (
                  <div key={r.key} className="text-center group">
                    <div className="text-3xl mb-1 group-hover:scale-110 transition-transform" title={r.desc}>{r.icon}</div>
                    <div className="text-white text-[10px] font-bold truncate">{r.label}</div>
                  </div>
                ))}
              </div>
              {/* Kazanılmamış (sıradaki) — kilitli */}
              {rozetler.kazanilmamis.length > 0 && (
                <>
                  <div className="text-purple-300/60 text-[10px] uppercase tracking-[0.15em] font-bold mt-5 mb-3">Sıradaki</div>
                  <div className="grid grid-cols-3 gap-3">
                    {rozetler.kazanilmamis.map(r => (
                      <div key={r.key} className="text-center opacity-40 hover:opacity-70 transition-opacity">
                        <div className="text-2xl mb-1 grayscale">{r.icon}</div>
                        <div className="text-purple-200/80 text-[10px] font-semibold truncate">{r.label}</div>
                        <div className="text-purple-300/50 text-[9px] mt-0.5 line-clamp-1">{r.desc}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ EKİBİM CTA ═══ */}
        {profilVerisi?.amareId && (
          <div className="stagger-fade" style={{ animationDelay: '350ms' }}>
            <button onClick={() => navigate('/ekibim')}
              className="w-full bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-500/20 backdrop-blur-md border border-emerald-300/40 hover:border-emerald-300/70 rounded-2xl p-5 shadow-xl transition group spring-tap text-left flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-base">Ekibimi Gör</div>
                <div className="text-emerald-200/80 text-xs mt-0.5">Altındaki üyelerin progress, risk ve aktivite özeti</div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:translate-x-1 transition" />
            </button>
          </div>
        )}

        {/* ═══ AI ASİSTAN KARTLARI (onboarding sayfasından taşındı) ═══ */}
        {profilVerisi?.amareId && (
          <div className="stagger-fade space-y-2" style={{ animationDelay: '360ms' }}>
            <SectionTitle icon={Sparkles}>AI Asistanların</SectionTitle>

            {/* Davet Asistanı — yeşil */}
            <a href="https://davet.oneteamglobal.ai/"
              target="_blank" rel="noopener noreferrer"
              className="block w-full bg-gradient-to-br from-emerald-500/20 via-emerald-400/15 to-teal-500/20 backdrop-blur-md border border-emerald-300/40 hover:border-emerald-300/70 rounded-2xl p-5 shadow-xl transition group spring-tap mt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-400/25 border border-emerald-300/50 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-6 h-6 text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-base">One Team Yapay Zeka Davet Asistanı</div>
                  <div className="text-emerald-200/80 text-xs mt-0.5">Kilidi açıldı — hemen başla</div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:translate-x-1 transition" />
              </div>
            </a>

            {/* AI Asistan — mor */}
            <a href="https://asistan.oneteamglobal.ai"
              target="_blank" rel="noopener noreferrer"
              className="block w-full bg-gradient-to-br from-purple-500/20 via-violet-400/15 to-indigo-500/20 backdrop-blur-md border border-purple-300/40 hover:border-purple-300/70 rounded-2xl p-5 shadow-xl transition group spring-tap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-400/25 border border-purple-300/50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-purple-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-base">One Team Yapay Zeka Asistanı</div>
                  <div className="text-purple-200/80 text-xs mt-0.5">7/24 AI koçun — hemen sor</div>
                </div>
                <ChevronRight className="w-5 h-5 text-purple-300 group-hover:translate-x-1 transition" />
              </div>
            </a>
          </div>
        )}

        {/* ═══ BAĞLANTILAR (sponsor) ═══ */}
        {sponsorAd && (
          <div id="section-baglantilar" className="stagger-fade" style={{ animationDelay: '400ms' }}>
            <SectionTitle icon={Users}>Bağlantılar</SectionTitle>
            <div className="mt-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl">
              <div className="text-purple-200/70 text-[10px] uppercase tracking-[0.15em] font-bold mb-3">Sponsorum</div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-lg">
                    {(sponsorAd || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-bold text-sm truncate">{sponsorAd}</div>
                    <div className="text-purple-200/70 text-xs">{maskPhone(sponsorTel) || 'Telefon yok'}</div>
                  </div>
                </div>
                {sponsorWa && (
                  <button onClick={() => setWaModalAcik(true)}
                    className="bg-green-500 hover:bg-green-400 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-lg spring-tap">
                    <MessageCircle className="w-3.5 h-3.5" /> İletişime geç
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ AKTİVİTE ═══ */}
        {(yarimKalan.length > 0 || takipSet.size > 0 || videoFav.size > 0 || hatirlatmalar.length > 0) && (
          <div id="section-aktivite" className="stagger-fade" style={{ animationDelay: '500ms' }}>
            <SectionTitle icon={Bell}>Aktivite</SectionTitle>
          </div>
        )}

        {/* Yarım kalan eğitimler (Faz 4a) */}
        {yarimKalan.length > 0 && (
          <section id="section-yarim-kalan" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl -mt-1 stagger-fade" style={{ animationDelay: '550ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4 text-amber-300" />
              <h2 className="text-white font-bold text-sm">Devam Et — Yarım Kaldı</h2>
            </div>
            <div className="space-y-2">
              {yarimKalan.map(v => (
                <button key={v.id}
                  onClick={() => navigate(`/kayitli-egitimler?v=${encodeURIComponent(v.id)}&t=${v.t}`)}
                  className="w-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-300/40 rounded-xl overflow-hidden text-left transition group flex gap-3 items-stretch spring-tap">
                  <div className="relative w-28 sm:w-32 flex-shrink-0 aspect-video bg-black/30 overflow-hidden">
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt={v.baslik} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Video className="w-6 h-6 text-white/30" /></div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                      <div className="w-9 h-9 rounded-full bg-amber-400/95 group-hover:bg-amber-300 flex items-center justify-center transition opacity-0 group-hover:opacity-100"><Video className="w-4 h-4 text-purple-900" /></div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                      <div className="h-full bg-amber-400" style={{ width: `${v.pct}%` }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-2 pr-2">
                    <div className="text-white text-xs font-bold line-clamp-2">{v.baslik}</div>
                    {v.egitmenAdlari?.[0] && <div className="text-purple-200/70 text-[10px] mt-0.5 truncate">{v.egitmenAdlari[0]}</div>}
                    <div className="text-amber-300 text-[10px] font-bold mt-1">%{v.pct} izlendi</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Favorilerim */}
        <section id="section-favoriler" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl -mt-1 stagger-fade" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-pink-400" />
            <h2 className="text-white font-bold text-sm">Favorilerim</h2>
          </div>

          {/* Takip eğitmenleri */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-200 text-sm">Takip ettiğim eğitmenler</span>
              <span className="text-white font-bold text-sm">{takipSet.size}</span>
            </div>
            {takipSet.size > 0 ? (
              <button onClick={() => navigate('/konusmacilar?fav=1')}
                className="w-full bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl px-3 py-2 text-purple-100 text-sm font-semibold flex items-center justify-between transition spring-tap">
                <span>Tümünü gör</span> <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-purple-300/60 text-xs italic">Henüz takip ettiğin eğitmen yok</p>
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
                      className="bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg overflow-hidden text-left transition group spring-tap">
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
                    className="w-full bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl px-3 py-2 text-purple-100 text-xs font-semibold flex items-center justify-between transition spring-tap">
                    <span>Tüm {videoFav.size} favoriyi gör</span> <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : videoFav.size > 0 ? (
              <button onClick={() => navigate('/kayitli-egitimler?fav=1')}
                className="w-full bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl px-3 py-2 text-purple-100 text-sm font-semibold flex items-center justify-between transition spring-tap">
                <span>Tümünü gör</span> <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-purple-300/60 text-xs italic">Henüz favori eğitimin yok</p>
            )}
          </div>
        </section>

        {/* Abonelikler + hatırlatmalar */}
        <section id="section-abonelikler" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl -mt-1 stagger-fade" style={{ animationDelay: '650ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-blue-300" />
            <h2 className="text-white font-bold text-sm">Abonelikler & Hatırlatmalar</h2>
          </div>

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
              <p className="text-purple-300/60 text-xs italic">Henüz hatırlatma kurmadın</p>
            ) : (
              <div className="space-y-1.5">
                {hatirlatmalar.slice(0, 5).map(h => (
                  <div key={h.id} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs">
                    <div className="text-white font-semibold truncate">{h.egitimAdi || h.title || 'Eğitim'}</div>
                    <div className="text-purple-200/70 mt-0.5">
                      {h.zaman ? new Date(h.zaman).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      {h.tip && <span className="ml-2 text-purple-300/60">• {h.tip}</span>}
                    </div>
                  </div>
                ))}
                {hatirlatmalar.length > 5 && (
                  <p className="text-purple-300/60 text-xs text-center mt-2">+{hatirlatmalar.length - 5} daha</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ═══ EĞİTMEN BAŞVURUSU CTA — alttaki son kart ═══ */}
        <section className="bg-gradient-to-br from-amber-400/15 via-purple-600/10 to-amber-400/15 backdrop-blur-md border border-amber-300/30 rounded-2xl p-5 shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-400/20 border border-amber-300/40 mb-3">
            <Users className="w-6 h-6 text-amber-300" />
          </div>
          <h3 className="text-white font-bold text-base mb-1">Eğitmen olmak ister misin?</h3>
          <p className="text-purple-200 text-xs mb-4 leading-relaxed">
            Bilgi birikimini paylaş, eğitim takvimimizde yer al.
          </p>
          <button onClick={() => navigate('/egitmen-basvuru')}
            className="bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold px-6 py-2.5 rounded-xl text-sm shadow-lg spring-tap inline-flex items-center gap-2">
            Başvur <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      </div>

      {/* iPhone home indicator için ekstra padding */}
      <div className="pb-[env(safe-area-inset-bottom)]" />

      <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />
      {bultenModalAcik && <BultenModal onClose={handleBultenClose} />}

      {/* Seri açıklama modal */}
      {streakAciklamaAcik && (
        <SimpleModal onClose={() => setStreakAciklamaAcik(false)} title="Günlük Serin 🔥">
          <div className="text-center py-4">
            <Flame className="w-16 h-16 text-orange-400 mx-auto mb-3" fill="#fb923c" />
            <div className="text-white text-3xl font-light mb-1">{streak.current} gün</div>
            <p className="text-purple-200 text-sm">Üst üste site açtın</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-purple-300/70 text-[10px] uppercase">Rekor</div>
                <div className="text-amber-300 font-bold text-lg">{streak.longest} gün</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-purple-300/70 text-[10px] uppercase">Toplam Giriş</div>
                <div className="text-white font-bold text-lg">{streak.total} gün</div>
              </div>
            </div>
            <p className="text-purple-200/80 text-xs mt-5 leading-relaxed">
              Her gün giriş yaparak serini büyütebilirsin. 1 gün atlarsan sıfırlanır 😔
              {streak.current >= 7 && (<><br/><span className="text-amber-300 font-semibold">⚡ Disiplin rozeti kazandın!</span></>)}
            </p>
          </div>
        </SimpleModal>
      )}

      {/* Sponsor WhatsApp template modal */}
      {waModalAcik && sponsorWa && (
        <SimpleModal onClose={() => setWaModalAcik(false)} title={`${sponsorAd}'a Mesaj Yaz`}>
          <div className="space-y-2 mt-2">
            <p className="text-purple-200 text-sm mb-4">Hızlı bir başlangıç için bir şablon seç:</p>
            {[
              { ikon: '👋', baslik: 'Merhaba', mesaj: `Merhaba ${sponsorAd?.split(' ')[0] || ''}, nasılsın? Sana selam etmek istedim.` },
              { ikon: '📞', baslik: 'Görüşme İste', mesaj: `Merhaba ${sponsorAd?.split(' ')[0] || ''}, müsait olduğun bir zaman görüşmek isterim. Ne zaman uygun olursun?` },
              { ikon: '❓', baslik: 'Soru Sor', mesaj: `Merhaba ${sponsorAd?.split(' ')[0] || ''}, eğitimle ilgili bir sorum var. Konuşmak için müsait misin?` },
              { ikon: '🎓', baslik: 'Eğitim Önerisi', mesaj: `Merhaba ${sponsorAd?.split(' ')[0] || ''}, başlamam için hangi eğitimleri önerirsin?` },
              { ikon: '✍️', baslik: 'Boş Mesaj', mesaj: '' },
            ].map(t => (
              <a key={t.baslik}
                href={`https://wa.me/${sponsorWa}${t.mesaj ? '?text=' + encodeURIComponent(t.mesaj) : ''}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => setWaModalAcik(false)}
                className="block bg-white/5 hover:bg-white/15 border border-white/10 hover:border-green-400/40 rounded-xl px-4 py-3 transition spring-tap">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.ikon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm">{t.baslik}</div>
                    {t.mesaj && <div className="text-purple-200/70 text-xs mt-0.5 line-clamp-2">"{t.mesaj}"</div>}
                  </div>
                  <MessageCircle className="w-4 h-4 text-green-400" />
                </div>
              </a>
            ))}
          </div>
        </SimpleModal>
      )}

      {/* Yıllık Wrapped kartı modal */}
      {wrappedAcik && (
        <WrappedKart
          onClose={() => setWrappedAcik(false)}
          fullName={fullName}
          rank={a?.rank}
          totalWatched={totalWatched}
          completedCount={completedCount}
          favCount={takipSet.size + videoFav.size}
          streakLongest={streak.longest}
          uyelikYil={profilVerisi?.uyelikSuresi?.yil || 0}
        />
      )}
    </div>
  );
};

// Helpers — Amare brand: purple/glass + amber accent
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
    <Icon className="w-4 h-4 text-amber-300/80 flex-shrink-0" />
    <span className="text-purple-200/80 text-xs flex-shrink-0">{label}</span>
    <span className="text-white font-semibold text-sm truncate ml-auto">{value}</span>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
    <div className="text-purple-300/70 text-[10px] uppercase tracking-wider">{label}</div>
    <div className="text-white font-bold text-sm mt-0.5">{value}</div>
  </div>
);

// Count-up'lı + tıklanabilir StatCell (scroll anchor için)
const StatCell = ({ label, value, highlight = false, scrollToId = null, delay = 0, suffix = '', tooltip = null }) => {
  const numValue = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10) || 0;
  const isNumeric = typeof value === 'number' || /^\d+/.test(String(value));
  const animated = useCountUp(isNumeric ? numValue : 0, { duration: 900, delay });

  const handleClick = () => {
    if (!scrollToId) return;
    const el = document.getElementById(scrollToId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <button
      type="button"
      onClick={scrollToId ? handleClick : undefined}
      disabled={!scrollToId}
      title={tooltip || label}
      aria-label={tooltip ? `${label}: ${tooltip}` : label}
      className={`group text-center px-1.5 sm:px-2 py-3 sm:py-4 transition-all ${scrollToId ? 'hover:bg-white/5 cursor-pointer active:scale-95' : 'cursor-default'}`}
    >
      <div className={`font-light leading-none tracking-tight tabular-nums ${highlight ? 'text-amber-300' : 'text-white'}`}>
        {isNumeric ? (
          <>
            <span className="text-xl sm:text-2xl">{animated}</span>
            {suffix && <span className="text-[10px] sm:text-xs ml-0.5 opacity-70">{suffix}</span>}
          </>
        ) : (
          <span className="text-xl sm:text-2xl">{value}</span>
        )}
      </div>
      <div className={`text-[9px] sm:text-[10px] uppercase tracking-[0.08em] sm:tracking-[0.1em] mt-1.5 sm:mt-2 font-semibold ${highlight ? 'text-amber-300' : 'text-amber-300/60'} line-clamp-1`}>
        {label}
      </div>
    </button>
  );
};

const SectionTitle = ({ children, icon: Icon }) => (
  <div className="flex items-center gap-2.5">
    {Icon && <Icon className="w-3 h-3 text-amber-300" />}
    <h3 className="text-amber-300 text-[11px] font-bold uppercase tracking-[0.25em]">{children}</h3>
    <div className="flex-1 h-px bg-gradient-to-r from-amber-300/30 to-transparent" />
  </div>
);

// Brand uyumlu basit modal — overlay + glass kart
// Mobile uyumu: iOS Safari'de scroll çalışsın diye max-h + overflow-y-auto
const SimpleModal = ({ onClose, title, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
    <div className="bg-gradient-to-br from-purple-900 to-indigo-900 border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-6 relative my-auto max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition z-10">
        <X className="w-4 h-4" />
      </button>
      {title && <h3 className="text-white text-lg font-bold mb-2 pr-8">{title}</h3>}
      {children}
    </div>
  </div>
);

// Yıllık Wrapped paylaşılabilir kart — Spotify Wrapped tarzı
const WrappedKart = ({ onClose, fullName, rank, totalWatched, completedCount, favCount, streakLongest, uyelikYil }) => {
  const yil = new Date().getFullYear();
  const saat = Math.floor(totalWatched / 3600);

  const handleShare = async () => {
    const text = `🎉 ${yil} One Team Yıllık Özetim\n\n${fullName}\n${rank || ''}\n\n⏱️ ${saat} saat eğitim\n📚 ${completedCount} eğitim tamamlandı\n❤️ ${favCount} favori\n🔥 ${streakLongest} gün rekor seri\n💎 ${uyelikYil}+ yıl üye\n\negitimtakvimi.oneteamglobal.ai`;
    if (navigator.share) {
      try { await navigator.share({ title: 'One Team Yıllık Özetim', text }); }
      catch {}
    } else {
      navigator.clipboard.writeText(text);
      alert('Panoya kopyalandı!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 rounded-3xl shadow-2xl w-full max-w-sm p-6 sm:p-8 relative overflow-hidden text-center my-auto max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition z-10">
          <X className="w-4 h-4" />
        </button>
        {/* Bg deko */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative">
          <div className="text-white/80 text-xs uppercase tracking-[0.3em] font-bold mb-1">{yil}</div>
          <h2 className="text-white text-3xl font-extrabold mb-1">One Team</h2>
          <div className="text-white/90 text-2xl font-light italic mb-6">Yıllık Özetim</div>

          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 space-y-3 text-left mb-5">
            <div className="flex items-center justify-between border-b border-white/20 pb-2">
              <div>
                <div className="text-white font-bold text-base">{fullName}</div>
                {rank && <div className="text-white/80 text-xs uppercase tracking-wider">{rank}</div>}
              </div>
              <Trophy className="w-6 h-6 text-white/80" />
            </div>
            <WrappedRow label="Toplam Saat" value={`${saat}h`} />
            <WrappedRow label="Tamamlanan Eğitim" value={completedCount} />
            <WrappedRow label="Favori" value={favCount} />
            <WrappedRow label="Rekor Seri" value={`${streakLongest} gün`} />
            <WrappedRow label="Üyelik" value={`${uyelikYil}+ yıl`} />
          </div>

          <button onClick={handleShare}
            className="w-full bg-white hover:bg-white/95 text-orange-700 font-bold py-3 rounded-xl shadow-xl spring-tap inline-flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" /> Paylaş
          </button>
          <p className="text-white/70 text-[10px] mt-3 tracking-wider">egitimtakvimi.oneteamglobal.ai</p>
        </div>
      </div>
    </div>
  );
};

const WrappedRow = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-white/80 text-sm">{label}</span>
    <span className="text-white font-bold text-base">{value}</span>
  </div>
);

const AbonelikChip = ({ aktif, label, onClick, actionLabel, busy = false }) => (
  <button onClick={onClick} disabled={busy}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition spring-tap ${
      aktif
        ? 'bg-green-400/15 border border-green-300/30 text-green-100 hover:bg-green-400/25'
        : 'bg-white/5 border border-white/10 text-purple-200 hover:bg-white/10'
    } ${busy ? 'opacity-50 cursor-wait' : ''}`}>
    <span className="text-sm font-medium flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${aktif ? 'bg-green-400' : 'bg-purple-400/40'}`} />
      {label}
    </span>
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${
      aktif ? 'bg-white/15 text-green-200' : 'bg-amber-400/20 text-amber-200'
    }`}>
      {busy ? '...' : actionLabel}
    </span>
  </button>
);

export default Profil;
