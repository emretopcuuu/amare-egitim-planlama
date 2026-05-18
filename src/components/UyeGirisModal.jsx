// Üye Giriş Modal — email, telefon veya Amare ID ile pasif giriş.
// /uye-giris-link Netlify function'ına istek atar.
// Backend doğrularsa: emaile magic link gönderildi → kullanıcı bekleme ekranı.

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, ArrowRight, Mail, Lock } from 'lucide-react';

const UyeGirisModal = ({ acik, onClose }) => {
  const [lookup, setLookup] = useState('');
  const [durum, setDurum] = useState('giris'); // giris | gonderildi
  const [mesaj, setMesaj] = useState('');
  const [emailMask, setEmailMask] = useState('');
  const [adKisa, setAdKisa] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
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
      }
      setEmailMask(data.emailMask || '');
      setAdKisa(data.adKisa || '');
      setDurum('gonderildi');
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
    setAdKisa('');
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
                <div className="mt-3 flex items-start gap-2 text-red-300 text-xs bg-red-500/15 border border-red-400/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{mesaj}</span>
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

        {durum === 'gonderildi' && (
          <>
            <div className="text-center mb-6">
              <div className="inline-block w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-white text-2xl font-extrabold mb-2">
                {adKisa ? `Selam ${adKisa}` : 'Email gönderildi'} 👋
              </h2>
              <p className="text-purple-100 text-sm">Giriş linki e-postana yollandı:</p>
              <p className="text-amber-300 text-lg font-bold mt-2 font-mono">{emailMask}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 text-purple-100 text-sm space-y-2">
              <p>📧 <strong>Email kutunu aç</strong>, gelen kutusu veya spam klasöründe One Team mailini bul</p>
              <p>👆 <strong>"Giriş Yap"</strong> butonuna tıkla</p>
              <p>✅ Sayfa otomatik açılır, giriş tamamdır</p>
            </div>

            <div className="text-purple-200/60 text-[11px] mb-4 space-y-1">
              <p>🔒 Link 1 saat geçerli ve tek kullanımlık</p>
              <p>📬 Mail gelmezse spam klasörünü kontrol et</p>
            </div>

            <div className="flex gap-2">
              <button onClick={reset}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl text-sm spring-tap">
                Başka bilgi dene
              </button>
              <button onClick={onClose}
                className="flex-1 bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-2.5 rounded-xl text-sm spring-tap">
                Tamam
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UyeGirisModal;
