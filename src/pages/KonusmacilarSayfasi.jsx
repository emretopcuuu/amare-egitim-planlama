// /konusmacilar — Tüm konuşmacıların grid sayfası
import React, { useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData, makeSafeId, makeCoreId } from '../context/DataContext';
import { coreIdFuzzyEslesir, gecerliEgitmenMi } from '../utils/egitmenFotoMatch';
import { useTranslation } from '../context/LanguageContext';
import { ArrowLeft, User, Search, X, Loader2, Star, RotateCw, SlidersHorizontal, ArrowDownUp, LayoutGrid, List, Sparkles, ArrowRight, Calendar, Eye } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LoadingProgress from '../components/LoadingProgress';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import { useTakipEgitmenler } from '../utils/takip';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import { usePullToRefresh } from '../utils/usePullToRefresh';
import { haptic } from '../utils/mobileHelpers';
import { useInfiniteScroll } from '../utils/useInfiniteScroll';
import { useSmartBack } from '../utils/navigation';
import LazyImage from '../components/LazyImage';
import { useDocumentTitle } from '../utils/useDocumentTitle';
import { tahminEt } from '../utils/stringSimilarity';
import { useToast } from '../components/Toast';

// Sıralama opsiyonları — etiketler t() ile dinamik dönüşür
const SIRALAMA_KODLARI = [
  { kod: 'aktif', tKey: 'trainers_sort_active', etiket: 'En Aktif', ikon: '🔥' },
  { kod: 'cok_egitim', tKey: 'trainers_sort_active', etiket: 'Çok Eğitim', ikon: '📈' },
  { kod: 'alfabe', tKey: 'trainers_sort_az', etiket: 'A — Z', ikon: '🔤' },
  { kod: 'alfabe_zy', tKey: 'trainers_sort_za', etiket: 'Z — A', ikon: '🔠' },
  { kod: 'yeni', tKey: 'trainers_sort_active', etiket: 'Yeni Eklenenler', ikon: '🌱' },
];

const splitEgitmen = (e) => {
  if (!e) return [];
  return e.normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()).filter(n => n.length > 1);
};

const KonusmacilarSayfasi = () => {
  useDocumentTitle('Eğitmenler', 'Tüm eğitmenler · uzmanlık alanları');
  const navigate = useNavigate();
  const geri = useSmartBack('/takvim');
  const { takvim, konusmacilar, loading } = useData();
  const { t } = useTranslation();
  const [arama, setArama] = useState('');
  const [secili, setSecili] = useState(null);
  const [sadeceFav, setSadeceFav] = useState(false);
  const [siralama, setSiralama] = useState('aktif');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [yardimAcik, setYardimAcik] = useState(false);
  const [goruntuMode, setGoruntuMode] = useState('grid'); // grid | liste
  const [hoverId, setHoverId] = useState(null);
  const aramaRef = useRef(null);
  const { takipSet, toggle: takipToggle, count: favSayisi } = useTakipEgitmenler();
  const { toast } = useToast();

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
      let cid = makeCoreId(ad) || ad.toLocaleUpperCase('tr-TR').trim();
      if (!cid || cid.length < 2) return null;
      // 2026-06-09: Fuzzy birleştirme — "M.İLKER YILMAZ" eklenirken "MAHMUT İLKER YILMAZ"
      // zaten map'te varsa onunla birleş (kısaltma yüzünden ayrı kart oluşmasın).
      // Konuşmacılar önce eklendiği için fotolu/tam isim kayıt map'te hazır olur.
      if (!map.has(cid)) {
        for (const mevcutCid of map.keys()) {
          if (coreIdFuzzyEslesir(cid, mevcutCid)) { cid = mevcutCid; break; }
        }
      }
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

    // Firestore kayıtlarını ekle (placeholder/marka kayıtları hariç)
    (konusmacilar || []).forEach(k => {
      if (k.ad && gecerliEgitmenMi(k.ad)) addOrMerge(k.ad, k);
    });

    // Takvimde geçen isimleri ekle + eğitim sayar
    // 2026-06-09: "Eğitmenler belirlenecek", "AMARE" vb. placeholder'ları filtrele
    takvim.forEach(e => {
      splitEgitmen(e.egitmen).filter(gecerliEgitmenMi).forEach(ad => {
        const cid = addOrMerge(ad, null);
        if (cid && map.has(cid)) map.get(cid).egitimSayisi += 1;
      });
    });

    return [...map.values()]
      .filter(v => v.ad && v.ad.length >= 2);
  }, [takvim, konusmacilar]);

  // Arama + favori filtresi + sıralama
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
    // Sıralama
    const sorted = [...arr];
    if (siralama === 'aktif' || siralama === 'cok_egitim') {
      sorted.sort((a, b) => {
        if (b.egitimSayisi !== a.egitimSayisi) return b.egitimSayisi - a.egitimSayisi;
        return a.ad.localeCompare(b.ad, 'tr-TR');
      });
    } else if (siralama === 'alfabe') {
      sorted.sort((a, b) => a.ad.localeCompare(b.ad, 'tr-TR'));
    } else if (siralama === 'alfabe_zy') {
      sorted.sort((a, b) => b.ad.localeCompare(a.ad, 'tr-TR'));
    } else if (siralama === 'yeni') {
      // Yeni eklenenler — doc id (timestamp benzeri) ters sıralı
      sorted.sort((a, b) => {
        const aId = a.kayit?.id || '';
        const bId = b.kayit?.id || '';
        return bId.localeCompare(aId);
      });
    }
    return sorted;
  }, [tumKonusmacilar, arama, sadeceFav, takipSet, siralama]);

  const aktifFiltreSayisi = (sadeceFav ? 1 : 0) + (siralama !== 'aktif' ? 1 : 0) + (arama.trim() ? 1 : 0);

  // #10 — Arama bulunamadığında tahmin et
  const tahminler = useMemo(() => {
    if (!arama.trim() || filtrelenmis.length > 0) return [];
    return tahminEt(arama.trim(), tumKonusmacilar, (k) => k.ad, 3, 0.45);
  }, [arama, filtrelenmis.length, tumKonusmacilar]);

  // #3 — Hover preview için son eğitim cache'i
  const sonEgitimMap = useMemo(() => {
    const map = new Map();
    const ksByCore = new Map(tumKonusmacilar.map(k => [makeCoreId(k.ad), k]));
    (takvim || []).forEach(e => {
      splitEgitmen(e.egitmen).forEach(ad => {
        const cid = makeCoreId(ad);
        if (!cid) return;
        const cur = map.get(cid);
        // En yeni tarihi tut (tarih DD.MM.YYYY)
        if (!cur || (e.tarih || '') > (cur.tarih || '')) {
          map.set(cid, { tarih: e.tarih, egitim: e.egitim });
        }
      });
    });
    return map;
  }, [takvim, tumKonusmacilar]);

  // #4 — Hızlı favori toggle — modal açmadan
  const favToggle = (e, k) => {
    e.stopPropagation();
    e.preventDefault();
    const cid = makeCoreId(k.ad);
    if (!cid) return;
    const oncekiDurum = takipSet.has(cid);
    takipToggle(cid);
    haptic(10);
    toast(
      oncekiDurum
        ? `${k.kayit?.ad || k.ad} favorilerden çıkarıldı`
        : `${k.kayit?.ad || k.ad} favorilere eklendi`,
      { type: oncekiDurum ? 'info' : 'success' }
    );
  };

  // Infinite scroll — 30'ar batch
  const { visibleItems: gorunenler, sentinelRef, hasMore } = useInfiniteScroll(filtrelenmis, 30);

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
            <button onClick={geri} aria-label="Geri"
              className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
              <ArrowLeft className="w-4 h-4 mr-1.5" />Geri
            </button>
            <LanguageSwitcher />
          </div>

          {/* #1 — Hero başlık + sayılar (küçültüldü, alana hava verildi) */}
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white font-display">
              {t('trainers_title')}
              <span className="text-amber-300 font-light ml-2 text-base md:text-lg">
                · {tumKonusmacilar.length} {t('trainers_count_suffix')}
              </span>
            </h1>
          </div>

          {/* #1 — HERO SEARCH: büyük, ortada, altın glow */}
          <div className="relative mb-3 flex gap-2 items-stretch">
            <div className="relative flex-1 group">
              {/* Altın halo glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400/30 via-amber-300/40 to-amber-400/30 rounded-2xl blur-md opacity-50 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-300" />
                <input type="text" ref={aramaRef} value={arama} onChange={e => setArama(e.target.value)}
                  placeholder={`${tumKonusmacilar.length} eğitmenin arasından ara... ( / ile odaklan)`}
                  className="w-full bg-white/15 backdrop-blur border-2 border-amber-300/30 focus:border-amber-400 text-white placeholder-purple-200/70 rounded-2xl pl-12 pr-10 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all shadow-lg" />
                {arama && (
                  <button onClick={() => setArama('')} aria-label="Aramayı temizle"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white spring-tap w-7 h-7 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <button onClick={() => { haptic(8); setSheetOpen(true); }} aria-label={t('trainers_filters')}
              className="md:hidden relative bg-white/15 hover:bg-white/25 border-2 border-amber-300/30 text-white rounded-2xl px-3 py-3 spring-tap inline-flex items-center gap-1.5 text-sm font-semibold">
              <SlidersHorizontal className="w-5 h-5" />
              {aktifFiltreSayisi > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-gray-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {aktifFiltreSayisi}
                </span>
              )}
            </button>
          </div>

          {/* Desktop: sıralama dropdown + favori + view toggle */}
          <div className="hidden md:flex mt-3 flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {/* #6 — Genişletilmiş sıralama */}
              <div className="relative">
                <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300 pointer-events-none" />
                <select value={siralama} onChange={e => setSiralama(e.target.value)}
                  className="bg-white/15 backdrop-blur border-2 border-white/20 focus:border-amber-400 text-white rounded-xl pl-9 pr-8 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30 appearance-none cursor-pointer">
                  {SIRALAMA_KODLARI.map(s => (
                    <option key={s.kod} value={s.kod} className="bg-purple-900">
                      {s.ikon} {s.etiket}
                    </option>
                  ))}
                </select>
              </div>
              {favSayisi > 0 && (
                <button onClick={() => setSadeceFav(s => !s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold spring-tap transition-all ${
                    sadeceFav ? 'bg-yellow-400 text-gray-900' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }`}>
                  <Star className="w-3.5 h-3.5" fill={sadeceFav ? 'currentColor' : 'none'} />
                  {t('trainers_only_favs')} ({favSayisi})
                </button>
              )}
              {/* Aktif sıralama göstergesi */}
              <span className="text-purple-300/50 text-[11px] italic inline-flex items-center">
                {filtrelenmis.length} sonuç
              </span>
            </div>

            {/* #7 — Liste / Grid view toggle */}
            <div className="inline-flex items-center bg-white/10 border border-white/20 rounded-lg p-0.5">
              <button onClick={() => setGoruntuMode('grid')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  goruntuMode === 'grid' ? 'bg-amber-400 text-purple-900 shadow' : 'text-white/70 hover:text-white'
                }`}
                title="Grid görünüm">
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setGoruntuMode('liste')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  goruntuMode === 'liste' ? 'bg-amber-400 text-purple-900 shadow' : 'text-white/70 hover:text-white'
                }`}
                title="Liste görünüm">
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid / Liste */}
      <div className="px-4 py-6 pb-bottom-nav">
        <div className="container mx-auto max-w-7xl">
          {filtrelenmis.length === 0 ? (
            // #10 — Akıllı boş sonuç: tahmin önerisi + CTA
            <div className="text-center py-12 sm:py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-400/15 border border-amber-300/30 mb-4">
                <Search className="w-10 h-10 text-amber-300/60" />
              </div>
              {arama.trim() ? (
                <>
                  <h3 className="text-white text-lg sm:text-xl font-bold mb-1">
                    "<span className="text-amber-300">{arama}</span>" ile eşleşen yok
                  </h3>
                  {tahminler.length > 0 ? (
                    <>
                      <p className="text-purple-200/80 text-sm mb-5">
                        Belki bunlardan birini mi demek istedin?
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-md mx-auto">
                        {tahminler.map(k => (
                          <button key={k.ad} onClick={() => setArama(k.ad)}
                            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold text-sm px-4 py-2 rounded-full shadow-lg transition-all spring-tap">
                            <Sparkles className="w-3.5 h-3.5" />
                            {k.kayit?.ad || k.ad}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-purple-200/70 text-sm mb-6 max-w-md mx-auto">
                      Burada arama eşleşmedi. Belki eğitim takvimine bakmak istersin?
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button onClick={() => setArama('')}
                      className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold px-4 py-2 rounded-full transition-all spring-tap">
                      <RotateCw className="w-3.5 h-3.5" />
                      Aramayı temizle
                    </button>
                    <button onClick={() => navigate('/takvim')}
                      className="inline-flex items-center gap-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/30 text-xs font-semibold px-4 py-2 rounded-full transition-all spring-tap">
                      <Calendar className="w-3.5 h-3.5" />
                      Eğitim Takvimi
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </>
              ) : sadeceFav ? (
                <>
                  <h3 className="text-white text-lg sm:text-xl font-bold mb-1">
                    Henüz favorin yok
                  </h3>
                  <p className="text-purple-200/80 text-sm mb-5 max-w-md mx-auto">
                    Eğitmenlerin yanındaki ⭐ ikonuna tıkla — burada birikecekler.
                  </p>
                  <button onClick={() => setSadeceFav(false)}
                    className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold text-sm px-4 py-2 rounded-full shadow-lg transition-all spring-tap">
                    Tüm eğitmenleri göster
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <p className="text-white/60 text-lg">{t('trainers_not_found')}</p>
              )}
            </div>
          ) : goruntuMode === 'liste' ? (
            // #7 — LISTE GÖRÜNÜM
            <div className="space-y-2 max-w-4xl mx-auto">
              {gorunenler.map(({ ad, kayit, egitimSayisi }) => {
                const cid = makeCoreId(ad);
                const isFav = cid && takipSet.has(cid);
                const sonEg = sonEgitimMap.get(cid);
                return (
                  <button key={ad} onClick={() => navigate(`/lider/${makeCoreId(ad)}`)}
                    className="relative w-full bg-white/5 hover:bg-white/12 border border-white/10 hover:border-amber-400/60 rounded-xl p-3 sm:p-4 transition-all spring-tap text-left flex items-center gap-3 sm:gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                    {kayit?.fotoURL ? (
                      <LazyImage src={kayit.fotoURL} alt={kayit.ad || ad}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-top border-2 border-purple-300/40 group-hover:border-amber-400 transition-all flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 flex items-center justify-center border-2 border-purple-300/40 group-hover:border-amber-400 transition-all flex-shrink-0" aria-hidden="true">
                        <User className="w-7 h-7 text-white/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm sm:text-base leading-tight truncate">{kayit?.ad || ad}</div>
                      {kayit?.unvan && <div className="text-xs text-amber-300 mt-0.5 truncate">{kayit.unvan}</div>}
                      <div className="text-[11px] text-purple-200/70 mt-1 truncate">
                        {egitimSayisi} {t('trainers_count_label')}
                        {sonEg?.egitim && <> · <span className="italic">Son: {sonEg.egitim}</span></>}
                      </div>
                    </div>
                    {/* #4 — Hızlı favori toggle */}
                    <button onClick={(e) => favToggle(e, { ad, kayit })}
                      className={`flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full transition-all spring-tap ${
                        isFav ? 'bg-yellow-400 text-purple-900 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-yellow-300'
                      }`}
                      aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}>
                      <Star className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                    <ArrowRight className="w-4 h-4 text-amber-300/60 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                );
              })}
              {hasMore && (
                <div ref={sentinelRef} className="py-8 text-center text-white/40 text-xs">
                  ({gorunenler.length} / {filtrelenmis.length})
                </div>
              )}
            </div>
          ) : (
            // GRID GÖRÜNÜM (default)
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {gorunenler.map(({ ad, kayit, egitimSayisi }) => {
                  const cid = makeCoreId(ad);
                  const isFav = cid && takipSet.has(cid);
                  const sonEg = sonEgitimMap.get(cid);
                  const isHovered = hoverId === cid;
                  return (
                    <div key={ad} className="relative"
                      onMouseEnter={() => setHoverId(cid)}
                      onMouseLeave={() => setHoverId(null)}>
                      <button onClick={() => navigate(`/lider/${makeCoreId(ad)}`)}
                        className="relative w-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400 rounded-xl p-3 transition-all hover-lift spring-tap text-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                        {kayit?.fotoURL ? (
                          <LazyImage src={kayit.fotoURL} alt={kayit.ad || ad}
                            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full object-top border-2 border-purple-300/40 shadow-sm group-hover:border-amber-400 group-hover:scale-105 transition-all" />
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-white/10 flex items-center justify-center border-2 border-purple-300/40 group-hover:border-amber-400 group-hover:scale-105 transition-all" aria-hidden="true">
                            <User className="w-10 h-10 text-white/40" />
                          </div>
                        )}
                        <div className="mt-2 text-white font-semibold text-xs sm:text-sm leading-tight">{kayit?.ad || ad}</div>
                        {kayit?.unvan && <div className="text-[10px] text-amber-300 mt-0.5 line-clamp-1">{kayit.unvan}</div>}
                        <div className="mt-1 text-[10px] text-purple-200">{egitimSayisi} {t('trainers_count_label')}</div>
                      </button>
                      {/* #4 — Hızlı favori toggle (kart üstünde) */}
                      <button onClick={(e) => favToggle(e, { ad, kayit })}
                        className={`absolute top-2 right-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full transition-all spring-tap ${
                          isFav ? 'bg-yellow-400 text-purple-900 shadow-lg scale-100' : 'bg-purple-900/60 hover:bg-yellow-400 text-white/60 hover:text-purple-900 backdrop-blur-sm scale-90 hover:scale-100'
                        }`}
                        aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}>
                        <Star className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      {/* #3 — Hover preview (sadece desktop, son eğitim varsa) */}
                      {isHovered && sonEg?.egitim && (
                        <div className="hidden md:block absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 pointer-events-none animate-fade-in">
                          <div className="bg-purple-950/95 backdrop-blur-md border border-amber-300/40 rounded-xl p-3 shadow-2xl">
                            <div className="text-amber-300 text-[10px] uppercase tracking-wider font-bold mb-1 inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Son Eğitim
                            </div>
                            <div className="text-white text-xs font-semibold leading-snug line-clamp-2">
                              {sonEg.egitim}
                            </div>
                          </div>
                          {/* Alt ok */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-950/95 border-r border-b border-amber-300/40 rotate-45 -mt-1" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="py-8 text-center text-white/40 text-xs">
                  ({gorunenler.length} / {filtrelenmis.length})
                </div>
              )}
            </>
          )}
        </div>
      </div>


      {/* Mobile filter bottom sheet */}
      {sheetOpen && (
        <KonusmaciFilterSheet
          t={t}
          onClose={() => setSheetOpen(false)}
          onUygula={() => { haptic(15); setSheetOpen(false); }}
          siralama={siralama} setSiralama={setSiralama}
          sadeceFav={sadeceFav} setSadeceFav={setSadeceFav}
          favSayisi={favSayisi}
          filtrelenmisSayi={filtrelenmis.length}
          sifirla={() => { setSiralama('aktif'); setSadeceFav(false); setArama(''); }}
        />
      )}

      <KeyboardShortcutsHelp acik={yardimAcik} onClose={() => setYardimAcik(false)} />
    </div>
  );
};

// ─── Mobile filter bottom sheet ────────────────────────────────────────
const KonusmaciFilterSheet = ({ t, onClose, onUygula, siralama, setSiralama, sadeceFav, setSadeceFav, favSayisi, filtrelenmisSayi, sifirla }) => {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-purple-900 to-indigo-950 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="pt-3 pb-1 flex justify-center"><div className="w-12 h-1.5 rounded-full bg-white/30" /></div>
        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <h3 className="text-white text-lg font-bold inline-flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />{t('trainers_filters')}
          </h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {/* Sıralama */}
          <div>
            <div className="text-white/80 text-xs font-bold mb-2 inline-flex items-center gap-1.5 uppercase tracking-wider">
              <ArrowDownUp className="w-3.5 h-3.5" />{t('trainers_sort_title')}
            </div>
            <div className="flex flex-wrap gap-2">
              {SIRALAMA_KODLARI.map(s => (
                <button key={s.kod} onClick={() => { haptic(8); setSiralama(s.kod); }}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all spring-tap min-h-[36px] inline-flex items-center gap-1.5 ${
                    siralama === s.kod ? 'bg-amber-400 text-gray-900 shadow-md' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }`}>
                  <span>{s.ikon}</span>
                  {s.etiket}
                </button>
              ))}
            </div>
          </div>

          {/* Favori */}
          {favSayisi > 0 && (
            <div>
              <div className="text-white/80 text-xs font-bold mb-2 inline-flex items-center gap-1.5 uppercase tracking-wider">
                <Star className="w-3.5 h-3.5" />{t('trainers_filters')}
              </div>
              <button onClick={() => { haptic(8); setSadeceFav(s => !s); }}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all spring-tap min-h-[36px] inline-flex items-center gap-1.5 ${
                  sadeceFav ? 'bg-yellow-400 text-gray-900 shadow-md' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}>
                <Star className="w-3.5 h-3.5" fill={sadeceFav ? 'currentColor' : 'none'} />
                {t('trainers_only_favs')} ({favSayisi})
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex gap-2">
          <button onClick={sifirla}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl spring-tap text-sm inline-flex items-center justify-center gap-1.5">
            <RotateCw className="w-4 h-4" />{t('trainers_reset')}
          </button>
          <button onClick={onUygula}
            className="flex-[2] bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold py-3 rounded-xl spring-tap text-sm">
            {filtrelenmisSayi} {t('trainers_show_count')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KonusmacilarSayfasi;
