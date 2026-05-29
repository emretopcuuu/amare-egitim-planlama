// Yürütme Kurulu sayfası — Presidential / 3-Star / 2-Star / 1-Star Diamond
// İçerik: src/utils/yurutmeKurulu.js'den çekilir (manuel kürasyon)
// Foto: konuşmacılar collection'ından coreId match

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Star, User as UserIcon } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from '../context/LanguageContext';
import { YURUTME_KURULU } from '../utils/yurutmeKurulu';
import { db } from '../utils/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { makeCoreId } from '../context/DataContext';

const I18N = {
  tr: {
    anasayfa: 'Anasayfa',
    kicker: 'OneTeam Liderleri',
    baslik: 'Yürütme Kurulu',
    aciklama: 'OneTeam ekosistemini yönlendiren, vizyonu hayata geçiren liderler.',
    rutbeler: {
      'presidential': 'Presidential Diamond',
      '3star': '3 Star Diamond',
      '2star': '2 Star Diamond',
      '1star': '1 Star Diamond',
    },
    altMetin: 'Bu liderler komisyonları kurar, eğitim politikalarını belirler ve OneTeam ailesini büyütür.',
  },
  en: {
    anasayfa: 'Home',
    kicker: 'OneTeam Leaders',
    baslik: 'Executive Board',
    aciklama: 'The leaders shaping the OneTeam ecosystem and bringing the vision to life.',
    rutbeler: {
      'presidential': 'Presidential Diamond',
      '3star': '3 Star Diamond',
      '2star': '2 Star Diamond',
      '1star': '1 Star Diamond',
    },
    altMetin: 'These leaders form the committees, set training policies, and grow the OneTeam family.',
  },
  de: {
    anasayfa: 'Startseite',
    kicker: 'OneTeam-Führung',
    baslik: 'Exekutivausschuss',
    aciklama: 'Die Führungskräfte, die das OneTeam-Ökosystem gestalten und die Vision zum Leben erwecken.',
    rutbeler: {
      'presidential': 'Presidential Diamond',
      '3star': '3 Star Diamond',
      '2star': '2 Star Diamond',
      '1star': '1 Star Diamond',
    },
    altMetin: 'Diese Führungskräfte bilden die Ausschüsse, legen die Bildungsrichtlinien fest und vergrößern die OneTeam-Familie.',
  },
  nl: {
    anasayfa: 'Home',
    kicker: 'OneTeam Leiders',
    baslik: 'Uitvoerend Bestuur',
    aciklama: 'De leiders die het OneTeam-ecosysteem vormgeven en de visie tot leven brengen.',
    rutbeler: {
      'presidential': 'Presidential Diamond',
      '3star': '3 Star Diamond',
      '2star': '2 Star Diamond',
      '1star': '1 Star Diamond',
    },
    altMetin: 'Deze leiders vormen de commissies, bepalen het opleidingsbeleid en laten de OneTeam-familie groeien.',
  },
};

const RUTBE_SIRA = ['presidential', '3star', '2star', '1star'];
const RUTBE_RENK = {
  'presidential': 'from-amber-300 via-amber-400 to-amber-200',
  '3star': 'from-amber-400/80 to-amber-500/60',
  '2star': 'from-purple-300/80 to-purple-400/60',
  '1star': 'from-purple-200/70 to-purple-300/50',
};
const RUTBE_YILDIZ = {
  'presidential': 5,
  '3star': 3,
  '2star': 2,
  '1star': 1,
};

const YurutmekuruluSayfasi = () => {
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const tr = I18N[lang] || I18N.tr;

  // Konuşmacılar collection'ından coreId → fotoURL map'i
  const [fotolar, setFotolar] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'konusmacilar'));
        const map = {};
        snap.forEach(d => {
          const data = d.data();
          if (data.fotoURL) map[d.id] = data.fotoURL;
        });
        setFotolar(map);
      } catch (e) {
        console.warn('[yurutme] foto yüklenemedi:', e.message);
      }
    })();
  }, []);

  const getFoto = (uye) => {
    const cid = uye.coreId || makeCoreId(uye.ad);
    return cid && fotolar[cid] ? fotolar[cid] : null;
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative">
      {/* Dekoratif altın aurora */}
      <div className="absolute top-0 left-0 right-0 h-[700px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.18)_0%,transparent_75%)] pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10 max-w-5xl">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={() => navigate('/hakkimizda')}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> {tr.anasayfa}
          </button>
          <LanguageSwitcher />
        </div>

        {/* Hero — kompakt */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 animate-fade-in">
          {/* Crown ikonu */}
          <div className="relative inline-block mb-4">
            <div className="absolute -inset-4 bg-amber-400/20 blur-2xl pointer-events-none" />
            <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-600/15 border border-amber-300/50 shadow-2xl">
              <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300" />
            </div>
          </div>

          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-10 bg-amber-400/50" />
            <span className="text-amber-300 text-[10px] sm:text-xs uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              {tr.kicker}
            </span>
            <div className="h-px w-10 bg-amber-400/50" />
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight mb-3 leading-tight">
            {tr.baslik}
          </h1>

          {/* Açıklama */}
          <p className="text-purple-100/85 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            {tr.aciklama}
          </p>
        </div>

        {/* Rütbe grupları */}
        {RUTBE_SIRA.map(rkod => {
          const list = YURUTME_KURULU[rkod] || [];
          if (list.length === 0) return null;
          const yildizSayisi = RUTBE_YILDIZ[rkod];
          return (
            <section key={rkod} className="mb-12">
              {/* Rütbe başlığı */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-0.5">
                  {[...Array(yildizSayisi)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  ))}
                </div>
                <h2 className={`text-base sm:text-lg font-bold uppercase tracking-wider bg-gradient-to-r ${RUTBE_RENK[rkod]} bg-clip-text text-transparent`}>
                  {tr.rutbeler[rkod]}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-amber-400/40 to-transparent" />
                <span className="text-purple-200/60 text-xs font-mono">{list.length}</span>
              </div>

              {/* Üye grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {list.map((u, idx) => {
                  const foto = getFoto(u);
                  return (
                    <div key={u.ad + idx}
                      className="bg-white/10 backdrop-blur-md border border-white/20 hover:border-amber-300/40 rounded-xl p-4 transition-all duration-300 text-center shadow-lg group hover:shadow-amber-500/15">
                      {/* Avatar */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3">
                        {foto ? (
                          <img src={foto} alt={u.ad}
                            loading="lazy" decoding="async"
                            className="w-full h-full rounded-full object-cover border-2 border-amber-300/50 shadow-md group-hover:border-amber-300 transition-colors"
                            style={{ objectPosition: 'center 25%' }} />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/15 border-2 border-amber-300/40 flex items-center justify-center">
                            <span className="text-amber-200 font-bold text-base">
                              {(u.ad || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {rkod === 'presidential' && (
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 border-2 border-purple-900 flex items-center justify-center shadow">
                            <Crown className="w-3.5 h-3.5 text-purple-900" />
                          </div>
                        )}
                      </div>
                      {/* Ad */}
                      <div className="text-white font-bold text-xs sm:text-sm leading-tight">
                        {u.ad}
                      </div>
                      {u.unvan && (
                        <div className="text-amber-300/80 text-[10px] mt-0.5 leading-tight">
                          {u.unvan}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Boş durumda placeholder */}
        {RUTBE_SIRA.every(r => (YURUTME_KURULU[r] || []).length === 0) && (
          <div className="text-center py-12">
            <UserIcon className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
            <p className="text-purple-200/70">Yürütme Kurulu listesi hazırlanıyor.</p>
          </div>
        )}

        {/* Alt manifesto */}
        <div className="text-center mt-8 mb-12">
          <p className="text-purple-200/60 text-xs max-w-2xl mx-auto leading-relaxed">
            {tr.altMetin}
          </p>
        </div>
      </div>
    </div>
  );
};

export default YurutmekuruluSayfasi;
