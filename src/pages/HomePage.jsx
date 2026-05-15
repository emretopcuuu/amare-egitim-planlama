import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Shield, Sparkles, Newspaper } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import BultenModal from '../components/BultenModal';

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [bultenModal, setBultenModal] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-amare-purple via-amare-blue to-amare-light">
      <div className="container mx-auto px-4 py-12">
        {/* Language Switcher + Bülten */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <button onClick={() => setBultenModal(true)}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 px-4 py-2 rounded-full text-sm font-bold transition-all gold-glow spring-tap">
            <Newspaper className="w-4 h-4" /><span className="hidden sm:inline">Haftalık Bülten</span><span className="sm:hidden">Bülten</span>
          </button>
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-6">
            <Sparkles className="w-20 h-20 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            {t('home_title')}
          </h1>
        </div>

        {/* Action Cards — Eğitmen Başvurusu profile taşındı, 2 kart kaldı */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div
            onClick={() => navigate('/takvim')}
            className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-amare-blue rounded-full p-4">
                <Calendar className="w-12 h-12 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
              {t('home_card2_title')}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {t('home_card2_desc')}
            </p>
            <button className="w-full bg-amare-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              {t('home_card2_btn')}
            </button>
          </div>

          <div
            onClick={() => navigate('/admin-giris')}
            className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-gray-700 rounded-full p-4">
                <Shield className="w-12 h-12 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
              {t('home_card3_title')}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {t('home_card3_desc')}
            </p>
            <button className="w-full bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
              {t('home_card3_btn')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-white/70">
          <p>{t('copyright')}</p>
        </div>
      </div>
      {bultenModal && <BultenModal onClose={() => setBultenModal(false)} />}
    </div>
  );
};

export default HomePage;
