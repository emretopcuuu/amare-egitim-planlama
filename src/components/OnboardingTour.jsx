// Onboarding tour — yeni üye için 6 adımlı interaktif walkthrough
// Tetik: ilk login (anonim değil) + tur henüz görülmedi
// Storage: users/{uid}.onboardingTuruGorduk = true (Firestore)
//          ayrıca localStorage fallback (anonim → giriş yapan kullanıcı için)
//
// Tasarım: brand'li mor cam modal, spotlight yerine ekranı dim + tooltip

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X, ChevronRight, ChevronLeft, Sparkles, Calendar, Video, UserCircle, Users, Trophy, Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'amare_onboarding_tur';

const ADIMLAR = [
  {
    icon: Sparkles,
    renk: 'amber',
    baslik: 'Hoş geldin! 👋',
    ozet: 'One Team Eğitim Sistemine başla',
    metin: 'Tüm canlı eğitimler, 900+ kayıtlı video ve kişisel kariyer yolun tek yerde. Şimdi sana hızlı bir tur yapacağız — 30 saniye sürer.',
    btnEtiket: 'Hadi başla',
  },
  {
    icon: Calendar,
    renk: 'sky',
    baslik: 'Eğitim Takvimi',
    ozet: 'Canlı eğitimleri keşfet',
    metin: 'Bu hafta katılabileceğin canlı Zoom eğitimleri burada. Her eğitime "Hatırlat" butonu ile kayıt olabilir, takvime ekleyebilirsin.',
    cta: { label: 'Takvimi aç', path: '/takvim' },
  },
  {
    icon: Video,
    renk: 'purple',
    baslik: 'Kayıtlı Eğitimler',
    ozet: '900+ video kütüphanesi',
    metin: 'Tüm geçmiş eğitimler, 14 farklı kategoriye AI ile etiketlenmiş. Yıldız oyla, yer imi koy, mini quiz çöz, yorum yap.',
    cta: { label: 'Kütüphaneyi aç', path: '/kayitli-egitimler' },
  },
  {
    icon: Award,
    renk: 'emerald',
    baslik: 'Eğitim Yolun',
    ozet: 'Kariyere özel curriculum',
    metin: 'Profilinde rank\'ına özel 3 zorunlu + öneri video bekliyor. Tamamladıkça otomatik bir sonraki rank açılır. Streak, rozet, hatırlatma — hepsi takipte.',
    cta: { label: 'Profilime git', path: '/profil' },
  },
  {
    icon: Users,
    renk: 'rose',
    baslik: 'Ekibim',
    ozet: 'Sponsor isen kontrol paneli',
    metin: 'Altındaki üyelerin curriculum yüzdesi, son aktivitesi, risk durumu. Toplu davet, AI sponsor asistanı, lider karnesi tek ekranda.',
    cta: { label: 'Ekibimi gör', path: '/ekibim' },
  },
  {
    icon: Trophy,
    renk: 'amber',
    baslik: 'Hazırsın! 🚀',
    ozet: 'İlk eğitimi izlemeye başla',
    metin: 'Telefonuna ana ekran kısayolu eklersen tek tık açar. Bildirimleri açarsan yeni eğitim/yeni rank anında haberdar olursun. Bol başarılar!',
    btnEtiket: 'Başla',
  },
];

const RENK_MAP = {
  amber:   { ikonBg: 'bg-amber-500/20 border-amber-400/40', ikonText: 'text-amber-300', ozetText: 'text-amber-200' },
  sky:     { ikonBg: 'bg-sky-500/20 border-sky-400/40', ikonText: 'text-sky-300', ozetText: 'text-sky-200' },
  purple:  { ikonBg: 'bg-purple-500/20 border-purple-400/40', ikonText: 'text-purple-300', ozetText: 'text-purple-200' },
  emerald: { ikonBg: 'bg-emerald-500/20 border-emerald-400/40', ikonText: 'text-emerald-300', ozetText: 'text-emerald-200' },
  rose:    { ikonBg: 'bg-rose-500/20 border-rose-400/40', ikonText: 'text-rose-300', ozetText: 'text-rose-200' },
};

const OnboardingTour = () => {
  const { currentUser, isAnonymous, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [acik, setAcik] = useState(false);
  const [adim, setAdim] = useState(0);

  useEffect(() => {
    if (!ready || !currentUser || isAnonymous) return;
    // SSO callback ekranındaysa açılmasın
    if (location.pathname === '/sso' || location.pathname === '/giris-tamamla') return;
    let iptal = false;
    (async () => {
      // Önce Firestore'dan kontrol
      try {
        const snap = await getDoc(doc(db, `users/${currentUser.uid}`));
        if (snap.exists() && snap.data().onboardingTuruGorduk === true) return;
      } catch {}
      // Sonra localStorage (anonim sürümden devam eden kullanıcı için)
      if (localStorage.getItem(STORAGE_KEY) === 'tamamlandi') return;
      if (iptal) return;
      // Açılır
      setTimeout(() => { if (!iptal) setAcik(true); }, 1500);
    })();
    return () => { iptal = true; };
  }, [ready, currentUser?.uid, isAnonymous, location.pathname]);

  async function kapat(tamamlandi = false) {
    setAcik(false);
    // localStorage
    try { localStorage.setItem(STORAGE_KEY, tamamlandi ? 'tamamlandi' : 'iptal'); } catch {}
    // Firestore
    if (currentUser && !isAnonymous) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}`), {
          onboardingTuruGorduk: true,
          onboardingTuruTamamlandi: tamamlandi,
        }, { merge: true });
      } catch (e) { console.warn('[tour] save err:', e.message); }
    }
  }

  function ileri() {
    if (adim < ADIMLAR.length - 1) setAdim(a => a + 1);
    else kapat(true);
  }

  function geri() {
    if (adim > 0) setAdim(a => a - 1);
  }

  function ctaAcVeBitir(path) {
    kapat(true);
    setTimeout(() => navigate(path), 200);
  }

  const a = useMemo(() => ADIMLAR[adim], [adim]);
  const renk = RENK_MAP[a?.renk || 'amber'];
  const Icon = a?.icon || Sparkles;

  if (!acik) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-br from-purple-900 to-indigo-950 border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* İlerleme bar */}
        <div className="h-1.5 bg-black/40">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
            style={{ width: `${((adim + 1) / ADIMLAR.length) * 100}%` }} />
        </div>

        <div className="p-6 sm:p-7">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-300/60 text-[10px] uppercase tracking-wider font-bold">
              Adım {adim + 1} / {ADIMLAR.length}
            </span>
            <button onClick={() => kapat(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              aria-label="Turu kapat">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* İkon */}
          <div className={`w-16 h-16 rounded-2xl ${renk.ikonBg} border flex items-center justify-center mb-4`}>
            <Icon className={`w-8 h-8 ${renk.ikonText}`} />
          </div>

          {/* İçerik */}
          <h2 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">{a.baslik}</h2>
          <p className={`${renk.ozetText} text-sm font-semibold mb-3`}>{a.ozet}</p>
          <p className="text-purple-100/85 text-sm leading-relaxed mb-6">{a.metin}</p>

          {/* CTA + Nav */}
          <div className="flex flex-col gap-2">
            {a.cta && (
              <button onClick={() => ctaAcVeBitir(a.cta.path)}
                className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3 rounded-xl spring-tap inline-flex items-center justify-center gap-2">
                {a.cta.label}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <div className="flex gap-2">
              {adim > 0 && (
                <button onClick={geri}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl spring-tap inline-flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" />
                  Geri
                </button>
              )}
              <button onClick={ileri}
                className={`flex-1 ${a.cta ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-amber-400 hover:bg-amber-300 text-purple-900'} font-bold py-3 rounded-xl spring-tap inline-flex items-center justify-center gap-2`}>
                {a.btnEtiket || (adim === ADIMLAR.length - 1 ? 'Bitir' : 'Sonraki')}
                {adim < ADIMLAR.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
            {adim < ADIMLAR.length - 1 && (
              <button onClick={() => kapat(false)}
                className="text-purple-300/50 hover:text-purple-200 text-xs py-1 spring-tap">
                Turu atla
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
