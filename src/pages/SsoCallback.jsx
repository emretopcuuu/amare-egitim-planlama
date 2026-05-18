// /sso?t=<customToken>&uye=<amareId>
// ─────────────────────────────────────────────────────────────────────────
// oneteamglobal.ai onboarding'i tamamlayan kullanıcı buraya gelir.
// signInWithCustomToken ile tek tıkla login + Firestore profil oluştur,
// sonra /takvim'e yönlendir.
//
// Token Firebase Admin SDK tarafından sso-onboarding.mjs içinde üretilmiştir.
// Anonim kullanıcı varsa hesap ID'si değişir — anonim veri kaybolur (kabul
// edilebilir, çünkü onboarding'ten gelen yeni kullanıcının zaten geçmişi yok).
// ─────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { auth, db } from '../utils/firebase';

const SsoCallback = () => {
  const navigate = useNavigate();
  const [durum, setDurum] = useState('isleniyor'); // isleniyor | basarili | hata
  const [mesaj, setMesaj] = useState('Hoş geldin, giriş tamamlanıyor...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('t');
    const amareId = params.get('uye') || null;
    const email = params.get('e') || null;
    const fullName = params.get('n') || null;
    // Return URL — onboarding zorunlu yönlendirmesinden geri dönen kullanıcı buraya gider
    const returnUrl = params.get('r') || null;

    if (!token) {
      setDurum('hata');
      setMesaj('Giriş tokeni eksik. Lütfen onboarding ekranındaki butonu tekrar dene.');
      return;
    }

    (async () => {
      try {
        const cred = await signInWithCustomToken(auth, token);
        const uid = cred.user.uid;

        // Firestore'da profil oluştur/güncelle
        const profilRef = doc(db, 'users', uid);
        const mevcut = await getDoc(profilRef);

        await setDoc(profilRef, {
          email: email || cred.user.email || null,
          displayName: fullName || cred.user.displayName || null,
          amareId,
          kaynak: 'onboarding_sso',
          sonGiris: serverTimestamp(),
          ...(mevcut.exists() ? {} : { ilkGiris: serverTimestamp() }),
        }, { merge: true });

        setDurum('basarili');
        // Return URL varsa oraya, yoksa /takvim'e dön
        if (returnUrl && /^https?:\/\/(egitimtakvimi\.oneteamglobal\.ai|localhost)/.test(returnUrl)) {
          setMesaj('Profiline yönlendiriliyorsun...');
          setTimeout(() => { window.location.href = returnUrl; }, 1000);
        } else {
          setMesaj('Hoş geldin! Takvime yönlendiriliyorsun...');
          setTimeout(() => navigate('/takvim', { replace: true }), 1200);
        }
      } catch (err) {
        console.error('[sso-callback] hata:', err);
        setDurum('hata');
        let msg = 'Giriş yapılamadı. Token süresi dolmuş olabilir.';
        if (err?.code === 'auth/invalid-custom-token') {
          msg = 'Token geçersiz. Onboarding linki bozulmuş olabilir.';
        } else if (err?.code === 'auth/network-request-failed') {
          msg = 'İnternet bağlantısı sorunu. Lütfen tekrar dene.';
        }
        setMesaj(msg);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="bg-gradient-to-br from-purple-800/50 to-indigo-900/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">

        {durum === 'isleniyor' && (
          <>
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Giriş yapılıyor</h1>
            <p className="text-purple-200 text-sm">{mesaj}</p>
          </>
        )}

        {durum === 'basarili' && (
          <>
            <div className="inline-block w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Hoş geldin! 🎉</h1>
            <p className="text-purple-100 text-sm">{mesaj}</p>
          </>
        )}

        {durum === 'hata' && (
          <>
            <div className="inline-block w-16 h-16 bg-red-500/20 border border-red-400/30 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-red-300" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Giriş başarısız</h1>
            <p className="text-purple-100 text-sm mb-6">{mesaj}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate('/takvim')}
                className="bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-2.5 px-6 rounded-xl spring-tap inline-flex items-center justify-center gap-2">
                Takvime devam et <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-purple-200/70 text-xs mt-2">
                💡 Takvimi anonim olarak gezebilirsin. Hesabını sonra "Marka Ortağı Girişi" ile bağlayabilirsin.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SsoCallback;
