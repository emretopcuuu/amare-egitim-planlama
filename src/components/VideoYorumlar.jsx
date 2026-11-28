// Video yorumları — basit threading (parent + reply)
// Firestore: kayitli_egitimler/{vimeoId}/yorumlar/{yorumId}
//   { uid, ad, fotoURL, metin, tarih, parentId?, gizli?, bildirimSayisi? }
// Moderasyon (mağaza O3, Apple 1.2): her yorumda Bildir (yöneticiye kayıt,
// netlify/functions/yorum-bildir.mjs; 3 bildirimde yorum otomatik gizlenir) +
// Engelle (yazarın yorumları bu cihazda gizlenir) + yazarken yasaklı kelime süzgeci.

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, Send, Loader2, Trash2, CornerDownRight, X, Clock, Flag, Ban } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { guvenliGetDocs } from '../utils/guvenliVeri';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { uygunsuzMu, engelliYazarlar, yazariEngelle, engelleriKaldir } from '../utils/yorumFiltre';

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
  const { t } = useTranslation();
  const [engelliler, setEngelliler] = useState(() => engelliYazarlar());
  const [bildirilenler, setBildirilenler] = useState(() => new Set());
  const [uyari, setUyari] = useState('');

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
    if (uygunsuzMu(yeniMetin)) { setUyari(t('yorum_uygunsuz')); return; }
    setUyari('');
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

  async function bildir(y) {
    if (!currentUser || isAnonymous) { setUyari(t('yorum_giris_gerek')); return; }
    const sebep = window.prompt(t('yorum_bildir_sor'), '');
    if (sebep === null) return; // vazgeçti
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/yorum-bildir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ islem: 'bildir', vimeoId: String(vimeoId), yorumId: y.id, sebep }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setBildirilenler(s => new Set(s).add(y.id));
      setUyari(t('yorum_bildirildi'));
    } catch (e) {
      console.warn('[yorum] bildir err:', e.message);
      setUyari(t('yorum_bildir_hata'));
    }
  }

  function engelle(y) {
    if (!y.uid || !window.confirm(t('yorum_engelle_onay'))) return;
    setEngelliler(yazariEngelle(y.uid));
  }

  // Görünür yorumlar: yönetici incelemesine kadar gizlenenler + engellenen yazarlar dışarıda
  const engelSet = new Set(engelliler);
  const gorunur = yorumlar.filter(y => !y.gizli && !engelSet.has(y.uid));
  const engelliSayisi = yorumlar.filter(y => !y.gizli && engelSet.has(y.uid)).length;

  // Threading — parent yorumlar + her birinin yanıtları
  const parentlar = gorunur.filter(y => !y.parentId);
  const yanitMap = {};
  gorunur.forEach(y => {
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
            {gorunur.length > 0 && (
              <span className="text-emerald-300 text-xs font-normal ml-1.5">({gorunur.length})</span>
            )}
          </span>
        </div>
        {gorunur.length === 0 && currentUser && !isAnonymous && (
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

      {uyari && (
        <p className="text-amber-200 text-[11px] mb-2 text-center" role="status">{uyari}</p>
      )}

      {yukleniyor && <Loader2 className="w-5 h-5 animate-spin text-white/40 mx-auto" />}

      {!yukleniyor && parentlar.length === 0 && (
        <p className="text-white/40 text-[11px] text-center py-2">Henüz yorum yok. İlk olabilirsin.</p>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {parentlar.map(y => (
          <div key={y.id}>
            <YorumKart y={y} onYanit={() => setYanitVeren(y.id)} onSil={sil} onBildir={bildir} onEngelle={engelle}
              bildirildi={bildirilenler.has(y.id)} currentUser={currentUser} t={t} />
            {yanitMap[y.id]?.length > 0 && (
              <div className="ml-7 mt-2 space-y-2">
                {yanitMap[y.id].map(yan => (
                  <YorumKart key={yan.id} y={yan} onSil={sil} onBildir={bildir} onEngelle={engelle}
                    bildirildi={bildirilenler.has(yan.id)} currentUser={currentUser} t={t} yanit />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {engelliSayisi > 0 && (
        <p className="text-white/40 text-[10px] mt-2 text-center">
          {t('yorum_engelli_gizli').replace('{n}', engelliSayisi)}{' '}
          <button onClick={() => setEngelliler(engelleriKaldir())} className="underline hover:text-white/70">
            {t('yorum_engel_kaldir')}
          </button>
        </p>
      )}
    </div>
  );
};

const YorumKart = ({ y, onYanit, onSil, onBildir, onEngelle, bildirildi, currentUser, t, yanit = false }) => {
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
          {!benim && (
            <>
              <button onClick={() => onBildir(y)} disabled={bildirildi}
                className="text-white/50 hover:text-amber-300 spring-tap inline-flex items-center gap-0.5 disabled:opacity-50">
                <Flag className="w-2.5 h-2.5" />{bildirildi ? t('yorum_bildirildi_kisa') : t('yorum_bildir')}
              </button>
              {y.uid && (
                <button onClick={() => onEngelle(y)}
                  className="text-white/50 hover:text-rose-300 spring-tap inline-flex items-center gap-0.5">
                  <Ban className="w-2.5 h-2.5" />{t('yorum_engelle')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoYorumlar;
