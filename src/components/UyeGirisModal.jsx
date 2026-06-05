// Üye Giriş Modal — email, telefon veya Amare ID ile pasif giriş.
// /uye-giris-link Netlify function'ına istek atar.
// Backend doğrularsa: emaile magic link gönderildi → kullanıcı bekleme ekranı.

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, ArrowRight, Mail, Lock, HelpCircle, Send, KeyRound } from 'lucide-react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../utils/firebase';

const UyeGirisModal = ({ acik, onClose }) => {
  const [lookup, setLookup] = useState('');
  const [durum, setDurum] = useState('giris'); // giris | gonderildi | talepFormu | talepGonderildi
  const [mesaj, setMesaj] = useState('');
  const [emailMask, setEmailMask] = useState('');
  const [emailReal, setEmailReal] = useState(''); // OTP doğrulama için gerekli
  const [adKisa, setAdKisa] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  // OTP state
  const [otpKod, setOtpKod] = useState(['', '', '', '', '', '']);
  const [otpHata, setOtpHata] = useState('');
  const [otpKontrol, setOtpKontrol] = useState(false);
  const otpRefs = useRef([]);
  // Email düzeltme talep formu state
  const [talepAd, setTalepAd] = useState('');
  const [talepEmail, setTalepEmail] = useState('');
  const [talepSebep, setTalepSebep] = useState('');
  const [talepTel, setTalepTel] = useState('');
  const inputRef = useRef(null);

  // Modal açılınca input focus
  useEffect(() => {
    if (acik && durum === 'giris') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [acik, durum]);

  // Esc ile kapat
  useEffect(() => {
    if (!acik) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [acik, onClose]);

  if (!acik) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const v = lookup.trim();
    if (v.length < 3) {
      setMesaj('En az 3 karakter gir');
      return;
    }
    setYukleniyor(true);
    setMesaj('');
    try {
      const res = await fetch('/.netlify/functions/uye-giris-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookup: v }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMesaj(data.error || data.detail || `Sistem hatası (${res.status}). Birazdan tekrar dene.`);
        return;
      }
      if (!data.found) {
        setMesaj(data.message || 'Bu bilgi ile kayıtlı Marka Ortağı bulunamadı.');
        return;
      }
      // Başarılı — email gönderildi
      // Magic link callback için tam email lazım (signInWithEmailLink gerektirir)
      // localStorage same-origin only, aynı tarayıcıda güvenli
      if (data.emailReal) {
        try { window.localStorage.setItem('amare_giris_email', data.emailReal); } catch {}
        setEmailReal(data.emailReal);
      }
      setEmailMask(data.emailMask || '');
      // adKisa artık backend'den dönmüyor (security: isim sızıntısı engellendi)
      setAdKisa('');
      setOtpKod(['', '', '', '', '', '']);
      setOtpHata('');
      setDurum('gonderildi');
      // OTP ilk kutusuna otomatik focus (300ms sonra — render bitsin)
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err) {
      setMesaj('Bağlantı hatası: ' + (err?.message || 'bilinmeyen') + '. İnternet bağlantını kontrol et.');
    } finally {
      setYukleniyor(false);
    }
  };

  const reset = () => {
    setLookup('');
    setDurum('giris');
    setMesaj('');
    setEmailMask('');
    setEmailReal('');
    setAdKisa('');
    setOtpKod(['', '', '', '', '', '']);
    setOtpHata('');
  };

  // OTP input — tek hane gir
  const otpHaneDegistir = (idx, val) => {
    const yeni = [...otpKod];
    // Sadece sayı kabul et
    yeni[idx] = (val || '').replace(/\D/g, '').slice(0, 1);
    setOtpKod(yeni);
    setOtpHata('');
    // Dolu ise sonraki kutuya focus
    if (yeni[idx] && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
    // Hepsi dolduysa otomatik gönder
    if (yeni.every(k => k.length === 1)) {
      otpGonder(yeni.join(''));
    }
  };

  // OTP Backspace ile önceki kutuya
  const otpTuse = (idx, e) => {
    if (e.key === 'Backspace' && !otpKod[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  // OTP paste — "483 729" gibi tam 6 hane yapıştırılınca dağıt
  const otpYapistir = (e) => {
    e.preventDefault();
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      const yeni = text.split('');
      setOtpKod(yeni);
      otpRefs.current[5]?.focus();
      otpGonder(text);
    }
  };

  // OTP doğrula → Firebase signInWithCustomToken
  const otpGonder = async (kodStr) => {
    const kod = kodStr || otpKod.join('');
    if (kod.length !== 6) {
      setOtpHata('6 hane gir');
      return;
    }
    if (!emailReal) {
      setOtpHata('Email bilgisi kayıp. Yeniden başla.');
      return;
    }
    setOtpKontrol(true);
    setOtpHata('');
    try {
      const res = await fetch('/.netlify/functions/uye-giris-kod-dogrula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailReal, kod }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setOtpHata(data.error || `Kod doğrulanamadı (${res.status})`);
        // Hata durumunda kodu temizle
        setOtpKod(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
        return;
      }
      // Custom token ile login
      await signInWithCustomToken(auth, data.customToken);
      // Modal'ı kapat, sayfa kendi kendine güncellenecek (auth listener)
      onClose();
    } catch (err) {
      setOtpHata('Bağlantı hatası: ' + (err?.message || 'bilinmeyen'));
    } finally {
      setOtpKontrol(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-gradient-to-br from-purple-900 to-indigo-950 rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 border border-white/10 relative">

        <button onClick={onClose} aria-label="Kapat"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
          <X className="w-4 h-4" />
        </button>

        {durum === 'giris' && (
          <>
            <div className="text-center mb-6">
              <div className="inline-block w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                <Mail className="w-7 h-7 text-purple-900" />
              </div>
              <h2 className="text-white text-2xl font-extrabold mb-1">Marka Ortağı Girişi</h2>
              <p className="text-purple-200 text-sm">Amare Marka Ortağıysan kişisel deneyim aç</p>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="block text-purple-200 text-xs font-semibold mb-2 uppercase tracking-wider">
                Email, Telefon veya Amare ID
              </label>
              <input
                ref={inputRef}
                type="text"
                value={lookup}
                onChange={e => { setLookup(e.target.value); setMesaj(''); }}
                placeholder="ahmet@gmail.com  ·  0532...  ·  2198057"
                disabled={yukleniyor}
                className="w-full bg-white/10 border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300/60 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all"
              />
              {mesaj && (
                <div className="mt-3 bg-red-500/15 border border-red-400/30 rounded-lg px-3 py-2.5 space-y-2">
                  <div className="flex items-start gap-2 text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{mesaj}</span>
                  </div>
                  {/* Bulunamadı durumunda alternatif giriş ipucu */}
                  {mesaj.includes('bulunamadı') && (
                    <div className="text-purple-200/80 text-[11px] pl-6 leading-relaxed">
                      💡 <strong>Diğer yöntemleri dene:</strong>
                      <ul className="mt-1 ml-3 space-y-0.5 list-disc list-inside">
                        <li>Farklı bir email (Amare kaydındaki)</li>
                        <li>Telefon numarası (örn 0532...)</li>
                        <li>Amare ID (örn 2198057)</li>
                      </ul>
                      <p className="mt-2 text-amber-200/80">
                        Hâlâ olmazsa <a href="https://oneteamglobal.ai" className="underline font-semibold hover:text-amber-200" target="_blank" rel="noopener">oneteamglobal.ai</a>'den Amare üye olabilir veya sponsorundan kontrol isteyebilirsin.
                      </p>
                    </div>
                  )}
                  {/* Email bozuk VEYA bilgi bulunamadı → destek talebi (her iki durumda da göster) */}
                  {(mesaj.includes('email') || mesaj.includes('Email') || mesaj.includes('geçersiz formatlı') || mesaj.includes('bulunamadı')) && (
                    <div className="border-t border-red-400/20 pt-2 mt-2">
                      <button onClick={() => {
                        setDurum('talepFormu');
                        setTalepAd('');
                        // Email girilmişse pre-fill, telefon ya da ID girilmişse boş bırak
                        const isEmail = lookup.includes('@');
                        setTalepEmail(isEmail ? lookup : '');
                        setTalepTel(!isEmail && /^\+?\d/.test(lookup) ? lookup : '');
                        // Sebep otomatik bilgi
                        const aranan = lookup ? `"${lookup}"` : 'bilgi';
                        setTalepSebep(mesaj.includes('bulunamadı')
                          ? `${aranan} ile sisteme giriş yapamıyorum. Lütfen Amare kaydımı kontrol edip email'imi güncelleyin.`
                          : '');
                      }}
                        className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 text-sm font-extrabold py-3 px-4 rounded-xl inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-500/40 hover:shadow-amber-500/60 spring-tap ring-2 ring-amber-300/50 hover:ring-amber-300/80 transition-all">
                        <Send className="w-4 h-4" />
                        {mesaj.includes('bulunamadı') ? 'Destek Talebi Gönder' : 'Email Düzeltme Talebi Gönder'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <p className="text-amber-200/70 text-[11px] mt-2 text-center">
                        {mesaj.includes('bulunamadı')
                          ? 'Admin bilgilerini kontrol edip 24sa içinde dönüş yapacak.'
                          : "Admin 24sa içinde email'ini günceller, sonra giriş yapabilirsin."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={yukleniyor || lookup.trim().length < 3}
                className="w-full mt-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-purple-900 font-bold py-3 rounded-xl transition-all spring-tap inline-flex items-center justify-center gap-2">
                {yukleniyor
                  ? <><Loader2 className="w-5 h-5 animate-spin" />Doğrulanıyor...</>
                  : <>Devam et<ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-white/10 space-y-2">
              <p className="text-purple-200/80 text-xs flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                Şifre yok — email'ine tek seferlik link gönderilir
              </p>
              <p className="text-purple-200/60 text-[11px]">
                Amare'de kayıtlı email/telefon kontrol edilir. Sahte kayıt yapılamaz.
              </p>
            </div>
          </>
        )}

        {durum === 'talepFormu' && (
          <>
            <div className="text-center mb-5">
              <div className="inline-block w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                <HelpCircle className="w-7 h-7 text-purple-900" />
              </div>
              <h2 className="text-white text-xl font-extrabold mb-1">Email Düzeltme Talebi</h2>
              <p className="text-purple-200 text-xs">Admin email'ini güncelleyecek (24sa içinde)</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!talepAd || talepAd.length < 3) { setMesaj('Ad/soyad gerekli'); return; }
              if (!talepEmail || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(talepEmail)) {
                setMesaj('Geçerli email gerekli'); return;
              }
              setYukleniyor(true);
              setMesaj('');
              try {
                const res = await fetch('/.netlify/functions/email-duzelt-talep', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    lookup,
                    ad: talepAd,
                    yeniEmail: talepEmail,
                    sebep: talepSebep,
                    telefon: talepTel,
                  }),
                });
                const data = await res.json();
                if (!res.ok) {
                  const detayli = data.detail ? `${data.error || 'Hata'} — ${data.detail}` : (data.error || 'Talep gönderilemedi');
                  throw new Error(detayli);
                }
                setDurum('talepGonderildi');
              } catch (err) {
                setMesaj(err.message);
              } finally {
                setYukleniyor(false);
              }
            }}>
              <div className="space-y-3">
                <div>
                  <label className="block text-purple-200 text-[11px] font-semibold mb-1 uppercase tracking-wider">Ad Soyad</label>
                  <input type="text" value={talepAd} onChange={e => setTalepAd(e.target.value)}
                    placeholder="Ferdi Kımış" disabled={yukleniyor}
                    className="w-full bg-white/10 border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-purple-200 text-[11px] font-semibold mb-1 uppercase tracking-wider">Doğru Email</label>
                  <input type="email" value={talepEmail} onChange={e => setTalepEmail(e.target.value)}
                    placeholder="ornek@gmail.com" disabled={yukleniyor}
                    className="w-full bg-white/10 border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-purple-200 text-[11px] font-semibold mb-1 uppercase tracking-wider">Telefon (opsiyonel)</label>
                  <input type="tel" value={talepTel} onChange={e => setTalepTel(e.target.value)}
                    placeholder="0532..." disabled={yukleniyor}
                    className="w-full bg-white/10 border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-purple-200 text-[11px] font-semibold mb-1 uppercase tracking-wider">Not (opsiyonel)</label>
                  <textarea value={talepSebep} onChange={e => setTalepSebep(e.target.value)}
                    placeholder="Sponsorum kim, hangi şehirden, vs..." maxLength={500} rows={2} disabled={yukleniyor}
                    className="w-full bg-white/10 border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" />
                </div>
              </div>

              {mesaj && (
                <div className="mt-3 flex items-start gap-2 text-red-300 text-xs bg-red-500/15 border border-red-400/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{mesaj}</span>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => { setDurum('giris'); setMesaj(''); }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl text-sm spring-tap">
                  Geri
                </button>
                <button type="submit" disabled={yukleniyor}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-2.5 rounded-xl text-sm spring-tap inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  {yukleniyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Talep Gönder
                </button>
              </div>
            </form>
          </>
        )}

        {durum === 'talepGonderildi' && (
          <>
            <div className="text-center mb-5">
              <div className="inline-block w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-white text-2xl font-extrabold mb-2">Talep Alındı ✓</h2>
              <p className="text-purple-100 text-sm">
                Admin 24 saat içinde email'ini günceller.<br />
                Güncellendikten sonra <strong>{talepEmail}</strong> ile giriş yapabilirsin.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-purple-100 text-xs">
              📧 Onaylandığında email'ine bilgilendirme gelir (opsiyonel)<br />
              💬 Sorun olursa sponsorundan kontrol iste
            </div>
            <button onClick={onClose}
              className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3 rounded-xl text-sm spring-tap">
              Tamam
            </button>
          </>
        )}

        {durum === 'gonderildi' && (
          <>
            <div className="text-center mb-5">
              <div className="inline-flex w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl items-center justify-center mb-3 shadow-lg shadow-amber-500/30">
                <KeyRound className="w-7 h-7 text-purple-900" />
              </div>
              <h2 className="text-white text-xl font-extrabold mb-1">
                {adKisa ? `Selam ${adKisa}` : 'Mail gönderildi'} 👋
              </h2>
              <p className="text-purple-200 text-xs mb-1">Mail yollandı:</p>
              <p className="text-amber-300 text-sm font-bold font-mono">{emailMask}</p>
            </div>

            {/* OTP input — 6 kutucuk */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-amber-300/90 uppercase tracking-wider mb-3 text-center">
                Mailde Gelen 6 Haneli Kodu Yaz
              </label>
              <div className="flex gap-2 justify-center mb-2" onPaste={otpYapistir}>
                {otpKod.map((d, i) => (
                  <React.Fragment key={i}>
                    <input
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      value={d}
                      onChange={(e) => otpHaneDegistir(i, e.target.value)}
                      onKeyDown={(e) => otpTuse(i, e)}
                      disabled={otpKontrol}
                      className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl sm:text-3xl font-bold rounded-xl bg-white/10 border-2 ${
                        otpHata ? 'border-rose-400/70' : d ? 'border-amber-400' : 'border-white/15'
                      } text-white focus:outline-none focus:border-amber-400 focus:bg-white/15 transition-all`}
                    />
                    {i === 2 && <span className="self-center text-amber-300/40 text-2xl font-light">·</span>}
                  </React.Fragment>
                ))}
              </div>
              {otpHata && (
                <p className="text-rose-300 text-xs text-center mt-2 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {otpHata}
                </p>
              )}
              {otpKontrol && (
                <p className="text-purple-200 text-xs text-center mt-2 flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Kod doğrulanıyor...
                </p>
              )}
            </div>

            {/* Veya ayracı */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-purple-300/60 text-[10px] uppercase tracking-[0.3em] font-bold">veya</span>
              <div className="flex-1 h-px bg-white/15" />
            </div>

            {/* Magic link açıklama */}
            <div className="bg-amber-400/8 border border-amber-300/20 rounded-xl p-3.5 mb-4">
              <p className="text-amber-200 text-xs leading-relaxed text-center">
                Maildeki <strong className="text-amber-300">"Giriş Yap"</strong> butonuna tıklarsan da olur.
                Aynı sonuç, iki yol.
              </p>
            </div>

            <div className="text-purple-200/60 text-[11px] mb-4 text-center space-y-0.5">
              <p>🔒 Kod 24 saat geçerli · Link 1 saat geçerli · Tek kullanımlık</p>
              <p>📬 Mail gelmezse spam klasörünü kontrol et</p>
            </div>

            <div className="flex gap-2">
              <button onClick={reset} disabled={otpKontrol}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl text-sm spring-tap disabled:opacity-50">
                Yeniden Başla
              </button>
              <button onClick={() => otpGonder()} disabled={otpKontrol || otpKod.some(k => !k)}
                className="flex-1 bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-2.5 rounded-xl text-sm spring-tap disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                {otpKontrol ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Giriş Yap
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UyeGirisModal;
