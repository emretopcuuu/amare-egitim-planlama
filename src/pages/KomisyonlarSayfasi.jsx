// Komisyonlar — OneTeam Girişimcilik Ekosistemi
// 11 komisyonu hisset, her birine tıklayıp ne yaptıklarını gör.
// Admin (Emre) içeriği düzenleyebilir.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Users2, Building2, Lock } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { KOMISYONLAR } from '../utils/komisyonlar';

const KomisyonlarSayfasi = () => {
  const navigate = useNavigate();

  const aktifSayisi = KOMISYONLAR.filter(k => k.aktif).length;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative">
      {/* Üstte altın aurora */}
      <div className="absolute top-0 left-0 right-0 h-[700px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.18)_0%,transparent_75%)] pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> Anasayfa
          </button>
          <LanguageSwitcher />
        </div>

        {/* Hero — Ekosistem hissi */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 animate-fade-in">
          {/* OneTeam logo glow ile */}
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
              OneTeam
            </span>
            <div className="h-px w-12 bg-amber-400/50" />
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight mb-4 leading-tight">
            Girişimcilik <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent font-bold">Ekosistemi</span>
          </h1>

          <p className="text-purple-100/90 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            OneTeam liderleri tarafından kurulan komisyonlar, üyelerimizin
            <span className="text-amber-300 font-semibold"> gelişimine</span>,
            <span className="text-amber-300 font-semibold"> dayanışmasına</span> ve
            <span className="text-amber-300 font-semibold"> başarısına</span> hizmet eder.
          </p>

          {/* İstatistik rozetleri */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2">
              <Building2 className="w-4 h-4 text-amber-300" />
              <span className="text-white text-sm font-semibold">{KOMISYONLAR.length} Komisyon</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 backdrop-blur-md border border-emerald-400/30 rounded-full px-4 py-2">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span className="text-emerald-100 text-sm font-semibold">{aktifSayisi} Aktif</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2">
              <Users2 className="w-4 h-4 text-purple-200" />
              <span className="text-white text-sm font-semibold">Lider Görevliler</span>
            </div>
          </div>
        </div>

        {/* Komisyonlar grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto">
          {KOMISYONLAR.map((k, idx) => {
            const Icon = k.icon;
            return (
              <button
                key={k.id}
                onClick={() => navigate(`/komisyonlar/${k.id}`)}
                className={`group relative overflow-hidden bg-white/10 hover:bg-white/15 backdrop-blur-md border rounded-2xl p-6 transition-all duration-300 spring-tap text-left shadow-xl ${
                  k.aktif
                    ? 'border-amber-300/40 hover:border-amber-300/70 hover:shadow-amber-500/20'
                    : 'border-white/15 hover:border-white/30'
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Aktif/Kurulum rozeti */}
                <div className="absolute top-3 right-3">
                  {k.aktif ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md border border-emerald-300/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-white/10 text-purple-200 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/15">
                      <Lock className="w-2.5 h-2.5" />
                      Kuruluyor
                    </span>
                  )}
                </div>

                {/* İkon + OneTeam mini rozeti */}
                <div className="relative w-16 h-16 mb-4">
                  <div className={`absolute inset-0 rounded-2xl ${
                    k.aktif
                      ? 'bg-gradient-to-br from-amber-400/30 to-amber-600/15 border border-amber-300/50'
                      : 'bg-white/10 border border-white/20'
                  } shadow-lg`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className={`w-8 h-8 ${k.aktif ? 'text-amber-300' : 'text-purple-100/80'}`} />
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-purple-900 border-2 border-purple-800 overflow-hidden flex items-center justify-center shadow-md">
                    <img src="/logos/oneteam-logo.png" alt="OneTeam" className="w-4 h-4 object-contain" />
                  </div>
                </div>

                {/* Komisyon adı */}
                <h3 className="text-white font-bold text-base sm:text-lg mb-1 leading-tight">
                  {k.kisaAd}
                </h3>
                <p className="text-purple-200/80 text-xs sm:text-sm leading-snug line-clamp-2 mb-3">
                  {k.tagline}
                </p>

                {/* Alt CTA */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className={`text-[11px] uppercase tracking-wider font-bold ${k.aktif ? 'text-amber-300' : 'text-purple-200/60'}`}>
                    Detayları Gör
                  </span>
                  <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${k.aktif ? 'text-amber-300' : 'text-white/40'}`} />
                </div>

                {/* Dekor gradient overlay (hover'da daha belirgin) */}
                {k.aktif && (
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
                )}
              </button>
            );
          })}
        </div>

        {/* Alt bilgi */}
        <div className="mt-14 text-center max-w-2xl mx-auto">
          <p className="text-purple-200/70 text-sm leading-relaxed">
            Her komisyon kendi alanında uzmanlaşmış liderlerden oluşur.
            Birlikte OneTeam ekosistemini büyütürüz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KomisyonlarSayfasi;
