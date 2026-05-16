// Video reactions — tek tık emoji (👍 🔥 ❤️ 🙏 💡)
// Firestore aggregate: kayitli_egitimler/{vimeoId}.reactions = { fire: 12, like: 30, ... }
// Kullanıcının tepkisi: kayitli_egitimler/{vimeoId}/reactions/{uid} = { tip }

import React, { useEffect, useState } from 'react';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const TIPLER = [
  { kod: 'like',  emoji: '👍', etiket: 'Beğen' },
  { kod: 'fire',  emoji: '🔥', etiket: 'Ateş' },
  { kod: 'love',  emoji: '❤️', etiket: 'Sevgi' },
  { kod: 'pray',  emoji: '🙏', etiket: 'Teşekkür' },
  { kod: 'idea',  emoji: '💡', etiket: 'Aha!' },
];

const VideoReactions = ({ vimeoId }) => {
  const { currentUser, isAnonymous } = useAuth();
  const [sayilar, setSayilar] = useState({});
  const [benimTip, setBenimTip] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!vimeoId) return;
    (async () => {
      try {
        const vRef = doc(db, `kayitli_egitimler/${vimeoId}`);
        const vSnap = await getDoc(vRef);
        if (vSnap.exists()) {
          setSayilar(vSnap.data().reactions || {});
        }
        if (currentUser && !isAnonymous) {
          const myRef = doc(db, `kayitli_egitimler/${vimeoId}/reactions/${currentUser.uid}`);
          const mySnap = await getDoc(myRef);
          if (mySnap.exists()) setBenimTip(mySnap.data().tip);
        }
      } catch (e) {
        console.warn('[reactions] read err:', e.message);
      }
    })();
  }, [vimeoId, currentUser?.uid, isAnonymous]);

  async function tepkiVer(tip) {
    if (!currentUser || isAnonymous || yukleniyor) return;
    setYukleniyor(true);
    try {
      const myRef = doc(db, `kayitli_egitimler/${vimeoId}/reactions/${currentUser.uid}`);
      const vRef = doc(db, `kayitli_egitimler/${vimeoId}`);

      const eskiTip = benimTip;
      const yeniTip = eskiTip === tip ? null : tip; // Aynı tipe basarsa kaldır

      await runTransaction(db, async (tx) => {
        const vSnap = await tx.get(vRef);
        const reactions = (vSnap.exists() ? vSnap.data().reactions : {}) || {};

        if (eskiTip && reactions[eskiTip]) {
          reactions[eskiTip] = Math.max(0, reactions[eskiTip] - 1);
        }
        if (yeniTip) {
          reactions[yeniTip] = (reactions[yeniTip] || 0) + 1;
        }

        tx.set(vRef, { reactions }, { merge: true });
        if (yeniTip) {
          tx.set(myRef, { tip: yeniTip, tarih: new Date() }, { merge: true });
        } else {
          tx.delete(myRef);
        }
      });

      setBenimTip(yeniTip);
      // Yenile
      const vSnap2 = await getDoc(vRef);
      if (vSnap2.exists()) setSayilar(vSnap2.data().reactions || {});
    } catch (e) {
      console.warn('[reactions] tepki err:', e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  // Tüm tipler için count > 0 olanları öne çıkar
  const sirali = [...TIPLER].sort((a, b) => (sayilar[b.kod] || 0) - (sayilar[a.kod] || 0));

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">Tepki Ver</span>
        {(!currentUser || isAnonymous) && (
          <span className="text-white/40 text-[10px]">(Giriş yap)</span>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {sirali.map(t => {
          const aktif = benimTip === t.kod;
          const sayi = sayilar[t.kod] || 0;
          return (
            <button key={t.kod} onClick={() => tepkiVer(t.kod)}
              disabled={!currentUser || isAnonymous || yukleniyor}
              title={t.etiket}
              className={`px-2.5 py-1.5 rounded-full text-sm spring-tap transition border ${
                aktif
                  ? 'bg-amber-400 border-amber-300 text-purple-900 scale-105'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/15'
              } disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1`}>
              <span>{t.emoji}</span>
              {sayi > 0 && <span className="text-xs font-bold">{sayi}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VideoReactions;
