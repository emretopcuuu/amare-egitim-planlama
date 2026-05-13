// Zengin tam ekran konuşmacı detay modal
// Mobilde otomatik tam ekran, desktop'ta büyük sheet
import React, { useEffect, useMemo, useState } from 'react';
import { X, User, Mail, Calendar, Clock, MapPin, Wifi, ExternalLink, Tag } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

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
  const { t, locale, tDynamic } = useTranslation();
  const [tab, setTab] = useState('gelecek'); // 'gelecek' | 'gecmis' | 'bio'

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
      <div className="bg-white w-full max-w-3xl sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn" onClick={e => e.stopPropagation()}>
        {/* Header: foto + isim */}
        <div className="relative bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-900 p-6 sm:p-8 text-white flex-shrink-0">
          <button onClick={onClose} aria-label="Kapat"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all spring-tap">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {kayit?.fotoURL ? (
              <img src={kayit.fotoURL} alt={displayAd}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover object-top border-4 border-white/30 shadow-2xl flex-shrink-0" />
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
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex flex-shrink-0 px-4 sm:px-8">
          {[
            { key: 'gelecek', label: `Gelecek (${gelecek.length})`, show: true },
            { key: 'gecmis', label: `Geçmiş (${gecmis.length})`, show: gecmis.length > 0 },
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
          {tab === 'bio' && kayit?.biyografi && (
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{kayit.biyografi}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KonusmaciFullModal;
