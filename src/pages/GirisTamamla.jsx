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
  const [durum, setDurum] = useState('hazir'); // hazir | isleniyor | basarili | hata | email_iste
  const [mesaj, setMesaj] = useState('');
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState(null);

  useEffect(() => {
    // Link valid mi kontrol et — auto signIn YAPMA (gmail bot link'i tüketmesin)
    const url = window.location.href;
    if (!isSignInWithEmailLink(auth, url)) {
      setDurum('hata');
      setMesaj('Geçersiz giriş linki. Lütfen yeni link iste.');
      return;
    }
    const emailIcin = window.localStorage.getItem('amare_giris_email');
    if (emailIcin) {
      setSavedEmail(emailIcin);
      setDurum('hazir');
      return;
    }

    // localStorage'da yok → URL'den ?uye=X ile backend'den email lookup dene
    // (Email farklı cihazda açıldığında çalışsın diye)
    const params = new URLSearchParams(window.location.search);
    const uyeId = params.get('uye');
    if (uyeId) {
      (async () => {
        try {
          const res = await fetch(`/.netlify/functions/uye-email-lookup?uye=${encodeURIComponent(uyeId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.emailMask) {
              // Mask göster, kullanıcı son 4 karakterini yazıp doğrulasın
              setSavedEmail(null);
              setEmail('');
              setDurum('email_iste');
              setMesaj(`Hangi adrese link yolladık? Doğrula: ${data.emailMask}`);
              return;
            }
          }
        } catch {}
        // Lookup başarısız — manuel email iste
        setDurum('email_iste');
        setMesaj('Hangi adrese link gönderdik? Doğrulamak için email yaz.');
      })();
    } else {
      setDurum('email_iste');
      setMesaj('Hangi adrese link gönderdik? Doğrulamak için email yaz.');
    }
  }, []);

  const tamamla = async (emailIcin) => {
    setDurum('isleniyor');
    setMesaj('Giriş tamamlanıyor...');

    const url = window.location.href;

    // ═══ AŞAMA 1: Firebase auth (kritik — başarılıysa giriş tamam) ═══
    let userCred = null;
    try {
      const mevcut = auth.currentUser;

      if (mevcut && mevcut.isAnonymous) {
        try {
          const credential = EmailAuthProvider.credentialWithLink(emailIcin, url);
          userCred = await linkWithCredential(mevcut, credential);
        } catch (linkErr) {
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
      try { window.localStorage.removeItem('amare_giris_email'); } catch {}
    } catch (err) {
      console.error('[giris-tamamla] AUTH hatası:', err);
      // Auth state yine de set olmuş olabilir (race condition) — kontrol et
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        console.warn('[giris-tamamla] Auth error olmasına rağmen currentUser var, devam et');
        userCred = { user: auth.currentUser };
      } else {
        setDurum('hata');
        let mesajNice = err?.message || 'bilinmeyen';
        if (err?.code === 'auth/invalid-action-code') {
          mesajNice = 'Bu link süresi dolmuş veya kullanılmış. Yeni link iste.';
        } else if (err?.code === 'auth/user-disabled') {
          mesajNice = 'Hesap kapatılmış. Destekle iletişime geç.';
        } else if (err?.code === 'auth/invalid-email') {
          mesajNice = 'Email adresi farklı. Email\'i bekleyenden farklı yazdıysan kontrol et.';
        } else if (err?.code === 'auth/expired-action-code') {
          mesajNice = 'Link süresi (1 saat) dolmuş. Yeni link iste.';
        }
        setMesaj(mesajNice);
        return; // Buradan çık
      }
    }

    // ═══ AŞAMA 2: Auth başarılı → kullanıcıya hemen success göster ═══
    setDurum('basarili');
    setMesaj('Giriş başarılı 🎉');

    // ═══ AŞAMA 3: Firestore profil yazma (best-effort, hatası giriş bozmaz) ═══
    (async () => {
      try {
        const uid = userCred.user.uid;
        const profilRef = doc(db, 'users', uid);
        const mevcutProfil = await getDoc(profilRef);
        const params = new URLSearchParams(window.location.search);
        const amareIdParam = params.get('uye') || null;
        await setDoc(profilRef, {
          email: emailIcin,
          amareId: amareIdParam,
          sonGiris: serverTimestamp(),
          ...(mevcutProfil.exists() ? {} : { ilkGiris: serverTimestamp() }),
        }, { merge: true });
      } catch (e) {
        // Sessizce log, kullanıcı yine giriş yapmış sayılır
        console.warn('[giris-tamamla] Firestore profil yazılamadı (giriş başarılı):', e.message);
      }
    })();

    // ═══ AŞAMA 4: Yönlendir ═══
    setTimeout(() => navigate('/takvim', { replace: true }), 1500);
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

        {durum === 'hazir' && savedEmail && (
          <>
            <div className="inline-block w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <ArrowRight className="w-9 h-9 text-purple-900" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Giriş için tıkla</h1>
            <p className="text-purple-100 text-sm mb-1">Email adresin:</p>
            <p className="text-amber-300 font-mono font-bold mb-6">{savedEmail}</p>
            <button onClick={() => tamamla(savedEmail)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3 px-6 rounded-xl spring-tap inline-flex items-center justify-center gap-2 shadow-lg">
              Girişi tamamla <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-4 text-purple-200/60 text-xs">
              🔒 Güvenlik için tek tıkla doğrulama gerekiyor
            </p>
          </>
        )}

        {durum === 'isleniyor' && (
          <>
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">{mesaj || 'Giriş işleniyor...'}</h1>
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
            <p className="text-purple-100 text-sm mb-4">{mesaj}</p>

            {/* Bazı durumlarda auth aslında başarılı olur — kontrol ettir */}
            <button onClick={() => window.location.reload()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 px-6 rounded-xl spring-tap mb-2 inline-flex items-center justify-center gap-2">
              🔄 Sayfayı yenile (giriş yapmış olabilirim)
            </button>

            <div className="flex flex-col gap-2 mt-3">
              <button onClick={() => navigate('/profil?giris=1')}
                className="bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-2.5 px-6 rounded-xl spring-tap inline-flex items-center justify-center gap-2">
                Yeni giriş linki iste <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/takvim')}
                className="bg-white/10 hover:bg-white/20 text-white py-2 px-6 rounded-xl spring-tap text-sm">
                Takvime dön
              </button>
            </div>

            <div className="mt-4 bg-amber-400/10 border border-amber-400/30 rounded-xl p-3 text-left">
              <p className="text-amber-200 text-xs font-bold mb-1">💡 Bilinen 3 sebep</p>
              <ol className="text-purple-100 text-[11px] space-y-1 list-decimal pl-4">
                <li>Linki başka cihazda istediysen (örn. masaüstünden, telefondan açıyorsan) — emailini tekrar gir</li>
                <li>Gmail/Outlook güvenlik tarayıcısı linki önceden tıklamış olabilir — yeni link iste</li>
                <li>1 saatlik geçerlilik süresi dolmuş olabilir — yeni link iste</li>
              </ol>
            </div>
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
