// Tek eğitim detay sayfası — SEO için ayrı URL (/e/:id) ile erişilir
// WhatsApp/Facebook/Twitter paylaşımlarında zengin önizleme için Edge Function
// netlify/edge-functions/event-og.mjs HTML'i crawler için pre-render eder.
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData, makeSafeId } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import { ArrowLeft, Clock, MapPin, Wifi, Tag, User, Bell, Share2, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import EventActions from '../components/EventActions';
import HatirlatmaKayitModal from '../components/HatirlatmaKayitModal';

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

const EgitimDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { takvim, loading, konusmacilar } = useData();
  const { t, locale, tDynamic } = useTranslation();
  const [hatirlatmaModal, setHatirlatmaModal] = useState(false);

  const egitim = useMemo(() => takvim.find(e => e.id === id), [takvim, id]);

  // Title + meta — SPA için (Edge Function crawler için ayrıca yapıyor)
  useEffect(() => {
    if (egitim) {
      document.title = `${egitim.egitim} — One Team Eğitim Takvimi`;
    }
    return () => { document.title = 'One Team Eğitim Yönetim Sistemi'; };
  }, [egitim]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-white animate-spin" />
    </div>
  );

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

  const tarih = parseTarih(egitim.tarih);
  const tarihStr = tarih ? tarih.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : egitim.tarih;
  const konusmaciAdlari = splitEgitmen(egitim.egitmen);
  const isOnline = egitim.sehir === 'Online' || (egitim.yer || '').toLocaleUpperCase('tr-TR').includes('ZOOM');
  const yerStr = egitim.yer || '';
  const zoomMatch = yerStr.match(/(\d[\d\s]{6,})/);
  const zoomId = zoomMatch ? zoomMatch[1].replace(/\s/g, '') : null;

  const konusmaciKayitlari = konusmaciAdlari.map(ad => {
    const safeId = makeSafeId(ad);
    return { ad, kayit: konusmacilar.find(k => k.id === safeId || makeSafeId(k.ad || k.id) === safeId) };
  });

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

              {/* Konuşmacılar */}
              {konusmaciKayitlari.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Konuşmacılar</h2>
                  <div className="flex flex-wrap gap-4">
                    {konusmaciKayitlari.map(({ ad, kayit }) => (
                      <div key={ad} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                        {kayit?.fotoURL ? (
                          <img src={kayit.fotoURL} alt={kayit.ad || ad} loading="lazy" decoding="async"
                            className="w-14 h-14 rounded-full object-cover object-top border-2 border-purple-200 shadow-sm" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200" aria-hidden="true">
                            <User className="w-7 h-7 text-purple-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-gray-800">{kayit?.ad || ad}</div>
                          {kayit?.unvan && <div className="text-sm text-purple-600">{kayit.unvan}</div>}
                        </div>
                      </div>
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

              {/* Aksiyon butonları */}
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-gray-200">
                {isOnline && zoomId && (
                  <a href={`https://zoom.us/j/${zoomId}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all spring-tap">
                    <Wifi className="w-4 h-4" />Toplantıya Katıl
                  </a>
                )}
                <button onClick={() => setHatirlatmaModal(true)}
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all spring-tap">
                  <Bell className="w-4 h-4" />Hatırlatma Al
                </button>
                <EventActions egitim={egitim} />
              </div>
            </div>
          </div>

          {/* Geri dön footer */}
          <div className="mt-6 text-center">
            <Link to="/takvim" className="text-white/70 hover:text-white text-sm inline-flex items-center gap-1.5">
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
