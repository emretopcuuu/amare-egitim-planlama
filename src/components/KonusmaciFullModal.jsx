// Zengin tam ekran eğitmen detay modal
// Mobilde otomatik tam ekran, desktop'ta büyük sheet
import React, { useEffect, useMemo, useState } from 'react';
import { X, User, Mail, Calendar, Clock, MapPin, Wifi, ExternalLink, Tag, UserPlus, Play, Video, Star } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import KonusmaciTakipModal from './KonusmaciTakipModal';
import VideoOynatModal from './VideoOynatModal';
import UyeGirisModal from './UyeGirisModal';
import EgitmenSozleri from './EgitmenSozleri';
import { db } from '../utils/firebase';
import { collection, query, where, orderBy, limit as fbLimit, getDocs } from 'firebase/firestore';
import { useSwipeToDismiss } from '../utils/useSwipeToDismiss';
import { makeCoreId } from '../context/DataContext';
import { useTakipEgitmenler } from '../utils/takip';
import { useAuth } from '../context/AuthContext';

const parseTarih = (t) => {
  if (!t) return null;
  const parts = String(t).split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [d, m, y] = parts;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
};

const splitEgitmen = (e) => {
  if (!e) return [];
  return e.normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()).filter(n => n.length > 1);
};

const KonusmaciFullModal = ({ ad, kayit, takvim = [], onClose, onEgitimClick }) => {
  const swipe = useSwipeToDismiss(onClose);
  const { t, locale, tDynamic, lang } = useTranslation();
  const [tab, setTab] = useState('gelecek'); // 'gelecek' | 'gecmis' | 'kayitli' | 'bio'
  const [takipModal, setTakipModal] = useState(false);
  const [kayitliVideolar, setKayitliVideolar] = useState(null); // null = henüz yüklenmedi
  const [kayitliLoading, setKayitliLoading] = useState(false);
  const [oynatilanVideo, setOynatilanVideo] = useState(null);
  const [oynatSeekTo, setOynatSeekTo] = useState(null);
  const [girisModalAcik, setGirisModalAcik] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toggle: takipToggle, isTakip } = useTakipEgitmenler();

  const handleKayitliOynat = (v) => {
    if (!isAuthenticated) { setGirisModalAcik(true); return; }
    setOynatSeekTo(null);
    setOynatilanVideo(v);
  };

  // Söz tıklanınca: ilgili videoyu kayıtlı listesinden bul → start ile aç
  const handleSozTikla = (soz) => {
    if (!isAuthenticated) { setGirisModalAcik(true); return; }
    const liste = kayitliVideolar || [];
    const v = liste.find(x => (x.vimeoId || x.id) === soz.vimeoId)
      || { id: soz.vimeoId, vimeoId: soz.vimeoId, baslik: soz.baslik, thumbnailUrl: soz.thumbnailUrl };
    setOynatSeekTo(Math.floor(soz.start || 0));
    setOynatilanVideo(v);
  };
  const coreId = makeCoreId(ad);
  const favoriEgitmen = coreId ? isTakip(coreId) : false;

  // ESC ile kapan
  useEffect(() => {
    if (!ad) return;
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [ad, onClose]);

  // Bu konuşmacının eğitimlerini bul (ad eşleşmesi)
  const adNorm = (ad || '').normalize('NFC').toLocaleUpperCase('tr-TR').trim();
  const ilgiliEgitimler = useMemo(() => {
    return takvim
      .filter(e => {
        const adlar = splitEgitmen(e.egitmen).map(a => a.toLocaleUpperCase('tr-TR').trim());
        return adlar.some(a => a === adNorm || a.includes(adNorm) || adNorm.includes(a));
      })
      .map(e => ({ ...e, d: parseTarih(e.tarih) }))
      .filter(e => e.d);
  }, [takvim, adNorm]);

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const gelecek = ilgiliEgitimler.filter(e => e.d >= bugun).sort((a, b) => a.d - b.d);
  const gecmis = ilgiliEgitimler.filter(e => e.d < bugun).sort((a, b) => b.d - a.d);

  // Bu eğitmenin coreId'si — kayitli_egitimler query'si için
  const egitmenCoreId = useMemo(() => makeCoreId(ad || ''), [ad]);

  // Kayıtlı eğitimler — sekmeye basılınca lazy fetch (24h cache)
  useEffect(() => {
    if (tab !== 'kayitli' || kayitliVideolar !== null || !egitmenCoreId) return;
    const cacheKey = `amare_videos_${egitmenCoreId}_v1`;
    const TTL = 24 * 60 * 60 * 1000;

    // Cache check
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < TTL && Array.isArray(data)) {
          setKayitliVideolar(data);
          return;
        }
      }
    } catch {}

    setKayitliLoading(true);
    (async () => {
      try {
        const q = query(
          collection(db, 'kayitli_egitimler'),
          where('egitmenler', 'array-contains', egitmenCoreId),
          where('kayeneFiltrelendi', '==', false),
          orderBy('tarih', 'desc'),
          fbLimit(50)
        );
        const snap = await getDocs(q);
        // Transcript field UI'da gereksiz — kaldır
        const videos = snap.docs.map(d => {
          const { transcript, ...rest } = d.data();
          return { id: d.id, ...rest };
        });
        setKayitliVideolar(videos);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: videos }));
        } catch {}
      } catch (err) {
        console.warn('[kayitli_egitimler] fetch hatası:', err.message);
        setKayitliVideolar([]); // hata durumunda boş — tekrar denemek için cache yazma
      } finally {
        setKayitliLoading(false);
      }
    })();
  }, [tab, egitmenCoreId, kayitliVideolar]);

  if (!ad) return null;

  const displayAd = kayit?.ad || ad;
  const renderEgitimItem = (egitim) => {
    const isOnline = egitim.sehir === 'Online' || (egitim.yer || '').toLocaleUpperCase('tr-TR').includes('ZOOM');
    return (
      <Link key={egitim.id} to={`/e/${egitim.id}`}
        onClick={() => { onEgitimClick?.(egitim); onClose?.(); }}
        className="block bg-white border border-gray-200 hover:border-purple-400 hover:shadow-md rounded-xl p-4 transition-all hover-lift">
        <div className="flex items-start gap-3">
          <div className={`flex flex-col items-center justify-center px-2 py-2 min-w-[56px] rounded-lg ${isOnline ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
            <div className="text-xl font-extrabold leading-none font-display">{egitim.d.getDate()}</div>
            <div className="text-[10px] uppercase tracking-wider mt-0.5">{egitim.d.toLocaleDateString(locale, { month: 'short' })}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 truncate">{tDynamic(egitim.egitim)}</h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
              {egitim.saat && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{egitim.saat}{egitim.bitisSaati ? `-${egitim.bitisSaati}` : ''}</span>}
              {egitim.yer && <span className="flex items-center gap-1">{isOnline ? <Wifi className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}{isOnline ? 'Zoom' : egitim.yer.slice(0, 30)}</span>}
              {egitim.kategori && <span className="inline-flex items-center gap-1 text-purple-600"><Tag className="w-3 h-3" />{tDynamic(egitim.kategori)}</span>}
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" aria-hidden="true" />
        </div>
      </Link>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn"
        onClick={e => e.stopPropagation()}
        style={swipe.style}
        {...swipe.handlers}>
        {/* Drag handle — sadece mobilde, swipe ipucu */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>
        {/* Header: foto + isim */}
        <div className="relative bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-900 p-6 sm:p-8 text-white flex-shrink-0">
          <button onClick={onClose} aria-label="Kapat"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all spring-tap">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {kayit?.fotoURL ? (
              <img src={kayit.fotoURL} alt={displayAd}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white/30 shadow-2xl flex-shrink-0"
                style={{ objectPosition: 'center 25%' }} />
            ) : (
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/15 flex items-center justify-center border-4 border-white/30 flex-shrink-0" aria-hidden="true">
                <User className="w-14 h-14 text-white/70" />
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display gold-text-glow">{displayAd}</h2>
              {kayit?.unvan && <p className="text-amber-300 font-semibold mt-1">{kayit.unvan}</p>}
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-3 text-sm">
                <span className="bg-white/10 px-3 py-1 rounded-full">
                  <span className="font-bold">{gelecek.length}</span> gelecek
                </span>
                <span className="bg-white/10 px-3 py-1 rounded-full">
                  <span className="font-bold">{gecmis.length}</span> geçmiş
                </span>
                {kayit?.linkedin && (
                  <a href={`mailto:${kayit.linkedin}`} className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors spring-tap">
                    <Mail className="w-3.5 h-3.5" />İletişim
                  </a>
                )}
                <button onClick={() => coreId && takipToggle(coreId)}
                  title={favoriEgitmen ? 'Favorilerden çıkar' : 'Favori eğitmenlere ekle'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-all font-bold spring-tap ${
                    favoriEgitmen
                      ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}>
                  <Star className="w-3.5 h-3.5" fill={favoriEgitmen ? 'currentColor' : 'none'} />
                  {favoriEgitmen ? 'Favori' : 'Favoriye ekle'}
                </button>
                <button onClick={() => setTakipModal(true)}
                  className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-gray-900 px-3 py-1 rounded-full transition-colors font-bold spring-tap gold-glow">
                  <UserPlus className="w-3.5 h-3.5" />E-posta ile takip
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex flex-shrink-0 px-4 sm:px-8">
          {[
            { key: 'gelecek', label: `Gelecek (${gelecek.length})`, show: true },
            { key: 'gecmis', label: `Geçmiş (${gecmis.length})`, show: gecmis.length > 0 },
            { key: 'kayitli', label: 'Kayıtlı Eğitimler', show: true },
            { key: 'sozler', label: 'İlham Sözleri', show: true },
            { key: 'bio', label: 'Biyografi', show: !!kayit?.biyografi },
          ].filter(x => x.show).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 sm:px-5 py-3 text-sm font-semibold transition-all border-b-2 spring-tap ${tab === t.key ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {tab === 'gelecek' && (
            <>
              {gelecek.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p>Şu an planlanmış eğitim yok.</p>
                </div>
              ) : (
                <div className="space-y-2">{gelecek.map(renderEgitimItem)}</div>
              )}
            </>
          )}
          {tab === 'gecmis' && (
            <div className="space-y-2">{gecmis.map(renderEgitimItem)}</div>
          )}
          {tab === 'kayitli' && (
            <>
              {kayitliLoading && (
                <div className="text-center py-12 text-gray-400">
                  <Video className="w-12 h-12 mx-auto mb-2 opacity-40 animate-pulse" />
                  <p>Kayıtlı eğitimler yükleniyor...</p>
                </div>
              )}
              {!kayitliLoading && kayitliVideolar?.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Video className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p>Bu eğitmen için henüz kayıtlı eğitim yok.</p>
                </div>
              )}
              {!kayitliLoading && kayitliVideolar?.length > 0 && (
                <>
                  {!isAuthenticated && (
                    <button onClick={() => setGirisModalAcik(true)}
                      className="w-full mb-3 bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border border-amber-300 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 transition-all">
                      <div className="flex items-center gap-2 text-left min-w-0">
                        <svg className="w-5 h-5 text-amber-700 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                        <div className="text-amber-900 text-xs font-semibold">
                          Videoları izlemek için <span className="underline">Marka Ortağı girişi</span> yap
                        </div>
                      </div>
                      <span className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-lg flex-shrink-0">Giriş</span>
                    </button>
                  )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {kayitliVideolar.map(v => (
                    <button key={v.id} onClick={() => handleKayitliOynat(v)}
                      className="bg-white border border-gray-200 hover:border-purple-400 hover:shadow-md rounded-xl overflow-hidden text-left transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                      <div className="relative aspect-video bg-gray-100">
                        {v.thumbnailUrl ? (
                          <img src={v.thumbnailUrl} alt={v.baslik} loading="lazy"
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-10 h-10 text-gray-300" />
                          </div>
                        )}
                        <div className={`absolute inset-0 flex items-center justify-center transition-all ${isAuthenticated ? 'bg-black/0 group-hover:bg-black/40' : 'bg-black/30 group-hover:bg-black/50'}`}>
                          {isAuthenticated ? (
                            <div className="w-12 h-12 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                              <Play className="w-6 h-6 text-purple-700 ml-0.5" fill="currentColor" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center shadow-xl">
                              <svg className="w-6 h-6 text-purple-900" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{v.baslik}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {v.tarih && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{v.tarih}</span>}
                          {v.kategoriler?.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-purple-600"><Tag className="w-3 h-3" />{v.kategoriler[0]}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                </>
              )}
            </>
          )}
          {tab === 'sozler' && (
            <EgitmenSozleri coreId={egitmenCoreId} onSozTikla={handleSozTikla} dil={(lang || 'tr').toUpperCase()} />
          )}
          {tab === 'bio' && kayit?.biyografi && (
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{kayit.biyografi}</p>
            </div>
          )}
        </div>
      </div>

      {takipModal && <KonusmaciTakipModal konusmaciAd={displayAd} onClose={() => setTakipModal(false)} />}
      {oynatilanVideo && (
        <VideoOynatModal
          video={oynatilanVideo}
          seekTo={oynatSeekTo}
          tumVideolar={kayitliVideolar || []}
          onOynat={(v) => { setOynatSeekTo(null); setOynatilanVideo(v); }}
          onClose={() => { setOynatilanVideo(null); setOynatSeekTo(null); }}
        />
      )}
      <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />
    </div>
  );
};

export default KonusmaciFullModal;
