import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Shield, Newspaper, ArrowRight } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import BultenModal from '../components/BultenModal';

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [bultenModal, setBultenModal] = useState(false);

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

        {/* HERO — One Team logo merkezde, premium */}
        <div className="text-center pt-6 sm:pt-12 pb-12 sm:pb-16 animate-fade-in">
          <div className="inline-block relative">
            {/* Logo arkasına yumuşak altın aurora */}
            <div className="absolute inset-0 bg-amber-400/20 blur-3xl scale-90 pointer-events-none" />
            <img
              src="/logos/oneteam logo.JPG"
              alt="One Team"
              className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 mx-auto object-contain"
              style={{
                mixBlendMode: 'screen',
                filter: 'drop-shadow(0 12px 40px rgba(251, 191, 36, 0.35))',
              }}
            />
          </div>

          {/* Subtle kicker — altın çizgili */}
          <div className="mt-6 inline-flex items-center justify-center gap-3">
            <div className="h-px w-10 sm:w-16 bg-amber-400/50" />
            <span className="text-amber-300 text-xs sm:text-sm uppercase tracking-[0.4em] font-semibold">
              Eğitim Takvimi
            </span>
            <div className="h-px w-10 sm:w-16 bg-amber-400/50" />
          </div>
        </div>

        {/* Action Cards — cam morfizm, brand uyumlu */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
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
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {t('home_card2_title')}
            </h3>
            <p className="text-purple-200/80 text-sm leading-relaxed">
              {t('home_card2_desc')}
            </p>
          </button>

          <button
            onClick={() => navigate('/admin-giris')}
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 hover:border-amber-300/40 rounded-3xl p-7 sm:p-8 transition-all duration-300 spring-tap text-left shadow-2xl"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-amber-300 group-hover:translate-x-1 transition-all ml-auto mt-2" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {t('home_card3_title')}
            </h3>
            <p className="text-purple-200/80 text-sm leading-relaxed">
              {t('home_card3_desc')}
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
    </div>
  );
};

export default HomePage;
