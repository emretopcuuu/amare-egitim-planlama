// Video yıldız oylama — kullanıcı 1-5 yıldız verir
// Firestore: kayitli_egitimler/{vimeoId}/oylar/{uid} = { yildiz, tarih }
// Aggregate: kayitli_egitimler/{vimeoId} doc'unda { puanOrt, puanSayisi }

import React, { useEffect, useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const VideoYildiz = ({ vimeoId, kompakt = false }) => {
  const { currentUser, isAnonymous } = useAuth();
  const [puanOrt, setPuanOrt] = useState(null);
  const [puanSayisi, setPuanSayisi] = useState(0);
  const [benimPuan, setBenimPuan] = useState(0);
  const [hover, setHover] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    if (!vimeoId) { setYukleniyor(false); return; }
    (async () => {
      try {
        // Aggregate
        const videoRef = doc(db, 'kayitli_egitimler', String(vimeoId));
        const videoSnap = await getDoc(videoRef);
        if (videoSnap.exists()) {
          const d = videoSnap.data();
          setPuanOrt(d.puanOrt ?? null);
          setPuanSayisi(d.puanSayisi ?? 0);
        }
        // Kullanıcının kendi oyu
        if (currentUser && !isAnonymous) {
          const oyRef = doc(db, `kayitli_egitimler/${vimeoId}/oylar/${currentUser.uid}`);
          const oySnap = await getDoc(oyRef);
          if (oySnap.exists()) {
            setBenimPuan(oySnap.data().yildiz || 0);
          }
        }
      } catch (e) {
        console.warn('[yildiz] read err:', e.message);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [vimeoId, currentUser?.uid, isAnonymous]);

  async function oyla(yildiz) {
    if (!currentUser || isAnonymous || gonderiliyor) return;
    setGonderiliyor(true);
    try {
      const oyRef = doc(db, `kayitli_egitimler/${vimeoId}/oylar/${currentUser.uid}`);
      const videoRef = doc(db, `kayitli_egitimler/${vimeoId}`);

      await runTransaction(db, async (tx) => {
        const oySnap = await tx.get(oyRef);
        const videoSnap = await tx.get(videoRef);
        const eskiYildiz = oySnap.exists() ? (oySnap.data().yildiz || 0) : 0;
        const eskiOrt = videoSnap.exists() ? (videoSnap.data().puanOrt || 0) : 0;
        const eskiSayisi = videoSnap.exists() ? (videoSnap.data().puanSayisi || 0) : 0;

        // Yeni ortalama hesabı
        let yeniSayisi, yeniToplamPuan;
        if (eskiYildiz > 0) {
          // Kullanıcı zaten oy vermişti — değiştir
          yeniSayisi = eskiSayisi;
          yeniToplamPuan = eskiOrt * eskiSayisi - eskiYildiz + yildiz;
        } else {
          // İlk oy
          yeniSayisi = eskiSayisi + 1;
          yeniToplamPuan = eskiOrt * eskiSayisi + yildiz;
        }
        const yeniOrt = yeniSayisi > 0 ? yeniToplamPuan / yeniSayisi : 0;

        tx.set(oyRef, {
          yildiz,
          tarih: serverTimestamp(),
          uid: currentUser.uid,
        }, { merge: true });
        tx.set(videoRef, {
          puanOrt: Math.round(yeniOrt * 10) / 10,
          puanSayisi: yeniSayisi,
        }, { merge: true });
      });

      setBenimPuan(yildiz);
      // UI'ı yenile (transaction içinde okunan değerler güvenilir değil)
      const refreshed = await getDoc(videoRef);
      if (refreshed.exists()) {
        setPuanOrt(refreshed.data().puanOrt ?? null);
        setPuanSayisi(refreshed.data().puanSayisi ?? 0);
      }
    } catch (e) {
      console.warn('[yildiz] oyla err:', e.message);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (yukleniyor) {
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />;
  }

  // Kompakt mod — sadece ortalama göster
  if (kompakt) {
    if (puanSayisi === 0) return null;
    return (
      <span className="inline-flex items-center gap-1 text-amber-300 text-xs font-bold">
        <Star className="w-3 h-3" fill="currentColor" />
        {puanOrt?.toFixed(1) || '—'}
        <span className="text-white/40 font-normal">({puanSayisi})</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(i => {
          const aktif = (hover || benimPuan) >= i;
          return (
            <button key={i}
              onClick={() => oyla(i)}
              onMouseEnter={() => setHover(i)}
              disabled={!currentUser || isAnonymous || gonderiliyor}
              aria-label={`${i} yıldız ver`}
              className="p-0.5 spring-tap disabled:opacity-50 disabled:cursor-not-allowed">
              <Star className={`w-5 h-5 transition ${aktif ? 'text-amber-400 scale-110' : 'text-white/30'}`}
                fill={aktif ? 'currentColor' : 'none'} />
            </button>
          );
        })}
      </div>
      <div className="text-xs">
        {puanSayisi > 0 ? (
          <span className="text-white/70">
            <strong className="text-amber-300">{puanOrt?.toFixed(1)}</strong>
            <span className="text-white/40"> · {puanSayisi} oy</span>
          </span>
        ) : (
          <span className="text-white/40">Henüz oy yok</span>
        )}
        {benimPuan > 0 && (
          <span className="text-emerald-300 ml-2 text-[10px]">✓ Senin oyun: {benimPuan}</span>
        )}
        {(!currentUser || isAnonymous) && (
          <span className="text-white/40 ml-2 text-[10px]">(Giriş yap)</span>
        )}
      </div>
    </div>
  );
};

export default VideoYildiz;
