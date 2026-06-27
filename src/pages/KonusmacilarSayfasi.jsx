// /konusmacilar — Tüm konuşmacıların grid sayfası
import React, { useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData, makeSafeId, makeCoreId } from '../context/DataContext';
import { coreIdFuzzyEslesir, gecerliEgitmenMi } from '../utils/egitmenFotoMatch';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, Search, X, Loader2, Star, RotateCw, SlidersHorizontal, ArrowDownUp, LayoutGrid, List, Sparkles, ArrowRight, Calendar, Eye, TrendingUp, Zap, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { KARIYER_BASAMAKLARI, kariyerSira, kariyerTarih, ayFarki, sureMetni } from '../utils/kariyer';

// Sıralama opsiyonları — etiketler t() ile dinamik dönüşür
const SIRALAMA_KODLARI = [
  { kod: 'aktif', tKey: 'trainers_sort_active', etiket: 'En Aktif', ikon: '🔥' },
  { kod: 'rutbe', tKey: 'trainers_sort_active', etiket: 'Rütbe (yüksek→düşük)', ikon: '💎' },
  { kod: 'hizli', tKey: 'trainers_sort_active', etiket: 'En hızlı yükselenler', ikon: '⚡' },
  { kod: 'kidem', tKey: 'trainers_sort_active', etiket: 'En kıdemli', ikon: '🎖️' },
  { kod: 'cok_egitim', tKey: 'trainers_sort_active', etiket: 'Çok Eğitim', ikon: '📈' },
  { kod: 'alfabe', tKey: 'trainers_sort_az', etiket: 'A — Z', ikon: '🔤' },
  { kod: 'alfabe_zy', tKey: 'trainers_sort_za', etiket: 'Z — A', ikon: '🔠' },
  { kod: 'yeni', tKey: 'trainers_sort_active', etiket: 'Yeni Eklenenler', ikon: '🌱' },
];

// Liderin Amare kariyerini çöz: kariyerGecmis varsa son basamak, yoksa unvan rütbe mi?
const rutbeCoz = (kayit) => {
  const kg = Array.isArray(kayit?.kariyerGecmis) ? kayit.kariyerGecmis : [];
  let kariyer = kg.length ? kg[kg.length - 1].kariyer : null;
  const unvan = kayit?.unvan || '';
  if (!kariyer && kariyerSira(unvan) >= 0) kariyer = unvan;
  const rankIdx = kariyer ? kariyerSira(kariyer) : -1;
  const meslek = (unvan && kariyerSira(unvan) < 0) ? unvan : null;
  return { rankIdx, kariyer: rankIdx >= 0 ? KARIYER_BASAMAKLARI[rankIdx] : null, meslek };
};

// Rütbe → renk/tier stili (yükseldikçe daha parlak)
const rutbeStil = (idx) => {
  if (idx >= 13) return 'bg-gradient-to-r from-fuchsia-500/30 to-amber-400/30 text-amber-100 border-amber-300/50';
  if (idx >= 10) return 'bg-amber-400/20 text-amber-200 border-amber-300/40';
  if (idx >= 9) return 'bg-cyan-400/15 text-cyan-100 border-cyan-300/40';
  if (idx >= 6) return 'bg-indigo-400/15 text-indigo-100 border-indigo-300/30';
  if (idx >= 2) return 'bg-white/10 text-purple-100 border-white/20';
  return 'bg-white/5 text-white/60 border-white/10';
};
const tierBilgi = (idx) => {
  if (idx == null || idx < 0) return { key: 'yok', label: 'Kariyer verisi yok' };
  if (idx >= 13) return { key: 'pres', label: 'Presidential Diamond' };
  if (idx >= 10) return { key: 'star', label: 'Star Diamond' };
  if (idx >= 9) return { key: 'dia', label: 'Diamond' };
  if (idx >= 6) return { key: 'leader', label: 'Leader Kademesi' };
  if (idx >= 2) return { key: 'base', label: 'Bronze — Platinum' };
  return { key: 'brand', label: 'Brand Partner / Builder' };
};
// "PRESIDENTIAL DIAMOND" → "Presidential Diamond" (İngilizce rütbe adları — düz casing, "Dıamond" olmasın)
const rutbeYazi = (r) => (r || '').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
// Rütbeye göre foto halkası rengi (hiyerarşi pekişir)
const rutbeHalka = (idx) => {
  if (idx >= 13) return 'border-fuchsia-300';
  if (idx >= 10) return 'border-amber-300';
  if (idx >= 9) return 'border-cyan-300';
  if (idx >= 6) return 'border-indigo-300';
  if (idx >= 2) return 'border-purple-300/60';
  return 'border-purple-300/40';
};

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
  const [rutbeFiltre, setRutbeFiltre] = useState(null); // hız şeridinden seçilen rütbe idx
  const aramaRef = useRef(null);
  const { takipSet, toggle: takipToggle, count: favSayisi } = useTakipEgitmenler();
  const { toast } = useToast();
  const { email: girisEmail } = useAuth();

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

  // Kariyer haritası — coreId → { rankIdx, kariyer, meslek, katilim, suresAy, tenureAy, veri }
  const kariyerMap = useMemo(() => {
    const m = new Map();
    tumKonusmacilar.forEach(({ ad, kayit }) => {
      const cid = makeCoreId(ad);
      const r = rutbeCoz(kayit);
      const katilim = kariyerTarih(kayit?.katilimTarihi);
      const kg = Array.isArray(kayit?.kariyerGecmis) ? kayit.kariyerGecmis : [];
      let suresAy = null;
      if (katilim && kg.length) { const son = kariyerTarih(kg[kg.length - 1].tarih); if (son) suresAy = ayFarki(katilim, son) + 1; }
      const tenureAy = katilim ? ayFarki(katilim, new Date()) : null;
      m.set(cid, { ...r, katilim, suresAy, tenureAy, veri: kg.length > 0 });
    });
    return m;
  }, [tumKonusmacilar]);

  // İstatistik + benchmark (rütbe başına ortalama ay) + veri tamamlanma %
  const istatistik = useMemo(() => {
    const perRank = {};
    const tenureler = [];
    let veriOlan = 0, diamondPlus = 0, enHizliDiamond = null;
    const diaIdx = kariyerSira('DIAMOND');
    tumKonusmacilar.forEach(({ ad, kayit }) => {
      const info = kariyerMap.get(makeCoreId(ad)); if (!info) return;
      if (info.rankIdx >= diaIdx) diamondPlus++;
      if (info.tenureAy != null) tenureler.push(info.tenureAy);
      const kg = Array.isArray(kayit?.kariyerGecmis) ? kayit.kariyerGecmis : [];
      if (kg.length && info.katilim) {
        veriOlan++;
        kg.forEach(s => {
          const dt = kariyerTarih(s.tarih); if (!dt) return;
          const ay = ayFarki(info.katilim, dt) + 1; const si = kariyerSira(s.kariyer); if (si < 0) return;
          (perRank[si] || (perRank[si] = [])).push(ay);
          if (si === diaIdx && (enHizliDiamond == null || ay < enHizliDiamond)) enHizliDiamond = ay;
        });
      }
    });
    const ortRutbe = {};
    Object.entries(perRank).forEach(([k, a]) => { if (a.length >= 3) ortRutbe[k] = Math.round(a.reduce((x, y) => x + y, 0) / a.length); });
    const avgTenure = tenureler.length ? Math.round(tenureler.reduce((a, b) => a + b, 0) / tenureler.length) : null;
    const toplam = tumKonusmacilar.length;
    return { ortRutbe, veriOlan, toplam, tamamlanma: toplam ? Math.round(veriOlan / toplam * 100) : 0, diamondPlus, avgTenure, enHizliDiamond };
  }, [tumKonusmacilar, kariyerMap]);

  // Arama + favori filtresi + sıralama
  const filtrelenmis = useMemo(() => {
    let arr = tumKonusmacilar;
    if (rutbeFiltre != null) arr = arr.filter(k => kariyerMap.get(makeCoreId(k.ad))?.rankIdx === rutbeFiltre);
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
        const info = kariyerMap.get(makeCoreId(k.ad));
        const rutbe = (info?.kariyer || '').toLocaleUpperCase('tr-TR');
        const sehir = (k.kayit?.sehir || '').toLocaleUpperCase('tr-TR');
        return ad.includes(q) || unvan.includes(q) || rutbe.includes(q) || sehir.includes(q);
      });
    }
    // Sıralama
    const sorted = [...arr];
    if (siralama === 'aktif' || siralama === 'cok_egitim') {
      sorted.sort((a, b) => {
        if (b.egitimSayisi !== a.egitimSayisi) return b.egitimSayisi - a.egitimSayisi;
        return a.ad.localeCompare(b.ad, 'tr-TR');
      });
    } else if (siralama === 'rutbe') {
      sorted.sort((a, b) => {
        const ra = kariyerMap.get(makeCoreId(a.ad))?.rankIdx ?? -1, rb = kariyerMap.get(makeCoreId(b.ad))?.rankIdx ?? -1;
        if (rb !== ra) return rb - ra;
        return a.ad.localeCompare(b.ad, 'tr-TR');
      });
    } else if (siralama === 'hizli') {
      sorted.sort((a, b) => {
        const sa = kariyerMap.get(makeCoreId(a.ad))?.suresAy, sb = kariyerMap.get(makeCoreId(b.ad))?.suresAy;
        const av = sa == null ? Infinity : sa, bv = sb == null ? Infinity : sb;
        if (av !== bv) return av - bv;
        return a.ad.localeCompare(b.ad, 'tr-TR');
      });
    } else if (siralama === 'kidem') {
      sorted.sort((a, b) => {
        const ta = kariyerMap.get(makeCoreId(a.ad))?.tenureAy, tb = kariyerMap.get(makeCoreId(b.ad))?.tenureAy;
        return (tb == null ? -1 : tb) - (ta == null ? -1 : ta);
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
  }, [tumKonusmacilar, arama, sadeceFav, takipSet, siralama, rutbeFiltre, kariyerMap]);

  const aktifFiltreSayisi = (sadeceFav ? 1 : 0) + (siralama !== 'aktif' ? 1 : 0) + (arama.trim() ? 1 : 0) + (rutbeFiltre != null ? 1 : 0);

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

  // #9 — Keşif: yaklaşan eğitimi olan eğitmenler (en yakın tarih)
  const yaklasanEgitmenler = useMemo(() => {
    const parse = (t) => { const p = String(t || '').split('.').map(Number); if (p.length !== 3 || p.some(isNaN)) return null; const d = new Date(p[2], p[1] - 1, p[0]); return isNaN(d.getTime()) ? null : d; };
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const map = new Map();
    (takvim || []).forEach(e => {
      const d = parse(e.tarih); if (!d || d < now) return;
      splitEgitmen(e.egitmen).filter(gecerliEgitmenMi).forEach(ad => {
        const c = makeCoreId(ad); if (!c) return;
        const cur = map.get(c); if (!cur || d < cur.dt) map.set(c, { dt: d, egitim: e.egitim });
      });
    });
    const byCore = new Map(tumKonusmacilar.map(k => [makeCoreId(k.ad), k]));
    return [...map.entries()].map(([c, v]) => ({ cid: c, k: byCore.get(c), ...v })).filter(x => x.k).sort((a, b) => a.dt - b.dt).slice(0, 14);
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
          {/* #9 — Keşif: yaklaşan eğitimi olan eğitmenler (sadece arama/filtre yokken) */}
          {!arama.trim() && rutbeFiltre == null && !sadeceFav && yaklasanEgitmenler.length > 0 && (
            <div className="mb-5">
              <div className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-2 inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" />Yaklaşan eğitimi olan eğitmenler</div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {yaklasanEgitmenler.map(x => (
                  <button key={x.cid} onClick={() => navigate(`/lider/${x.cid}`)} className="flex-shrink-0 w-[72px] text-center group spring-tap">
                    <div className="relative w-16 h-16 mx-auto">
                      {x.k.kayit?.fotoURL
                        ? <LazyImage src={x.k.kayit.fotoURL} alt={x.k.ad} className="w-16 h-16 rounded-full object-top border-2 border-amber-300/50 group-hover:border-amber-400 transition-all" />
                        : <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border-2 border-amber-300/40"><User className="w-7 h-7 text-white/40" /></div>}
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-extrabold text-purple-900 bg-amber-400 px-1.5 py-0.5 rounded-full whitespace-nowrap shadow">{x.dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="mt-1.5 text-[10px] text-white/80 leading-tight line-clamp-2">{x.k.kayit?.ad || x.k.ad}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* #6 — İstatistik şeridi + veri tamamlanma (test) */}
          {istatistik.veriOlan > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-white/8 border border-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full"><User className="w-3.5 h-3.5 text-purple-200" />{istatistik.toplam} eğitmen</span>
              <span className="inline-flex items-center gap-1.5 bg-cyan-400/10 border border-cyan-300/30 text-cyan-100 text-xs font-semibold px-3 py-1.5 rounded-full">💎 {istatistik.diamondPlus} Diamond+</span>
              {istatistik.avgTenure != null && <span className="inline-flex items-center gap-1.5 bg-white/8 border border-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full"><Calendar className="w-3.5 h-3.5 text-amber-300" />ort. kıdem {sureMetni(istatistik.avgTenure)}</span>}
              {istatistik.enHizliDiamond != null && <span className="inline-flex items-center gap-1.5 bg-amber-400/10 border border-amber-300/30 text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full"><Zap className="w-3.5 h-3.5" />en hızlı Diamond {sureMetni(istatistik.enHizliDiamond)}</span>}
              <span className="inline-flex items-center gap-1.5 bg-red-600/25 border border-red-400/60 text-red-100 text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.35)]" title="Kariyer verileri henüz tüm eğitmenler için tamamlanmadı — test aşamasında">⚠ TEST · Veriler yalnızca %{istatistik.tamamlanma} tamamlandı</span>
            </div>
          )}

          {/* #1 — Kariyer Hız Şeridi: rütbeye ortalama kaç ayda ulaşılıyor */}
          {Object.keys(istatistik.ortRutbe).length > 0 && (
            <div className="mb-5 rounded-2xl bg-gradient-to-br from-purple-950/60 to-indigo-950/40 border border-amber-300/20 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="text-amber-300 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"><TrendingUp className="w-4 h-4" />Eğitmenlerin ortalama kariyer süreleri</div>
                {rutbeFiltre != null && (
                  <button onClick={() => setRutbeFiltre(null)} className="text-[11px] text-purple-200 hover:text-white inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full"><X className="w-3 h-3" />filtreyi kaldır</button>
                )}
              </div>
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 pr-6">
                  {Object.keys(istatistik.ortRutbe).map(Number).sort((a, b) => a - b).map(i => {
                    const sel = rutbeFiltre === i;
                    return (
                      <button key={i} onClick={() => setRutbeFiltre(sel ? null : i)}
                        className={`flex-shrink-0 rounded-xl border px-3 py-2 text-center min-w-[96px] transition-all spring-tap ${rutbeStil(i)} ${sel ? 'ring-2 ring-amber-400 scale-105' : 'hover:brightness-125'}`}>
                        <div className="text-[10px] font-bold leading-tight line-clamp-1">{rutbeYazi(KARIYER_BASAMAKLARI[i])}</div>
                        <div className="text-sm font-extrabold mt-0.5">~{sureMetni(istatistik.ortRutbe[i])}</div>
                      </button>
                    );
                  })}
                </div>
                {/* sağ kenar fade — kaydırılabilir olduğunu belli eder */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-purple-950/90 to-transparent flex items-center justify-end">
                  <ChevronRight className="w-4 h-4 text-amber-300/70 animate-pulse" />
                </div>
              </div>
              <div className="text-[10px] text-purple-300/60 mt-2">Hangi kariyere ortalama ne kadar sürede ulaşıldı · {istatistik.veriOlan} liderin verisiyle · rütbeye tıkla → filtrele <span className="text-red-300/80">(tüm kayıtlar henüz dolmadığı için test aşamasındadır)</span></div>
            </div>
          )}

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
                const info = kariyerMap.get(cid);
                const benim = !!girisEmail && !!kayit?.email && girisEmail.toLowerCase() === String(kayit.email).toLowerCase();
                return (
                  <button key={ad} onClick={() => navigate(`/lider/${makeCoreId(ad)}`)}
                    className={`relative w-full rounded-xl p-3 sm:p-4 transition-all spring-tap text-left flex items-center gap-3 sm:gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${benim ? 'bg-amber-400/10 border-2 border-amber-400/70' : 'bg-white/5 hover:bg-white/12 border border-white/10 hover:border-amber-400/60'}`}>
                    {kayit?.fotoURL ? (
                      <LazyImage src={kayit.fotoURL} alt={kayit.ad || ad}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full object-top border-2 group-hover:border-amber-400 transition-all flex-shrink-0 ${rutbeHalka(info?.rankIdx ?? -1)}`} />
                    ) : (
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 flex items-center justify-center border-2 group-hover:border-amber-400 transition-all flex-shrink-0 ${rutbeHalka(info?.rankIdx ?? -1)}`} aria-hidden="true">
                        <User className="w-7 h-7 text-white/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm sm:text-base leading-tight truncate">{kayit?.ad || ad}{benim && <span className="ml-2 text-[9px] font-extrabold text-purple-900 bg-amber-400 px-1.5 py-0.5 rounded-full align-middle">★ BU SENSİN</span>}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {info?.kariyer
                          ? <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${rutbeStil(info.rankIdx)}`}>{rutbeYazi(info.kariyer)}</span>
                          : kayit?.unvan && <span className="text-xs text-amber-300 truncate">{kayit.unvan}</span>}
                        {info?.kariyer && info.meslek && <span className="text-[11px] text-purple-200/60 truncate">{info.meslek}</span>}
                        {info?.suresAy != null && <span className="text-[11px] text-emerald-300/80">· {sureMetni(info.suresAy)}da ulaştı</span>}
                      </div>
                      <div className="text-[11px] text-purple-200/70 mt-1 truncate">
                        {egitimSayisi} {t('trainers_count_label')}
                        {kayit?.sehir && <> · <span className="inline-flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{kayit.sehir}</span></>}
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
                {(() => {
                  let prevTier = null;
                  const nodes = [];
                  gorunenler.forEach(({ ad, kayit, egitimSayisi }) => {
                    const cid = makeCoreId(ad);
                    const isFav = cid && takipSet.has(cid);
                    const sonEg = sonEgitimMap.get(cid);
                    const isHovered = hoverId === cid;
                    const info = kariyerMap.get(cid);
                    const benim = !!girisEmail && !!kayit?.email && girisEmail.toLowerCase() === String(kayit.email).toLowerCase();
                    // #7 — Rütbe sıralamasında kademe başlıkları
                    if (siralama === 'rutbe') {
                      const tb = tierBilgi(info?.rankIdx);
                      if (tb.key !== prevTier) {
                        prevTier = tb.key;
                        nodes.push(
                          <div key={`grp-${tb.key}`} className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-6 mt-3 first:mt-0">
                            <div className="flex items-center gap-2"><span className="text-amber-300 text-xs font-bold uppercase tracking-wider">{tb.label}</span><div className="flex-1 h-px bg-white/10" /></div>
                          </div>
                        );
                      }
                    }
                    nodes.push(
                      <div key={ad} className="relative"
                        onMouseEnter={() => setHoverId(cid)}
                        onMouseLeave={() => setHoverId(null)}>
                        <button onClick={() => navigate(`/lider/${makeCoreId(ad)}`)}
                          className={`relative w-full min-h-[182px] flex flex-col items-center rounded-xl p-3 transition-all hover-lift spring-tap text-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${benim ? 'bg-amber-400/10 border-2 border-amber-400/70' : 'bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400'}`}>
                          {/* #7 — Bu sensin rozeti */}
                          {benim && <span className="absolute top-2 left-2 z-10 text-[9px] font-extrabold text-purple-900 bg-amber-400 px-1.5 py-0.5 rounded-full">★ BU SENSİN</span>}
                          {kayit?.fotoURL ? (
                            <LazyImage src={kayit.fotoURL} alt={kayit.ad || ad}
                              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-top border-2 shadow-sm group-hover:border-amber-400 group-hover:scale-105 transition-all ${rutbeHalka(info?.rankIdx ?? -1)}`} />
                          ) : (
                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 flex items-center justify-center border-2 group-hover:border-amber-400 group-hover:scale-105 transition-all ${rutbeHalka(info?.rankIdx ?? -1)}`} aria-hidden="true">
                              <User className="w-10 h-10 text-white/40" />
                            </div>
                          )}
                          <div className="mt-2 text-white font-semibold text-xs sm:text-sm leading-tight line-clamp-2">{kayit?.ad || ad}</div>
                          {info?.kariyer ? (
                            <div className="mt-1 flex flex-col items-center gap-0.5 w-full">
                              <span className={`inline-block max-w-full text-[9px] font-bold px-1.5 py-0.5 rounded-full border line-clamp-1 ${rutbeStil(info.rankIdx)}`}>{rutbeYazi(info.kariyer)}</span>
                              {info.meslek && <span className="text-[9px] text-purple-200/55 line-clamp-1 max-w-full">{info.meslek}</span>}
                            </div>
                          ) : kayit?.unvan ? (
                            <div className="text-[10px] text-amber-300 mt-0.5 line-clamp-1">{kayit.unvan}</div>
                          ) : null}
                          {kayit?.sehir && <div className="mt-0.5 text-[9px] text-purple-200/60 inline-flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{kayit.sehir}</div>}
                          <div className="mt-auto pt-1 text-[10px] text-purple-200">{benim ? 'Profilini düzenle →' : `${egitimSayisi} ${t('trainers_count_label')}`}</div>
                        </button>
                        {/* #4 — Hızlı favori toggle (kart üstünde) */}
                        <button onClick={(e) => favToggle(e, { ad, kayit })}
                          className={`absolute top-2 right-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full transition-all spring-tap ${
                            isFav ? 'bg-yellow-400 text-purple-900 shadow-lg scale-100' : 'bg-purple-900/60 hover:bg-yellow-400 text-white/60 hover:text-purple-900 backdrop-blur-sm scale-90 hover:scale-100'
                          }`}
                          aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}>
                          <Star className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                        {/* #5 — Hover preview: rütbe + kaçıncı ayda + son eğitim */}
                        {isHovered && (sonEg?.egitim || info?.kariyer) && (
                          <div className="hidden md:block absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 pointer-events-none animate-fade-in">
                            <div className="bg-purple-950/95 backdrop-blur-md border border-amber-300/40 rounded-xl p-3 shadow-2xl text-left">
                              {info?.kariyer && (
                                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${rutbeStil(info.rankIdx)}`}>{rutbeYazi(info.kariyer)}</span>
                                  {info.suresAy != null && <span className="text-emerald-300 text-[10px] font-semibold inline-flex items-center gap-0.5"><Zap className="w-3 h-3" />{sureMetni(info.suresAy)}da ulaştı</span>}
                                </div>
                              )}
                              {sonEg?.egitim && (
                                <>
                                  <div className="text-amber-300 text-[10px] uppercase tracking-wider font-bold mb-1 inline-flex items-center gap-1"><Calendar className="w-3 h-3" />Son Eğitim</div>
                                  <div className="text-white text-xs font-semibold leading-snug line-clamp-2">{sonEg.egitim}</div>
                                </>
                              )}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-950/95 border-r border-b border-amber-300/40 rotate-45 -mt-1" />
                          </div>
                        )}
                      </div>
                    );
                  });
                  return nodes;
                })()}
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
