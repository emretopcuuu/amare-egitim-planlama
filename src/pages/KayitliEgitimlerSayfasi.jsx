// /kayitli-egitimler — Vimeo kayıtlı eğitim arşivi
// Tüm filtreler: kategori (multi), eğitmen, dil, yıl, süre, sıralama, arama
// + Favoriler, izleme geçmişi, URL persist, sonsuz scroll, süre + plays rozetleri
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, X, Video, Play, Calendar, Tag, Loader2, User, Globe,
  Clock, Eye, Heart, Filter, History, ArrowDownUp, ChevronDown,
} from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, query, where, orderBy, limit as fbLimit, getDocs } from 'firebase/firestore';
import LanguageSwitcher from '../components/LanguageSwitcher';
import VideoOynatModal from '../components/VideoOynatModal';

// ─── Sabitler ────────────────────────────────────────────────────────────
const KATEGORILER = [
  'Liderlik', 'Satış', 'Motivasyon', 'Davet', 'Kapanış',
  'Sunum Teknikleri', 'Zaman Yönetimi', 'Kişisel Gelişim',
  'Sağlık', 'Finansal Özgürlük', 'Vizyon', 'Hikaye', 'Ürün Eğitimi',
];

const DIL_PATTERNS = [
  { kod: 'RU', etiket: 'Rusça',      regex: /russian|russia|русск|россия|russisch/i },
  { kod: 'EN', etiket: 'İngilizce',  regex: /\benglish\b|englisch|\(en\)|in english/i },
  { kod: 'DE', etiket: 'Almanca',    regex: /\bdeutsch\b|\bgerman\b|deutschland|germany|\(de\)/i },
  { kod: 'NL', etiket: 'Hollandaca', regex: /nederlands|\bdutch\b|nederland|holland|\(nl\)/i },
];
const DILLER = [
  { kod: 'all', etiket: 'Tüm Diller' },
  { kod: 'TR',  etiket: 'Türkçe' },
  { kod: 'RU',  etiket: 'Rusça' },
  { kod: 'EN',  etiket: 'İngilizce' },
  { kod: 'DE',  etiket: 'Almanca' },
  { kod: 'NL',  etiket: 'Hollandaca' },
];
const SURE_FILTRELERI = [
  { kod: 'all',   etiket: 'Tüm Süreler' },
  { kod: 'kisa',  etiket: '< 15 dk', min: 0,    max: 900 },
  { kod: 'orta',  etiket: '15-60 dk', min: 900,  max: 3600 },
  { kod: 'uzun',  etiket: '> 1 saat',  min: 3600, max: Infinity },
];
const SIRALAMALAR = [
  { kod: 'yeni',     etiket: 'En Yeni' },
  { kod: 'eski',     etiket: 'En Eski' },
  { kod: 'populer',  etiket: 'En Popüler' },
  { kod: 'alfabe',   etiket: 'Alfabetik' },
];

function detectDil(video) {
  const text = `${video.baslik || ''} ${video.aciklama || ''}`;
  for (const p of DIL_PATTERNS) {
    if (p.regex.test(text)) return p.kod;
  }
  return 'TR';
}

function formatSure(saniye) {
  if (!saniye || saniye < 1) return null;
  const h = Math.floor(saniye / 3600);
  const m = Math.floor((saniye % 3600) / 60);
  const s = Math.floor(saniye % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function formatPlays(n) {
  if (!n || n < 1) return null;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace('.0', '') + 'K';
  return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
}

const CACHE_KEY = 'amare_kayitli_egitimler_all_v3';
const TTL = 12 * 60 * 60 * 1000;
const FAV_KEY = 'amare_video_favoriler';
const HIST_KEY = 'amare_video_gecmis';
const HIST_MAX = 100;
const PAGE_SIZE = 60;

// Helper — localStorage Set
function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {}
}
function loadList(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

const KayitliEgitimlerSayfasi = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── State ─────────────────────────────────────────────────────────────
  const [tumVideolar, setTumVideolar] = useState([]);
  const [loading, setLoading] = useState(true);

  // URL-persistent filtreler
  const initKategoriSet = () => new Set((searchParams.get('kat') || '').split(',').filter(Boolean));
  const [kategoriSet, setKategoriSet] = useState(initKategoriSet);
  const [dilKod, setDilKod] = useState(searchParams.get('dil') || 'all');
  const [egitmenCoreId, setEgitmenCoreId] = useState(searchParams.get('eg') || '');
  const [yil, setYil] = useState(searchParams.get('yil') || 'all');
  const [sureKod, setSureKod] = useState(searchParams.get('sure') || 'all');
  const [siralama, setSiralama] = useState(searchParams.get('sira') || 'yeni');
  const [arama, setArama] = useState(searchParams.get('q') || '');
  const [sadeceFav, setSadeceFav] = useState(searchParams.get('fav') === '1');
  const [oynatilan, setOynatilan] = useState(null);

  // localStorage state
  const [favoriler, setFavoriler] = useState(() => loadSet(FAV_KEY));
  const [gecmis, setGecmis] = useState(() => new Set(loadList(HIST_KEY)));

  // Sonsuz scroll
  const [gosterilen, setGosterilen] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  // ─── URL persistence ──────────────────────────────────────────────────
  useEffect(() => {
    const p = {};
    if (kategoriSet.size > 0) p.kat = [...kategoriSet].join(',');
    if (dilKod !== 'all') p.dil = dilKod;
    if (egitmenCoreId) p.eg = egitmenCoreId;
    if (yil !== 'all') p.yil = yil;
    if (sureKod !== 'all') p.sure = sureKod;
    if (siralama !== 'yeni') p.sira = siralama;
    if (arama.trim()) p.q = arama.trim();
    if (sadeceFav) p.fav = '1';
    setSearchParams(p, { replace: true });
  }, [kategoriSet, dilKod, egitmenCoreId, yil, sureKod, siralama, arama, sadeceFav, setSearchParams]);

  // ─── Veri çekme ───────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < TTL && Array.isArray(data)) {
          setTumVideolar(data.map(v => v.dil ? v : { ...v, dil: detectDil(v) }));
          setLoading(false);
          return;
        }
      }
    } catch {}

    setLoading(true);
    (async () => {
      try {
        const q = query(
          collection(db, 'kayitli_egitimler'),
          where('kayeneFiltrelendi', '==', false),
          orderBy('tarih', 'desc'),
          fbLimit(2500)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => {
          const { transcript, ...rest } = d.data();
          const v = { id: d.id, ...rest };
          v.dil = detectDil(v);
          return v;
        });
        setTumVideolar(data);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
      } catch (err) {
        console.warn('[kayitli_egitimler] fetch hatası:', err.message);
        setTumVideolar([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Türev: yıl seçenekleri ───────────────────────────────────────────
  const yilOpsiyonlari = useMemo(() => {
    const map = new Map();
    for (const v of tumVideolar) {
      const y = (v.tarih || '').slice(0, 4);
      if (y && /^\d{4}$/.test(y)) {
        map.set(y, (map.get(y) || 0) + 1);
      }
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [tumVideolar]);

  // ─── Türev: eğitmen seçenekleri (alfabetik) ───────────────────────────
  const egitmenOpsiyonlari = useMemo(() => {
    const map = new Map();
    for (const v of tumVideolar) {
      const coreIds = v.egitmenler || [];
      const adlar = v.egitmenAdlari || [];
      coreIds.forEach((cid, i) => {
        if (!cid) return;
        if (!map.has(cid)) map.set(cid, { coreId: cid, ad: adlar[i] || cid, count: 0 });
        map.get(cid).count++;
      });
    }
    return [...map.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr-TR'));
  }, [tumVideolar]);

  // ─── Filtre + sıralama ────────────────────────────────────────────────
  const filtrelenmis = useMemo(() => {
    let arr = tumVideolar;
    if (kategoriSet.size > 0) {
      arr = arr.filter(v => {
        const kats = v.kategoriler || [];
        return kats.some(k => kategoriSet.has(k));
      });
    }
    if (dilKod !== 'all') arr = arr.filter(v => v.dil === dilKod);
    if (egitmenCoreId) arr = arr.filter(v => (v.egitmenler || []).includes(egitmenCoreId));
    if (yil !== 'all') arr = arr.filter(v => (v.tarih || '').startsWith(yil));
    if (sureKod !== 'all') {
      const f = SURE_FILTRELERI.find(s => s.kod === sureKod);
      if (f) arr = arr.filter(v => {
        const s = v.sure || 0;
        return s >= f.min && s < f.max;
      });
    }
    if (sadeceFav) arr = arr.filter(v => favoriler.has(v.id));
    if (arama.trim()) {
      const q = arama.toLocaleLowerCase('tr-TR');
      arr = arr.filter(v => {
        const b = (v.baslik || '').toLocaleLowerCase('tr-TR');
        const e = (v.egitmenAdlari || []).join(' ').toLocaleLowerCase('tr-TR');
        return b.includes(q) || e.includes(q);
      });
    }
    // Sıralama
    const sorted = [...arr];
    if (siralama === 'yeni')      sorted.sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
    else if (siralama === 'eski') sorted.sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
    else if (siralama === 'populer') sorted.sort((a, b) => (b.plays || 0) - (a.plays || 0));
    else if (siralama === 'alfabe') sorted.sort((a, b) => (a.baslik || '').localeCompare(b.baslik || '', 'tr-TR'));
    return sorted;
  }, [tumVideolar, kategoriSet, dilKod, egitmenCoreId, yil, sureKod, siralama, arama, sadeceFav, favoriler]);

  // Filtre değişince sayfa sıfırla
  useEffect(() => { setGosterilen(PAGE_SIZE); }, [kategoriSet, dilKod, egitmenCoreId, yil, sureKod, siralama, arama, sadeceFav]);

  // Sonsuz scroll: sentinel IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && gosterilen < filtrelenmis.length) {
        setGosterilen(g => Math.min(g + PAGE_SIZE, filtrelenmis.length));
      }
    }, { rootMargin: '400px' });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [filtrelenmis.length, gosterilen]);

  // ─── Aktif filtre sayısı ──────────────────────────────────────────────
  const aktifFiltreSayisi = [
    kategoriSet.size > 0,
    dilKod !== 'all',
    !!egitmenCoreId,
    yil !== 'all',
    sureKod !== 'all',
    sadeceFav,
    !!arama.trim(),
  ].filter(Boolean).length;

  const filtreleriTemizle = () => {
    setKategoriSet(new Set());
    setDilKod('all');
    setEgitmenCoreId('');
    setYil('all');
    setSureKod('all');
    setSadeceFav(false);
    setArama('');
  };

  // ─── Eylemler ─────────────────────────────────────────────────────────
  const toggleKategori = (k) => {
    setKategoriSet(s => {
      const next = new Set(s);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const toggleFavori = (e, vid) => {
    e.stopPropagation();
    setFavoriler(s => {
      const next = new Set(s);
      next.has(vid) ? next.delete(vid) : next.add(vid);
      saveSet(FAV_KEY, next);
      return next;
    });
  };

  const handleOynat = (v) => {
    // Geçmişe ekle (en son izlenen en başta)
    setGecmis(s => {
      const next = new Set(s);
      next.add(v.id);
      const list = [v.id, ...[...s].filter(x => x !== v.id)].slice(0, HIST_MAX);
      saveList(HIST_KEY, list);
      return new Set(list);
    });
    setOynatilan(v);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Header */}
      <div className="pt-6 pb-4 px-4 sticky top-0 z-30 bg-gradient-to-b from-purple-900/95 to-purple-900/85 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <button onClick={() => navigate('/takvim')} aria-label="Takvime dön"
              className="flex items-center text-white/70 hover:text-white text-sm spring-tap">
              <ArrowLeft className="w-4 h-4 mr-1.5" />Takvim
            </button>
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display">Kayıtlı Eğitimler</h1>
          <p className="text-purple-200 mt-1 text-sm">
            {filtrelenmis.length} / {tumVideolar.length} eğitim
            {aktifFiltreSayisi > 0 && (
              <button onClick={filtreleriTemizle}
                className="ml-3 inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 text-xs underline">
                <X className="w-3 h-3" />{aktifFiltreSayisi} filtreyi temizle
              </button>
            )}
            {favoriler.size > 0 && !sadeceFav && (
              <button onClick={() => setSadeceFav(true)}
                className="ml-3 inline-flex items-center gap-1 text-pink-300 hover:text-pink-200 text-xs">
                <Heart className="w-3 h-3" fill="currentColor" />{favoriler.size} favorim
              </button>
            )}
          </p>

          {/* Arama */}
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
            <input type="text" value={arama} onChange={e => setArama(e.target.value)}
              placeholder="Eğitim adı veya eğitmen ara..."
              className="w-full bg-white/15 backdrop-blur border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300 rounded-xl pl-12 pr-10 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all" />
            {arama && (
              <button onClick={() => setArama('')} aria-label="Aramayı temizle"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white spring-tap">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdownlar: Eğitmen / Dil / Yıl / Süre / Sıralama */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <DropdownField icon={User} value={egitmenCoreId} onChange={setEgitmenCoreId}>
              <option value="" className="bg-purple-900">Tüm Eğitmenler ({egitmenOpsiyonlari.length})</option>
              {egitmenOpsiyonlari.map(o => (
                <option key={o.coreId} value={o.coreId} className="bg-purple-900">{o.ad} ({o.count})</option>
              ))}
            </DropdownField>
            <DropdownField icon={Globe} value={dilKod} onChange={setDilKod}>
              {DILLER.map(d => <option key={d.kod} value={d.kod} className="bg-purple-900">{d.etiket}</option>)}
            </DropdownField>
            <DropdownField icon={Calendar} value={yil} onChange={setYil}>
              <option value="all" className="bg-purple-900">Tüm Yıllar</option>
              {yilOpsiyonlari.map(([y, c]) => (
                <option key={y} value={y} className="bg-purple-900">{y} ({c})</option>
              ))}
            </DropdownField>
            <DropdownField icon={Clock} value={sureKod} onChange={setSureKod}>
              {SURE_FILTRELERI.map(s => <option key={s.kod} value={s.kod} className="bg-purple-900">{s.etiket}</option>)}
            </DropdownField>
            <DropdownField icon={ArrowDownUp} value={siralama} onChange={setSiralama}>
              {SIRALAMALAR.map(s => <option key={s.kod} value={s.kod} className="bg-purple-900">{s.etiket}</option>)}
            </DropdownField>
          </div>

          {/* Hızlı filtreler */}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <button onClick={() => setSadeceFav(s => !s)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-all spring-tap ${
                sadeceFav ? 'bg-pink-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }`}>
              <Heart className="w-3.5 h-3.5" fill={sadeceFav ? 'currentColor' : 'none'} />
              Favoriler ({favoriler.size})
            </button>
            {gecmis.size > 0 && (
              <span className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-white/5 text-white/60 inline-flex items-center gap-1.5 border border-white/10">
                <History className="w-3.5 h-3.5" />İzlendi: {gecmis.size}
              </span>
            )}
          </div>

          {/* Kategori chip'leri (multi-select) */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => setKategoriSet(new Set())}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all spring-tap ${
                kategoriSet.size === 0
                  ? 'bg-amber-400 text-gray-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }`}>
              Tümü
            </button>
            {KATEGORILER.map(k => (
              <button key={k} onClick={() => toggleKategori(k)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all spring-tap ${
                  kategoriSet.has(k)
                    ? 'bg-amber-400 text-gray-900 shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}>
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 py-6 pb-16">
        <div className="container mx-auto max-w-7xl">
          {loading ? (
            <div className="text-center py-16 text-white/70">
              <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin opacity-70" />
              <p>Kayıtlı eğitimler yükleniyor...</p>
            </div>
          ) : filtrelenmis.length === 0 ? (
            <div className="text-center py-16 text-white/50">
              <Video className="w-20 h-20 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Filtreye uyan kayıt bulunamadı.</p>
              {aktifFiltreSayisi > 0 && (
                <button onClick={filtreleriTemizle}
                  className="mt-3 inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 text-sm underline">
                  Filtreleri temizle
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtrelenmis.slice(0, gosterilen).map(v => (
                  <VideoKart key={v.id} video={v}
                    favori={favoriler.has(v.id)}
                    izlendi={gecmis.has(v.id)}
                    onToggleFav={(e) => toggleFavori(e, v.id)}
                    onOynat={() => handleOynat(v)}
                  />
                ))}
              </div>
              {gosterilen < filtrelenmis.length && (
                <div ref={sentinelRef} className="py-8 text-center text-white/50 text-sm">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin opacity-50" />
                  Daha fazla yükleniyor... ({gosterilen} / {filtrelenmis.length})
                </div>
              )}
              {gosterilen >= filtrelenmis.length && filtrelenmis.length > PAGE_SIZE && (
                <div className="py-8 text-center text-white/40 text-sm">
                  ✓ Tümü gösterildi ({filtrelenmis.length} eğitim)
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {oynatilan && (
        <VideoOynatModal video={oynatilan} onClose={() => setOynatilan(null)}
          tumVideolar={tumVideolar}
          onOynat={handleOynat}
        />
      )}
    </div>
  );
};

// ─── Yardımcı: dropdown alanı ──────────────────────────────────────────
const DropdownField = ({ icon: Icon, value, onChange, children }) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300 pointer-events-none" />
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300 pointer-events-none" />
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-white/15 backdrop-blur border-2 border-white/20 focus:border-amber-400 text-white rounded-xl pl-9 pr-7 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 appearance-none cursor-pointer">
      {children}
    </select>
  </div>
);

// ─── Yardımcı: video kartı ─────────────────────────────────────────────
const VideoKart = ({ video: v, favori, izlendi, onToggleFav, onOynat }) => {
  const sureMetin = formatSure(v.sure);
  const playsMetin = formatPlays(v.plays);
  return (
    <button onClick={onOynat}
      className="relative bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400 rounded-xl overflow-hidden text-left transition-all hover-lift spring-tap group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
      <div className="relative aspect-video bg-black/30">
        {v.thumbnailUrl ? (
          <img src={v.thumbnailUrl} alt={v.baslik} loading="lazy" decoding="async"
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-12 h-12 text-white/30" />
          </div>
        )}
        {/* Sol üst: izlendi */}
        {izlendi && (
          <div className="absolute top-2 left-2 bg-black/70 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            <History className="w-3 h-3" />İzlendi
          </div>
        )}
        {/* Sağ üst: dil */}
        {v.dil && v.dil !== 'TR' && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {v.dil}
          </div>
        )}
        {/* Sağ alt: süre */}
        {sureMetin && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded">
            {sureMetin}
          </div>
        )}
        {/* Hover: play */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/50 transition-all">
          <div className="w-14 h-14 rounded-full bg-white/95 group-hover:bg-amber-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
            <Play className="w-7 h-7 text-purple-800 ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <h4 className="font-bold text-white text-sm line-clamp-2 mb-1.5 flex-1">{v.baslik}</h4>
          <button onClick={onToggleFav} aria-label={favori ? 'Favoriden çıkar' : 'Favoriye ekle'}
            className={`flex-shrink-0 p-1 rounded-full transition-all ${favori ? 'text-pink-400 hover:text-pink-300' : 'text-white/40 hover:text-pink-300'}`}>
            <Heart className="w-4 h-4" fill={favori ? 'currentColor' : 'none'} />
          </button>
        </div>
        {v.egitmenAdlari?.length > 0 && (
          <div className="text-xs text-purple-200 mb-1.5 line-clamp-1">
            {v.egitmenAdlari.join(', ')}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/60">
          {v.tarih && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />{v.tarih}
            </span>
          )}
          {playsMetin && (
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3 h-3" />{playsMetin}
            </span>
          )}
          {v.kategoriler?.[0] && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Tag className="w-3 h-3" />{v.kategoriler[0]}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default KayitliEgitimlerSayfasi;
