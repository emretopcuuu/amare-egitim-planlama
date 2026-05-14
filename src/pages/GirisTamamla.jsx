// /giris-tamamla — Email magic link callback
// Email'deki linke tıklayan kullanıcı buraya gelir. Firebase signInWithEmailLink
// ile authentication tamamlanır. Anonim kullanıcı varsa hesap birleştirilir
// (linkWithCredential) — favoriler, watch progress vs. korunur.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailLink,
  isSignInWithEmailLink,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { auth, db } from '../utils/firebase';

const GirisTamamla = () => {
  const navigate = useNavigate();
  const [durum, setDurum] = useState('isleniyor'); // isleniyor | basarili | hata | email_iste
  const [mesaj, setMesaj] = useState('Giriş işleniyor...');
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const url = window.location.href;
        if (!isSignInWithEmailLink(auth, url)) {
          setDurum('hata');
          setMesaj('Geçersiz giriş linki. Lütfen yeni link iste.');
          return;
        }

        // Email genelde localStorage'da saklanır ama burada user farklı cihazda
        // olabilir. Email'i URL'den çıkarmaya gerek yok — Firebase yapıyor.
        // Önce localStorage'ı dene.
        let emailIcin = window.localStorage.getItem('amare_giris_email');
        if (!emailIcin) {
          // Farklı cihaz/tarayıcı — kullanıcıdan email iste
          setDurum('email_iste');
          setMesaj('Hangi adrese link gönderdik? Doğrulamak için email yaz.');
          return;
        }
        await tamamla(emailIcin);
      } catch (err) {
        console.error('[giris-tamamla] hata:', err);
        setDurum('hata');
        setMesaj('Hata: ' + (err?.message || 'bilinmeyen'));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tamamla = async (emailIcin) => {
    setDurum('isleniyor');
    setMesaj('Giriş tamamlanıyor...');
    try {
      const url = window.location.href;

      // Eğer mevcut anonim kullanıcı varsa — link et (veri korunsun)
      const mevcut = auth.currentUser;
      let userCred;

      if (mevcut && mevcut.isAnonymous) {
        try {
          const credential = EmailAuthProvider.credentialWithLink(emailIcin, url);
          userCred = await linkWithCredential(mevcut, credential);
        } catch (linkErr) {
          // Eğer bu email zaten başka hesapta var ise — düz signIn'e dön
          // (eski hesap kullanılır, anonim veri kayıp olur ama giriş başarılı)
          if (linkErr.code === 'auth/credential-already-in-use' ||
              linkErr.code === 'auth/email-already-in-use') {
            userCred = await signInWithEmailLink(auth, emailIcin, url);
          } else {
            throw linkErr;
          }
        }
      } else {
        userCred = await signInWithEmailLink(auth, emailIcin, url);
      }

      // Email'i temizle (artık lazım değil)
      window.localStorage.removeItem('amare_giris_email');

      // Firestore'da profil oluştur/güncelle
      const uid = userCred.user.uid;
      const profilRef = doc(db, 'users', uid);
      const mevcutProfil = await getDoc(profilRef);

      // URL'den uye id parametresini al (uye-giris-link function eklemişti)
      const params = new URLSearchParams(window.location.search);
      const amareIdParam = params.get('uye') || null;

      await setDoc(profilRef, {
        email: emailIcin,
        amareId: amareIdParam,
        sonGiris: serverTimestamp(),
        ...(mevcutProfil.exists() ? {} : { ilkGiris: serverTimestamp() }),
      }, { merge: true });

      setDurum('basarili');
      setMesaj('Giriş başarılı 🎉');
      setTimeout(() => navigate('/takvim', { replace: true }), 1500);
    } catch (err) {
      console.error('[giris-tamamla] tamamla hatası:', err);
      setDurum('hata');
      let mesajNice = err?.message || 'bilinmeyen';
      if (err?.code === 'auth/invalid-action-code') {
        mesajNice = 'Bu link süresi dolmuş veya kullanılmış. Yeni link iste.';
      } else if (err?.code === 'auth/user-disabled') {
        mesajNice = 'Hesap kapatılmış. Destekle iletişime geç.';
      }
      setMesaj(mesajNice);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      window.localStorage.setItem('amare_giris_email', email.trim());
      tamamla(email.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="bg-gradient-to-br from-purple-800/50 to-indigo-900/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">

        {durum === 'isleniyor' && (
          <>
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">{mesaj}</h1>
            <p className="text-purple-200 text-sm">Birkaç saniye sürer...</p>
          </>
        )}

        {durum === 'basarili' && (
          <>
            <div className="inline-block w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Hoş geldin! 🎉</h1>
            <p className="text-purple-100 text-sm mb-2">{mesaj}</p>
            <p className="text-purple-200/70 text-xs">Takvime yönlendiriliyorsun...</p>
          </>
        )}

        {durum === 'hata' && (
          <>
            <div className="inline-block w-16 h-16 bg-red-500/20 border border-red-400/30 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-red-300" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Giriş başarısız</h1>
            <p className="text-purple-100 text-sm mb-6">{mesaj}</p>
            <button onClick={() => navigate('/takvim')}
              className="bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-2.5 px-6 rounded-xl spring-tap inline-flex items-center gap-2">
              Takvime dön <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {durum === 'email_iste' && (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Email doğrulaması</h1>
            <p className="text-purple-100 text-sm mb-6">{mesaj}</p>
            <form onSubmit={handleEmailSubmit}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@adresin.com" autoFocus required
                className="w-full bg-white/10 border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all" />
              <button type="submit"
                className="w-full mt-3 bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3 rounded-xl spring-tap inline-flex items-center justify-center gap-2">
                Devam <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default GirisTamamla;
