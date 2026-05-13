// Yatay konuşmacı şeridi — eğitim sayısına göre sıralı, tıklayınca konuşmacı modal'ı
// Hem mobilde hem desktop'ta görünür (eskiden mobil-only idi, gün gün gösteriyordu)
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { makeSafeId, makeCoreId } from '../context/DataContext';
import KonusmaciFullModal from './KonusmaciFullModal';
import { User, ChevronLeft, ChevronRight } from 'lucide-react';

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
  return e.normalize('NFC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()
      .replace(/\s*SÖYLEŞİ\s*/gi, '')
      .replace(/\s*SÖYLEŞI\s*/gi, '')
      .replace(/\s+[İI]LE\.{0,3}\s*$/i, '')
      .replace(/\s+VE\s*$/i, '')
      .replace(/\.{2,}$/g, '')
      .trim())
    .filter(n => n.length > 1);
};

const StoryStrip = ({ takvim, konusmacilar }) => {
  const [secili, setSecili] = useState(null);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Scroll durumu takip — sol/sağ ok butonları aktiflik için
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, []);

  // Sol/sağ ok ile scroll
  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  // Mouse drag-to-scroll — desktop'ta tutup sürükleyerek scroll
  const dragState = useRef({ active: false, startX: 0, startScroll: 0 });
  const onMouseDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { active: true, startX: e.pageX, startScroll: el.scrollLeft };
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  };
  const onMouseMove = (e) => {
    if (!dragState.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = dragState.current.startScroll - (e.pageX - dragState.current.startX);
  };
  const onMouseUpOrLeave = () => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    const el = scrollRef.current;
    if (el) {
      el.style.cursor = '';
      el.style.userSelect = '';
    }
  };

  // Gelecek eğitimlerden konuşmacıları topla, eğitim sayısına göre sırala
  const konusmaciListesi = useMemo(() => {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    // Konuşmacı kaydını esnek bul — 5 katmanlı match
    const findKayit = (ad) => {
      if (!konusmacilar || !konusmacilar.length) return null;
      const adNorm = ad.normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').trim();
      const safeId = makeSafeId(adNorm);
      const coreId = makeCoreId(adNorm);

      // Strateji 1-4: ID variant'larıyla
      for (const k of konusmacilar) {
        if (k.id === safeId || k.id === coreId) return k;
        const kAd = k.ad || k.id || '';
        if (makeSafeId(kAd) === safeId || makeCoreId(kAd) === coreId) return k;
        if (makeCoreId(k.id || '') === coreId) return k;
      }

      // Strateji 5: Ad+soyad substring match (unvan'sız parça)
      const adsiz = adNorm.replace(/^(Yrd\.?\s*Doç\.?\s*Dr\.?\s*|Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*Öğr\.?\s*Üyesi\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Psik\.?\s*|Psk\.?\s*|Ecz\.?\s*|Av\.?\s*|Öğr\.?\s*Gör\.?\s*|Arş\.?\s*Gör\.?\s*)/gi, '').trim();
      const parcalar = adsiz.split(/\s+/).filter(p => p.length > 1);
      if (parcalar.length >= 2) {
        const ilk = parcalar[0].toLocaleUpperCase('tr-TR');
        const son = parcalar[parcalar.length - 1].toLocaleUpperCase('tr-TR');
        // Hem ad hem soyad eşleşmeli (false positive engelle)
        const m = konusmacilar.find(k => {
          const kAd = (k.ad || '').normalize('NFC').toLocaleUpperCase('tr-TR');
          return kAd.includes(ilk) && kAd.includes(son);
        });
        if (m) return m;
      }
      // Strateji 6: Tek isim/soyad ile arama (son fallback)
      if (parcalar.length === 1) {
        const p = parcalar[0].toLocaleUpperCase('tr-TR');
        const m = konusmacilar.find(k => {
          const kAd = (k.ad || '').normalize('NFC').toLocaleUpperCase('tr-TR');
          return kAd.includes(p) && p.length >= 4;
        });
        if (m) return m;
      }

      return null;
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
          <span>Önümüzdeki Eğitmenler</span>
          <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] normal-case tracking-normal">
            En aktif {konusmaciListesi.length}
          </span>
        </div>
        <div className="relative group">
          {/* Sol ok butonu — desktop'ta görünür, scrollable iken aktif */}
          {canScrollLeft && (
            <button onClick={() => scrollBy(-1)} aria-label="Sola kaydır"
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-purple-800 shadow-xl items-center justify-center transition-all opacity-0 group-hover:opacity-100 spring-tap"
              style={{ marginLeft: '-12px' }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {canScrollRight && (
            <button onClick={() => scrollBy(1)} aria-label="Sağa kaydır"
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-purple-800 shadow-xl items-center justify-center transition-all opacity-0 group-hover:opacity-100 spring-tap"
              style={{ marginRight: '-12px' }}>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <div ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide cursor-grab md:cursor-grab"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUpOrLeave}
            onMouseLeave={onMouseUpOrLeave}
            onWheel={(e) => {
              // Yatay scroll wheel desteği (Shift+wheel veya yatay trackpad)
              if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // zaten yatay
              if (e.shiftKey || e.deltaX !== 0) return;
              // Normal wheel'i yatay scroll'a çevir
              const el = scrollRef.current;
              if (!el) return;
              if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
              }
            }}
          >
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
      </div>

      {secili && <KonusmaciFullModal ad={secili.ad} kayit={secili.kayit} takvim={takvim} onClose={() => setSecili(null)} />}
    </>
  );
};

export default StoryStrip;
