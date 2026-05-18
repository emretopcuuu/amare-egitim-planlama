// Video içi transcript chunks — Spotify podcast-vari zaman damgalı navigation
// VideoOynatModal'da gösterilir, kullanıcı belirli noktaya atlar
//
// Veri kaynağı: kayitli_egitimler/{vimeoId}.transcriptChunks
// Format: [{ start: 0.0, end: 5.2, text: "..." }, ...]

import React, { useEffect, useState, useMemo } from 'react';
import { FileText, Play, Search, X, ChevronDown, Loader2, Sparkles, Clock, BookOpen, Quote, List } from 'lucide-react';
import { db, auth } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { trackAnTikla } from '../utils/anlarTrack';

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
  const [aiAnaliz, setAiAnaliz] = useState(null); // { ahaMoments, chapters, ozet }
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
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
        // Cache'lenmiş AI analizi varsa direkt al
        const aiSnap = await getDoc(doc(db, `kayitli_egitimler/${vimeoId}/ai_analiz/main`));
        if (!iptal && aiSnap.exists()) {
          setAiAnaliz(aiSnap.data());
        }
      } catch (e) {
        console.warn('[chunks] read err:', e.message);
        setChunks([]);
      }
    })();
    return () => { iptal = true; };
  }, [vimeoId]);

  // AI analiz tetikle (yoksa)
  async function aiAnalizTetikle() {
    if (aiAnaliz || aiYukleniyor) return;
    setAiYukleniyor(true);
    try {
      const user = auth.currentUser;
      const headers = { 'Content-Type': 'application/json' };
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
      const res = await fetch('/.netlify/functions/ai-transcript-analiz', {
        method: 'POST',
        headers,
        body: JSON.stringify({ vimeoId }),
      });
      const data = await res.json();
      if (res.ok) setAiAnaliz(data);
    } catch (e) {
      console.warn('[ai-analiz] err:', e.message);
    } finally {
      setAiYukleniyor(false);
    }
  }

  const filtreli = useMemo(() => {
    if (!chunks) return [];
    if (!arama.trim()) return chunks;
    const q = arama.trim().toLowerCase();
    return chunks.filter(c => (c.text || '').toLowerCase().includes(q));
  }, [chunks, arama]);

  // Aha! moments — AI varsa onu kullan, yoksa heuristic
  const ahaMoments = useMemo(() => {
    if (aiAnaliz?.ahaMoments?.length > 0) {
      // AI çıktısı (start + text + sebep)
      return aiAnaliz.ahaMoments;
    }
    // Heuristic fallback
    if (!chunks || chunks.length < 5) return [];
    const aha = chunks.filter(c => {
      const dur = (c.end || 0) - (c.start || 0);
      const len = (c.text || '').length;
      const sorulu = (c.text || '').includes('?');
      return dur >= 4 && dur <= 25 && len >= 60 && len <= 250 && !sorulu;
    }).slice(0, 5);
    return aha;
  }, [chunks, aiAnaliz]);

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
          {/* AI özet — varsa en üstte */}
          {aiAnaliz?.ozet && !arama && (
            <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-400/30 rounded-lg p-3">
              <div className="text-purple-200/80 text-[10px] uppercase tracking-wider font-bold mb-1.5 inline-flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> 3 Cümlede Bu Video
              </div>
              <p className="text-white text-xs leading-relaxed">{aiAnaliz.ozet.kisa}</p>
              {aiAnaliz.ozet.uzun && aiAnaliz.ozet.uzun.length > aiAnaliz.ozet.kisa?.length && (
                <details className="mt-2">
                  <summary className="text-purple-300/80 text-[10px] cursor-pointer hover:text-purple-200">
                    Detaylı özet
                  </summary>
                  <p className="text-white/80 text-xs leading-relaxed mt-1">{aiAnaliz.ozet.uzun}</p>
                </details>
              )}
              {aiAnaliz.ozet.anaTema && (
                <div className="mt-2 inline-block bg-purple-500/20 text-purple-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  {aiAnaliz.ozet.anaTema}
                </div>
              )}
            </div>
          )}

          {/* Chapters — YouTube tarzı bölüm bar */}
          {aiAnaliz?.chapters?.length > 0 && !arama && (
            <div>
              <div className="text-sky-300/80 text-[10px] uppercase tracking-wider font-bold mb-2 inline-flex items-center gap-1">
                <List className="w-3 h-3" /> Bölümler ({aiAnaliz.chapters.length})
              </div>
              <div className="space-y-1">
                {aiAnaliz.chapters.map((ch, i) => (
                  <button key={i} onClick={() => { trackAnTikla(vimeoId, ch.start, 'chapter'); onSeek?.(ch.start); }}
                    className="w-full text-left bg-sky-500/5 hover:bg-sky-500/15 border border-sky-400/20 hover:border-sky-400/50 rounded-md px-2.5 py-1.5 flex items-center gap-2 transition spring-tap">
                    <span className="bg-sky-500/30 text-sky-100 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded flex-shrink-0 min-w-[44px] text-center">
                      {formatSure(ch.start)}
                    </span>
                    <span className="text-white text-xs flex-1">{ch.baslik}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI tetikleyici — analiz yoksa */}
          {!aiAnaliz && !aiYukleniyor && (
            <button onClick={aiAnalizTetikle}
              className="w-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-400/30 rounded-lg p-2.5 text-xs text-purple-200 font-semibold inline-flex items-center justify-center gap-2 spring-tap">
              <Sparkles className="w-3.5 h-3.5" />
              AI ile analiz et (Aha moments + Bölümler + Özet)
            </button>
          )}
          {aiYukleniyor && (
            <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-2.5 text-xs text-purple-200 inline-flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AI analiz ediyor (~10sn)...
            </div>
          )}

          {/* Aha! moments — AI veya heuristic */}
          {ahaMoments.length > 0 && !arama && (
            <div>
              <div className="text-amber-300/80 text-[10px] uppercase tracking-wider font-bold mb-2 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Aha! Anlar
                {aiAnaliz?.ahaMoments?.length > 0 && (
                  <span className="text-amber-400/60 text-[9px] font-normal normal-case ml-1">(AI küratör)</span>
                )}
              </div>
              <div className="space-y-1.5">
                {ahaMoments.map((c, i) => (
                  <button key={i} onClick={() => { trackAnTikla(vimeoId, c.start, 'aha'); onSeek?.(c.start); }}
                    className="w-full text-left bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg p-2.5 flex items-start gap-2 transition spring-tap">
                    <span className="bg-amber-400 text-purple-900 text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <Play className="w-2.5 h-2.5" fill="currentColor" />{formatSure(c.start)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/85 text-xs leading-relaxed">{c.text}</p>
                      {c.sebep && (
                        <p className="text-amber-200/70 text-[10px] mt-1 italic">{c.sebep}</p>
                      )}
                    </div>
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
                <button key={`${c.start}_${i}`} onClick={() => { trackAnTikla(vimeoId, c.start, 'chunk'); onSeek?.(c.start); }}
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
