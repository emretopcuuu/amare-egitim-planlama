// /konusmacilar — Tüm konuşmacıların grid sayfası
import React, { useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData, makeSafeId, makeCoreId } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import { ArrowLeft, User, Search, X, Loader2, Star, RotateCw } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import KonusmaciFullModal from '../components/KonusmaciFullModal';
import LoadingProgress from '../components/LoadingProgress';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import { useTakipEgitmenler } from '../utils/takip';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import { usePullToRefresh } from '../utils/usePullToRefresh';

const splitEgitmen = (e) => {
  if (!e) return [];
  return e.normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()).filter(n => n.length > 1);
};

const KonusmacilarSayfasi = () => {
  const navigate = useNavigate();
  const { takvim, konusmacilar, loading } = useData();
  const { t } = useTranslation();
  const [arama, setArama] = useState('');
  const [secili, setSecili] = useState(null);
  const [sadeceFav, setSadeceFav] = useState(false);
  const [yardimAcik, setYardimAcik] = useState(false);
  const aramaRef = useRef(null);
  const { takipSet, count: favSayisi } = useTakipEgitmenler();

  // Klavye kısayolları
  useKeyboardShortcuts({
    '/': () => aramaRef.current?.focus(),
    '?': () => setYardimAcik(true),
    'Escape': () => { if (secili) setSecili(null); else if (yardimAcik) setYardimAcik(false); },
  }, [secili, yardimAcik]);

  // Pull-to-refresh — sayfayı tazele
  const handleRefresh = async () => {
    window.location.reload();
  };
  const { pullY, refreshing } = usePullToRefresh(handleRefresh);

  // Tüm konuşmacıları topla — coreId ile dedupe (unvan + Türkçe normalize)
  // "ZEYNEP" vs "ZEYNEP DEMİR" hala farklı kişiler olabilir, sadece exact aynı core
  // "Dr.TUNÇ TUNCER" + "TUNÇ TUNCER" + "Uzm.Dr. TUNÇ TUNCER" → 1 entry
  const tumKonusmacilar = useMemo(() => {
    const map = new Map(); // coreId → { ad, kayit (en bilgili), egitimSayisi, allNames }

    const addOrMerge = (ad, kayit) => {
      const cid = makeCoreId(ad) || ad.toLocaleUpperCase('tr-TR').trim();
      if (!cid || cid.length < 2) return null;
      if (!map.has(cid)) {
        map.set(cid, { ad: kayit?.ad || ad, kayit: kayit || null, egitimSayisi: 0, allNames: new Set([ad]) });
      } else {
        const item = map.get(cid);
        item.allNames.add(ad);
        // Daha bilgili kayıt varsa onunla güncelle (foto + unvan tercih)
        if (kayit) {
          if (!item.kayit) {
            item.kayit = kayit;
            item.ad = kayit.ad || item.ad;
          } else if (kayit.fotoURL && !item.kayit.fotoURL) {
            item.kayit = kayit;
            item.ad = kayit.ad || item.ad;
          } else if (kayit.unvan && !item.kayit.unvan) {
            // Foto eşit ama unvan farklı → en uzun unvanı tut
            item.kayit = { ...item.kayit, unvan: kayit.unvan };
          }
        }
      }
      return cid;
    };

    // Firestore kayıtlarını ekle
    (konusmacilar || []).forEach(k => {
      if (k.ad) addOrMerge(k.ad, k);
    });

    // Takvimde geçen isimleri ekle + eğitim sayar
    takvim.forEach(e => {
      splitEgitmen(e.egitmen).forEach(ad => {
        const cid = addOrMerge(ad, null);
        if (cid && map.has(cid)) map.get(cid).egitimSayisi += 1;
      });
    });

    return [...map.values()]
      .filter(v => v.ad && v.ad.length >= 2)
      .sort((a, b) => {
        if (b.egitimSayisi !== a.egitimSayisi) return b.egitimSayisi - a.egitimSayisi;
        return a.ad.localeCompare(b.ad, 'tr-TR');
      });
  }, [takvim, konusmacilar]);

  // Arama + favori filtresi
  const filtrelenmis = useMemo(() => {
    let arr = tumKonusmacilar;
    if (sadeceFav) {
      arr = arr.filter(k => {
        const cid = makeCoreId(k.ad);
        return cid && takipSet.has(cid);
      });
    }
    if (arama.trim()) {
      const q = arama.toLocaleUpperCase('tr-TR');
      arr = arr.filter(k => {
        const ad = (k.ad || '').toLocaleUpperCase('tr-TR');
        const unvan = (k.kayit?.unvan || '').toLocaleUpperCase('tr-TR');
        return ad.includes(q) || unvan.includes(q);
      });
    }
    return arr;
  }, [tumKonusmacilar, arama, sadeceFav, takipSet]);

  if (loading) return <LoadingProgress />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Pull-to-refresh göstergesi (mobile) */}
      {pullY > 0 && (
        <div style={{ height: `${pullY}px` }}
          className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-end justify-center pb-2 bg-gradient-to-b from-purple-950 to-purple-900 transition-[height]">
          <RotateCw className={`w-6 h-6 text-amber-300 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? '' : `rotate(${Math.min(pullY * 3, 360)}deg)` }} />
        </div>
      )}

      {/* Header */}
      <div className="pt-6 pb-4 px-4 sticky top-0 z-30 bg-gradient-to-b from-purple-900/95 to-purple-900/85 backdrop-blur-md border-b border-white/10"
        style={{ transform: `translateY(${pullY * 0.5}px)` }}>
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <button onClick={() => navigate('/takvim')} aria-label="Takvime dön"
              className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
              <ArrowLeft className="w-4 h-4 mr-1.5" />Takvim
            </button>
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display">Eğitmenler</h1>
          <p className="text-purple-200 mt-1">{tumKonusmacilar.length} eğitmen, {takvim.length} eğitim</p>
          {/* Arama */}
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
            <input type="text" ref={aramaRef} value={arama} onChange={e => setArama(e.target.value)}
              placeholder="Eğitmen ara… ( / ile odaklan)"
              className="w-full bg-white/15 backdrop-blur border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300 rounded-xl pl-12 pr-10 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all" />
            {arama && (
              <button onClick={() => setArama('')} aria-label="Aramayı temizle"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white spring-tap">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Favori filtresi */}
          {favSayisi > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setSadeceFav(s => !s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold spring-tap transition-all ${
                  sadeceFav ? 'bg-yellow-400 text-gray-900' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                }`}>
                <Star className="w-3.5 h-3.5" fill={sadeceFav ? 'currentColor' : 'none'} />
                Sadece favorilerim ({favSayisi})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 py-6 pb-bottom-nav">
        <div className="container mx-auto max-w-7xl">
          {filtrelenmis.length === 0 ? (
            <div className="text-center py-16 text-white/50">
              <User className="w-20 h-20 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Aradığınız eğitmen bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {filtrelenmis.map(({ ad, kayit, egitimSayisi }) => {
                const cid = makeCoreId(ad);
                const isFav = cid && takipSet.has(cid);
                return (
                  <button key={ad} onClick={() => setSecili({ ad, kayit })}
                    className="relative bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400 rounded-xl p-3 transition-all hover-lift spring-tap text-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                    {isFav && (
                      <Star className="absolute top-2 right-2 w-4 h-4 text-yellow-400 drop-shadow" fill="currentColor" />
                    )}
                    {kayit?.fotoURL ? (
                      <img src={kayit.fotoURL} alt={kayit.ad || ad} loading="lazy" decoding="async"
                        className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full object-cover object-top border-2 border-purple-300/40 shadow-sm group-hover:border-amber-400 group-hover:scale-105 transition-all" />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-white/10 flex items-center justify-center border-2 border-purple-300/40 group-hover:border-amber-400 group-hover:scale-105 transition-all" aria-hidden="true">
                        <User className="w-10 h-10 text-white/40" />
                      </div>
                    )}
                    <div className="mt-2 text-white font-semibold text-xs sm:text-sm leading-tight">{kayit?.ad || ad}</div>
                    {kayit?.unvan && <div className="text-[10px] text-amber-300 mt-0.5 line-clamp-1">{kayit.unvan}</div>}
                    <div className="mt-1 text-[10px] text-purple-200">{egitimSayisi} eğitim</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {secili && <KonusmaciFullModal {...secili} takvim={takvim} onClose={() => setSecili(null)} />}

      <KeyboardShortcutsHelp acik={yardimAcik} onClose={() => setYardimAcik(false)} />
    </div>
  );
};

export default KonusmacilarSayfasi;
