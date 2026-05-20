// KomisyonSoruFormu — Komisyon detay sayfasında alt section
// Düşük-eşik etkileşim: anonim kullanıcılar da bir komisyona soru/öneri gönderebilir.
//
// Firestore: komisyon_iletisim_talepleri/{auto-id}
//   { komisyonId, ad, email, mesaj, olusturulmaTarihi, uid?, durum: 'yeni' }
// firestore.rules: anonim create izni + admin read

import React, { useState } from 'react';
import { MessageSquarePlus, Send, Loader2, CheckCircle2, AlertCircle, Mail, User as UserIcon } from 'lucide-react';
import { db, auth } from '../utils/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from '../context/LanguageContext';

const I18N = {
  tr: {
    baslik: 'Bu Komisyona Soru Sor',
    altMetin: 'Bir sorunuz, öneriniz veya görüşünüz mü var? Komisyon ekibine iletmek için aşağıdaki formu doldurun.',
    adPlaceholder: 'Adınız Soyadınız',
    emailPlaceholder: 'E-posta adresiniz',
    mesajPlaceholder: 'Sorunuzu veya önerinizi yazın...',
    gonder: 'Gönder',
    gonderiliyor: 'Gönderiliyor',
    basariliBaslik: 'Mesajınız iletildi',
    basariliMetin: 'Komisyon ekibi en kısa sürede size dönüş yapacak. Katkınız için teşekkürler.',
    yeniMesaj: 'Yeni Mesaj Gönder',
    hata: 'Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.',
    eksik: 'Lütfen tüm alanları doldurun.',
    emailGecersiz: 'Lütfen geçerli bir e-posta adresi girin.',
  },
  en: {
    baslik: 'Ask This Committee',
    altMetin: 'Have a question, suggestion or comment? Fill out the form below to reach the committee.',
    adPlaceholder: 'Your full name',
    emailPlaceholder: 'Your email address',
    mesajPlaceholder: 'Write your question or suggestion...',
    gonder: 'Send',
    gonderiliyor: 'Sending',
    basariliBaslik: 'Message sent',
    basariliMetin: 'The committee will get back to you shortly. Thank you for your contribution.',
    yeniMesaj: 'Send Another Message',
    hata: 'Could not send. Please try again later.',
    eksik: 'Please fill in all fields.',
    emailGecersiz: 'Please enter a valid email address.',
  },
  de: {
    baslik: 'Diesen Ausschuss Kontaktieren',
    altMetin: 'Haben Sie eine Frage, einen Vorschlag oder Kommentar? Füllen Sie das untenstehende Formular aus.',
    adPlaceholder: 'Ihr vollständiger Name',
    emailPlaceholder: 'Ihre E-Mail-Adresse',
    mesajPlaceholder: 'Schreiben Sie Ihre Frage oder Ihren Vorschlag...',
    gonder: 'Senden',
    gonderiliyor: 'Wird gesendet',
    basariliBaslik: 'Nachricht gesendet',
    basariliMetin: 'Der Ausschuss meldet sich in Kürze bei Ihnen. Danke für Ihren Beitrag.',
    yeniMesaj: 'Weitere Nachricht senden',
    hata: 'Konnte nicht gesendet werden. Bitte später erneut versuchen.',
    eksik: 'Bitte füllen Sie alle Felder aus.',
    emailGecersiz: 'Bitte geben Sie eine gültige E-Mail ein.',
  },
  nl: {
    baslik: 'Stel een Vraag aan Deze Commissie',
    altMetin: 'Heeft u een vraag, suggestie of opmerking? Vul het onderstaande formulier in.',
    adPlaceholder: 'Uw volledige naam',
    emailPlaceholder: 'Uw e-mailadres',
    mesajPlaceholder: 'Schrijf uw vraag of suggestie...',
    gonder: 'Versturen',
    gonderiliyor: 'Versturen...',
    basariliBaslik: 'Bericht verzonden',
    basariliMetin: 'De commissie neemt binnenkort contact met u op. Bedankt voor uw bijdrage.',
    yeniMesaj: 'Nieuw Bericht Versturen',
    hata: 'Kon niet verzonden worden. Probeer later opnieuw.',
    eksik: 'Vul alstublieft alle velden in.',
    emailGecersiz: 'Voer een geldig e-mailadres in.',
  },
};

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

const KomisyonSoruFormu = ({ komisyonId, komisyonAd }) => {
  const { lang } = useTranslation();
  const tr = I18N[lang] || I18N.tr;

  const currentUser = auth?.currentUser;
  const [ad, setAd] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [mesaj, setMesaj] = useState('');
  const [durum, setDurum] = useState('idle'); // idle | gonderiliyor | basarili | hata
  const [hataMetin, setHataMetin] = useState('');

  const gonder = async (e) => {
    e.preventDefault();
    setHataMetin('');

    if (!ad.trim() || !email.trim() || !mesaj.trim()) {
      setDurum('hata');
      setHataMetin(tr.eksik);
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setDurum('hata');
      setHataMetin(tr.emailGecersiz);
      return;
    }

    setDurum('gonderiliyor');
    try {
      await addDoc(collection(db, 'komisyon_iletisim_talepleri'), {
        komisyonId,
        komisyonAd: komisyonAd || '',
        ad: ad.trim().slice(0, 100),
        email: email.trim().toLowerCase().slice(0, 200),
        mesaj: mesaj.trim().slice(0, 2000),
        uid: currentUser?.uid || null,
        olusturulmaTarihi: serverTimestamp(),
        durum: 'yeni',
        dil: lang,
      });
      setDurum('basarili');
      setMesaj('');
    } catch (err) {
      console.error('[komisyon-soru] hata:', err);
      setDurum('hata');
      setHataMetin(tr.hata + ' (' + err.message.slice(0, 80) + ')');
    }
  };

  const sifirla = () => {
    setDurum('idle');
    setHataMetin('');
  };

  // Başarılı durumda — success message
  if (durum === 'basarili') {
    return (
      <section className="mb-8 bg-gradient-to-br from-emerald-500/10 to-emerald-700/5 border border-emerald-400/30 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-300" />
        </div>
        <h3 className="text-white font-bold text-lg sm:text-xl mb-2">{tr.basariliBaslik}</h3>
        <p className="text-emerald-100/90 text-sm leading-relaxed max-w-md mx-auto mb-5">
          {tr.basariliMetin}
        </p>
        <button onClick={sifirla}
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold spring-tap">
          <MessageSquarePlus className="w-4 h-4" /> {tr.yeniMesaj}
        </button>
      </section>
    );
  }

  return (
    <section className="mb-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-2">
        <MessageSquarePlus className="w-5 h-5 text-amber-300" />
        <h2 className="text-white font-bold text-lg sm:text-xl">{tr.baslik}</h2>
      </div>
      <p className="text-purple-100/80 text-sm leading-relaxed mb-5">
        {tr.altMetin}
      </p>

      <form onSubmit={gonder} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/60" />
            <input
              type="text"
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder={tr.adPlaceholder}
              maxLength={100}
              required
              disabled={durum === 'gonderiliyor'}
              className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-3 py-2.5 text-white text-sm placeholder-purple-300/40 focus:border-amber-400/60 outline-none disabled:opacity-50"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/60" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tr.emailPlaceholder}
              maxLength={200}
              required
              disabled={durum === 'gonderiliyor'}
              className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-3 py-2.5 text-white text-sm placeholder-purple-300/40 focus:border-amber-400/60 outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <textarea
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value)}
          placeholder={tr.mesajPlaceholder}
          rows={4}
          maxLength={2000}
          required
          disabled={durum === 'gonderiliyor'}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm leading-relaxed placeholder-purple-300/40 focus:border-amber-400/60 outline-none resize-y disabled:opacity-50"
        />

        {durum === 'hata' && hataMetin && (
          <div className="flex items-center gap-2 bg-rose-500/15 border border-rose-400/40 text-rose-200 rounded-xl px-3 py-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{hataMetin}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-purple-200/50 text-xs">
            {mesaj.length} / 2000
          </span>
          <button type="submit" disabled={durum === 'gonderiliyor'}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-purple-900 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg spring-tap disabled:opacity-50">
            {durum === 'gonderiliyor' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {tr.gonderiliyor}</>
            ) : (
              <><Send className="w-4 h-4" /> {tr.gonder}</>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};

export default KomisyonSoruFormu;
