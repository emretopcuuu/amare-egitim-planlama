// /profil — Eğitim sayfası. Tek scroll, sekme yok.
//
// 2026-10-23 SADELEŞTİRME: sayfa artık yalnız eğitimle ilgili.
// Kaldırılanlar ve nedenleri:
//  - XP / seviye / günlük seri / rozet / haftalık görev / kolektif hedef:
//    oyunlaştırma katmanı. Eğitim takvimine giren iş ortağı burada "kaçıncı
//    seviyedeyim" değil "nerede kaldım" sorusunun cevabını arıyor.
//  - Amare üyelik bilgileri (telefon/e-posta/Amare ID/kayıt tarihi), Marka
//    Ortaklığı süresi, rütbe rozeti, yıldönümü, Ekibim, Sponsorum: bu veriler
//    One Team uygulamasından yönetiliyor, takvim onları göstermiyor.
//    YAN ETKİ: "Amare ID bağlı değil" ve "Profil verisi yüklenemedi" hata
//    kutuları da kalktı — kaynakları bu bağımlılıktı.
//  - Hakkımda / bio / onboarding cevapları / tanıtım editörü, Günün İlhamı,
//    Bana Özel Aha, Yıllık Özet kartı, "Eğitmen olmak ister misin" CTA'sı.
//  - Onboarding zorunlu kapısı: oneteamglobal.ai onboarding'ini bitirmeyen
//    kişi eskiden kendi izleme geçmişini DE göremiyordu. Eğitim sayfasını
//    Amare hunisine kilitlemenin anlamı yok.
//
// Kalan: eğitim yolu (rütbeye göre müfredat), yarım kalan videolar,
// favoriler, izleme istatistiği, hatırlatmalar + abonelikler.
//
// NOT: profil-veri çağrısı kaldı ama tek şey için — kullanıcının rütbesi,
// çünkü "Eğitim Yolum" müfredatı ona göre diziliyor. Çağrı düşerse sayfa
// hata göstermez, yalnız o blok görünmez. Kaldırılan bileşenler
// (XPHalka/XPBar/HaftalikGorevler/KolektifHedef/BugununIlhami/BanaOzelAha)
// dosya olarak duruyor; geri istenirse yerinde.

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, LogIn, LogOut, Heart, Video, Bell, Clock, ChevronRight,
  Loader2, RefreshCw, Trophy, RotateCw, PlayCircle, GraduationCap,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import UyeGirisModal from '../components/UyeGirisModal';
import EgitmenAnalyticsKart from '../components/EgitmenAnalyticsKart';
import { useDocumentTitle } from '../utils/useDocumentTitle';
import ProfilAvatar from '../components/ProfilAvatar';
import { egitmenFotosuBul } from '../utils/egitmenFotoMatch';
import { useTakipEgitmenler } from '../utils/takip';
import { useWatchProgress, getTotalWatchedSeconds, getCompletedCount } from '../utils/watchProgress';
import { useCountUp } from '../utils/useCountUp';
import { usePullToRefresh } from '../utils/usePullToRefresh';
import { webPushDestekli, webPushIzinDurumu, webPushKaydolu, webPushIptal } from '../utils/webPush';
import BultenModal from '../components/BultenModal';
import EgitimYolumBlok from '../components/EgitimYolumBlok';

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

// İzleme süresini insan diline çevir: 1 saatin altında dakika göster, yoksa
// 40 dakika izlemiş yeni kullanıcı ekranda "0 sa" görüyor.
function izlemeGoster(saniye) {
  if (!saniye || saniye < 60) return { value: 0, suffix: 'dk' };
  if (saniye < 3600) return { value: Math.floor(saniye / 60), suffix: 'dk' };
  return { value: Math.floor(saniye / 3600), suffix: 'sa' };
}

const Profil = () => {
  useDocumentTitle('Eğitimlerim', 'Eğitim yolun, yarım kalan videolar, favorilerin ve hatırlatmaların');
  const navigate = useNavigate();
  // Geri butonu daima ana takvime — navigate(-1) bazen yanlış sayfaya gidiyordu.
  const geri = () => navigate('/takvim');
  const { toast } = useToast();
  const { currentUser, uid, isAnonymous, isAuthenticated, displayName, email, ready } = useAuth();
  const { konusmacilar } = useData();
  const { takipSet } = useTakipEgitmenler();
  const watchProgress = useWatchProgress();

  // URL'de ?giris=1 varsa modal otomatik açılsın (davet linkleri için)
  const [girisModalAcik, setGirisModalAcik] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('giris') === '1';
  });
  const [profilVerisi, setProfilVerisi] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [userDoc, setUserDoc] = useState(null);
  const [abonelikler, setAbonelikler] = useState({ bulten: false, bultenDocId: null, push: false, takip: 0 });
  const [bultenModalAcik, setBultenModalAcik] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [hatirlatmalar, setHatirlatmalar] = useState([]);
  const [videoFav, setVideoFav] = useState(new Set());
  const [yarimKalan, setYarimKalan] = useState([]);     // [{id, pct, t, baslik, thumbnailUrl}]
  const [favVideoMeta, setFavVideoMeta] = useState([]); // [{id, baslik, thumbnailUrl, egitmenAdlari}]

  // İzleme istatistikleri (watchProgress.version değişince yeniden hesaplanır)
  const totalWatched = useMemo(() => getTotalWatchedSeconds(), [watchProgress.version]);
  const completedCount = useMemo(() => getCompletedCount(), [watchProgress.version]);

  // Pull-to-refresh callback'i ref'te tut — fetch tanımı sonradan
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

  // Yarım kalan eğitimler + favori video meta'sı
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

  // Profil-veri çağrısı — SADECE rütbe için (Eğitim Yolum müfredatı).
  // Düşerse sessiz: kullanıcıya hata kutusu gösterilmez, o blok görünmez.
  const profilVerisiFetch = async (force = false) => {
    if (!currentUser || isAnonymous) return;
    const amareId = userDoc?.amareId;
    if (!amareId) return;

    if (!force) {
      const cached = loadProfilCache(amareId);
      if (cached) { setProfilVerisi(cached); return; }
    }

    setYukleniyor(true);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/profil-veri', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn('[profil] profil-veri:', data.error || res.status);
        return;
      }
      setProfilVerisi(data);
      saveProfilCache(amareId, data);
    } catch (err) {
      console.warn('[profil] profil-veri fetch:', err.message);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => { fetchRef.current = profilVerisiFetch; });

  useEffect(() => {
    if (userDoc?.amareId) profilVerisiFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc?.amareId]);

  // Bülten + hatırlatmalar — abonelik-durumu.mjs üzerinden (admin SDK).
  // Client SDK ile doğrudan okumak "Missing or insufficient permissions" veriyordu
  // (bulten_aboneleri/hatirlatmalar rules'ı admin-only, spam koruması).
  useEffect(() => {
    if (!email || !currentUser) return;
    (async () => {
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch('/.netlify/functions/abonelik-durumu', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error(`abonelik-durumu ${res.status}`);
        const data = await res.json();
        const pushIzin = webPushDestekli() && webPushIzinDurumu() === 'granted';
        setAbonelikler({
          bulten: !!data.bulten?.abone,
          bultenDocId: data.bulten?.docId || null,
          push: pushIzin,
          takip: takipSet.size,
        });
        setHatirlatmalar(data.hatirlatmalar || []);
      } catch (e) {
        console.warn('[profil] abonelik fetch:', e.message);
      }
    })();
  }, [email, currentUser, takipSet.size]);

  const toggleBulten = async () => {
    if (abonelikler.bulten) {
      if (!window.confirm('Haftalık bülten aboneliğini iptal etmek istediğinden emin misin?')) return;
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch('/.netlify/functions/abonelik-durumu?action=bulten-iptal', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error(`bulten-iptal ${res.status}`);
        setAbonelikler(prev => ({ ...prev, bulten: false, bultenDocId: null }));
      } catch (e) {
        toast('Aboneliği kapatamadık, tekrar dener misin?', { type: 'error' });
      }
    } else {
      setBultenModalAcik(true);
    }
  };

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
      toast(e.message || 'Bir terslik var, biraz sonra dene', { type: 'error' });
    } finally {
      setPushBusy(false);
    }
  };

  const handleBultenClose = () => {
    setBultenModalAcik(false);
    if (email && currentUser) {
      currentUser.getIdToken()
        .then(idToken => fetch('/.netlify/functions/abonelik-durumu', {
          headers: { Authorization: `Bearer ${idToken}` },
        }))
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data) return;
          setAbonelikler(prev => ({ ...prev, bulten: !!data.bulten?.abone, bultenDocId: data.bulten?.docId || null }));
        })
        .catch(() => {});
    }
  };

  // ─── Hook'lar early return'lerden ÖNCE bitmeli ───
  const fullName = profilVerisi?.amare?.full_name || profilVerisi?.member?.full_name || userDoc?.displayName || displayName || '';
  const userFoto = userDoc?.fotoURL || null;
  const egitmenFoto = useMemo(() => egitmenFotosuBul(fullName, konusmacilar), [fullName, konusmacilar]);
  const finalFoto = userFoto || egitmenFoto || null;
  const izleme = useMemo(() => izlemeGoster(totalWatched), [totalWatched]);

  // ─── Conditional render'lar ───

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
          <button onClick={geri} className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Geri
          </button>
        </div>
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-9 h-9 text-amber-300" />
            </div>
            <h1 className="text-2xl font-light text-white mb-2 tracking-tight">Eğitimlerin burada</h1>
            <p className="text-purple-200 text-sm mb-8 leading-relaxed">
              Giriş yap: eğitim yolun, yarım kalan videolar, favorilerin ve kurduğun hatırlatmalar tek sayfada.
            </p>
            <button onClick={() => setGirisModalAcik(true)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3.5 rounded-xl shadow-lg spring-tap inline-flex items-center justify-center gap-2 mb-3">
              <LogIn className="w-5 h-5" /> Marka Ortağı Girişi Yap
            </button>
            <p className="text-purple-300/70 text-xs mt-4">
              Henüz Amare Marka Ortağı değilsen <a href="https://oneteamglobal.ai" className="text-amber-300 hover:text-amber-200 underline font-semibold">oneteamglobal.ai</a>
            </p>
          </div>
        </div>
        <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />
      </div>
    );
  }

  const rank = profilVerisi?.amare?.rank;
  // Hiç eğitim izi var mı? Yoksa boş durum + çıkış yolu göster.
  const hicIzYok = yarimKalan.length === 0 && videoFav.size === 0 && takipSet.size === 0 && totalWatched < 60;

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

      {/* Header */}
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 pt-6">
        <button onClick={geri} className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Geri
        </button>
        <div className="flex items-center gap-2">
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

      {/* HERO — avatar + ad. Rütbe rozeti, XP halkası, seviye ve seri kalktı. */}
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-7 text-center">
        <ProfilAvatar uid={uid} fullName={fullName} fotoURL={finalFoto} size="xl" editable={true} />
        <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          {fullName || 'Eğitimlerim'}
        </h1>
        <p className="mt-1.5 text-purple-200 text-sm">Eğitim yolculuğun</p>
      </div>

      {/* İZLEME ÖZETİ — 3 sayı, hepsi eğitim. XP ve rozet sayacı kalktı. */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl grid grid-cols-3 divide-x divide-white/10 shadow-xl overflow-hidden">
          <StatCell label="İzleme" value={izleme.value} suffix={izleme.suffix}
            highlight={totalWatched > 0} delay={0}
            tooltip="Toplam izlediğin eğitim süresi" />
          <StatCell label="Tamamlanan" value={completedCount} delay={100}
            highlight={completedCount > 0}
            tooltip="Sonuna kadar izlediğin eğitim sayısı"
            scrollToId="section-favoriler" />
          <StatCell label="Favori" value={videoFav.size + takipSet.size} delay={200}
            tooltip="Favori eğitimler + takip ettiğin eğitmenler"
            scrollToId="section-favoriler" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">

        {/* ═══ BOŞ DURUM — hiç eğitim izi yoksa çıkış yolu ver ═══ */}
        {hicIzYok && (
          <section className="bg-gradient-to-br from-amber-400/15 via-purple-600/10 to-amber-400/15 backdrop-blur-md border border-amber-300/30 rounded-2xl p-5 shadow-xl text-center stagger-fade" >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-400/20 border border-amber-300/40 mb-3">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
            <h3 className="text-white font-bold text-base mb-1">Henüz başlamadın</h3>
            <p className="text-purple-200 text-xs mb-4 leading-relaxed">
              İlk eğitimini izle; nerede kaldığın, favorilerin ve ilerlemen bu sayfada birikir.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => navigate('/kayitli-egitimler')}
                className="bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg spring-tap inline-flex items-center gap-2">
                Kayıtlı eğitimler <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/takvim')}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-2.5 rounded-xl text-sm spring-tap inline-flex items-center gap-2">
                Yaklaşan eğitimler
              </button>
            </div>
          </section>
        )}

        {/* ═══ EĞİTİM YOLUM — rütbeye göre müfredat ═══ */}
        {rank ? (
          <div id="section-egitim-yolum" className="stagger-fade">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle icon={Trophy}>Eğitim Yolum</SectionTitle>
              <span className="text-purple-300/60 text-[10px] uppercase tracking-wider font-bold">Sana Özel</span>
            </div>
            <EgitimYolumBlok uid={uid} isAnonymous={isAnonymous} kullaniciRankString={rank} />
          </div>
        ) : yukleniyor ? (
          <div className="rounded-2xl border border-white/10 skeleton-shimmer" style={{ height: '180px' }} />
        ) : null}

        {/* ═══ DEVAM ET — YARIM KALDI ═══ */}
        {yarimKalan.length > 0 && (
          <section id="section-yarim-kalan" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl stagger-fade" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <PlayCircle className="w-4 h-4 text-amber-300" />
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

        {/* ═══ FAVORİLERİM ═══ */}
        <section id="section-favoriler" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl stagger-fade" style={{ animationDelay: '150ms' }}>
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
              <button onClick={() => navigate('/konusmacilar')}
                className="w-full bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl px-3 py-2 text-purple-200 text-xs font-semibold flex items-center justify-between transition spring-tap">
                <span>Henüz takip ettiğin eğitmen yok — eğitmenlere bak</span> <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Video favorileri */}
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
              <button onClick={() => navigate('/kayitli-egitimler')}
                className="w-full bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl px-3 py-2 text-purple-200 text-xs font-semibold flex items-center justify-between transition spring-tap">
                <span>Henüz favori eğitimin yok — kayıtlı eğitimlere bak</span> <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* ═══ EĞİTMEN ANALİTİĞİ — yalnız eğitmen hesapları ═══ */}
        {userDoc?.egitmenCoreId && (
          <div className="stagger-fade" style={{ animationDelay: '200ms' }}>
            <EgitmenAnalyticsKart coreId={userDoc.egitmenCoreId} />
          </div>
        )}

        {/* ═══ ABONELİKLER + HATIRLATMALAR ═══ */}
        <section id="section-abonelikler" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl stagger-fade" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-blue-300" />
            <h2 className="text-white font-bold text-sm">Abonelikler & Hatırlatmalar</h2>
          </div>

          <div className="space-y-2 mb-4">
            <AbonelikChip aktif={abonelikler.bulten} label="Haftalık bülten" onClick={toggleBulten}
              actionLabel={abonelikler.bulten ? 'İptal' : 'Abone ol'} />
            <AbonelikChip aktif={abonelikler.push} label="Web push bildirimi" onClick={togglePush}
              busy={pushBusy}
              actionLabel={abonelikler.push ? 'Kapat' : 'Aç'} />
            <AbonelikChip aktif={abonelikler.takip > 0} label={`Eğitmen takip (${abonelikler.takip})`} onClick={() => navigate('/konusmacilar?fav=1')}
              actionLabel="Yönet" />
          </div>

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
                {hatirlatmalar
                  .slice()
                  .sort((a, b) => {
                    const ta = a.gonderilecekZaman?.seconds || 0;
                    const tb = b.gonderilecekZaman?.seconds || 0;
                    return tb - ta;
                  })
                  .slice(0, 5).map(h => {
                  let zamanStr = '';
                  if (h.tarih) {
                    zamanStr = h.tarih + (h.saat ? ' · ' + h.saat : '');
                  } else if (h.gonderilecekZaman?.seconds) {
                    zamanStr = new Date(h.gonderilecekZaman.seconds * 1000)
                      .toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  } else {
                    zamanStr = '—';
                  }
                  const gonderildi = h.gonderildi === true;
                  return (
                    <div key={h.id} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-white font-semibold flex-1 line-clamp-1">{h.egitimAdi || h.title || 'Eğitim'}</div>
                        {gonderildi && (
                          <span className="text-emerald-300 text-[10px] font-bold flex-shrink-0">✓ Gönderildi</span>
                        )}
                      </div>
                      <div className="text-purple-200/70 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />{zamanStr}
                        </span>
                        {h.hatirlatmaZamani && (
                          <span className="text-amber-300/80 text-[10px]">• {h.hatirlatmaZamani} öncesi</span>
                        )}
                        {h.egitmen && (
                          <span className="text-purple-300/60 text-[10px] truncate max-w-[160px]">• {h.egitmen}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {hatirlatmalar.length > 5 && (
                  <p className="text-purple-300/60 text-xs text-center mt-2">+{hatirlatmalar.length - 5} daha</p>
                )}
              </div>
            )}
          </div>
        </section>

      </div>

      {/* iPhone home indicator için ekstra padding */}
      <div className="pb-[env(safe-area-inset-bottom)]" />

      <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />
      {bultenModalAcik && <BultenModal onClose={handleBultenClose} />}
    </div>
  );
};

// Count-up'lı + tıklanabilir sayaç hücresi
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
