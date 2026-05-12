// Eğitim kartı için aksiyon dropdown'u: Takvime Ekle (Google/Outlook/Apple) + WhatsApp + Link kopyala
import React, { useState, useRef, useEffect } from 'react';
import { CalendarPlus, Share2, Check, Link2, X } from 'lucide-react';
import { downloadICS, googleCalendarUrl, outlookCalendarUrl, whatsappShareUrl, copyDeepLink } from '../utils/eventActions';

const EventActions = ({ egitim, dark = false, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleCopy = async () => {
    await copyDeepLink(egitim);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const gUrl = googleCalendarUrl(egitim);
  const oUrl = outlookCalendarUrl(egitim);
  const wUrl = whatsappShareUrl(egitim);

  // Buton stilleri — dark (hero kart için) vs light (normal kart için)
  const triggerCls = dark
    ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors'
    : compact
    ? 'inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors'
    : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors';

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={triggerCls} title="Takvime ekle, paylaş, link kopyala">
        <Share2 className="w-3.5 h-3.5" />
        {!compact && <span>Paylaş</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-56 animate-scaleIn">
          <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wide flex items-center justify-between">
            <span>Aksiyonlar</span>
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="hover:bg-white/20 rounded p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {gUrl && (
            <a href={gUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700 border-b border-gray-100">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600">G</div>
              Google Takvim
            </a>
          )}
          {oUrl && (
            <a href={oUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700 border-b border-gray-100">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-700">O</div>
              Outlook
            </a>
          )}
          <button onClick={() => { downloadICS(egitim); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700 border-b border-gray-100">
            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600">
              <CalendarPlus className="w-4 h-4" />
            </div>
            Apple/Diğer (.ics)
          </button>
          <a href={wUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700 border-b border-gray-100">
            <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center text-green-600">W</div>
            WhatsApp ile paylaş
          </a>
          <button onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-sm text-gray-700">
            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
            </div>
            {copied ? 'Kopyalandı!' : 'Linki kopyala'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EventActions;
