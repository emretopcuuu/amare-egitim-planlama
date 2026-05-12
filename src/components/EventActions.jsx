// Eğitim kartı için aksiyon dropdown'u: Takvime Ekle (Google/Outlook/Apple) + WhatsApp + Link kopyala
// Portal ile body root'a render edilir — overflow-hidden parent'lardan etkilenmez
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, Share2, Check, Link2, X } from 'lucide-react';
import { downloadICS, googleCalendarUrl, outlookCalendarUrl, whatsappShareUrl, copyDeepLink } from '../utils/eventActions';

const EventActions = ({ egitim, dark = false, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Trigger pozisyonuna göre menüyü konumlandır
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 224; // w-56
    const margin = 8;
    // Sağa hizala — taşarsa sola kaydır
    let left = rect.right - menuWidth;
    if (left < margin) left = margin;
    if (left + menuWidth > window.innerWidth - margin) left = window.innerWidth - menuWidth - margin;
    let top = rect.bottom + 4;
    // Alta sığmıyorsa yukarı aç
    const menuHeight = 280;
    if (top + menuHeight > window.innerHeight - margin) {
      top = rect.top - menuHeight - 4;
      if (top < margin) top = margin;
    }
    setPos({ top, left });
  }, [open]);

  // Dış tıklama, ESC, scroll → kapan
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

  const handleCopy = async () => {
    await copyDeepLink(egitim);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const gUrl = googleCalendarUrl(egitim);
  const oUrl = outlookCalendarUrl(egitim);
  const wUrl = whatsappShareUrl(egitim);

  const triggerCls = dark
    ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors spring-tap'
    : compact
    ? 'inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors spring-tap'
    : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors spring-tap';

  return (
    <>
      <button ref={triggerRef} type="button" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={triggerCls} title="Takvime ekle, paylaş, link kopyala">
        <Share2 className="w-3.5 h-3.5" />
        {!compact && <span>Paylaş</span>}
      </button>
      {open && createPortal(
        <div ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 224 }}
          className="z-[100] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-scaleIn">
          <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wide flex items-center justify-between">
            <span>Aksiyonlar</span>
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="hover:bg-white/20 rounded p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {gUrl && (
            <a href={gUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700 border-b border-gray-100">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">G</div>
              Google Takvim
            </a>
          )}
          {oUrl && (
            <a href={oUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700 border-b border-gray-100">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">O</div>
              Outlook
            </a>
          )}
          <button onClick={() => { downloadICS(egitim); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700 border-b border-gray-100">
            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600">
              <CalendarPlus className="w-4 h-4" />
            </div>
            Apple / Diğer (.ics)
          </button>
          <a href={wUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700 border-b border-gray-100">
            <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">W</div>
            WhatsApp ile paylaş
          </a>
          <button onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700">
            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
            </div>
            {copied ? 'Kopyalandı!' : 'Linki kopyala'}
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

export default EventActions;
