// Komisyonlar — OneTeam Girişimcilik Ekosistemi
// 11 komisyonu hisset, her birine tıklayıp ne yaptıklarını gör.
// Admin (Emre) içeriği düzenleyebilir.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Users2, Building2, Lock, Award } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from '../context/LanguageContext';
import { KOMISYONLAR } from '../utils/komisyonlar';
import { db } from '../utils/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { makeCoreId } from '../context/DataContext';

// Çok dilli statik metinler — translations.js'e taşımak yerine inline
const I18N = {
  tr: {
    anasayfa: 'Anasayfa',
    kicker: 'One Team Komisyonlar',
    aciklamaBasi: 'OneTeam Yürütme Kurulu tarafından kurulan komisyonlar, iş ortaklarımızın',
    gelisim: 'gelişimine',
    dayanisma: 'dayanışmasına',
    basari: 'başarısına',
    hizmetEder: 'hizmet eder.',
    komisyon: 'Komisyon',
    aktif: 'Aktif',
    aktifBadge: 'Aktif',
    kuruluyorBadge: 'Kuruluyor',
    liderGorevliler: 'Lider Görevliler',
    detaylariGor: 'Detayları Gör',
    baskan: 'Başkan',
    altMetin: 'Her komisyon kendi alanında uzmanlaşmış liderlerden oluşur. Birlikte OneTeam ekosistemini büyütürüz.',
  },
  en: {
    anasayfa: 'Home',
    kicker: 'One Team Committees',
    aciklamaBasi: 'Committees established by the OneTeam Executive Board serve our partners’',
    gelisim: 'development',
    dayanisma: 'solidarity',
    basari: 'success',
    hizmetEder: '.',
    komisyon: 'Committee',
    aktif: 'Active',
    aktifBadge: 'Active',
    kuruluyorBadge: 'Building',
    liderGorevliler: 'Leadership',
    detaylariGor: 'View Details',
    baskan: 'Chair',
    altMetin: 'Each committee consists of leaders specialized in their field. Together we grow the OneTeam ecosystem.',
  },
  de: {
    anasayfa: 'Startseite',
    kicker: 'One Team Ausschüsse',
    aciklamaBasi: 'Die vom OneTeam-Exekutivausschuss eingerichteten Komitees dienen der',
    gelisim: 'Entwicklung',
    dayanisma: 'Solidarität',
    basari: 'dem Erfolg',
    hizmetEder: 'unserer Partner.',
    komisyon: 'Ausschuss',
    aktif: 'Aktiv',
    aktifBadge: 'Aktiv',
    kuruluyorBadge: 'Im Aufbau',
    liderGorevliler: 'Führungsteam',
    detaylariGor: 'Details ansehen',
    baskan: 'Vorsitz',
    altMetin: 'Jeder Ausschuss besteht aus Experten ihres Fachgebiets. Gemeinsam wachsen wir.',
  },
  nl: {
    anasayfa: 'Home',
    kicker: 'One Team Commissies',
    aciklamaBasi: 'Door het OneTeam Uitvoerend Bestuur opgerichte commissies dienen de',
    gelisim: 'ontwikkeling',
    dayanisma: 'solidariteit',
    basari: 'succes',
    hizmetEder: 'van onze partners.',
    komisyon: 'Commissie',
    aktif: 'Actief',
    aktifBadge: 'Actief',
    kuruluyorBadge: 'In opbouw',
    liderGorevliler: 'Leiderschap',
    detaylariGor: 'Details bekijken',
    baskan: 'Voorzitter',
    altMetin: 'Elke commissie bestaat uit leiders die gespecialiseerd zijn in hun vakgebied. Samen laten we het OneTeam-ecosysteem groeien.',
  },
};

const KomisyonlarSayfasi = () => {
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const tr = I18N[lang] || I18N.tr;

  // Firestore'dan tüm komisyon doc'larını çek — başkan + üye sayısı + özet için
  const [baskanlar, setBaskanlar] = useState({}); // { komisyonId: { ad, fotoURL, coreId } }
  const [icerikler, setIcerikler] = useState({}); // { komisyonId: { ozet, uyeSayisi } }
  // Konuşmacılar collection'ından güncel fotoğraflar (coreId → fotoURL)
  // Konuşmacı tarafında foto değişince burada da otomatik güncellenir
  const [freshFotolar, setFreshFotolar] = useState({});
  // Skeleton loading state — başkan kartları yüklenirken pulse placeholder göster
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'komisyonlar'));
        const map = {};
        const icerikMap = {};
        snap.forEach(d => {
          const data = d.data();
          const uyeler = Array.isArray(data.uyeler) ? data.uyeler : [];
          const baskan = uyeler.find(u => u.unvan === 'Komisyon Başkanı');
          if (baskan) map[d.id] = baskan;
          icerikMap[d.id] = {
            ozet: data.ozet || '',
            uyeSayisi: uyeler.length,
          };
        });
        setBaskanlar(map);
        setIcerikler(icerikMap);
        setYukleniyor(false);

        // Başkanların coreId'lerini topla (yoksa ad'dan üret), konuşmacılar'dan güncel foto çek
        const coreIds = [...new Set(
          Object.values(map).map(b => b.coreId || makeCoreId(b.ad)).filter(Boolean)
        )];
        if (coreIds.length > 0) {
          const freshMap = {};
          await Promise.all(coreIds.map(async (cid) => {
            try {
              const ksnap = await getDoc(doc(db, 'konusmacilar', cid));
              if (ksnap.exists()) {
                const k = ksnap.data();
                if (k.fotoURL) freshMap[cid] = { fotoURL: k.fotoURL, ad: k.ad };
              }
            } catch {}
          }));
          setFreshFotolar(freshMap);
        }
      } catch (e) {
        console.warn('[komisyonlar] baskan yuklenemedi:', e.message);
        setYukleniyor(false);
      }
    })();
  }, []);

  // Başkanın güncel fotoğrafı (konuşmacılar'dan), yoksa snapshot
  const getBaskanFoto = (b) => {
    const cid = b?.coreId || makeCoreId(b?.ad);
    return (cid && freshFotolar[cid]?.fotoURL) || b?.fotoURL || null;
  };

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
            <ArrowLeft className="w-4 h-4" /> {tr.anasayfa}
          </button>
          <LanguageSwitcher />
        </div>

        {/* Hero — kompakt versiyon */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 animate-fade-in">
          {/* OneTeam logo — küçültüldü, hafif glow */}
          <div className="relative inline-block mb-3">
            <div className="absolute -inset-4 bg-amber-400/15 blur-2xl pointer-events-none" />
            <img
              src="/logos/oneteam-logo.png"
              alt="OneTeam"
              className="relative w-20 sm:w-24 md:w-28 h-auto"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(251, 191, 36, 0.35)) drop-shadow(0 0 20px rgba(251, 191, 36, 0.15))',
              }}
            />
          </div>

          {/* Kicker — altın çizgili */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-8 sm:w-12 bg-amber-400/50" />
            <span className="text-amber-300 text-[10px] sm:text-xs uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              {tr.kicker}
            </span>
            <div className="h-px w-8 sm:w-12 bg-amber-400/50" />
          </div>

          {/* Kompakt açıklama — tek satıra düşürüldü, anahtar kelimeler altın */}
          <p className="text-purple-100/85 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto mb-4">
            {tr.aciklamaBasi}{' '}
            <span className="text-amber-300 font-semibold">{tr.gelisim}</span>,{' '}
            <span className="text-amber-300 font-semibold">{tr.dayanisma}</span>
            {lang === 'tr' ? ' ve ' : lang === 'en' ? ' and ' : lang === 'de' ? ' und ' : ' en '}
            <span className="text-amber-300 font-semibold">{tr.basari}</span> {tr.hizmetEder}
          </p>

          {/* Tek bant istatistik — kompakt inline */}
          <div className="inline-flex items-center gap-3 sm:gap-4 bg-white/5 backdrop-blur-md border border-white/15 rounded-full px-4 sm:px-5 py-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-white">
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <strong className="font-bold">{KOMISYONLAR.length}</strong> {tr.komisyon}
            </span>
            <span className="w-px h-3 bg-white/20" />
            <span className="inline-flex items-center gap-1.5 text-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <strong className="font-bold">{aktifSayisi}</strong> {tr.aktif}
            </span>
            <span className="w-px h-3 bg-white/20" />
            <span className="inline-flex items-center gap-1.5 text-purple-200">
              <Users2 className="w-3.5 h-3.5 text-purple-300" />
              {tr.liderGorevliler}
            </span>
          </div>
        </div>

        {/* Komisyonlar grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto">
          {KOMISYONLAR.map((k, idx) => {
            const Icon = k.icon;
            const baskan = baskanlar[k.id];
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
                      {tr.aktifBadge}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-white/10 text-purple-200 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/15">
                      <Lock className="w-2.5 h-2.5" />
                      {tr.kuruluyorBadge}
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
                <p className="text-purple-200/80 text-xs leading-snug line-clamp-2 mb-3 min-h-[2.25rem]">
                  {k.tagline}
                </p>

                {/* Komisyon Başkanı kartı — BÜYÜTÜLDÜ */}
                {yukleniyor && !baskan ? (
                  /* Skeleton placeholder */
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10 animate-pulse">
                    <div className="w-14 h-14 rounded-full bg-white/10 flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-2 bg-white/10 rounded w-12" />
                      <div className="h-3 bg-white/15 rounded w-3/4" />
                      <div className="h-2 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ) : baskan ? (
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      {getBaskanFoto(baskan) ? (
                        <img src={getBaskanFoto(baskan)} alt={baskan.ad}
                          loading="lazy" decoding="async"
                          className="w-14 h-14 rounded-full object-cover border-2 border-amber-300/50 shadow-lg"
                          style={{ objectPosition: 'center 25%' }} />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/20 border-2 border-amber-300/40 flex items-center justify-center shadow-lg">
                          <span className="text-amber-200 font-bold text-sm">
                            {(baskan.ad || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {/* Award rozeti — büyütüldü */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-purple-900 flex items-center justify-center shadow">
                        <Award className="w-3 h-3 text-purple-900" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] uppercase tracking-wider text-amber-300/90 font-bold mb-0.5">{tr.baskan}</div>
                      <div className="text-white text-sm font-bold truncate leading-tight">{baskan.ad}</div>
                      {icerikler[k.id]?.uyeSayisi > 0 && (
                        <div className="text-purple-200/70 text-[10px] mt-0.5">
                          <Users2 className="w-2.5 h-2.5 inline -mt-0.5" /> {icerikler[k.id].uyeSayisi} üye
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Alt CTA */}
                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[11px] uppercase tracking-wider font-bold ${k.aktif ? 'text-amber-300' : 'text-purple-200/60'}`}>
                    {tr.detaylariGor}
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
            {tr.altMetin}
          </p>
        </div>
      </div>
    </div>
  );
};

export default KomisyonlarSayfasi;
