// Poster büyütme modalı — 1 veya 2 görsel (ana afiş + program içeriği).
// 2 görsel varsa ok butonları + nokta göstergesi + swipe ile geçiş; 1 görselde eskisi gibi sade.
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function PosterCarouselModal({ acik, urls = [], baslik = '', onClose, indirLabel = 'İndir' }) {
  const gecerli = (urls || []).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const swipeRef = useRef({ x: 0, t: 0 });

  useEffect(() => { if (acik) setIdx(0); }, [acik, gecerli[0]]);
  useEffect(() => {
    if (!acik || gecerli.length < 2) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + gecerli.length) % gecerli.length);
      else if (e.key === 'ArrowRight') setIdx(i => (i + 1) % gecerli.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [acik, gecerli.length]);

  if (!acik || !gecerli.length) return null;
  const cokluMu = gecerli.length > 1;
  const url = gecerli[idx] || gecerli[0];
  const onceki = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + gecerli.length) % gecerli.length); };
  const sonraki = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % gecerli.length); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { const t = e.touches[0]; swipeRef.current = { x: t.clientX, t: Date.now() }; }}
        onTouchEnd={(e) => {
          if (!cokluMu) return;
          const s = swipeRef.current; if (!s.t || Date.now() - s.t > 600) return;
          const dx = e.changedTouches[0].clientX - s.x;
          if (dx < -50) setIdx(i => (i + 1) % gecerli.length);
          else if (dx > 50) setIdx(i => (i - 1 + gecerli.length) % gecerli.length);
        }}>
        <button onClick={onClose} aria-label="Kapat" className="absolute -top-10 right-0 text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
        {cokluMu && (
          <>
            <span className="absolute top-2 left-2 z-10 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">{idx + 1}/{gecerli.length} — {idx === 0 ? 'Ana Afiş' : 'Program İçeriği'}</span>
            <button onClick={onceki} aria-label="Önceki görsel" className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={sonraki} aria-label="Sonraki görsel" className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"><ChevronRight className="w-5 h-5" /></button>
          </>
        )}
        <img src={url} alt={baslik} className="w-full rounded-xl shadow-2xl select-none" draggable={false} />
        {cokluMu && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {gecerli.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} aria-label={`Görsel ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition ${i === idx ? 'bg-white' : 'bg-white/40 hover:bg-white/60'}`} />
            ))}
          </div>
        )}
        <div className="flex justify-center mt-3">
          <a href={url} download={`${(baslik || 'poster').replace(/[^a-z0-9]/gi, '_')}${cokluMu ? `_${idx + 1}` : ''}.png`}
            className="flex items-center gap-2 bg-white text-purple-800 px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-50 transition shadow"><Download className="w-4 h-4" />{indirLabel}</a>
        </div>
      </div>
    </div>
  );
}
