// Ekip Yönetim Paneli — saha yönetimi araçları
// Şimdilik tek modül: Hızlı Başlangıç Bonusu Takip (external link)
// İleride başka modüller eklenecek (sponsor zinciri, organizasyon ağacı, S&S takip vb)

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ExternalLink, Rocket, Lock, Building2, Bot, Calculator, Video, Users2 } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { useSmartBack } from '../utils/navigation';

// Çok dilli metinler
const I18N = {
  tr: {
    anasayfa: 'Anasayfa',
    geri: 'Geri',
    kicker: 'Saha Yönetim Araçları',
    baslik: 'Ekip Yönetim Paneli',
    aciklama: 'OneTeam iş ortaklarının organizasyon yönetimi için merkezi araç paneli.',
    aktifBadge: 'Aktif',
    kuruluyorBadge: 'Yakında',
    detaylariGor: 'Panele Git',
    altMetin: 'Bu panel sürekli geliştiriliyor. Yeni modüller eklendikçe burada görünecek.',
  },
  en: {
    anasayfa: 'Home',
    geri: 'Back',
    kicker: 'Field Management Tools',
    baslik: 'Team Management Panel',
    aciklama: 'Central tools panel for OneTeam partners to manage their organization.',
    aktifBadge: 'Active',
    kuruluyorBadge: 'Coming',
    detaylariGor: 'Open Panel',
    altMetin: 'This panel is constantly evolving. New modules will appear here as they are added.',
  },
  de: {
    anasayfa: 'Startseite',
    geri: 'Zurück',
    kicker: 'Feldmanagement-Tools',
    baslik: 'Team Management Panel',
    aciklama: 'Zentrales Tool-Panel für OneTeam-Partner zur Verwaltung ihrer Organisation.',
    aktifBadge: 'Aktiv',
    kuruluyorBadge: 'Bald',
    detaylariGor: 'Panel öffnen',
    altMetin: 'Dieses Panel wird ständig weiterentwickelt. Neue Module erscheinen hier.',
  },
  nl: {
    anasayfa: 'Home',
    geri: 'Terug',
    kicker: 'Veldbeheer Tools',
    baslik: 'Team Management Paneel',
    aciklama: 'Centraal toolspaneel voor OneTeam-partners om hun organisatie te beheren.',
    aktifBadge: 'Actief',
    kuruluyorBadge: 'Binnenkort',
    detaylariGor: 'Paneel openen',
    altMetin: 'Dit paneel wordt voortdurend ontwikkeld. Nieuwe modules verschijnen hier.',
  },
};

// Modüller (kartlar) — her biri ayrı bir araç
const MODULLER = [
  {
    id: 'hbb',
    ad: {
      tr: 'Hızlı Başlangıç Bonusu Takip',
      en: 'Quick Start Bonus Tracker',
      de: 'Schnellstart-Bonus Tracker',
      nl: 'Snelstart Bonus Tracker',
    },
    kisaltma: 'HBB',
    aciklama: {
      tr: 'Hızlı Başlangıç sürecindekiler, sponsorları ve üst hat Diamond\'lar için.',
      en: 'For partners in Quick Start period, their sponsors, and upline Diamonds.',
      de: 'Für Partner in der Schnellstart-Phase, ihre Sponsoren und Upline-Diamonds.',
      nl: 'Voor partners in de Snelstart-periode, hun sponsors en upline-Diamonds.',
    },
    icon: Rocket,
    aktif: true,
    link: 'https://hbb.oneteamglobal.ai/',
    renk: 'amber',
  },
  {
    id: 'asistan',
    ad: {
      tr: 'OneTeam Asistan',
      en: 'OneTeam Assistant',
      de: 'OneTeam Assistent',
      nl: 'OneTeam Assistent',
    },
    kisaltma: 'AI',
    aciklama: {
      tr: 'Eğitim ve organizasyon süreçlerinde AI destekli kişisel asistan.',
      en: 'AI-powered personal assistant for training and organization tasks.',
      de: 'KI-gestützter Assistent für Schulungs- und Organisationsaufgaben.',
      nl: 'AI-aangedreven assistent voor training en organisatietaken.',
    },
    icon: Bot,
    aktif: true,
    link: 'https://asistan.oneteamglobal.ai/',
    renk: 'amber',
    sso: true, // giriş yapmış kullanıcının emaili query param olarak iletilir
  },
  {
    id: 'hesaplayici',
    ad: {
      tr: 'Müşteri Kazanç Hesaplayıcı',
      en: 'Customer Earnings Calculator',
      de: 'Kunden-Verdienstrechner',
      nl: 'Klant Verdienstencalculator',
    },
    kisaltma: 'CALC',
    aciklama: {
      tr: 'Kazanç, prim ve performans hesaplamaları için araç.',
      en: 'Tool for earnings, bonus and performance calculations.',
      de: 'Tool für Verdienst-, Bonus- und Leistungsberechnungen.',
      nl: 'Tool voor verdiensten-, bonus- en prestatieberekeningen.',
    },
    icon: Calculator,
    aktif: true,
    link: 'https://hesaplayici.oneteamglobal.ai/',
    renk: 'amber',
  },
  {
    id: 'crm',
    ad: {
      tr: 'Aday Takip Sistemi',
      en: 'Lead Tracking System',
      de: 'Lead-Tracking-System',
      nl: 'Leadtracking Systeem',
    },
    kisaltma: 'CRM',
    aciklama: {
      tr: 'Aday ve potansiyel iş ortağı ilişkilerini takip et.',
      en: 'Track candidate and potential partner relationships.',
      de: 'Verfolge Kandidaten- und potenzielle Partnerbeziehungen.',
      nl: 'Volg kandidaten en potentiële partnerrelaties.',
    },
    icon: Users2,
    aktif: true,
    link: 'https://crm.oneteamglobal.ai/',
    renk: 'amber',
  },
  {
    id: 'kayitli-egitimler',
    ad: {
      tr: 'Kayıtlı Eğitimler',
      en: 'Recorded Trainings',
      de: 'Aufgezeichnete Schulungen',
      nl: 'Opgenomen Trainingen',
    },
    kisaltma: 'KE',
    aciklama: {
      tr: 'Geçmiş eğitimlerin video arşivi ve AI destekli arama.',
      en: 'Archive of past training videos with AI-assisted search.',
      de: 'Archiv vergangener Schulungsvideos mit KI-gestützter Suche.',
      nl: 'Archief van eerdere trainingsvideo\'s met AI-ondersteund zoeken.',
    },
    icon: Video,
    aktif: true,
    link: '/kayitli-egitimler',
    internal: true, // SPA içi sayfa — aynı sekmede aç
    renk: 'amber',
  },
  // İleride buraya yeni modüller eklenecek
];

const EkipYonetimSayfasi = () => {
  const navigate = useNavigate();
  const geri = useSmartBack('/');
  const { lang } = useTranslation();
  const { currentUser } = useData();
  const tr = I18N[lang] || I18N.tr;

  const aktifSayisi = MODULLER.filter(m => m.aktif).length;

  // SSO destekli modüller: HMAC-imzalı kısa süreli (5dk) token üretip URL'e ekle.
  // Önceden ?email= imzasız gidiyordu — saldırgan başkasının emailini elle
  // yazıp asistana o kişi olarak girebiliyordu. Artık imzasız kabul edilmez.
  const [ssoYukleniyor, setSsoYukleniyor] = React.useState(null); // m.id
  const ssoLinkAc = async (m, e) => {
    e.preventDefault();
    if (!m.aktif) return;
    if (m.internal) { navigate(m.link); return; }
    if (!m.sso || !currentUser?.email) {
      window.open(m.link, '_blank', 'noopener,noreferrer');
      return;
    }
    setSsoYukleniyor(m.id);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/asistan-sso-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: 'egitim-takvimi' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.token) throw new Error(data?.error || 'token-alinamadi');
      const u = new URL(m.link);
      u.searchParams.set('ssoToken', data.token);
      u.searchParams.set('source', 'egitim-takvimi');
      window.open(u.toString(), '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[SSO]', err.message);
      // Fallback: imzasız link yerine HİÇ açma — kullanıcı yeniden dener
      alert('Bağlantı oluşturulamadı. Lütfen tekrar dene.');
    } finally {
      setSsoYukleniyor(null);
    }
  };
  // Görsel href: SSO için # (gerçek URL onClick'te üretilir)
  const linkOlustur = (m) => (m.sso ? '#' : m.link);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative">
      {/* Üstte altın aurora */}
      <div className="absolute top-0 left-0 right-0 h-[700px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.18)_0%,transparent_75%)] pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={geri}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> {tr.geri || tr.anasayfa}
          </button>
          <LanguageSwitcher />
        </div>

        {/* Hero — kompakt */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 animate-fade-in">
          {/* OneTeam logo */}
          <div className="relative inline-block mb-3">
            <div className="absolute -inset-4 bg-amber-400/15 blur-2xl pointer-events-none" />
            <img
              src="/logos/oneteam-logo.png"
              alt="OneTeam"
              className="relative w-20 sm:w-24 md:w-28 h-auto"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(251, 191, 36, 0.35)) drop-shadow(0 0 20px rgba(251, 191, 36, 0.15))',
              }}
            />
          </div>

          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-8 sm:w-12 bg-amber-400/50" />
            <span className="text-amber-300 text-[10px] sm:text-xs uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              {tr.kicker}
            </span>
            <div className="h-px w-8 sm:w-12 bg-amber-400/50" />
          </div>

          {/* Başlık */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight mb-3 leading-tight">
            {tr.baslik}
          </h1>

          {/* Açıklama */}
          <p className="text-purple-100/85 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            {tr.aciklama}
          </p>
        </div>

        {/* Modüller grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto">
          {MODULLER.map((m, idx) => {
            const Icon = m.icon;
            const ad = m.ad[lang] || m.ad.tr;
            const aciklama = m.aciklama[lang] || m.aciklama.tr;
            return (
              <a
                key={m.id}
                href={m.aktif ? linkOlustur(m) : '#'}
                target={m.aktif && !m.internal && !m.sso ? '_blank' : undefined}
                rel={m.aktif && !m.internal && !m.sso ? 'noopener noreferrer' : undefined}
                onClick={(e) => {
                  if (!m.aktif) { e.preventDefault(); return; }
                  if (m.internal) { e.preventDefault(); navigate(m.link); return; }
                  if (m.sso) { ssoLinkAc(m, e); return; }
                }}
                aria-busy={ssoYukleniyor === m.id}
                className={`group relative overflow-hidden bg-white/10 backdrop-blur-md border rounded-2xl p-6 transition-all duration-300 spring-tap text-left shadow-xl ${
                  m.aktif
                    ? 'hover:bg-white/15 border-amber-300/40 hover:border-amber-300/70 hover:shadow-amber-500/20 cursor-pointer'
                    : 'border-white/15 cursor-not-allowed opacity-70'
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* İkon + OneTeam mini rozeti */}
                <div className="relative w-16 h-16 mb-4">
                  <div className={`absolute inset-0 rounded-2xl ${
                    m.aktif
                      ? 'bg-gradient-to-br from-amber-400/30 to-amber-600/15 border border-amber-300/50'
                      : 'bg-white/10 border border-white/20'
                  } shadow-lg`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className={`w-8 h-8 ${m.aktif ? 'text-amber-300' : 'text-purple-100/80'}`} />
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-purple-900 border-2 border-purple-800 overflow-hidden flex items-center justify-center shadow-md">
                    <img src="/logos/oneteam-logo.png" alt="OneTeam" className="w-4 h-4 object-contain" />
                  </div>
                </div>

                {/* Modül adı */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold text-base sm:text-lg leading-tight">
                    {ad}
                  </h3>
                  {m.kisaltma && (
                    <span className="bg-amber-400/15 text-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-amber-300/30">
                      {m.kisaltma}
                    </span>
                  )}
                </div>
                <p className="text-purple-200/80 text-xs leading-snug line-clamp-2 mb-3 min-h-[2.25rem]">
                  {aciklama}
                </p>

                {/* Alt CTA */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className={`text-[11px] uppercase tracking-wider font-bold inline-flex items-center gap-1 ${
                    m.aktif ? 'text-amber-300' : 'text-purple-200/60'
                  }`}>
                    {m.aktif ? tr.detaylariGor : tr.kuruluyorBadge}
                    {m.aktif && !m.internal && <ExternalLink className="w-3 h-3" />}
                  </span>
                  {m.aktif ? (
                    <ArrowRight className="w-4 h-4 text-amber-300 transition-transform group-hover:translate-x-1" />
                  ) : (
                    <Lock className="w-4 h-4 text-white/40" />
                  )}
                </div>

                {/* Dekor gradient overlay */}
                {m.aktif && (
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
                )}
              </a>
            );
          })}
        </div>

        {/* Alt bilgi */}
        <div className="mt-12 text-center max-w-2xl mx-auto">
          <p className="text-purple-200/60 text-xs leading-relaxed inline-flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" />
            {tr.altMetin}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EkipYonetimSayfasi;
