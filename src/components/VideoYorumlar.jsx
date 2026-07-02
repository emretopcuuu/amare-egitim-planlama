// Video yorumları — basit threading (parent + reply)
// Firestore: kayitli_egitimler/{vimeoId}/yorumlar/{yorumId}
//   { uid, ad, fotoURL, metin, tarih, parentId? }

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, Send, Loader2, Trash2, CornerDownRight, X, Clock } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { guvenliGetDocs } from '../utils/guvenliVeri';
import { useAuth } from '../context/AuthContext';

const COOLDOWN_MS = 5000; // 5 saniye yorumlar arası min süre — spam koruma

function timeAgo(ts) {
  if (!ts) return '';
  const ms = Date.now() - (ts._seconds ? ts._seconds * 1000 : new Date(ts).getTime());
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'şimdi';
  if (s < 3600) return `${Math.floor(s / 60)}dk`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa`;
  if (s < 604800) return `${Math.floor(s / 86400)}g`;
  return `${Math.floor(s / 604800)}h`;
}

const VideoYorumlar = ({ vimeoId }) => {
  const { currentUser, isAnonymous } = useAuth();
  const [yorumlar, setYorumlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yeniMetin, setYeniMetin] = useState('');
  const [yanitVeren, setYanitVeren] = useState(null); // parentId
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [cooldownKalan, setCooldownKalan] = useState(0);
  const sonGonderimRef = useRef(0);

  const load = useCallback(async () => {
    if (!vimeoId) { setYukleniyor(false); return; }
    try {
      const q = query(collection(db, `kayitli_egitimler/${vimeoId}/yorumlar`), orderBy('tarih', 'desc'));
      const snap = await guvenliGetDocs(q);
      setYorumlar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn('[yorum] read err:', e.message);
    } finally {
      setYukleniyor(false);
    }
  }, [vimeoId]);

  useEffect(() => { load(); }, [load]);

  async function gonder() {
    if (!currentUser || isAnonymous || !yeniMetin.trim()) return;
    // Cooldown kontrolü — 5sn arası min süre
    const kalan = COOLDOWN_MS - (Date.now() - sonGonderimRef.current);
    if (kalan > 0) {
      setCooldownKalan(Math.ceil(kalan / 1000));
      return;
    }
    setGonderiliyor(true);
    try {
      await addDoc(collection(db, `kayitli_egitimler/${vimeoId}/yorumlar`), {
        uid: currentUser.uid,
        ad: currentUser.displayName || 'Marka Ortağı',
        fotoURL: currentUser.photoURL || null,
        metin: yeniMetin.trim().slice(0, 1000),
        parentId: yanitVeren || null,
        tarih: serverTimestamp(),
      });
      sonGonderimRef.current = Date.now();
      setYeniMetin('');
      setYanitVeren(null);
      // Cooldown sayacı başlat (UI feedback)
      setCooldownKalan(Math.ceil(COOLDOWN_MS / 1000));
      const interval = setInterval(() => {
        const k = COOLDOWN_MS - (Date.now() - sonGonderimRef.current);
        if (k <= 0) {
          setCooldownKalan(0);
          clearInterval(interval);
        } else {
          setCooldownKalan(Math.ceil(k / 1000));
        }
      }, 500);
      await load();
    } catch (e) {
      console.warn('[yorum] gonder err:', e.message);
    } finally {
      setGonderiliyor(false);
    }
  }

  async function sil(id) {
    if (!window.confirm('Bu yorum silinsin mi?')) return;
    try {
      await deleteDoc(doc(db, `kayitli_egitimler/${vimeoId}/yorumlar/${id}`));
      setYorumlar(y => y.filter(x => x.id !== id));
    } catch (e) {
      console.warn('[yorum] sil err:', e.message);
    }
  }

  // Threading — parent yorumlar + her birinin yanıtları
  const parentlar = yorumlar.filter(y => !y.parentId);
  const yanitMap = {};
  yorumlar.forEach(y => {
    if (y.parentId) {
      if (!yanitMap[y.parentId]) yanitMap[y.parentId] = [];
      yanitMap[y.parentId].push(y);
    }
  });

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl p-4 sm:p-5 border-2 border-emerald-300/30 shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-300" />
          <span className="text-white font-extrabold text-sm sm:text-base">
            💬 Yorumlar
            {yorumlar.length > 0 && (
              <span className="text-emerald-300 text-xs font-normal ml-1.5">({yorumlar.length})</span>
            )}
          </span>
        </div>
        {yorumlar.length === 0 && currentUser && !isAnonymous && (
          <span className="text-emerald-200/70 text-[10px] italic">İlk yorumu sen yaz! 👇</span>
        )}
      </div>

      {/* Yorum yazma */}
      {currentUser && !isAnonymous ? (
        <div className="mb-3">
          {yanitVeren && (
            <div className="text-amber-300 text-[11px] mb-1 inline-flex items-center gap-1">
              <CornerDownRight className="w-3 h-3" />
              Yanıtlanıyor
              <button onClick={() => setYanitVeren(null)} className="text-white/40 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea value={yeniMetin} onChange={(e) => setYeniMetin(e.target.value)}
              placeholder={yanitVeren ? 'Yanıtın...' : 'Düşünceni paylaş, kaçırdıkların görenler için not bırak...'}
              maxLength={1000} rows={2}
              className="flex-1 bg-black/30 text-white text-sm px-3 py-2 rounded-lg placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none border border-white/10 focus:border-emerald-400/50" />
            <button onClick={gonder}
              disabled={gonderiliyor || !yeniMetin.trim() || cooldownKalan > 0}
              title={cooldownKalan > 0 ? `${cooldownKalan}sn bekle` : 'Gönder'}
              className="bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold px-3 rounded-lg spring-tap disabled:opacity-50 self-end h-9 inline-flex items-center gap-1">
              {gonderiliyor ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : cooldownKalan > 0 ? <><Clock className="w-3.5 h-3.5" /><span className="text-xs">{cooldownKalan}</span></>
                : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-white/40 text-[11px] mb-3 text-center">Yorum yazmak için <span className="text-amber-300">Marka Ortağı girişi</span> yap.</p>
      )}

      {yukleniyor && <Loader2 className="w-5 h-5 animate-spin text-white/40 mx-auto" />}

      {!yukleniyor && parentlar.length === 0 && (
        <p className="text-white/40 text-[11px] text-center py-2">Henüz yorum yok. İlk olabilirsin.</p>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {parentlar.map(y => (
          <div key={y.id}>
            <YorumKart y={y} onYanit={() => setYanitVeren(y.id)} onSil={sil} currentUser={currentUser} />
            {yanitMap[y.id]?.length > 0 && (
              <div className="ml-7 mt-2 space-y-2">
                {yanitMap[y.id].map(yan => (
                  <YorumKart key={yan.id} y={yan} onSil={sil} currentUser={currentUser} yanit />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const YorumKart = ({ y, onYanit, onSil, currentUser, yanit = false }) => {
  const initials = (y.ad || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const benim = currentUser?.uid === y.uid;
  return (
    <div className="flex items-start gap-2">
      {y.fotoURL ? (
        <img src={y.fotoURL} alt={y.ad} className="w-7 h-7 rounded-full object-cover border border-white/20 flex-shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-white font-bold">{y.ad}</span>
          <span className="text-white/40">{timeAgo(y.tarih)}</span>
          {yanit && <CornerDownRight className="w-3 h-3 text-white/30" />}
        </div>
        <p className="text-white/85 text-xs mt-0.5 whitespace-pre-wrap break-words">{y.metin}</p>
        <div className="flex gap-3 mt-1 text-[10px]">
          {!yanit && onYanit && (
            <button onClick={onYanit} className="text-white/50 hover:text-amber-300 spring-tap">Yanıtla</button>
          )}
          {benim && (
            <button onClick={() => onSil(y.id)} className="text-white/50 hover:text-rose-300 spring-tap inline-flex items-center gap-0.5">
              <Trash2 className="w-2.5 h-2.5" />Sil
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoYorumlar;
