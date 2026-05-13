// Mobil-only horizontal story şeridi — her gün için konuşmacı avatarları
// Tıklayınca o güne filtre uygular (scroll target ile)
import React, { useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';

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
  return e.normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()).filter(n => n.length > 1);
};

const StoryStrip = ({ takvim, konusmacilar, onDayClick }) => {
  const { locale } = useTranslation();

  // Önümüzdeki 14 gün için eğitim olan günleri topla
  const gunler = useMemo(() => {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const limit = new Date(bugun);
    limit.setDate(bugun.getDate() + 14);

    const map = new Map(); // dateStr → { date, egitimler }
    takvim.forEach(e => {
      const d = parseTarih(e.tarih);
      if (!d || d < bugun || d > limit) return;
      const key = e.tarih;
      if (!map.has(key)) map.set(key, { date: d, tarihStr: e.tarih, egitimler: [], ilkEgitimId: e.id });
      map.get(key).egitimler.push(e);
    });
    return [...map.values()].sort((a, b) => a.date - b.date);
  }, [takvim]);

  if (gunler.length === 0) return null;

  const fotoBul = (ad) => {
    if (!konusmacilar) return null;
    const norm = ad.normalize('NFC').toLocaleUpperCase('tr-TR').trim();
    const k = konusmacilar.find(k => (k.ad || '').toLocaleUpperCase('tr-TR').trim() === norm);
    return k?.fotoURL;
  };

  return (
    <div className="md:hidden -mx-4 px-4 mb-4">
      <div className="flex items-center gap-2 mb-2 text-purple-200 text-xs uppercase tracking-wider font-semibold">
        <span>Önümüzdeki günler</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {gunler.map(({ date, tarihStr, egitimler, ilkEgitimId }) => {
          const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
          const isToday = date.getTime() === bugun.getTime();
          // İlk konuşmacının fotosunu göster
          const ilkKonusmaci = splitEgitmen(egitimler[0]?.egitmen)[0];
          const foto = ilkKonusmaci ? fotoBul(ilkKonusmaci) : null;
          return (
            <button key={tarihStr} onClick={() => onDayClick?.(ilkEgitimId)}
              className="flex-shrink-0 flex flex-col items-center gap-1 group focus:outline-none spring-tap">
              <div className={`relative w-16 h-16 rounded-full p-0.5 ${isToday ? 'bg-gradient-to-tr from-amber-400 to-pink-500 animate-pulse' : 'bg-gradient-to-tr from-purple-400 to-purple-600'}`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-purple-900 border-2 border-purple-900">
                  {foto ? (
                    <img src={foto} alt={ilkKonusmaci} loading="lazy" decoding="async"
                      className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full bg-purple-800 flex items-center justify-center text-purple-300 text-lg font-bold">
                      {date.getDate()}
                    </div>
                  )}
                </div>
                {egitimler.length > 1 && (
                  <span className="absolute -bottom-0.5 -right-0.5 bg-amber-400 text-gray-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow border-2 border-purple-900">
                    {egitimler.length}
                  </span>
                )}
              </div>
              <div className="text-center">
                <div className={`text-[11px] font-bold ${isToday ? 'text-amber-300' : 'text-white'}`}>{date.getDate()} {date.toLocaleDateString(locale, { month: 'short' })}</div>
                <div className="text-[9px] text-purple-300 uppercase">{isToday ? 'Bugün' : date.toLocaleDateString(locale, { weekday: 'short' })}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StoryStrip;
