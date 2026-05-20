import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Shield, Newspaper, ArrowRight, Users, Hammer, X } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import BultenModal from '../components/BultenModal';

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [bultenModal, setBultenModal] = useState(false);
  const [yapimAsamasinda, setYapimAsamasinda] = useState(false);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative">
      {/* Üstte yumuşak altın aurora glow */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.15)_0%,transparent_70%)] pointer-events-none" />
      {/* Köşelerde dekor blur'lar */}
      <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10">
        {/* Top bar — Bülten + Dil */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={() => setBultenModal(true)}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-purple-900 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-amber-500/30 spring-tap">
            <Newspaper className="w-4 h-4" />
            <span className="hidden sm:inline">Haftalık Bülten</span>
            <span className="sm:hidden">Bülten</span>
          </button>
          <LanguageSwitcher />
        </div>

        {/* HERO — One Team logo merkezde, çerçevesiz transparent */}
        <div className="flex flex-col items-center pt-4 sm:pt-8 pb-12 sm:pb-16 animate-fade-in">
          <div className="relative">
            {/* Logo arkasına yumuşak altın aurora */}
            <div className="absolute -inset-8 bg-amber-400/15 blur-3xl pointer-events-none" />
            {/* Transparent PNG — direkt mor zemin üstünde altın logo */}
            <img
              src="/logos/oneteam-logo.png"
              alt="One Team"
              className="relative w-64 sm:w-80 md:w-96 h-auto"
              style={{
                filter: 'drop-shadow(0 8px 24px rgba(251, 191, 36, 0.35)) drop-shadow(0 0 40px rgba(251, 191, 36, 0.2))',
              }}
            />
          </div>

          {/* Kicker — altın çizgili, logonun altında */}
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3">
            <div className="h-px w-10 sm:w-16 bg-amber-400/50" />
            <span className="text-amber-300 text-xs sm:text-sm uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              Girişimcilik Ekosistemi
            </span>
            <div className="h-px w-10 sm:w-16 bg-amber-400/50" />
          </div>
        </div>

        {/* Action Cards — cam morfizm, brand uyumlu */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/takvim')}
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 hover:border-amber-300/40 rounded-3xl p-7 sm:p-8 transition-all duration-300 spring-tap text-left shadow-2xl"
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
            onClick={() => navigate('/komisyonlar')}
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 hover:border-amber-300/40 rounded-3xl p-7 sm:p-8 transition-all duration-300 spring-tap text-left shadow-2xl"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-amber-300 group-hover:translate-x-1 transition-all ml-auto mt-2" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 uppercase tracking-wide">
              Komisyonlar
            </h3>
            <p className="text-purple-200/80 text-sm leading-relaxed">
              OneTeam'in tüm komisyonları
            </p>
          </button>

          {/* Ekip Yönetim Paneli — Yapım aşamasında */}
          <button
            onClick={() => setYapimAsamasinda(true)}
            className="group relative bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 hover:border-amber-300/40 rounded-3xl p-7 sm:p-8 transition-all duration-300 spring-tap text-left shadow-2xl"
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

        {/* Footer */}
        <div className="mt-16 sm:mt-24 text-center">
          <p className="text-purple-300/60 text-xs tracking-wider">
            {t('copyright')}
          </p>
        </div>
      </div>

      {bultenModal && <BultenModal onClose={() => setBultenModal(false)} />}

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
