// Hakkımızda — OneTeam Girişimcilik Ekosistemi kurumsal sayfası
// Misyon + Vizyon + ileride Değerler/Liderler/İletişim için geniş.
// İçerik şimdilik hard-coded; ileride Firestore'a alınabilir.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Compass } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from '../context/LanguageContext';

const I18N = {
  tr: {
    anasayfa: 'Anasayfa',
    kicker: 'One Team',
    baslikSol: 'Girişimcilik',
    baslikSag: 'Ekosistemi',
    intro: 'Sağlık, varlık ve özgürlük için yola çıkan, girişimci adaylarına destek olan aile.',
    misyon: 'Misyon',
    misyonMetin1: 'Sağlık, varlık ve özgürlük dolu bir yaşamın',
    misyonVurgu: ' herkes için ',
    misyonMetin2: 'mümkün olduğuna inanıyoruz. One Team ailesi olarak hep birlikte bunun için çalışıyoruz.',
    vizyon: 'Vizyon',
    vizyonMetin1: 'Bireylerin ve toplulukların yaşamını iyileştiren,',
    vizyonVurgu: ' dünyanın en büyük ve en etkili ',
    vizyonMetin2: 'girişimcilik ekosistemi olmak.',
    altKicker: 'Birlikte Daha Güçlü',
    altMetin: 'One Team, Amare liderlerin kurduğu dünyanın en başarılı girişimci dayanışma topluluklarından biridir.',
    copyright: '© 2026 Powered by OneTeam',
  },
  en: {
    anasayfa: 'Home',
    kicker: 'One Team',
    baslikSol: 'Entrepreneurship',
    baslikSag: 'Ecosystem',
    intro: 'A family setting out for health, prosperity and freedom, supporting aspiring entrepreneurs.',
    misyon: 'Mission',
    misyonMetin1: 'We believe a life full of health, prosperity and freedom is',
    misyonVurgu: ' possible for everyone',
    misyonMetin2: '. As the One Team family, we work together for this.',
    vizyon: 'Vision',
    vizyonMetin1: 'To become',
    vizyonVurgu: ' the world\'s largest and most influential ',
    vizyonMetin2: 'entrepreneurship ecosystem improving the lives of individuals and communities.',
    altKicker: 'Stronger Together',
    altMetin: 'One Team is one of the world’s most successful entrepreneur solidarity communities, founded by Amare leaders.',
    copyright: '© 2026 Powered by OneTeam',
  },
  de: {
    anasayfa: 'Startseite',
    kicker: 'One Team',
    baslikSol: 'Unternehmer',
    baslikSag: 'Ökosystem',
    intro: 'Eine Familie auf dem Weg zu Gesundheit, Wohlstand und Freiheit – mit Unterstützung für angehende Unternehmer.',
    misyon: 'Mission',
    misyonMetin1: 'Wir glauben, ein Leben voller Gesundheit, Wohlstand und Freiheit ist',
    misyonVurgu: ' für jeden ',
    misyonMetin2: 'möglich. Als One Team-Familie arbeiten wir gemeinsam dafür.',
    vizyon: 'Vision',
    vizyonMetin1: 'Das',
    vizyonVurgu: ' weltweit größte und einflussreichste ',
    vizyonMetin2: 'Unternehmer-Ökosystem zu werden, das das Leben von Menschen und Gemeinschaften verbessert.',
    altKicker: 'Gemeinsam Stärker',
    altMetin: 'One Team ist eine der erfolgreichsten Unternehmer-Solidargemeinschaften der Welt, gegründet von Amare-Führungskräften.',
    copyright: '© 2026 Powered by OneTeam',
  },
  nl: {
    anasayfa: 'Home',
    kicker: 'One Team',
    baslikSol: 'Ondernemers',
    baslikSag: 'Ecosysteem',
    intro: 'Een familie op weg naar gezondheid, welvaart en vrijheid — met steun voor aspirant-ondernemers.',
    misyon: 'Missie',
    misyonMetin1: 'Wij geloven dat een leven vol gezondheid, welvaart en vrijheid',
    misyonVurgu: ' voor iedereen ',
    misyonMetin2: 'mogelijk is. Als One Team-familie werken we hier samen aan.',
    vizyon: 'Visie',
    vizyonMetin1: 'Het',
    vizyonVurgu: ' grootste en meest invloedrijke ',
    vizyonMetin2: 'ondernemersecosysteem ter wereld worden dat het leven van individuen en gemeenschappen verbetert.',
    altKicker: 'Samen Sterker',
    altMetin: 'One Team is een van \'s werelds meest succesvolle ondernemers-solidariteitsgemeenschappen, opgericht door Amare-leiders.',
    copyright: '© 2026 Powered by OneTeam',
  },
};

const HakkimizdaSayfasi = () => {
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const tr = I18N[lang] || I18N.tr;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative">
      {/* Dekoratif altın aurora */}
      <div className="absolute top-0 left-0 right-0 h-[700px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.18)_0%,transparent_75%)] pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> {tr.anasayfa}
          </button>
          <LanguageSwitcher />
        </div>

        {/* HERO */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          {/* OneTeam logo — transparent + halo glow */}
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-6 bg-amber-400/20 blur-3xl pointer-events-none" />
            <img
              src="/logos/oneteam-logo.png"
              alt="OneTeam"
              className="relative w-24 sm:w-28 md:w-32 h-auto"
              style={{
                filter: 'drop-shadow(0 8px 24px rgba(251, 191, 36, 0.35)) drop-shadow(0 0 40px rgba(251, 191, 36, 0.2))',
              }}
            />
          </div>

          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-amber-400/50" />
            <span className="text-amber-300 text-xs sm:text-sm uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              {tr.kicker}
            </span>
            <div className="h-px w-12 bg-amber-400/50" />
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight mb-4 leading-tight">
            {tr.baslikSol} <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent font-bold">{tr.baslikSag}</span>
          </h1>

          <p className="text-purple-100/90 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            {tr.intro}
          </p>
        </div>

        {/* MİSYON */}
        <section className="mb-6 relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-md border border-amber-300/25 rounded-2xl p-7 sm:p-10 overflow-hidden shadow-2xl">
          {/* Köşe glow */}
          <div className="absolute -top-20 -left-20 w-52 h-52 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-start gap-5 sm:gap-7 flex-wrap sm:flex-nowrap">
              {/* İkon */}
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-300/40 shadow-lg flex-shrink-0">
                <Target className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300" />
              </div>

              <div className="flex-1 min-w-0">
                {/* Başlık + çizgi */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-amber-300 text-xs sm:text-sm uppercase tracking-[0.5em] font-bold">
                    {tr.misyon}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-400/60 via-amber-400/20 to-transparent" />
                </div>
                {/* Metin */}
                <p className="text-white/95 text-base sm:text-lg leading-relaxed font-light">
                  {tr.misyonMetin1}
                  <span className="text-amber-300 font-medium">{tr.misyonVurgu}</span>
                  {tr.misyonMetin2}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VİZYON */}
        <section className="mb-12 relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-md border border-amber-300/25 rounded-2xl p-7 sm:p-10 overflow-hidden shadow-2xl">
          {/* Köşe glow */}
          <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-start gap-5 sm:gap-7 flex-wrap sm:flex-nowrap">
              {/* İkon */}
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-300/40 shadow-lg flex-shrink-0">
                <Compass className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300" />
              </div>

              <div className="flex-1 min-w-0">
                {/* Başlık + çizgi */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-amber-300 text-xs sm:text-sm uppercase tracking-[0.5em] font-bold">
                    {tr.vizyon}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-400/60 via-amber-400/20 to-transparent" />
                </div>
                {/* Metin */}
                <p className="text-white/95 text-base sm:text-lg leading-relaxed font-light">
                  {tr.vizyonMetin1}
                  <span className="text-amber-300 font-medium">{tr.vizyonVurgu}</span>
                  {tr.vizyonMetin2}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Alt manifesto bandı */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-10 bg-amber-400/40" />
            <span className="text-amber-300/90 text-[10px] sm:text-xs uppercase tracking-[0.5em] font-bold whitespace-nowrap">
              {tr.altKicker}
            </span>
            <div className="h-px w-10 bg-amber-400/40" />
          </div>
          <p className="text-purple-200/70 text-sm max-w-2xl mx-auto leading-relaxed">
            {tr.altMetin}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-white/10">
          <p className="text-purple-300/60 text-xs tracking-wider">
            {tr.copyright}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HakkimizdaSayfasi;
