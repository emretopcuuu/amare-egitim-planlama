// Video içi transcript chunks — Spotify podcast-vari zaman damgalı navigation
// VideoOynatModal'da gösterilir, kullanıcı belirli noktaya atlar
//
// Veri kaynağı: kayitli_egitimler/{vimeoId}.transcriptChunks
// Format: [{ start: 0.0, end: 5.2, text: "..." }, ...]

import React, { useEffect, useState, useMemo } from 'react';
import { FileText, Play, Search, X, ChevronDown, Loader2, Sparkles, Clock } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

function formatSure(s) {
  if (s == null || s < 0) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Basit highlight — query'yi <mark> ile sar
function highlight(text, q) {
  if (!q || q.length < 2) return text;
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escaped})`, 'gi');
    return text.replace(re, '<mark style="background:rgba(251,191,36,0.4);color:#fff;padding:0 2px;border-radius:2px;">$1</mark>');
  } catch { return text; }
}

const VideoTranscriptChunks = ({ vimeoId, sure, onSeek }) => {
  const [chunks, setChunks] = useState(null); // null=loading, []=yok, [items]=var
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState('');

  useEffect(() => {
    if (!vimeoId) { setChunks([]); return; }
    let iptal = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, `kayitli_egitimler/${vimeoId}`));
        if (iptal) return;
        if (snap.exists()) {
          const data = snap.data();
          const ch = Array.isArray(data.transcriptChunks) ? data.transcriptChunks : [];
          setChunks(ch);
        } else {
          setChunks([]);
        }
      } catch (e) {
        console.warn('[chunks] read err:', e.message);
        setChunks([]);
      }
    })();
    return () => { iptal = true; };
  }, [vimeoId]);

  const filtreli = useMemo(() => {
    if (!chunks) return [];
    if (!arama.trim()) return chunks;
    const q = arama.trim().toLowerCase();
    return chunks.filter(c => (c.text || '').toLowerCase().includes(q));
  }, [chunks, arama]);

  // Aha! moments — yüksek değerli paragraflar (uzun + alıntı-vari)
  const ahaMoments = useMemo(() => {
    if (!chunks || chunks.length < 5) return [];
    // Heuristic: 8-25 sn arası + 50+ karakter + soru işareti/ünlem yok
    const aha = chunks.filter(c => {
      const dur = (c.end || 0) - (c.start || 0);
      const len = (c.text || '').length;
      const isAlinti = /["""'']/.test(c.text || '');
      const sorulu = (c.text || '').includes('?');
      return dur >= 4 && dur <= 25 && len >= 60 && len <= 250 && !sorulu;
    }).slice(0, 5);
    return aha;
  }, [chunks]);

  // Henüz yüklenmedi
  if (chunks === null) {
    return (
      <div className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-center justify-center gap-2 text-white/40 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transcript yükleniyor...
      </div>
    );
  }

  // Hiç chunk yok
  if (chunks.length === 0) {
    return null; // Sessizce gizle (zaten yorum/quiz var)
  }

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      {/* Header — toggle */}
      <button onClick={() => setAcik(a => !a)}
        className="w-full p-3 flex items-center justify-between gap-2 hover:bg-white/5 transition spring-tap">
        <span className="text-white/80 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          Transcript {chunks.length > 0 && `(${chunks.length} bölüm)`}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${acik ? 'rotate-180' : ''}`} />
      </button>

      {acik && (
        <div className="border-t border-white/10 p-3 space-y-3">
          {/* Aha! moments — eğitici alıntılar */}
          {ahaMoments.length > 0 && !arama && (
            <div>
              <div className="text-amber-300/80 text-[10px] uppercase tracking-wider font-bold mb-2 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Aha! Anlar
              </div>
              <div className="space-y-1.5">
                {ahaMoments.map((c, i) => (
                  <button key={i} onClick={() => onSeek?.(c.start)}
                    className="w-full text-left bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg p-2.5 flex items-start gap-2 transition spring-tap">
                    <span className="bg-amber-400 text-purple-900 text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <Play className="w-2.5 h-2.5" fill="currentColor" />{formatSure(c.start)}
                    </span>
                    <p className="text-white/85 text-xs leading-relaxed flex-1">{c.text}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Arama */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input type="text" value={arama} onChange={e => setArama(e.target.value)}
              placeholder="Bu videoda ara..."
              className="w-full bg-black/30 border border-white/10 focus:border-amber-400/60 rounded-lg pl-8 pr-8 py-2 text-xs text-white placeholder-white/40 outline-none transition" />
            {arama && (
              <button onClick={() => setArama('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {arama && (
            <div className="text-white/50 text-[10px]">
              {filtreli.length} eşleşme
            </div>
          )}

          {/* Chunk listesi */}
          {filtreli.length === 0 && arama && (
            <p className="text-white/40 text-[11px] text-center py-3">"{arama}" bu videoda geçmiyor</p>
          )}

          {filtreli.length > 0 && (
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {filtreli.slice(0, arama ? 50 : 100).map((c, i) => (
                <button key={`${c.start}_${i}`} onClick={() => onSeek?.(c.start)}
                  className="w-full text-left bg-black/20 hover:bg-amber-500/15 border border-transparent hover:border-amber-400/30 rounded p-2 flex items-start gap-2 transition spring-tap group">
                  <span className="bg-white/10 group-hover:bg-amber-400 group-hover:text-purple-900 text-white/70 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 flex-shrink-0 mt-0.5 min-w-[44px] justify-center">
                    <Clock className="w-2.5 h-2.5" />{formatSure(c.start)}
                  </span>
                  <p className="text-white/80 text-[11px] leading-relaxed flex-1"
                    dangerouslySetInnerHTML={{ __html: highlight(c.text || '', arama) }} />
                </button>
              ))}
              {!arama && filtreli.length > 100 && (
                <div className="text-white/40 text-[10px] text-center py-2">
                  +{filtreli.length - 100} bölüm daha (ara'yı kullan)
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoTranscriptChunks;
