// Video içi transcript chunks — Spotify podcast-vari zaman damgalı navigation
// VideoOynatModal'da gösterilir, kullanıcı belirli noktaya atlar.
//
// v2: Sekmeli yapı (Özet | Bölümler | Aha! Anlar | Transcript)
//     + Aktif bölüm canlı vurgu (currentTime tracking)
//     + Üstte arama her zaman görünür
//     + Daha büyük dokunma alanları (mobil)

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FileText, Play, Search, X, Loader2, Sparkles, Clock, BookOpen, List, Layers, MessageSquare } from 'lucide-react';
import { db, auth } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { trackAnTikla } from '../utils/anlarTrack';
import { metinTemizleDeep } from '../utils/metinTemizle';

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

const VideoTranscriptChunks = ({ vimeoId, sure, onSeek, currentTime = 0 }) => {
  const [chunks, setChunks] = useState(null); // null=loading, []=yok, [items]=var
  const [aiAnaliz, setAiAnaliz] = useState(null); // { ahaMoments, chapters, ozet }
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [arama, setArama] = useState('');
  const [aktifTab, setAktifTab] = useState('ozet'); // 'ozet' | 'bolumler' | 'aha' | 'transcript'
  const aktifChunkRef = useRef(null);

  // AI analiz tetikle (idempotent — zaten varsa atlar)
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
      if (res.ok) setAiAnaliz(metinTemizleDeep(data));
    } catch (e) {
      console.warn('[ai-analiz] err:', e.message);
    } finally {
      setAiYukleniyor(false);
    }
  }

  useEffect(() => {
    if (!vimeoId) { setChunks([]); return; }
    let iptal = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, `kayitli_egitimler/${vimeoId}`));
        if (iptal) return;
        let chunkVar = false;
        if (snap.exists()) {
          const data = snap.data();
          const ch = Array.isArray(data.transcriptChunks) ? data.transcriptChunks : [];
          chunkVar = ch.length > 0;
          setChunks(metinTemizleDeep(ch));
        } else {
          setChunks([]);
        }
        const aiSnap = await getDoc(doc(db, `kayitli_egitimler/${vimeoId}/ai_analiz/main`));
        if (iptal) return;
        if (aiSnap.exists()) {
          setAiAnaliz(metinTemizleDeep(aiSnap.data()));
        } else if (chunkVar && auth.currentUser) {
          aiAnalizTetikle();
        }
      } catch (e) {
        console.warn('[chunks] read err:', e.message);
        setChunks([]);
      }
    })();
    return () => { iptal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vimeoId]);

  // Arama → otomatik transcript tab'ına geç
  useEffect(() => {
    if (arama.trim().length >= 2 && aktifTab !== 'transcript') {
      setAktifTab('transcript');
    }
  }, [arama]); // eslint-disable-line

  // AI gelince akıllı tab seçimi: özet varsa "ozet", yoksa "transcript"
  useEffect(() => {
    if (aiAnaliz?.ozet && aktifTab === 'transcript' && !arama) {
      setAktifTab('ozet');
    }
  }, [aiAnaliz]); // eslint-disable-line

  const filtreli = useMemo(() => {
    if (!chunks) return [];
    if (!arama.trim()) return chunks;
    const q = arama.trim().toLowerCase();
    return chunks.filter(c => (c.text || '').toLowerCase().includes(q));
  }, [chunks, arama]);

  const ahaMoments = useMemo(() => {
    return aiAnaliz?.ahaMoments?.length > 0 ? aiAnaliz.ahaMoments : [];
  }, [aiAnaliz]);

  // Aktif bölüm (currentTime'a göre)
  const aktifBolumIdx = useMemo(() => {
    if (!aiAnaliz?.chapters?.length) return -1;
    for (let i = aiAnaliz.chapters.length - 1; i >= 0; i--) {
      if (currentTime >= (aiAnaliz.chapters[i].start || 0)) return i;
    }
    return -1;
  }, [aiAnaliz, currentTime]);

  // Aktif chunk (currentTime'a göre)
  const aktifChunkIdx = useMemo(() => {
    if (!chunks?.length) return -1;
    for (let i = chunks.length - 1; i >= 0; i--) {
      if (currentTime >= (chunks[i].start || 0)) return i;
    }
    return -1;
  }, [chunks, currentTime]);

  // Aktif chunk'a scroll
  useEffect(() => {
    if (aktifTab === 'transcript' && aktifChunkRef.current) {
      aktifChunkRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [aktifChunkIdx, aktifTab]);

  if (chunks === null) {
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-center gap-2 text-white/40 text-xs">
        <Loader2 className="w-4 h-4 animate-spin" /> Transcript yükleniyor...
      </div>
    );
  }
  if (chunks.length === 0) return null;

  // Hangi tab'lar gösterilebilir
  const ozetVar = !!aiAnaliz?.ozet;
  const chaptersVar = !!aiAnaliz?.chapters?.length;
  const ahaVar = ahaMoments.length > 0;

  const TABS = [
    { kod: 'ozet', label: 'Özet', kisa: 'Özet', icon: BookOpen, renk: 'purple', goster: ozetVar || aiYukleniyor || !aiAnaliz },
    { kod: 'bolumler', label: `Bölümler${chaptersVar ? ` (${aiAnaliz.chapters.length})` : ''}`, kisa: 'Bölüm', icon: List, renk: 'sky', goster: chaptersVar },
    { kod: 'aha', label: `Aha! Anlar${ahaVar ? ` (${ahaMoments.length})` : ''}`, kisa: 'Aha!', icon: Sparkles, renk: 'amber', goster: ahaVar },
    { kod: 'transcript', label: `Transcript (${chunks.length})`, kisa: 'Transcript', icon: FileText, renk: 'slate', goster: true },
  ].filter(t => t.goster);

  // Eğer aktif tab kapalıysa ilk açık tab'a düş
  const gecerliTab = TABS.find(t => t.kod === aktifTab) ? aktifTab : TABS[0]?.kod;

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
      {/* ─── ÜST: Arama bar + Tab bar ─── */}
      <div className="bg-black/20 border-b border-white/10 p-3 space-y-2.5 sticky top-0 z-10 backdrop-blur-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input type="text" value={arama} onChange={e => setArama(e.target.value)}
            placeholder="Bu videoda ara…"
            className="w-full bg-black/40 border border-white/10 focus:border-amber-400/60 rounded-lg pl-9 pr-9 py-2.5 text-sm text-white placeholder-white/40 outline-none transition" />
          {arama && (
            <button onClick={() => setArama('')} aria-label="Aramayı temizle"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab bar — yatay scroll, mobilde swipe edilebilir */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
          {TABS.map(t => {
            const aktif = t.kod === gecerliTab;
            const Icon = t.icon;
            const renkMap = {
              purple: aktif ? 'bg-purple-500/30 text-purple-100 border-purple-400/60' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10',
              sky:    aktif ? 'bg-sky-500/30 text-sky-100 border-sky-400/60'         : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10',
              amber:  aktif ? 'bg-amber-400/30 text-amber-100 border-amber-300/60'   : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10',
              slate:  aktif ? 'bg-white/20 text-white border-white/30'               : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10',
            };
            return (
              <button key={t.kod} onClick={() => setAktifTab(t.kod)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition spring-tap flex-shrink-0 ${renkMap[t.renk]}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.kisa}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── İÇERİK ALANI ─── */}
      <div className="p-3 sm:p-4">
        {/* ÖZET TAB */}
        {gecerliTab === 'ozet' && (
          <div>
            {aiYukleniyor && !aiAnaliz && (
              <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-400/30 rounded-xl p-4 text-sm text-purple-100 flex items-center justify-center gap-3 font-semibold">
                <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
                <div>
                  <div>AI bu videoyu analiz ediyor…</div>
                  <div className="text-purple-300/70 font-normal text-xs mt-0.5">~10sn — Aha! anlar + bölümler + özet</div>
                </div>
              </div>
            )}
            {!aiAnaliz && !aiYukleniyor && (
              <button onClick={aiAnalizTetikle}
                className="w-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-400/30 rounded-xl p-4 text-sm text-purple-100 font-semibold inline-flex items-center justify-center gap-2 spring-tap">
                <Sparkles className="w-4 h-4 text-amber-300" />
                AI ile analiz et (Özet + Bölümler + Aha! Anlar)
              </button>
            )}
            {aiAnaliz?.ozet && (
              <div className="bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border border-purple-400/30 rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-purple-300" />
                  <h4 className="text-purple-100 text-xs sm:text-sm font-extrabold uppercase tracking-wider">3 Cümlede Bu Video</h4>
                  {aiAnaliz.ozet.anaTema && (
                    <span className="ml-auto bg-purple-500/30 text-purple-100 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {aiAnaliz.ozet.anaTema}
                    </span>
                  )}
                </div>
                <p className="text-white text-sm leading-relaxed">{aiAnaliz.ozet.kisa}</p>
                {aiAnaliz.ozet.uzun && aiAnaliz.ozet.uzun.length > (aiAnaliz.ozet.kisa?.length || 0) && (
                  <details className="mt-3 group">
                    <summary className="text-purple-300/90 hover:text-purple-200 text-xs cursor-pointer font-semibold inline-flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Detaylı özet
                    </summary>
                    <p className="text-white/85 text-xs sm:text-sm leading-relaxed mt-2 pl-4 border-l-2 border-purple-400/30">
                      {aiAnaliz.ozet.uzun}
                    </p>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* BÖLÜMLER TAB */}
        {gecerliTab === 'bolumler' && chaptersVar && (
          <div className="space-y-2">
            {aiAnaliz.chapters.map((ch, i) => {
              const aktif = i === aktifBolumIdx;
              return (
                <button key={i} onClick={() => { trackAnTikla(vimeoId, ch.start, 'chapter'); onSeek?.(ch.start); }}
                  className={`w-full text-left rounded-xl p-3 sm:p-3.5 flex items-center gap-3 transition spring-tap border ${
                    aktif
                      ? 'bg-sky-500/25 border-sky-300/60 shadow-lg shadow-sky-500/20 ring-2 ring-sky-400/30'
                      : 'bg-sky-500/5 hover:bg-sky-500/15 border-sky-400/20 hover:border-sky-400/50'
                  }`}>
                  <span className={`text-xs font-bold font-mono px-2 py-1 rounded inline-flex items-center gap-1 flex-shrink-0 min-w-[52px] justify-center ${
                    aktif ? 'bg-sky-400 text-purple-900' : 'bg-sky-500/30 text-sky-100'
                  }`}>
                    {aktif && <Play className="w-2.5 h-2.5" fill="currentColor" />}
                    {formatSure(ch.start)}
                  </span>
                  <span className={`text-sm flex-1 ${aktif ? 'text-white font-semibold' : 'text-white/90'}`}>
                    {ch.baslik}
                  </span>
                  {aktif && (
                    <span className="text-sky-200/80 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                      ▶ Şu an
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* AHA! ANLAR TAB */}
        {gecerliTab === 'aha' && ahaVar && (
          <div className="space-y-2.5">
            {ahaMoments.map((c, i) => (
              <button key={i} onClick={() => { trackAnTikla(vimeoId, c.start, 'aha'); onSeek?.(c.start); }}
                className="w-full text-left bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 hover:border-amber-300/60 rounded-xl p-3 sm:p-4 flex items-start gap-3 transition spring-tap">
                <span className="bg-amber-400 text-purple-900 text-xs font-bold px-2 py-1 rounded inline-flex items-center gap-1 flex-shrink-0 min-w-[52px] justify-center">
                  <Play className="w-3 h-3" fill="currentColor" />{formatSure(c.start)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-relaxed italic">"{c.text}"</p>
                  {c.sebep && (
                    <p className="text-amber-200/80 text-xs mt-2 italic flex items-start gap-1">
                      <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {c.sebep}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* TRANSCRIPT TAB */}
        {gecerliTab === 'transcript' && (
          <div>
            {arama && (
              <div className="text-white/50 text-xs mb-2 inline-flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {filtreli.length > 0 ? `${filtreli.length} eşleşme` : `"${arama}" bulunamadı`}
              </div>
            )}
            <div className="space-y-1 max-h-[60vh] lg:max-h-[500px] overflow-y-auto pr-1">
              {filtreli.slice(0, arama ? 50 : 200).map((c, i) => {
                const aktif = !arama && chunks.indexOf(c) === aktifChunkIdx;
                return (
                  <button key={`${c.start}_${i}`}
                    ref={aktif ? aktifChunkRef : null}
                    onClick={() => { trackAnTikla(vimeoId, c.start, 'chunk'); onSeek?.(c.start); }}
                    className={`w-full text-left rounded-lg p-2.5 flex items-start gap-2 transition spring-tap group border ${
                      aktif
                        ? 'bg-amber-500/20 border-amber-400/50 shadow-md shadow-amber-500/10'
                        : 'bg-black/15 hover:bg-amber-500/10 border-transparent hover:border-amber-400/30'
                    }`}>
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 flex-shrink-0 mt-0.5 min-w-[48px] justify-center ${
                      aktif ? 'bg-amber-400 text-purple-900' : 'bg-white/10 text-white/70 group-hover:bg-amber-400 group-hover:text-purple-900'
                    }`}>
                      <Clock className="w-2.5 h-2.5" />{formatSure(c.start)}
                    </span>
                    <p className={`text-sm leading-relaxed flex-1 ${aktif ? 'text-white font-medium' : 'text-white/85'}`}
                      dangerouslySetInnerHTML={{ __html: highlight(c.text || '', arama) }} />
                  </button>
                );
              })}
              {!arama && filtreli.length > 200 && (
                <div className="text-white/40 text-xs text-center py-2 italic">
                  +{filtreli.length - 200} bölüm daha — yukarıdan ara
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoTranscriptChunks;
