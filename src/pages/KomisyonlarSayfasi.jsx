// Komisyonlar Admin Paneli — OneTeam'in tüm komisyonlarının grid'i
// Her komisyon altın renkli ikon + cam morfizm kart. Tıklayınca:
//   - Eğitim Komisyonu → /admin-giris (mevcut admin akışı)
//   - Diğerleri → "Yapım Aşamasında" modali
//
// Logolar: OneTeam logosu (alttaki rozet) + komisyona özel altın ikon.
//          Lucide-react ikonları altın renkte komisyon konusunu temsil eder.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, GraduationCap, Settings2, Package, Smartphone,
  HeartHandshake, Award, Globe2, UsersRound, LineChart, Scale, Tent,
  Hammer, X, Lock,
} from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

// Komisyon meta veri — sıra ve ikon eşlemesi
const KOMISYONLAR = [
  {
    id: 'egitim',
    ad: 'OneTeam Eğitim Komisyonu',
    kisaAd: 'Eğitim',
    aciklama: 'Eğitim takvimi, eğitmenler, kayıtlı eğitimler',
    icon: GraduationCap,
    aktif: true,
    rota: '/admin-giris',
  },
  {
    id: 'sistem',
    ad: 'OneTeam Sistem Komisyonu',
    kisaAd: 'Sistem',
    aciklama: 'Yapı, süreç ve standartlar',
    icon: Settings2,
    aktif: false,
  },
  {
    id: 'urun',
    ad: 'OneTeam Ürün Komisyonu',
    kisaAd: 'Ürün',
    aciklama: 'Ürün bilgisi, eğitim ve içerik',
    icon: Package,
    aktif: false,
  },
  {
    id: 'teknoloji',
    ad: 'OneTeam Teknoloji ve Sosyal Medya Komisyonu',
    kisaAd: 'Teknoloji & Sosyal Medya',
    aciklama: 'Dijital platformlar ve içerik üretimi',
    icon: Smartphone,
    aktif: false,
  },
  {
    id: 'yardim-eli',
    ad: 'OneTeam Yardım Eli Komisyonu',
    kisaAd: 'Yardım Eli',
    aciklama: 'Yardımlaşma ve dayanışma faaliyetleri',
    icon: HeartHandshake,
    aktif: false,
  },
  {
    id: 'takdir',
    ad: 'OneTeam Takdir Komisyonu',
    kisaAd: 'Takdir',
    aciklama: 'Başarı ödülleri ve takdir programları',
    icon: Award,
    aktif: false,
  },
  {
    id: 'dis-isleri',
    ad: 'OneTeam Dış İşleri ve Stratejik İletişim Komisyonu',
    kisaAd: 'Dış İşleri & İletişim',
    aciklama: 'Kurumsal ilişkiler ve stratejik iletişim',
    icon: Globe2,
    aktif: false,
  },
  {
    id: 'sosyal-kulupler',
    ad: 'OneTeam Sosyal Kulüpler Komisyonu',
    kisaAd: 'Sosyal Kulüpler',
    aciklama: 'İlgi alanı bazlı topluluk yönetimi',
    icon: UsersRound,
    aktif: false,
  },
  {
    id: 'butce',
    ad: 'OneTeam Bütçe Denetim ve Yatırım Komisyonu',
    kisaAd: 'Bütçe & Yatırım',
    aciklama: 'Finansal denetim ve yatırım planlaması',
    icon: LineChart,
    aktif: false,
  },
  {
    id: 'hukuk',
    ad: 'OneTeam Hukuk Komisyonu',
    kisaAd: 'Hukuk',
    aciklama: 'Yasal süreçler ve uyumluluk',
    icon: Scale,
    aktif: false,
  },
  {
    id: 'kamp',
    ad: 'OneTeam Kamp Komisyonu',
    kisaAd: 'Kamp',
    aciklama: 'Eğitim kampları ve etkinlikler',
    icon: Tent,
    aktif: false,
  },
];

const KomisyonlarSayfasi = () => {
  const navigate = useNavigate();
  const [yapimAsamasindaModal, setYapimAsamasindaModal] = useState(null);

  const handleKomisyonTik = (k) => {
    if (k.aktif && k.rota) {
      navigate(k.rota);
    } else {
      setYapimAsamasindaModal(k);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative">
      {/* Üstte yumuşak altın aurora glow */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10">
        {/* Top bar — Geri + Dil */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> Anasayfa
          </button>
          <LanguageSwitcher />
        </div>

        {/* Başlık */}
        <div className="text-center mb-10 sm:mb-14 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-400/15 border border-amber-300/30 mb-4 backdrop-blur-md shadow-2xl">
            <img src="/logos/oneteam-logo.png" alt="OneTeam" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight mb-2">
            Komisyonlar Admin Paneli
          </h1>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-10 sm:w-16 bg-amber-400/50" />
            <span className="text-amber-300 text-xs sm:text-sm uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              OneTeam
            </span>
            <div className="h-px w-10 sm:w-16 bg-amber-400/50" />
          </div>
          <p className="text-purple-200/70 text-sm mt-4 max-w-md mx-auto">
            Yönetmek istediğin komisyonu seç
          </p>
        </div>

        {/* Komisyonlar grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {KOMISYONLAR.map((k, idx) => {
            const Icon = k.icon;
            return (
              <button
                key={k.id}
                onClick={() => handleKomisyonTik(k)}
                className={`group relative bg-white/10 hover:bg-white/15 backdrop-blur-md border rounded-2xl p-4 sm:p-5 transition-all duration-300 spring-tap text-left shadow-xl ${
                  k.aktif
                    ? 'border-amber-300/40 hover:border-amber-300/70 hover:shadow-amber-500/20'
                    : 'border-white/20 hover:border-white/40'
                }`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Kilit rozeti (pasif komisyonlar) */}
                {!k.aktif && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-900/70 border border-white/20 flex items-center justify-center">
                    <Lock className="w-3 h-3 text-purple-200" />
                  </div>
                )}

                {/* Logo + icon kompoziti */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-3 mx-auto">
                  {/* Daire BG — altın halo */}
                  <div className={`absolute inset-0 rounded-2xl ${
                    k.aktif
                      ? 'bg-gradient-to-br from-amber-400/30 to-amber-600/20 border border-amber-300/50'
                      : 'bg-white/10 border border-white/20'
                  } shadow-lg`} />
                  {/* Komisyon iconu */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${k.aktif ? 'text-amber-300' : 'text-purple-200/80'}`} />
                  </div>
                  {/* OneTeam mini rozet (sol-alt) */}
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-900 border-2 border-purple-800 overflow-hidden flex items-center justify-center shadow-md">
                    <img src="/logos/oneteam-logo.png" alt="OneTeam" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
                  </div>
                </div>

                {/* Komisyon adı (kısa) */}
                <h3 className="text-white font-bold text-sm sm:text-base text-center mb-1 leading-tight">
                  {k.kisaAd}
                </h3>
                <p className="text-purple-200/70 text-xs text-center line-clamp-2 leading-snug">
                  {k.aciklama}
                </p>

                {/* Hover arrow */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition">
                  <ArrowRight className={`w-4 h-4 ${k.aktif ? 'text-amber-300' : 'text-white/40'}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Alt bilgi */}
        <div className="mt-12 text-center">
          <p className="text-purple-200/60 text-xs">
            <Lock className="w-3 h-3 inline mr-1" />
            Kilitli komisyonlar yakında aktif olacak
          </p>
        </div>
      </div>

      {/* Yapım Aşamasında Modal */}
      {yapimAsamasindaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setYapimAsamasindaModal(null)}>
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-amber-300/30 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center relative"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setYapimAsamasindaModal(null)}
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
              {yapimAsamasindaModal.kisaAd}
            </p>
            <p className="text-purple-200/80 text-sm mb-1">
              {yapimAsamasindaModal.ad}
            </p>
            <p className="text-purple-200/60 text-xs mb-6">
              {yapimAsamasindaModal.aciklama}
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-purple-100 text-sm leading-relaxed">
                Bu komisyonun admin paneli yakında hazır olacak.
                Çalışmalar devam ediyor.
              </p>
            </div>

            <button onClick={() => setYapimAsamasindaModal(null)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3 rounded-xl shadow-lg transition spring-tap">
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KomisyonlarSayfasi;
