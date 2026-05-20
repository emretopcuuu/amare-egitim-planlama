// Hakkımızda — OneTeam Girişimcilik Ekosistemi kurumsal sayfası
// Misyon + Vizyon + ileride Değerler/Liderler/İletişim için geniş.
// İçerik şimdilik hard-coded; ileride Firestore'a alınabilir.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Compass } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const HakkimizdaSayfasi = () => {
  const navigate = useNavigate();

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
            <ArrowLeft className="w-4 h-4" /> Anasayfa
          </button>
          <LanguageSwitcher />
        </div>

        {/* HERO */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          {/* OneTeam logo + halo */}
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-6 bg-amber-400/30 blur-3xl pointer-events-none" />
            <div className="relative inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-amber-400/30 to-amber-600/20 border-2 border-amber-300/40 backdrop-blur-md shadow-2xl">
              <img src="/logos/oneteam-logo.png" alt="OneTeam" className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-lg" />
            </div>
          </div>

          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-amber-400/50" />
            <span className="text-amber-300 text-xs sm:text-sm uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              One Team
            </span>
            <div className="h-px w-12 bg-amber-400/50" />
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight mb-4 leading-tight">
            Girişimcilik <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent font-bold">Ekosistemi</span>
          </h1>

          <p className="text-purple-100/90 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Sağlık, varlık ve özgürlük için yola çıkan, bireyleri ve toplulukları büyüten bir aile.
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
                    Misyon
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-400/60 via-amber-400/20 to-transparent" />
                </div>
                {/* Metin */}
                <p className="text-white/95 text-base sm:text-lg leading-relaxed font-light">
                  Sağlık, varlık ve özgürlük dolu bir yaşamın
                  <span className="text-amber-300 font-medium"> herkes için </span>
                  mümkün olduğuna inanıyoruz. One Team ailesi olarak hep birlikte bunun için çalışıyoruz.
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
                    Vizyon
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-400/60 via-amber-400/20 to-transparent" />
                </div>
                {/* Metin */}
                <p className="text-white/95 text-base sm:text-lg leading-relaxed font-light">
                  Bireylerin ve toplulukların yaşamını iyileştiren,
                  <span className="text-amber-300 font-medium"> dünyanın en büyük ve en etkili </span>
                  girişimcilik ekosistemi olmak.
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
              Birlikte Daha Güçlü
            </span>
            <div className="h-px w-10 bg-amber-400/40" />
          </div>
          <p className="text-purple-200/70 text-sm max-w-2xl mx-auto leading-relaxed">
            One Team, liderlerin kurduğu komisyonlar ve milyonlarca üyenin oluşturduğu
            dünyanın en büyük dayanışma topluluklarından biridir.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-white/10">
          <p className="text-purple-300/60 text-xs tracking-wider">
            © 2026 Powered by OneTeam
          </p>
        </div>
      </div>
    </div>
  );
};

export default HakkimizdaSayfasi;
