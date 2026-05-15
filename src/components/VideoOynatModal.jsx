// Vimeo iframe full-screen player overlay
// KonusmaciFullModal ve KayitliEgitimlerSayfasi tarafından kullanılır.
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { X, Calendar, Eye, Clock, Tag, Video as VideoIcon, Play } from 'lucide-react';
import { useVimeoTimeTracker } from '../utils/useVimeoTimeTracker';
import { updateProgress } from '../utils/watchProgress';
import { useAuth } from '../context/AuthContext';

function formatSure(saniye) {
  if (!saniye || saniye < 1) return null;
  const h = Math.floor(saniye / 3600);
  const m = Math.floor((saniye % 3600) / 60);
  const s = Math.floor(saniye % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function formatPlays(n) {
  if (!n || n < 1) return null;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace('.0', '') + 'K';
  return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
}

const VideoOynatModal = ({ video, onClose, tumVideolar = [], onOynat, seekTo = null }) => {
  const [aciklamaAcik, setAciklamaAcik] = useState(false);
  const iframeRef = useRef(null);
  const { isAuthenticated } = useAuth();

  // BYPASS koruması: programatik açma denenirse, login yoksa modal'ı kapa
  useEffect(() => {
    if (video && !isAuthenticated) {
      console.warn('[video] Yetkisiz oynatma denemesi engellendi');
      onClose?.();
    }
  }, [video, isAuthenticated, onClose]);

  if (video && !isAuthenticated) return null;

  // Watch progress tracker — Vimeo postMessage ile zamanı dinler
  const handleTimeUpdate = useCallback((seconds, duration) => {
    if (video?.id) updateProgress(video.id, seconds, duration);
  }, [video?.id]);

  useVimeoTimeTracker(iframeRef, video?.id, handleTimeUpdate);

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

  // Aynı eğitmenden diğer videolar (max 8, kendisi hariç)
  const ilgiliVideolar = useMemo(() => {
    if (!video || !tumVideolar?.length) return [];
    const coreIds = video.egitmenler || [];
    if (coreIds.length === 0) return [];
    return tumVideolar
      .filter(v => v.id !== video.id && (v.egitmenler || []).some(c => coreIds.includes(c)))
      .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''))
      .slice(0, 8);
  }, [video, tumVideolar]);

  if (!video) return null;

  const embedUrl = video.embedUrl || `https://player.vimeo.com/video/${video.vimeoId}`;
  const sep = embedUrl.includes('?') ? '&' : '?';
  // seekTo varsa Vimeo'nun #t= hash parametresi ile başlangıç saniyesini atla
  const hash = seekTo && seekTo > 0 ? `#t=${Math.floor(seekTo)}s` : '';
  const iframeSrc = `${embedUrl}${sep}autoplay=1&title=0&byline=0&portrait=0${hash}`;

  const sureMetin = formatSure(video.sure);
  const playsMetin = formatPlays(video.plays);
  const aciklama = (video.aciklama || '').trim();

  const handleIlgiliClick = (v) => {
    if (onOynat) {
      onOynat(v); // parent state'i günceller, modal yeniden render olur
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-6 animate-fade-in overflow-y-auto"
      onClick={onClose}>
      <div className="w-full max-w-5xl flex flex-col my-4" onClick={e => e.stopPropagation()}>
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
            ref={iframeRef}
            src={iframeSrc}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={video.baslik}
          />
        </div>

        {/* Meta */}
        <div className="mt-3 px-1 space-y-3">
          {/* Üst satır: tarih, süre, plays */}
          <div className="text-white/80 text-xs sm:text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
            {video.tarih && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />{video.tarih}
              </span>
            )}
            {sureMetin && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />{sureMetin}
              </span>
            )}
            {playsMetin && (
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />{playsMetin} izlenme
              </span>
            )}
          </div>

          {/* Eğitmen + kategoriler */}
          {(video.egitmenAdlari?.length > 0 || video.kategoriler?.length > 0) && (
            <div className="text-white/80 text-xs sm:text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
              {video.egitmenAdlari?.length > 0 && (
                <span className="font-semibold">{video.egitmenAdlari.join(', ')}</span>
              )}
              {video.kategoriler?.length > 0 && (
                <span className="text-amber-300 inline-flex items-center gap-1">
                  <Tag className="w-3 h-3" />{video.kategoriler.join(' · ')}
                </span>
              )}
            </div>
          )}

          {/* Açıklama (collapsible) */}
          {aciklama && (
            <div className="text-white/80 text-xs sm:text-sm bg-white/5 rounded-lg p-3 border border-white/10">
              <div className={aciklamaAcik ? '' : 'line-clamp-3'}>
                <p className="whitespace-pre-line">{aciklama}</p>
              </div>
              {aciklama.length > 200 && (
                <button onClick={() => setAciklamaAcik(s => !s)}
                  className="mt-2 text-amber-300 hover:text-amber-200 text-xs font-semibold">
                  {aciklamaAcik ? 'Daha az göster' : 'Devamını oku'}
                </button>
              )}
            </div>
          )}

          {/* Aynı eğitmenden ilgili videolar */}
          {ilgiliVideolar.length > 0 && (
            <div className="pt-2">
              <h4 className="text-white text-sm font-bold mb-2 inline-flex items-center gap-1.5">
                <VideoIcon className="w-4 h-4" />
                Aynı eğitmenden ({ilgiliVideolar.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {ilgiliVideolar.map(v => (
                  <button key={v.id} onClick={() => handleIlgiliClick(v)}
                    className="bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400 rounded-lg overflow-hidden text-left transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                    <div className="relative aspect-video bg-black/30">
                      {v.thumbnailUrl ? (
                        <img src={v.thumbnailUrl} alt={v.baslik} loading="lazy"
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <VideoIcon className="w-6 h-6 text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/50 flex items-center justify-center transition-all">
                        <Play className="w-6 h-6 text-white/0 group-hover:text-white transition-all" fill="currentColor" />
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="text-white text-xs font-semibold line-clamp-2 leading-tight">{v.baslik}</div>
                      {v.tarih && (
                        <div className="text-white/50 text-[10px] mt-1">{v.tarih}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoOynatModal;
