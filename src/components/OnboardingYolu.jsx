// Yeni üyeler için 30 günlük onboarding yol haritası
// Her yeni üyeye 6 adımlı checklist — sponsor işaretler
// Firestore: users/{sponsorUid}/onboarding/{amareId}

import React, { useEffect, useState } from 'react';
import { Sprout, CheckCircle2, Circle, MessageCircle, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePhoneForWa } from '../utils/mask';

const ADIM_TEMPLATE = [
  { kod: 'hosgeldin',   gun: 1,  baslik: 'Hoş geldin mesajı',     ipucu: 'WhatsApp ile kısa karşılama, kahve daveti.' },
  { kod: 'siteye_kayit', gun: 3,  baslik: 'Siteye giriş',          ipucu: 'Magic link gönder, profilini doldursun.' },
  { kod: 'ilk_egitim',  gun: 7,  baslik: 'İlk canlı eğitim',      ipucu: 'Birlikte bir eğitime katıl, motivasyon.' },
  { kod: 'ilk_siparis', gun: 14, baslik: 'İlk ürün siparişi',     ipucu: 'Ürün deneyimi olmadan satış olmaz.' },
  { kod: 'ilk_davet',   gun: 21, baslik: 'İlk yakın davet',       ipucu: 'En yakın 1 kişiyi davet etmesi için destekle.' },
  { kod: 'degerlendirme', gun: 30, baslik: '30. gün değerlendirme', ipucu: 'Hedef kontrol + bir sonraki ay planı.' },
];

const OnboardingYolu = ({ uyeler }) => {
  const { currentUser } = useAuth();
  const yeni = (uyeler || []).filter(u => u.kayitGunFarki !== null && u.kayitGunFarki < 35);

  if (yeni.length === 0) return null;

  return (
    <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sprout className="w-5 h-5 text-emerald-300" />
        <div>
          <h3 className="text-white font-extrabold text-base">Yeni Marka Ortakları ({yeni.length})</h3>
          <p className="text-emerald-200/70 text-[11px]">30 gün içinde katılanlar — onboarding hızla bitmeli</p>
        </div>
      </div>
      <div className="space-y-2">
        {yeni.map(u => (
          <OnboardingKart key={u.amareId} uye={u} currentUser={currentUser} />
        ))}
      </div>
    </div>
  );
};

const OnboardingKart = ({ uye, currentUser }) => {
  const [acik, setAcik] = useState(false);
  const [adimlar, setAdimlar] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!acik || adimlar || !currentUser) return;
    (async () => {
      setYukleniyor(true);
      try {
        const ref = doc(db, `users/${currentUser.uid}/onboarding/${uye.amareId}`);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().adimlar) {
          setAdimlar(snap.data().adimlar);
        } else {
          // İlk açılış — template ile başlat
          const t = ADIM_TEMPLATE.map(a => ({ ...a, tamamlandi: false, tarih: null }));
          setAdimlar(t);
        }
      } catch (e) {
        console.warn('[onboarding] read err:', e.message);
        const t = ADIM_TEMPLATE.map(a => ({ ...a, tamamlandi: false, tarih: null }));
        setAdimlar(t);
      } finally {
        setYukleniyor(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik]);

  async function toggleAdim(idx) {
    if (!adimlar || !currentUser) return;
    const yeni = adimlar.map((a, i) => i === idx
      ? { ...a, tamamlandi: !a.tamamlandi, tarih: !a.tamamlandi ? new Date().toISOString() : null }
      : a);
    setAdimlar(yeni);
    try {
      const ref = doc(db, `users/${currentUser.uid}/onboarding/${uye.amareId}`);
      await setDoc(ref, {
        amareId: uye.amareId,
        ad: uye.adSoyad,
        baslangic: uye.kayitTarihi,
        adimlar: yeni,
        guncelleme: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[onboarding] save err:', e.message);
    }
  }

  const tamamlanan = adimlar?.filter(a => a.tamamlandi).length || 0;
  const toplam = ADIM_TEMPLATE.length;
  const yuzde = Math.round((tamamlanan / toplam) * 100);
  const wa = normalizePhoneForWa(uye.phone);
  const onAd = (uye.adSoyad || '').split(' ')[0] || '';

  return (
    <div className="bg-black/20 border border-white/10 rounded-xl overflow-hidden">
      <button onClick={() => setAcik(!acik)}
        className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition spring-tap">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          {onAd[0] || '?'}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-sm truncate">{uye.adSoyad}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-100">
              Gün {uye.kayitGunFarki}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden max-w-[200px]">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${yuzde}%` }} />
            </div>
            <span className="text-emerald-200 text-[11px] font-bold">{tamamlanan}/{toplam}</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform flex-shrink-0 ${acik ? 'rotate-180' : ''}`} />
      </button>

      {acik && (
        <div className="border-t border-white/10 p-3 space-y-1.5">
          {yukleniyor && <Loader2 className="w-4 h-4 animate-spin text-emerald-300 mx-auto" />}
          {adimlar && adimlar.map((a, i) => {
            const acikmiBu = uye.kayitGunFarki >= a.gun;
            return (
              <button key={a.kod} onClick={() => acikmiBu && toggleAdim(i)}
                disabled={!acikmiBu}
                className={`w-full flex items-start gap-2 p-2 rounded-lg transition text-left ${
                  acikmiBu ? 'hover:bg-white/5 spring-tap' : 'opacity-40 cursor-not-allowed'
                }`}>
                {a.tamamlandi ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 text-xs ${a.tamamlandi ? 'text-emerald-200 line-through' : 'text-white'}`}>
                    <span className="font-bold">G{a.gun}</span>
                    <span>{a.baslik}</span>
                  </div>
                  <div className="text-purple-200/60 text-[10px] mt-0.5">{a.ipucu}</div>
                </div>
              </button>
            );
          })}
          {wa && (
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Selam ${onAd} 👋 ${ADIM_TEMPLATE.find(a => !adimlar?.find(x => x.kod === a.kod && x.tamamlandi))?.ipucu || 'Nasıl gidiyor?'}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold py-2 px-3 rounded-lg inline-flex items-center gap-1.5 spring-tap">
              <MessageCircle className="w-3.5 h-3.5" />
              Bir sonraki adımı tetikle
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default OnboardingYolu;
