import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Sparkles, Newspaper, ArrowRight, Users, Hammer, X, LogIn, User, ChevronDown } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import BultenModal from '../components/BultenModal';
import UyeGirisModal from '../components/UyeGirisModal';
import LiveCounter from '../components/LiveCounter';
import YaklasanEtkinlikSerit from '../components/YaklasanEtkinlikSerit';
import { useData } from '../context/DataContext';
import { db } from '../utils/firebase';
import { doc, getDoc, collection, getCountFromServer } from 'firebase/firestore';
import { confetti } from '../components/Konfeti';

// #3 — Manyetik kart hook'u (sadece desktop, mobil mouse'u yok zaten)
function useMagnetic(strength = 0.15) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Touch device'larda atla
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
    };
    const onLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength]);
  return ref;
}

// #8 — Günün saatine göre halo rengi
function gunRengi() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return { from: 'rgba(254, 240, 199, 0.18)', main: 'rgba(251, 191, 36, 0.15)' }; // sabah açık altın
  if (h >= 12 && h < 18) return { from: 'rgba(251, 191, 36, 0.20)', main: 'rgba(245, 158, 11, 0.18)' }; // öğle klasik altın
  if (h >= 18 && h < 23) return { from: 'rgba(251, 146, 60, 0.18)', main: 'rgba(239, 68, 68, 0.12)' }; // akşam kıpkırmızı
  return { from: 'rgba(168, 85, 247, 0.18)', main: 'rgba(124, 58, 237, 0.20)' }; // gece mor
}

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, takvim, konusmacilar } = useData();
  const [bultenModal, setBultenModal] = useState(false);
  const [yapimAsamasinda, setYapimAsamasinda] = useState(false);
  const [girisModal, setGirisModal] = useState(false);
  const [profilAdi, setProfilAdi] = useState('');
  // #4 — Canlı rakam sayacı için toplamlar (default fallback değerlerle başla)
  const [istatistik, setIstatistik] = useState({
    egitmen: 26,
    eğitim: 65,
    komisyon: 11,
  });
  // #8 — Günün saatine göre halo rengi
  const [renkler] = useState(() => gunRengi());

  // #3 — Magnetic refs
  const kart1Ref = useMagnetic(0.08);
  const kart2Ref = useMagnetic(0.08);
  const kart3Ref = useMagnetic(0.08);

  // #4 — İstatistikleri güncelle (data yüklendikçe)
  // Eğitmen sayısı: konuşmacılar koleksiyonu (doğrudan kaynak)
  // Eğitim sayısı: takvim listesi
  useEffect(() => {
    setIstatistik(prev => ({
      ...prev,
      egitmen: konusmacilar?.length || prev.egitmen,
      eğitim: takvim?.length || prev.eğitim,
    }));
  }, [takvim?.length, konusmacilar?.length]);

  // Logo click — easter egg konfeti
  const logoClick = useCallback(() => {
    confetti({ count: 30, origin: { x: 0.5, y: 0.3 }, spread: 60 });
  }, []);

  // Triple click anywhere — easter egg
  useEffect(() => {
    let tikSayisi = 0;
    let tikZamanlayici = null;
    const onTik = () => {
      tikSayisi++;
      clearTimeout(tikZamanlayici);
      tikZamanlayici = setTimeout(() => { tikSayisi = 0; }, 600);
      if (tikSayisi >= 3) {
        tikSayisi = 0;
        confetti({ count: 100, origin: { x: 0.5, y: 0.5 }, spread: 120 });
      }
    };
    // Sadece ana ekran içeriğine — modal/buton tıklamalarını sayma
    document.addEventListener('dblclick', onTik);
    return () => document.removeEventListener('dblclick', onTik);
  }, []);

  // Console easter egg — developers için ASCII art
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.__oneTeamWelcomed) {
      window.__oneTeamWelcomed = true;
      const stil = 'color: #fbbf24; font-weight: bold; font-size: 14px; text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);';
      console.log('%c\n  ░█▀█░█▀█░█▀▀░░░▀█▀░█▀▀░█▀█░█▄█\n  ░█░█░█░█░█▀▀░░░░█░░█▀▀░█▀█░█░█\n  ░▀▀▀░▀░▀░▀▀▀░░░░▀░░▀▀▀░▀░▀░▀░▀\n', stil);
      console.log('%c"Sağlık, varlık ve özgürlük — herkes için."', 'color: #c4b5fd; font-style: italic; font-size: 12px;');
      console.log('%cMeraklılara: github.com/emretopcuuu/amare-egitim-planlama', 'color: #a78bfa; font-size: 11px;');
    }
  }, []);

  // Login user için profil adını çek (users/{uid}.amareId → profil cache → full_name)
  useEffect(() => {
    if (!currentUser?.uid) { setProfilAdi(''); return; }
    const currentEmail = (currentUser.email || '').toLowerCase();
    // 1. Hızlı: localStorage cache'te varsa kullan — AMA mutlaka email eşleşmeli
    // Aksi halde bu cihazda önceki giriş yapmış başka birinin ismi görünür.
    const tryLocalCache = () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('amare_profil_v1_')) {
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            // Email eşleşmesi zorunlu — yanlış kullanıcı cache'i alınmasın
            const cacheEmail = (
              parsed?.data?.amare?.email ||
              parsed?.data?.member?.email ||
              parsed?.data?.email || ''
            ).toLowerCase();
            if (!currentEmail || cacheEmail !== currentEmail) continue;
            const ad = parsed?.data?.amare?.full_name || parsed?.data?.member?.full_name;
            if (ad) return ad;
          }
        }
      } catch {}
      return null;
    };
    const cacheAd = tryLocalCache();
    if (cacheAd) {
      setProfilAdi(cacheAd);
      return;
    }
    // 2. Fallback: Firestore users/{uid}.fullName
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          const ad = data.fullName || data.ad || data.displayName;
          if (ad) {
            setProfilAdi(ad);
            return;
          }
        }
        // 3. Son çare: displayName veya email
        setProfilAdi(currentUser.displayName || currentUser.email?.split('@')[0] || 'Profilim');
      } catch {
        setProfilAdi(currentUser.displayName || currentUser.email?.split('@')[0] || 'Profilim');
      }
    })();
  }, [currentUser?.uid, currentUser?.email]);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative">
      {/* Üstte yumuşak altın aurora glow — günün saatine göre değişen renkler */}
      <div className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center top, ${renkler.from} 0%, transparent 70%)` }} />
      {/* Köşelerde dekor blur'lar */}
      <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10">
        {/* Top bar — Bülten + Marka Ortağı Girişi + Dil */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={() => setBultenModal(true)}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-purple-900 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-amber-500/30 spring-tap">
            <Newspaper className="w-4 h-4" />
            <span className="hidden sm:inline">Haftalık Bülten</span>
            <span className="sm:hidden">Bülten</span>
          </button>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <button onClick={() => navigate('/profil')}
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-purple-900 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-amber-500/30 spring-tap max-w-[200px] sm:max-w-[260px]"
                title="Profilime git">
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {profilAdi || 'Profilim'}
                </span>
              </button>
            ) : (
              <button onClick={() => setGirisModal(true)}
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-purple-900 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-amber-500/30 spring-tap">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Marka Ortağı Girişi</span>
                <span className="sm:hidden">Giriş</span>
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </div>

        {/* HERO — One Team logo merkezde, çerçevesiz transparent */}
        <div className="flex flex-col items-center pt-4 sm:pt-8 pb-8 sm:pb-12">
          <div className="relative cursor-pointer" onClick={logoClick} title="">
            {/* #1 — Sinematik logo: halo nefes alır */}
            <div className="absolute -inset-8 bg-amber-400/15 blur-3xl pointer-events-none animate-halo-breath" />
            {/* #1 — Logo sinematik intro animasyonu */}
            <img
              src="/logos/oneteam-logo.png"
              alt="One Team"
              className="relative w-64 sm:w-80 md:w-96 h-auto animate-logo-cinema"
            />
          </div>

          {/* Kicker — #2 altın akan gradient ile "Ekosistemi" */}
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3">
            <div className="h-px w-10 sm:w-16 bg-amber-400/50" />
            <span className="text-xs sm:text-sm uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              <span className="text-amber-300">Girişimcilik </span>
              <span className="text-gold-shimmer font-bold">Ekosistemi</span>
            </span>
            <div className="h-px w-10 sm:w-16 bg-amber-400/50" />
          </div>

          {/* #4 — Canlı rakam sayacı (hero'nun nefes alan satırı) */}
          <LiveCounter
            className="mt-5 sm:mt-6"
            items={[
              { deger: istatistik.egitmen, etiket: 'Eğitmen' },
              { deger: istatistik.komisyon, etiket: 'Komisyon' },
              { deger: istatistik.eğitim, etiket: 'Eğitim', sonek: '+' },
            ]}
          />

          {/* #6 — Aşağı scroll davetkar ikon (hover'da güçlenir) */}
          <div className="mt-10 sm:mt-12 mb-2 inline-flex flex-col items-center text-amber-400/60 animate-scroll-hint pointer-events-none">
            <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Action Cards — cam morfizm, brand uyumlu */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <button
            ref={kart1Ref}
            onClick={() => navigate('/takvim')}
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 hover:border-amber-300/40 rounded-3xl p-7 sm:p-8 transition-all duration-300 spring-tap text-left shadow-2xl"
            style={{ transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s, border-color 0.3s' }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-amber-300 group-hover:translate-x-1 transition-all ml-auto mt-2" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 uppercase tracking-wide">
              Eğitim Takvimi
            </h3>
            <p className="text-purple-200/80 text-sm leading-relaxed">
              Güncel eğitim takvimi
            </p>
          </button>

          <button
            ref={kart2Ref}
            onClick={() => navigate('/hakkimizda')}
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 hover:border-amber-300/40 rounded-3xl p-7 sm:p-8 transition-all duration-300 spring-tap text-left shadow-2xl"
            style={{ transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s, border-color 0.3s' }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-amber-300 group-hover:translate-x-1 transition-all ml-auto mt-2" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 uppercase tracking-wide">
              Hakkımızda
            </h3>
            <p className="text-purple-200/80 text-sm leading-relaxed">
              Misyon, vizyon, eğitmenler, komisyonlar ve liderler
            </p>
          </button>

          {/* Ekip Yönetim Paneli — yeni sayfaya yönlendiriyor */}
          <button
            ref={kart3Ref}
            onClick={() => navigate('/ekip-yonetim')}
            className="group relative bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 hover:border-amber-300/40 rounded-3xl p-7 sm:p-8 transition-all duration-300 spring-tap text-left shadow-2xl"
            style={{ transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s, border-color 0.3s' }}
          >
            {/* Yapım Aşamasında rozeti — sağ üst köşe */}
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-amber-400/90 text-purple-900 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md border border-amber-300">
              <Hammer className="w-3 h-3" />
              Yapım Aşamasında
            </span>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-amber-300 group-hover:translate-x-1 transition-all ml-auto mt-2" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 uppercase tracking-wide">
              Ekip Yönetim Paneli
            </h3>
            <p className="text-purple-200/80 text-sm leading-relaxed">
              Ekip yapısı ve saha yönetimi
            </p>
          </button>
        </div>

        {/* #9 — Yaklaşan etkinlik şeridi (footer üstü, tek satır canlı bilgi) */}
        <div className="mt-16 sm:mt-20 max-w-5xl mx-auto">
          <YaklasanEtkinlikSerit />
        </div>

        {/* Footer */}
        <div className="mt-8 sm:mt-10 text-center">
          <p className="text-purple-300/60 text-xs tracking-wider">
            {t('copyright')}
          </p>
        </div>
      </div>

      {bultenModal && <BultenModal onClose={() => setBultenModal(false)} />}
      <UyeGirisModal acik={girisModal} onClose={() => setGirisModal(false)} />

      {/* Yapım Aşamasında Modal — Ekip Yönetim Paneli için */}
      {yapimAsamasinda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setYapimAsamasinda(false)}>
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-amber-300/30 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center relative"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setYapimAsamasinda(false)}
              className="absolute top-3 right-3 text-white/50 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-300/40 mb-4">
              <Hammer className="w-8 h-8 text-amber-300" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Yapım Aşamasında
            </h3>
            <p className="text-amber-300 text-sm font-semibold tracking-wide uppercase mb-4">
              Ekip Yönetim Paneli
            </p>
            <p className="text-purple-200/70 text-sm mb-6">
              Ekip yapısı, hiyerarşi ve performans yönetim modülü yakında hazır olacak.
            </p>

            <button onClick={() => setYapimAsamasinda(false)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3 rounded-xl shadow-lg transition spring-tap">
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
