import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Shield, Sparkles } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amare-purple via-amare-blue to-amare-light">
      <div className="container mx-auto px-4 py-12">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
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
          <h2 className="text-3xl md:text-4xl font-semibold text-white/90 mb-4">
            {t('home_subtitle')}
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            {t('home_desc')}
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div
            onClick={() => navigate('/egitmen-basvuru')}
            className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-amare-purple rounded-full p-4">
                <Users className="w-12 h-12 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
              {t('home_card1_title')}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {t('home_card1_desc')}
            </p>
            <button className="w-full bg-amare-purple text-white py-3 rounded-lg font-semibold hover:bg-amare-dark transition-colors">
              {t('home_card1_btn')}
            </button>
          </div>

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

        {/* Info Section */}
        <div className="mt-16 max-w-3xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-4 text-center">
            {t('home_how_title')}
          </h3>
          <div className="space-y-4">
            {[
              { num: '1', title: t('home_step1_title'), desc: t('home_step1_desc') },
              { num: '2', title: t('home_step2_title'), desc: t('home_step2_desc') },
              { num: '3', title: t('home_step3_title'), desc: t('home_step3_desc') },
            ].map((step) => (
              <div key={step.num} className="flex items-start">
                <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <span className="font-bold">{step.num}</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{step.title}</h4>
                  <p className="text-white/80">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-white/70">
          <p>{t('copyright')}</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
