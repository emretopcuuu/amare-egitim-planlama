// Takvime Ekle butonu — platform algılaması ile akıllı yönlendirme
// iOS → .ics download (Apple Calendar)
// Android → Google Calendar direct
// Desktop → küçük picker (Google/Outlook/.ics)
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, Check, X } from 'lucide-react';
import { downloadICS, googleCalendarUrl, outlookCalendarUrl } from '../utils/eventActions';

// Platform algılaması
const detectPlatform = () => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
};

const AddToCalendarButton = ({ egitim, className = '', children }) => {
  const platform = detectPlatform();
  const [open, setOpen] = useState(false);
  const [eklendi, setEklendi] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const gUrl = googleCalendarUrl(egitim);
  const oUrl = outlookCalendarUrl(egitim);

  // Mobil tek tık: doğrudan platforma uygun aksiyon
  const handleClick = (e) => {
    e.stopPropagation();
    if (platform === 'ios') {
      // iOS Safari: .ics download → "Add to Calendar" promptu açar
      if (downloadICS(egitim)) {
        setEklendi(true);
        setTimeout(() => setEklendi(false), 2000);
      }
      return;
    }
    if (platform === 'android' && gUrl) {
      // Android: Google Calendar URL — yüklü uygulamayı açar veya web
      window.open(gUrl, '_blank', 'noopener,noreferrer');
      setEklendi(true);
      setTimeout(() => setEklendi(false), 2000);
      return;
    }
    // Desktop: küçük picker
    setOpen(o => !o);
  };

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const w = 224;
    let left = Math.max(8, rect.right - w);
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    let top = rect.bottom + 4;
    const h = 200;
    if (top + h > window.innerHeight - 8) top = rect.top - h - 4;
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const defaultCls = 'inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all spring-tap';

  return (
    <>
      <button ref={triggerRef} type="button" onClick={handleClick}
        className={className || defaultCls}
        title="Bu eğitimi takvimine ekle">
        {eklendi ? (
          <>
            <Check className="w-4 h-4" />
            <span>Eklendi</span>
          </>
        ) : (
          <>
            <CalendarPlus className="w-4 h-4" />
            <span>{children || 'Takvime Ekle'}</span>
          </>
        )}
      </button>

      {open && platform === 'desktop' && createPortal(
        <div ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 224 }}
          className="z-[100] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-scaleIn">
          <div className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold uppercase tracking-wide flex items-center justify-between">
            <span>Hangi Takvim?</span>
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {gUrl && (
            <a href={gUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 text-sm text-gray-700 border-b border-gray-100">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">G</div>
              Google Takvim
            </a>
          )}
          {oUrl && (
            <a href={oUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 text-sm text-gray-700 border-b border-gray-100">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">O</div>
              Outlook
            </a>
          )}
          <button onClick={() => { downloadICS(egitim); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 text-sm text-gray-700">
            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600">
              <CalendarPlus className="w-4 h-4" />
            </div>
            Apple / Diğer (.ics)
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

export default AddToCalendarButton;
