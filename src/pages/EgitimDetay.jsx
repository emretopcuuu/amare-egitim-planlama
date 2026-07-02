// Tek eğitim detay sayfası — SEO için ayrı URL (/e/:id) ile erişilir
// WhatsApp/Facebook/Twitter paylaşımlarında zengin önizleme için Edge Function
// netlify/edge-functions/event-og.mjs HTML'i crawler için pre-render eder.
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData, makeSafeId, makeCoreId } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import { ArrowLeft, Clock, MapPin, Wifi, Tag, User, Bell, Share2, Loader2, Calendar as CalendarIcon, Timer, Navigation, Users as UsersIcon } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import EventActions from '../components/EventActions';
import AddToCalendarButton from '../components/AddToCalendarButton';
import HatirlatmaKayitModal from '../components/HatirlatmaKayitModal';
import LoadingProgress from '../components/LoadingProgress';
import { katilTikla } from '../utils/katilim';

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
    .map(n => n.trim().replace(/\s*SÖYLEŞİ\s*/gi, '').replace(/\s+[İI]LE\.{0,3}\s*$/i, '').trim())
    .filter(n => n.length > 1);
};

// Geri sayım hook
const useCountdown = (egitim) => {
  const [cd, setCd] = useState(null);
  useEffect(() => {
    if (!egitim) return;
    const calc = () => {
      const d = parseTarih(egitim.tarih);
      if (!d || !egitim.saat || !egitim.saat.includes(':')) return setCd(null);
      const [s, m] = egitim.saat.split(':').map(Number);
      const baslangic = new Date(d); baslangic.setHours(s, m, 0, 0);
      const fark = baslangic - new Date();
      if (fark < -3600000) return setCd({ durum: 'gecmis' });
      if (fark < 0) return setCd({ durum: 'canli' });
      setCd({
        durum: fark < 60000 ? 'imminent' : 'gelecek',
        gun: Math.floor(fark / 86400000),
        saat: Math.floor((fark % 86400000) / 3600000),
        dk: Math.floor((fark % 3600000) / 60000),
        sn: Math.floor((fark % 60000) / 1000),
      });
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [egitim]);
  return cd;
};

const EgitimDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { takvim, loading, konusmacilar, isAdmin } = useData();
  const { t, locale, tDynamic } = useTranslation();
  const [hatirlatmaModal, setHatirlatmaModal] = useState(false);
  const [konusmaciModal, setKonusmaciModal] = useState(null);

  const egitim = useMemo(() => takvim.find(e => e.id === id), [takvim, id]);
  const cd = useCountdown(egitim);

  // ⚠️ TÜM HOOK'LAR ÖNCE — early return'lerden sonra useMemo kullanılırsa React error #310

  const konusmaciAdlari = useMemo(() => splitEgitmen(egitim?.egitmen), [egitim?.egitmen]);

  // Aynı konuşmacının diğer eğitimleri (en fazla 4)
  const ayniKonusmaciEgitimleri = useMemo(() => {
    if (!egitim || !konusmaciAdlari.length) return [];
    const adSet = new Set(konusmaciAdlari.map(a => a.toLocaleUpperCase('tr-TR').trim()));
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    return takvim
      .filter(e => {
        if (e.id === egitim.id) return false;
        const d = parseTarih(e.tarih);
        if (!d || d < bugun) return false;
        return splitEgitmen(e.egitmen).some(a => adSet.has(a.toLocaleUpperCase('tr-TR').trim()));
      })
      .map(e => ({ ...e, d: parseTarih(e.tarih) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 4);
  }, [takvim, konusmaciAdlari, egitim?.id]);

  // Aynı kategoride benzer eğitimler (en fazla 3)
  const benzerKategoriler = useMemo(() => {
    if (!egitim?.kategori) return [];
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    return takvim
      .filter(e => e.id !== egitim.id && e.kategori === egitim.kategori)
      .map(e => ({ ...e, d: parseTarih(e.tarih) }))
      .filter(e => e.d && e.d >= bugun)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
  }, [takvim, egitim?.id, egitim?.kategori]);

  // Title + meta — SPA için (Edge Function crawler için ayrıca yapıyor)
  useEffect(() => {
    if (egitim) {
      document.title = `${egitim.egitim} — One Team Eğitim Takvimi`;
    }
    return () => { document.title = 'One Team Eğitim Yönetim Sistemi'; };
  }, [egitim]);

  // ────────── EARLY RETURNS (TÜM HOOK'LARDAN SONRA) ──────────
  if (loading) return <LoadingProgress />;

  if (!egitim) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Eğitim Bulunamadı</h2>
        <p className="text-gray-500 mb-6">Aradığınız eğitim takvimden kaldırılmış veya link geçersiz olabilir.</p>
        <Link to="/takvim" className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-800 transition">
          <CalendarIcon className="w-4 h-4" />Takvime Dön
        </Link>
      </div>
    </div>
  );

  // ────────── Normal compute (hook değil) ──────────
  const tarih = parseTarih(egitim.tarih);
  const tarihStr = tarih ? tarih.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : egitim.tarih;
  const isOnline = egitim.sehir === 'Online' || (egitim.yer || '').toLocaleUpperCase('tr-TR').includes('ZOOM');
  const yerStr = egitim.yer || '';
  const zoomMatch = yerStr.match(/(\d[\d\s]{6,})/);
  const zoomId = zoomMatch ? zoomMatch[1].replace(/\s/g, '') : null;

  const konusmaciKayitlari = konusmaciAdlari.map(ad => {
    const safeId = makeSafeId(ad);
    return { ad, kayit: konusmacilar.find(k => k.id === safeId || makeSafeId(k.ad || k.id) === safeId) };
  });

  // Geri sayım: dev banner için durum
  const cdBig = cd && cd.durum === 'gelecek' && cd.gun < 7;
  const cdImminent = cd && cd.durum === 'imminent';
  const cdCanli = cd && cd.durum === 'canli';

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Header */}
      <div className="pt-6 pb-2 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button onClick={() => navigate('/takvim')} aria-label="Takvime dön"
              className="flex items-center text-white/70 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />Takvime Dön
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="px-4 pb-12">
        <div className="container mx-auto max-w-4xl">
          {/* Büyük geri sayım banner — gelecek 7 gün içinde / canlı / imminent */}
          {cdCanli && (
            <div className="bg-red-500 rounded-2xl p-4 sm:p-6 mb-4 shadow-2xl canli-pulse flex items-center justify-center gap-3">
              <span className="w-3 h-3 bg-white rounded-full animate-ping" />
              <span className="text-white font-extrabold text-xl sm:text-2xl tracking-wider">ŞİMDİ CANLI!</span>
            </div>
          )}
          {cdImminent && (
            <div className="bg-amber-400 rounded-2xl p-4 sm:p-6 mb-4 shadow-2xl imminent-pulse text-center">
              <div className="text-gray-900 font-extrabold text-2xl sm:text-3xl">Birazdan başlıyor!</div>
              <div className="text-gray-800 text-sm mt-1">Hazır ol, eğitim 1 dakika içinde başlayacak</div>
            </div>
          )}
          {cdBig && !cdImminent && !cdCanli && (
            <div className="bg-gradient-to-r from-purple-800 to-indigo-800 rounded-2xl p-4 sm:p-6 mb-4 shadow-2xl border border-amber-400/30 gold-glow">
              <div className="text-amber-300 text-xs uppercase tracking-wider font-bold mb-2 text-center">Eğitime Kalan Süre</div>
              <div className="flex justify-center gap-2 sm:gap-4">
                {[{v:cd.gun,l:'GÜN'},{v:cd.saat,l:'SAAT'},{v:cd.dk,l:'DK'},{v:cd.sn,l:'SN'}].map(({v,l},i)=>(
                  <div key={l} className="bg-white/10 backdrop-blur rounded-xl px-3 sm:px-5 py-2 sm:py-3 min-w-[60px] sm:min-w-[80px] text-center border border-white/10">
                    <div className="text-white text-2xl sm:text-4xl font-extrabold tabular-nums font-display">
                      <span key={`${l}-${v}`} className="cd-digit">{String(v).padStart(2,'0')}</span>
                    </div>
                    <div className="text-amber-300/80 text-[10px] uppercase tracking-wider mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ana kart */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Poster (varsa) */}
            {egitim.gorselUrl && (
              <div className="bg-gray-100 max-h-[500px] flex items-center justify-center overflow-hidden">
                <img src={egitim.gorselUrl} alt={egitim.egitim} className="w-full h-auto max-h-[500px] object-contain" />
              </div>
            )}

            <div className="p-6 md:p-8">
              {/* Başlık + kategori */}
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 leading-tight font-display">{tDynamic(egitim.egitim)}</h1>
                {egitim.kategori && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-purple-50 text-purple-800 border border-purple-300">
                    <Tag className="w-3.5 h-3.5" />{tDynamic(egitim.kategori)}
                  </span>
                )}
              </div>

              {/* Tarih + saat */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-gray-700">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold">{tarihStr}</span>
                  </div>
                  {egitim.saat && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold">{egitim.saat}{egitim.bitisSaati ? ` - ${egitim.bitisSaati}` : ''}</span>
                      {egitim.sure && <span className="text-gray-500 text-sm">({egitim.sure})</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {isOnline ? <Wifi className="w-5 h-5 text-blue-600" /> : <MapPin className="w-5 h-5 text-red-500" />}
                    <span className="font-semibold">{isOnline ? 'Zoom' : egitim.yer}</span>
                  </div>
                </div>
              </div>

              {/* Konuşmacılar — tıklanınca tam ekran modal açılır */}
              {konusmaciKayitlari.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Eğitmenler</h2>
                  <div className="flex flex-wrap gap-4">
                    {konusmaciKayitlari.map(({ ad, kayit }) => (
                      <button key={ad} onClick={() => navigate(`/lider/${makeCoreId(ad)}`)}
                        className="flex items-center gap-3 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl p-3 transition-all spring-tap focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                        {kayit?.fotoURL ? (
                          <img src={kayit.fotoURL} alt={kayit.ad || ad} loading="lazy" decoding="async"
                            className="w-14 h-14 rounded-full object-cover border-2 border-purple-200 shadow-sm"
                            style={{ objectPosition: 'center 25%' }} />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200" aria-hidden="true">
                            <User className="w-7 h-7 text-purple-400" />
                          </div>
                        )}
                        <div className="text-left">
                          <div className="font-bold text-gray-800">{kayit?.ad || ad}</div>
                          {kayit?.unvan && <div className="text-sm text-purple-600">{kayit.unvan}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Açıklama */}
              {egitim.aciklama && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Açıklama</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{tDynamic(egitim.aciklama)}</p>
                </div>
              )}

              {/* Etkinlik Programı — fiziki etkinlikler (Vizyon Günü vb.) */}
              {!isOnline && (
                (Array.isArray(egitim.programAkisi) && egitim.programAkisi.length > 0)
                || egitim.mekanAdi || egitim.acikAdres || egitim.sunucular
              ) && (
                <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-5">
                  <h2 className="flex items-center gap-2 text-amber-900 font-extrabold text-base mb-4">
                    <MapPin className="w-5 h-5" /> Etkinlik Programı
                    {egitim.etkinlikTuru && <span className="text-amber-700/80 font-semibold text-sm">· {tDynamic(egitim.etkinlikTuru)}</span>}
                  </h2>

                  {/* Mekan + açık adres + yol tarifi */}
                  {(egitim.mekanAdi || egitim.acikAdres) && (
                    <div className="mb-4">
                      {egitim.mekanAdi && <div className="text-gray-900 font-bold">{egitim.mekanAdi}</div>}
                      {egitim.acikAdres && <div className="text-gray-600 text-sm mt-0.5 whitespace-pre-line">{egitim.acikAdres}</div>}
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([egitim.acikAdres, egitim.mekanAdi, egitim.sehir].filter(Boolean).join(' '))}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all spring-tap">
                        <Navigation className="w-4 h-4" /> Yol Tarifi
                      </a>
                    </div>
                  )}

                  {/* Program zaman çizelgesi */}
                  {Array.isArray(egitim.programAkisi) && egitim.programAkisi.length > 0 && (
                    <div className="space-y-2">
                      {egitim.programAkisi.filter(p => p && (p.baslik || p.baslangic)).map((p, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-amber-200 px-4 py-2.5">
                          {(p.baslangic || p.bitis) && (
                            <div className="flex items-center gap-1.5 text-amber-700 font-bold text-sm tabular-nums whitespace-nowrap flex-shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              {p.baslangic}{p.bitis ? `–${p.bitis}` : ''}
                            </div>
                          )}
                          <div className="text-gray-800 font-semibold">{tDynamic(p.baslik || '')}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sunucular */}
                  {egitim.sunucular && (
                    <div className="mt-4 pt-3 border-t border-amber-200">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-700 font-bold mb-1">
                        <UsersIcon className="w-3.5 h-3.5" /> Sunucular
                      </div>
                      <div className="text-gray-800 text-sm">{egitim.sunucular}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Aksiyon butonları */}
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-gray-200">
                {isOnline && zoomId && (
                  <span className="inline-flex items-center gap-3 flex-wrap">
                    <a href={`https://zoom.us/j/${zoomId}`} target="_blank" rel="noopener noreferrer" onClick={() => katilTikla(egitim)}
                      className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all spring-tap">
                      <Wifi className="w-4 h-4" />Toplantıya Katıl
                    </a>
                    {egitim.katilTiklamaSayisi > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-500">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{egitim.katilTiklamaSayisi} kişi katıldı
                      </span>
                    )}
                    {/* Zoom GERÇEK katılım (rapor) — sadece admin görür */}
                    {isAdmin && egitim.zoomGercekKatilim > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1" title="Zoom raporundan: gerçekten giren kişi sayısı ve ortalama kalma süresi (yalnız admin görür)">
                        📊 Zoom: {egitim.zoomGercekKatilim} kişi girdi{egitim.zoomOrtDakika ? ` · ort. ${egitim.zoomOrtDakika} dk kaldı` : ''}
                      </span>
                    )}
                  </span>
                )}
                <button onClick={() => setHatirlatmaModal(true)}
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all spring-tap">
                  <Bell className="w-4 h-4" />Hatırlatma Al
                </button>
                <AddToCalendarButton egitim={egitim} />
                <EventActions egitim={egitim} />
              </div>

              {/* Terk eğrisi — 5-dk kovalarda içerideki kişi (Zoom raporu, yalnız admin) */}
              {isAdmin && Array.isArray(egitim.zoomEgri) && egitim.zoomEgri.length > 1 && (() => {
                const max = Math.max(...egitim.zoomEgri, 1);
                return (
                  <div className="mt-5 pt-4 border-t border-gray-200">
                    <div className="text-xs font-bold text-gray-600 mb-1">📉 Katılım Eğrisi <span className="font-normal text-gray-400">(5 dakikalık dilimlerde içerideki kişi — yalnız admin görür)</span></div>
                    <div className="flex items-end gap-[2px] h-16">
                      {egitim.zoomEgri.map((v, i) => (
                        <div key={i} className="flex-1 bg-blue-400/80 rounded-t-sm min-w-[3px]" style={{ height: `${Math.max(3, (v / max) * 100)}%` }} title={`${i * 5}–${i * 5 + 5} dk: ${v} kişi`} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>başlangıç</span><span>{egitim.zoomEgri.length * 5} dk</span></div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Aynı konuşmacının diğer eğitimleri */}
          {ayniKonusmaciEgitimleri.length > 0 && (
            <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
              <h2 className="text-amber-300 text-sm font-bold uppercase tracking-wider mb-3 gold-text-glow">Aynı eğitmenden</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ayniKonusmaciEgitimleri.map(e => (
                  <Link key={e.id} to={`/e/${e.id}`}
                    className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-amber-400/40 rounded-xl p-3 transition-all hover-lift">
                    <div className="text-white font-bold text-sm line-clamp-2 mb-1">{tDynamic(e.egitim)}</div>
                    <div className="text-purple-200 text-xs flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" />{e.tarih}
                      {e.saat && <><Clock className="w-3 h-3 ml-1" />{e.saat}</>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Aynı kategoride benzer eğitimler */}
          {benzerKategoriler.length > 0 && (
            <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
              <h2 className="text-amber-300 text-sm font-bold uppercase tracking-wider mb-3 gold-text-glow">
                Benzer eğitimler — {tDynamic(egitim.kategori)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {benzerKategoriler.map(e => (
                  <Link key={e.id} to={`/e/${e.id}`}
                    className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-amber-400/40 rounded-xl p-3 transition-all hover-lift">
                    <div className="text-white font-bold text-sm line-clamp-2 mb-1">{tDynamic(e.egitim)}</div>
                    <div className="text-purple-200 text-xs flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" />{e.tarih}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Geri dön footer */}
          <div className="mt-6 text-center">
            <Link to="/takvim" className="text-white/70 hover:text-white text-sm inline-flex items-center gap-1.5 spring-tap">
              <CalendarIcon className="w-4 h-4" />Tüm eğitimleri gör
            </Link>
          </div>
        </div>
      </div>

      {hatirlatmaModal && <HatirlatmaKayitModal egitim={egitim} onClose={() => setHatirlatmaModal(false)} />}
    </div>
  );
};

export default EgitimDetay;
