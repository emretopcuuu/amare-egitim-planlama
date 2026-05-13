// Yatay konuşmacı şeridi — eğitim sayısına göre sıralı, tıklayınca konuşmacı modal'ı
// Hem mobilde hem desktop'ta görünür (eskiden mobil-only idi, gün gün gösteriyordu)
import React, { useMemo, useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { makeSafeId, makeCoreId } from '../context/DataContext';
import KonusmaciFullModal from './KonusmaciFullModal';
import { User } from 'lucide-react';

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

const StoryStrip = ({ takvim, konusmacilar }) => {
  const [secili, setSecili] = useState(null);

  // Gelecek eğitimlerden konuşmacıları topla, eğitim sayısına göre sırala
  const konusmaciListesi = useMemo(() => {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    // Konuşmacı kaydını esnek bul — safeId, coreId (unvan stripped) ile match
    const findKayit = (ad) => {
      if (!konusmacilar || !konusmacilar.length) return null;
      const safeId = makeSafeId(ad);
      const coreId = makeCoreId(ad);
      return konusmacilar.find(k => k.id === safeId)
          || konusmacilar.find(k => k.id === coreId)
          || konusmacilar.find(k => makeSafeId(k.ad || k.id) === safeId)
          || konusmacilar.find(k => makeCoreId(k.ad || k.id) === coreId)
          || null;
    };

    const sayilar = new Map(); // coreId → { ad (en uzun gördüğümüz), kayit, sayi, ilkTarih }
    takvim.forEach(e => {
      const d = parseTarih(e.tarih);
      if (!d || d < bugun) return;
      const adlar = splitEgitmen(e.egitmen);
      adlar.forEach(ad => {
        // CoreId üzerinden grupla — "Dr. TUNÇ TUNCER" ile "TUNÇ TUNCER" aynı kişi
        const key = makeCoreId(ad) || ad.normalize('NFC').toLocaleUpperCase('tr-TR').trim();
        if (!sayilar.has(key)) {
          const kayit = findKayit(ad);
          // Kayıt varsa kayıt.ad kullan (resmi isim), yoksa takvimdeki adı kullan
          sayilar.set(key, { ad: kayit?.ad || ad, kayit, sayi: 0, ilkTarih: d });
        }
        const item = sayilar.get(key);
        item.sayi += 1;
        if (d < item.ilkTarih) item.ilkTarih = d;
        // Kayıt sonradan bulunabilir mi diye tekrar dene
        if (!item.kayit) {
          const k = findKayit(ad);
          if (k) { item.kayit = k; item.ad = k.ad || item.ad; }
        }
      });
    });

    return [...sayilar.values()].sort((a, b) => {
      if (b.sayi !== a.sayi) return b.sayi - a.sayi; // önce eğitim sayısı
      return a.ilkTarih - b.ilkTarih; // sonra en erken eğitim
    });
  }, [takvim, konusmacilar]);

  if (konusmaciListesi.length === 0) return null;

  return (
    <>
      <div className="-mx-4 px-4 mb-4">
        <div className="flex items-center gap-2 mb-2 text-purple-200 text-xs uppercase tracking-wider font-semibold">
          <span>Önümüzdeki Konuşmacılar</span>
          <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] normal-case tracking-normal">
            En aktif {konusmaciListesi.length}
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
          {konusmaciListesi.map(({ ad, kayit, sayi }, idx) => {
            const top3 = idx < 3;
            return (
              <button key={ad} onClick={() => setSecili({ ad, kayit })}
                className="flex-shrink-0 flex flex-col items-center gap-1 group focus:outline-none spring-tap w-[68px]">
                <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 ${top3 ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-500' : 'bg-gradient-to-tr from-purple-400/60 to-purple-600/60'} group-hover:scale-105 transition-all`}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-purple-900 border-2 border-purple-900">
                    {kayit?.fotoURL ? (
                      <img src={kayit.fotoURL} alt={kayit.ad || ad} loading="lazy" decoding="async"
                        className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full bg-purple-800 flex items-center justify-center" aria-hidden="true">
                        <User className="w-7 h-7 text-purple-300" />
                      </div>
                    )}
                  </div>
                  {/* Eğitim sayısı badge */}
                  <span className="absolute -bottom-0.5 -right-0.5 bg-amber-400 text-gray-900 text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow border-2 border-purple-900">
                    {sayi}
                  </span>
                </div>
                <div className="text-center w-full">
                  <div className="text-[10px] sm:text-[11px] font-bold text-white leading-tight line-clamp-2 max-w-[68px]">{(kayit?.ad || ad).split(' ').slice(0, 3).join(' ')}</div>
                  {kayit?.unvan && <div className="text-[9px] text-amber-300/80 mt-0.5 line-clamp-1">{kayit.unvan}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {secili && <KonusmaciFullModal ad={secili.ad} kayit={secili.kayit} takvim={takvim} onClose={() => setSecili(null)} />}
    </>
  );
};

export default StoryStrip;
