// Vimeo iframe full-screen player overlay
// KonusmaciFullModal ve KayitliEgitimlerSayfasi tarafından kullanılır.
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const VideoOynatModal = ({ video, onClose }) => {
  useEffect(() => {
    if (!video) return;
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [video, onClose]);

  if (!video) return null;

  const embedUrl = video.embedUrl || `https://player.vimeo.com/video/${video.vimeoId}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-6 animate-fade-in"
      onClick={onClose}>
      <div className="w-full max-w-5xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-white text-sm sm:text-base font-semibold line-clamp-1 flex-1 pr-3">
            {video.baslik}
          </h3>
          <button onClick={onClose} aria-label="Kapat"
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all spring-tap text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Iframe */}
        <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl" style={{ paddingTop: '56.25%' }}>
          <iframe
            src={`${embedUrl}?autoplay=1&title=0&byline=0&portrait=0`}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={video.baslik}
          />
        </div>
        {/* Meta */}
        {(video.tarih || video.egitmenAdlari?.length) && (
          <div className="mt-3 text-white/80 text-xs sm:text-sm flex flex-wrap items-center gap-3 px-1">
            {video.tarih && <span>{video.tarih}</span>}
            {video.egitmenAdlari?.length > 0 && <span>{video.egitmenAdlari.join(', ')}</span>}
            {video.kategoriler?.length > 0 && (
              <span className="text-amber-300">{video.kategoriler.join(' · ')}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoOynatModal;
