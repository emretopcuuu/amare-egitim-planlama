// Video bookmark sistemi — kullanıcı belirli zaman damgalarına işaret eder
// Firestore: users/{uid}/bookmarks/{vimeoId-saniye} = { vimeoId, saniye, not, baslik, tarih }

import React, { useEffect, useState, useCallback } from 'react';
import { Bookmark, BookmarkPlus, Loader2, Trash2, Play, X } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, query, where, orderBy, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { guvenliGetDocs } from '../utils/guvenliVeri';
import { useAuth } from '../context/AuthContext';
import { trackAnTikla } from '../utils/anlarTrack';

function formatSure(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const VideoBookmarklar = ({ vimeoId, iframeRef, onSeek }) => {
  const { currentUser, isAnonymous } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [ekliyor, setEkliyor] = useState(false);
  const [acikGirisi, setAcikGirisi] = useState(false);
  const [yeniNot, setYeniNot] = useState('');
  const [yakalananSure, setYakalananSure] = useState(0);

  const loadBookmarks = useCallback(async () => {
    if (!currentUser || isAnonymous || !vimeoId) {
      setYukleniyor(false);
      return;
    }
    try {
      const q = query(
        collection(db, `users/${currentUser.uid}/bookmarks`),
        where('vimeoId', '==', String(vimeoId)),
        orderBy('saniye', 'asc')
      );
      const snap = await guvenliGetDocs(q);
      const liste = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookmarks(liste);
    } catch (e) {
      console.warn('[bookmark] read err:', e.message);
    } finally {
      setYukleniyor(false);
    }
  }, [vimeoId, currentUser?.uid, isAnonymous]);

  useEffect(() => { loadBookmarks(); }, [loadBookmarks]);

  // Vimeo iframe'den şu anki süreyi al (postMessage)
  function suanyiYakala() {
    if (!iframeRef?.current) {
      // Fallback — manuel girdi modu
      setYakalananSure(0);
      setAcikGirisi(true);
      return;
    }
    // Vimeo postMessage ile süreyi sor
    const messageHandler = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'getCurrentTime' || data.method === 'getCurrentTime') {
          // İlk response — değer içinde
        }
        if (typeof data.value === 'number') {
          setYakalananSure(Math.floor(data.value));
          setAcikGirisi(true);
          window.removeEventListener('message', messageHandler);
        }
      } catch {}
    };
    window.addEventListener('message', messageHandler);
    iframeRef.current.contentWindow?.postMessage(JSON.stringify({ method: 'getCurrentTime' }), '*');
    // 1sn sonra cevap gelmediyse manuel mod
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      if (!acikGirisi) {
        setYakalananSure(0);
        setAcikGirisi(true);
      }
    }, 1000);
  }

  async function bookmarkEkle() {
    if (!currentUser || isAnonymous) return;
    setEkliyor(true);
    try {
      const docId = `${vimeoId}_${yakalananSure}`;
      const ref = doc(db, `users/${currentUser.uid}/bookmarks/${docId}`);
      await setDoc(ref, {
        vimeoId: String(vimeoId),
        saniye: yakalananSure,
        not: yeniNot.trim() || null,
        tarih: serverTimestamp(),
      });
      setYeniNot('');
      setAcikGirisi(false);
      setYakalananSure(0);
      await loadBookmarks();
    } catch (e) {
      console.warn('[bookmark] ekle err:', e.message);
    } finally {
      setEkliyor(false);
    }
  }

  async function bookmarkSil(id) {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/bookmarks/${id}`));
      setBookmarks(b => b.filter(x => x.id !== id));
    } catch (e) {
      console.warn('[bookmark] sil err:', e.message);
    }
  }

  if (!currentUser || isAnonymous) {
    return null; // Anonim kullanıcı bookmark koyamaz
  }
  if (yukleniyor) {
    return <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center"><Loader2 className="w-4 h-4 animate-spin text-white/40 mx-auto" /></div>;
  }

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5" />
          Yer İmlerim {bookmarks.length > 0 && `(${bookmarks.length})`}
        </span>
        {!acikGirisi ? (
          <button onClick={suanyiYakala}
            className="bg-amber-400 hover:bg-amber-300 text-purple-900 text-xs font-bold px-3 py-1.5 rounded-lg spring-tap inline-flex items-center gap-1.5">
            <BookmarkPlus className="w-3.5 h-3.5" />Şu anı işaretle
          </button>
        ) : (
          <button onClick={() => { setAcikGirisi(false); setYeniNot(''); }}
            className="bg-white/10 text-white text-xs px-2 py-1 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {acikGirisi && (
        <div className="space-y-2 mb-2 p-2 bg-amber-400/10 border border-amber-400/30 rounded-lg">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-200 font-bold">{formatSure(yakalananSure)}</span>
            <input type="number" min="0" value={yakalananSure}
              onChange={(e) => setYakalananSure(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-black/30 text-white text-xs px-2 py-1 rounded w-20" placeholder="saniye" />
            <span className="text-white/40 text-[10px]">saniye</span>
          </div>
          <input type="text" value={yeniNot} onChange={(e) => setYeniNot(e.target.value)}
            placeholder="Bu nokta için bir not (opsiyonel)..." maxLength={200}
            className="w-full bg-black/30 text-white text-xs px-2 py-1.5 rounded placeholder-white/40" />
          <button onClick={bookmarkEkle} disabled={ekliyor}
            className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 text-xs font-bold py-1.5 rounded spring-tap disabled:opacity-50">
            {ekliyor ? 'Kaydediliyor...' : 'Yer imi ekle'}
          </button>
        </div>
      )}

      {bookmarks.length === 0 && !acikGirisi && (
        <p className="text-white/40 text-[11px] text-center py-2">Henüz yer imi yok. Önemli bir noktada "Şu anı işaretle"ye bas.</p>
      )}

      {bookmarks.length > 0 && (
        <div className="space-y-1">
          {bookmarks.map(b => (
            <div key={b.id} className="flex items-center gap-2 p-2 bg-black/20 rounded text-xs hover:bg-black/30">
              <button onClick={() => { trackAnTikla(vimeoId, b.saniye, 'bookmark'); onSeek?.(b.saniye); }}
                className="bg-amber-400/20 hover:bg-amber-400/40 text-amber-200 font-bold px-2 py-1 rounded inline-flex items-center gap-1 spring-tap">
                <Play className="w-3 h-3" fill="currentColor" />{formatSure(b.saniye)}
              </button>
              <span className="text-white/80 flex-1 truncate">{b.not || '—'}</span>
              <button onClick={() => bookmarkSil(b.id)} className="text-white/40 hover:text-rose-300 spring-tap">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoBookmarklar;
