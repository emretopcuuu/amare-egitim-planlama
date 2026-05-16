// Sponsor için push notification abonelik kartı
// Olaylar: yeni üye katıldı, ekip üyesi 14g aktif değil, rank yükseldi, davet açıldı

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { webPushDestekli, webPushIzinDurumu } from '../utils/webPush';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

const OLAY_TURLERI = [
  { kod: 'yeni_uye',     baslik: 'Yeni üye katıldı',     ipucu: 'Ekibin altına yeni biri eklendiğinde', varsayilan: true },
  { kod: 'pasif_uyari',  baslik: 'Pasif üye uyarısı',    ipucu: '14g+ aktif değil', varsayilan: true },
  { kod: 'rank_yukseldi', baslik: 'Rank yükseldi',       ipucu: 'Ekibinden biri rank atladığında', varsayilan: true },
  { kod: 'davet_acildi', baslik: 'Davet açıldı',         ipucu: 'Gönderdiğin magic link kullanıldığında', varsayilan: false },
];

const urlBase64ToUint8Array = (b64) => {
  const padding = '='.repeat((4 - b64.length % 4) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

const EkipBildirimAyar = () => {
  const { currentUser } = useAuth();
  const [destekli] = useState(webPushDestekli());
  const [izin, setIzin] = useState(webPushIzinDurumu());
  const [aboneliklr, setAboneliklr] = useState({});
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [abone, setAbone] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        // Mevcut subscription kontrolü
        const sw = await navigator.serviceWorker?.getRegistration?.('/sw-push.js');
        if (sw) {
          const sub = await sw.pushManager.getSubscription();
          if (sub) setAbone(true);
        }
        // Olay tercihlerini Firestore'dan oku
        const tercihRef = doc(db, `users/${currentUser.uid}/push_aboneleri/tercih`);
        const snap = await getDoc(tercihRef);
        if (snap.exists()) {
          setAboneliklr(snap.data().olaylar || {});
        } else {
          // İlk açılış — varsayılan ayarlar
          const def = {};
          OLAY_TURLERI.forEach(o => { def[o.kod] = o.varsayilan; });
          setAboneliklr(def);
        }
      } catch (e) {
        console.warn('[bildirim] init err:', e.message);
      }
    })();
  }, [currentUser]);

  async function aboneOl() {
    if (!destekli) {
      setHata('Bu tarayıcı push desteklemiyor — Chrome/Edge/Firefox ile dene');
      return;
    }
    if (!VAPID_KEY) {
      setHata('Push anahtarı eksik — Netlify env vars\'a VITE_VAPID_PUBLIC_KEY ekle ve "Clear cache and deploy" yap');
      return;
    }
    setYukleniyor(true);
    setHata('');
    setBilgi('');
    try {
      // 1. Service Worker register
      const sw = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      // 2. Permission
      const izinSon = await Notification.requestPermission();
      setIzin(izinSon);
      if (izinSon !== 'granted') {
        throw new Error('Bildirim izni reddedildi');
      }

      // 3. Subscribe
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
      const subJson = sub.toJSON();

      // 4. Firestore'a kaydet (users/{uid}/push_aboneleri/sponsor)
      await setDoc(doc(db, `users/${currentUser.uid}/push_aboneleri/sponsor`), {
        endpoint: subJson.endpoint,
        keys: subJson.keys || {},
        userAgent: navigator.userAgent.slice(0, 200),
        kayit: serverTimestamp(),
        aktif: true,
      });
      // Default tercihler
      const def = {};
      OLAY_TURLERI.forEach(o => { def[o.kod] = aboneliklr[o.kod] ?? o.varsayilan; });
      await setDoc(doc(db, `users/${currentUser.uid}/push_aboneleri/tercih`), {
        olaylar: def,
        guncelleme: serverTimestamp(),
      });
      setAboneliklr(def);
      setAbone(true);
      setBilgi('Bildirimler aktif. Test bildirimi gönderebilirsin.');
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  async function aboneIptal() {
    setYukleniyor(true);
    setHata('');
    try {
      const sw = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (sw) {
        const sub = await sw.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      await deleteDoc(doc(db, `users/${currentUser.uid}/push_aboneleri/sponsor`));
      setAbone(false);
      setBilgi('Bildirimler kapatıldı.');
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  async function tercihToggle(kod) {
    const yeni = { ...aboneliklr, [kod]: !aboneliklr[kod] };
    setAboneliklr(yeni);
    try {
      await setDoc(doc(db, `users/${currentUser.uid}/push_aboneleri/tercih`), {
        olaylar: yeni,
        guncelleme: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[bildirim] tercih save err:', e.message);
    }
  }

  async function testBildirim() {
    setYukleniyor(true);
    setHata('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/ekip-bildirim-test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test gönderilemedi');
      setBilgi('Test bildirimi gönderildi. Birkaç saniye içinde gelmeli.');
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  if (!destekli) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-purple-200/70 text-xs">
        Bildirim bu tarayıcıda desteklenmiyor.
      </div>
    );
  }

  return (
    <div className={`border rounded-2xl p-4 ${abone ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-white/5 border-white/15'}`}>
      <div className="flex items-center gap-3">
        {abone ? <Bell className="w-5 h-5 text-emerald-300" /> : <BellOff className="w-5 h-5 text-white/50" />}
        <div className="flex-1">
          <div className="text-white font-bold text-sm">
            {abone ? 'Push bildirimleri aktif' : 'Push bildirimlerini aç'}
          </div>
          <div className="text-purple-200/70 text-[11px]">
            {abone
              ? 'Ekipteki önemli olaylardan anında haberdar olursun'
              : 'Yeni üye, pasif uyarı, rank yükselmesi — anlık bildirim'}
          </div>
        </div>
        {abone ? (
          <button onClick={aboneIptal} disabled={yukleniyor}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg spring-tap disabled:opacity-50">
            Kapat
          </button>
        ) : (
          <button onClick={aboneOl} disabled={yukleniyor}
            className="bg-amber-400 hover:bg-amber-300 text-purple-900 text-xs font-bold px-3 py-1.5 rounded-lg spring-tap disabled:opacity-50 inline-flex items-center gap-1.5">
            {yukleniyor && <Loader2 className="w-3 h-3 animate-spin" />}
            Aç
          </button>
        )}
      </div>

      {abone && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
          {OLAY_TURLERI.map(o => (
            <label key={o.kod} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={aboneliklr[o.kod] || false} onChange={() => tercihToggle(o.kod)}
                className="hidden" />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                aboneliklr[o.kod] ? 'bg-emerald-400 border-emerald-400' : 'border-white/30'
              }`}>
                {aboneliklr[o.kod] && <Check className="w-3 h-3 text-purple-900" strokeWidth={3} />}
              </div>
              <div className="flex-1 text-xs">
                <span className="text-white font-semibold">{o.baslik}</span>
                <span className="text-purple-200/60 ml-1.5">— {o.ipucu}</span>
              </div>
            </label>
          ))}
          <button onClick={testBildirim} disabled={yukleniyor}
            className="mt-2 w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 rounded-lg spring-tap disabled:opacity-50">
            Test bildirim gönder
          </button>
        </div>
      )}

      {hata && (
        <div className="mt-2 text-rose-200 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{hata}
        </div>
      )}
      {bilgi && !hata && (
        <div className="mt-2 text-emerald-200 text-[11px] flex items-center gap-1.5">
          <Check className="w-3 h-3 flex-shrink-0" />{bilgi}
        </div>
      )}
    </div>
  );
};

export default EkipBildirimAyar;
