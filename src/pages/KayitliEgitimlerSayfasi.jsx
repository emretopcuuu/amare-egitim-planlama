// /kayitli-egitimler — Tüm Vimeo kayıtlı eğitimleri kategori chip'leri ile listeler
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Video, Play, Calendar, Tag, Loader2 } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, query, where, orderBy, limit as fbLimit, getDocs } from 'firebase/firestore';
import LanguageSwitcher from '../components/LanguageSwitcher';
import VideoOynatModal from '../components/VideoOynatModal';

// 13 kategori + Tümü (Faz 4 ile aynı sıralama)
const KATEGORILER = [
  'Tümü', 'Liderlik', 'Satış', 'Motivasyon', 'Davet', 'Kapanış',
  'Sunum Teknikleri', 'Zaman Yönetimi', 'Kişisel Gelişim',
  'Sağlık', 'Finansal Özgürlük', 'Vizyon', 'Hikaye', 'Ürün Eğitimi',
];

const CACHE_PREFIX = 'amare_kayitli_egitimler_';
const TTL = 12 * 60 * 60 * 1000; // 12 saat

const KayitliEgitimlerSayfasi = () => {
  const navigate = useNavigate();
  const [kategori, setKategori] = useState('Tümü');
  const [videolar, setVideolar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [arama, setArama] = useState('');
  const [oynatilan, setOynatilan] = useState(null);

  // Kategori bazında fetch (her kategori için ayrı cache)
  useEffect(() => {
    const cacheKey = CACHE_PREFIX + (kategori === 'Tümü' ? 'all' : kategori) + '_v1';
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < TTL && Array.isArray(data)) {
          setVideolar(data);
          setLoading(false);
          return;
        }
      }
    } catch {}

    setLoading(true);
    (async () => {
      try {
        let q;
        if (kategori === 'Tümü') {
          q = query(
            collection(db, 'kayitli_egitimler'),
            where('kayeneFiltrelendi', '==', false),
            orderBy('tarih', 'desc'),
            fbLimit(2000)
          );
        } else {
          q = query(
            collection(db, 'kayitli_egitimler'),
            where('kategoriler', 'array-contains', kategori),
            where('kayeneFiltrelendi', '==', false),
            orderBy('tarih', 'desc'),
            fbLimit(2000)
          );
        }
        const snap = await getDocs(q);
        // Transcript field UI'da gereksiz — bandwidth tasarrufu için at
        const data = snap.docs.map(d => {
          const { transcript, ...rest } = d.data();
          return { id: d.id, ...rest };
        });
        setVideolar(data);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
        } catch {}
      } catch (err) {
        console.warn('[kayitli_egitimler] fetch hatası:', err.message);
        setVideolar([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [kategori]);

  // Client-side arama filtresi
  const filtrelenmis = useMemo(() => {
    if (!arama.trim()) return videolar;
    const q = arama.toLocaleLowerCase('tr-TR');
    return videolar.filter(v => {
      const b = (v.baslik || '').toLocaleLowerCase('tr-TR');
      const e = (v.egitmenAdlari || []).join(' ').toLocaleLowerCase('tr-TR');
      return b.includes(q) || e.includes(q);
    });
  }, [videolar, arama]);

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
          <p className="text-purple-200 mt-1">{videolar.length} kayıtlı eğitim · kategori bazlı arşiv</p>

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

          {/* Kategori chip'leri — flex-wrap ile birden fazla satıra yayılır */}
          <div className="mt-4 flex flex-wrap gap-2">
            {KATEGORILER.map(k => (
              <button key={k} onClick={() => setKategori(k)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all spring-tap ${
                  kategori === k
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
              <p className="text-lg">
                {arama ? 'Arama kriterine uyan kayıt yok.' : 'Bu kategoride henüz kayıtlı eğitim yok.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtrelenmis.map(v => (
                <button key={v.id} onClick={() => setOynatilan(v)}
                  className="bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400 rounded-xl overflow-hidden text-left transition-all hover-lift spring-tap group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                  <div className="relative aspect-video bg-black/30">
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt={v.baslik} loading="lazy" decoding="async"
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-12 h-12 text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/50 transition-all">
                      <div className="w-14 h-14 rounded-full bg-white/95 group-hover:bg-amber-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <Play className="w-7 h-7 text-purple-800 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-white text-sm line-clamp-2 mb-1.5">{v.baslik}</h4>
                    {v.egitmenAdlari?.length > 0 && (
                      <div className="text-xs text-purple-200 mb-1.5 line-clamp-1">
                        {v.egitmenAdlari.join(', ')}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                      {v.tarih && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{v.tarih}
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
              ))}
            </div>
          )}
        </div>
      </div>

      {oynatilan && <VideoOynatModal video={oynatilan} onClose={() => setOynatilan(null)} />}
    </div>
  );
};

export default KayitliEgitimlerSayfasi;
