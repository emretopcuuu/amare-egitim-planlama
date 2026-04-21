import React from 'react';
import { useTranslation } from '../context/LanguageContext';

const FLAGS = { tr: '🇹🇷', en: '🇬🇧', de: '🇩🇪', nl: '🇳🇱' };

const LanguageSwitcher = ({ className = '' }) => {
  const { lang, setLang, SUPPORTED_LANGS } = useTranslation();

  return (
    <div className={`flex items-center gap-1 bg-white/10 backdrop-blur rounded-full p-0.5 ${className}`}>
      {SUPPORTED_LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
            lang === l
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="text-sm leading-none">{FLAGS[l]}</span>
          <span className="uppercase">{l}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
