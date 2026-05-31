// Vimeo iframe full-screen player overlay
// v2: Desktop'ta sidebar layout (video solda, AI panel sağda)
//     Mobile'da vertical stack (mevcut davranış)
//     currentTime tracking → transcript chunks aktif highlight
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { X, Calendar, Eye, Clock, Tag, Video as VideoIcon, Play } from 'lucide-react';
import { useVimeoTimeTracker } from '../utils/useVimeoTimeTracker';
import { updateProgress } from '../utils/watchProgress';
import { confetti } from './Konfeti';
import { useToast } from './Toast';
import { vimeoSeekAndPlay } from '../utils/vimeoSeek';
import { useAuth } from '../context/AuthContext';
import VideoYildiz from './VideoYildiz';
import VideoBookmarklar from './VideoBookmarklar';
import VideoYorumlar from './VideoYorumlar';
import VideoQuiz from './VideoQuiz';
import VideoReactions from './VideoReactions';
import VideoEkler from './VideoEkler';
import VideoTranscriptChunks from './VideoTranscriptChunks';

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
  const [currentTime, setCurrentTime] = useState(0); // canlı highlight için
  const iframeRef = useRef(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (video && !isAuthenticated) {
      console.warn('[video] Yetkisiz oynatma denemesi engellendi');
      onClose?.();
    }
  }, [video, isAuthenticated, onClose]);

  if (video && !isAuthenticated) return null;

  // Watch progress tracker (5sn throttle, mevcut)
  const handleTimeUpdate = useCallback((seconds, duration) => {
    if (video?.id) updateProgress(video.id, seconds, duration);
  }, [video?.id]);
  useVimeoTimeTracker(iframeRef, video?.id, handleTimeUpdate);

  // Video tamamlandı kutlaması — ilk kez %95+ olunca konfeti + toast
  const { toast } = useToast();
  useEffect(() => {
    const onTamam = (e) => {
      if (!video?.id || e.detail?.videoId !== video.id) return;
      confetti({ count: 80, origin: { x: 0.5, y: 0.7 } });
      toast('Tamamlandı! Bir adım daha 🌟', { type: 'success' });
    };
    window.addEventListener('video:tamamlandi', onTamam);
    return () => window.removeEventListener('video:tamamlandi', onTamam);
  }, [video?.id, toast]);

  // Hızlı currentTime — transcript highlight için (1sn throttle)
  useEffect(() => {
    if (!video) return;
    let son = 0;
    const onMsg = (e) => {
      if (typeof e.origin === 'string' && !e.origin.includes('vimeo.com')) return;
      let data;
      try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      if (data?.event !== 'timeupdate') return;
      const sec = data.data?.seconds;
      if (typeof sec !== 'number') return;
      const now = Date.now();
      if (now - son < 1000) return; // 1sn throttle
      son = now;
      setCurrentTime(sec);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [video?.id]);

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
  const hash = seekTo && seekTo > 0 ? `#t=${Math.floor(seekTo)}s` : '';
  const iframeSrc = `${embedUrl}${sep}autoplay=1&title=0&byline=0&portrait=0${hash}`;

  const sureMetin = formatSure(video.sure);
  const playsMetin = formatPlays(video.plays);
  const aciklama = (video.aciklama || '').trim();

  const handleIlgiliClick = (v) => {
    if (onOynat) onOynat(v);
  };

  const onSeek = (s) => vimeoSeekAndPlay(iframeRef.current, s);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 lg:p-6 animate-fade-in overflow-y-auto"
      onClick={onClose}>
      <div className="w-full max-w-7xl flex flex-col my-2 sm:my-4" onClick={e => e.stopPropagation()}>
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

        {/* ─── DESKTOP SIDEBAR LAYOUT (lg+): video sol 60%, AI panel sağ 40% ─── */}
        <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-4 xl:grid-cols-[1fr_460px]">
          {/* ─── SOL: Video + meta + reactions + diğer ─── */}
          <div className="space-y-3">
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

            {/* Üst satır: tarih, süre, plays */}
            <div className="text-white/80 text-xs sm:text-sm flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
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
              <div className="text-white/80 text-xs sm:text-sm flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
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

            {/* Etkileşim alanı — Yıldız + Reactions — daha belirgin CTA */}
            <div className="bg-gradient-to-br from-amber-400/15 via-orange-500/10 to-amber-400/15 border-2 border-amber-300/40 rounded-2xl p-4 sm:p-5 shadow-lg shadow-amber-500/10">
              <div className="text-center mb-3">
                <h4 className="text-white font-extrabold text-sm sm:text-base">
                  ✨ Bu eğitim sana ne kattı?
                </h4>
                <p className="text-amber-200/80 text-[11px] sm:text-xs mt-0.5">
                  Birkaç saniyeni ayır — yıldız ver, emoji bırak, eğitmen görür
                </p>
              </div>

              {/* Yıldız oylama — büyük + ortalı */}
              <div className="bg-black/20 rounded-xl p-3 mb-2.5 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-amber-300 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                  ⭐ Puanla
                </span>
                <VideoYildiz vimeoId={video.vimeoId || video.id} />
              </div>

              {/* Reactions — emoji */}
              <div className="bg-black/20 rounded-xl p-3">
                <VideoReactions vimeoId={video.vimeoId || video.id} />
              </div>
            </div>

            {/* PDF/Slide ekleri */}
            <VideoEkler vimeoId={video.vimeoId || video.id} />

            {/* Bookmark + zaman damgalı kayıt */}
            <VideoBookmarklar vimeoId={video.vimeoId || video.id} iframeRef={iframeRef} onSeek={onSeek} />

            {/* ─── MOBİL: transcript chunks burada (sidebar yok) ─── */}
            <div className="lg:hidden">
              <VideoTranscriptChunks
                vimeoId={video.vimeoId || video.id}
                sure={video.sure}
                onSeek={onSeek}
                currentTime={currentTime}
              />
            </div>

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

            {/* Quiz */}
            <VideoQuiz video={video} />

            {/* Yorumlar */}
            <VideoYorumlar vimeoId={video.vimeoId || video.id} />

            {/* Aynı eğitmenden ilgili videolar */}
            {ilgiliVideolar.length > 0 && (
              <div className="pt-2">
                <h4 className="text-white text-sm font-bold mb-2 inline-flex items-center gap-1.5">
                  <VideoIcon className="w-4 h-4" />
                  Aynı eğitmenden ({ilgiliVideolar.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
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

          {/* ─── SAĞ (sadece lg+): Sticky AI panel ─── */}
          <aside className="hidden lg:block">
            <div className="sticky top-2 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
              <VideoTranscriptChunks
                vimeoId={video.vimeoId || video.id}
                sure={video.sure}
                onSeek={onSeek}
                currentTime={currentTime}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default VideoOynatModal;
