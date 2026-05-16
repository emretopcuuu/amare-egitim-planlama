import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, makeSafeId, makeCoreId } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import { ArrowLeft, Download, Clock, AlertCircle, Loader2, MapPin, Tag, User, Wifi, Building2, X, Mail, Search, List, LayoutGrid, Table2, Timer, Bell, ChevronUp, CalendarDays, Calendar as CalendarIcon, Users as UsersIcon, Rss, Video, RotateCw, LogIn, LogOut, UserCircle } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import HatirlatmaKayitModal from '../components/HatirlatmaKayitModal';
import EventActions from '../components/EventActions';
import KonusmaciFullModal from '../components/KonusmaciFullModal';
import StoryStrip from '../components/StoryStrip';
import { EmptySearch, EmptyCompleted } from '../components/EmptyState';
import LoadingProgress from '../components/LoadingProgress';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import UyeGirisModal from '../components/UyeGirisModal';
import { DayMotif } from '../utils/dayIcon.jsx';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import { usePullToRefresh } from '../utils/usePullToRefresh';
import { useDocumentTitle } from '../utils/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
// jsPDF + html2canvas dinamik import — sadece PDF indir butonu tıklandığında yüklenir
// İlk yükleme süresinden ~400KB tasarruf

// Sofistike kategori renkleri: bg + text + border + ring (hover/active)
const KATEGORI_RENK = {
  'Liderlik':           { bg: 'bg-purple-50',  text: 'text-purple-800',  border: 'border-purple-300',  dot: 'bg-purple-500' },
  'Satış':              { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  'Motivasyon':         { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-300',   dot: 'bg-amber-500' },
  'Sağlık':             { bg: 'bg-rose-50',    text: 'text-rose-800',    border: 'border-rose-300',    dot: 'bg-rose-500' },
  'Finansal Özgürlük':  { bg: 'bg-sky-50',     text: 'text-sky-800',     border: 'border-sky-300',     dot: 'bg-sky-500' },
  'Kişisel Gelişim':    { bg: 'bg-violet-50',  text: 'text-violet-800',  border: 'border-violet-300',  dot: 'bg-violet-500' },
  'Vizyon Günü':        { bg: 'bg-pink-50',    text: 'text-pink-800',    border: 'border-pink-300',    dot: 'bg-pink-500' },
  'Panel':              { bg: 'bg-cyan-50',    text: 'text-cyan-800',    border: 'border-cyan-300',    dot: 'bg-cyan-500' },
  'Diğer':              { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-300',   dot: 'bg-slate-500' },
};
const SEHIRLER = ['İstanbul','Ankara','İzmir','Bursa','Kayseri','Antalya','Konya','Nevşehir','Eskişehir','Trabzon','Adana','Mersin','Gaziantep','Diyarbakır','Samsun','Denizli','Muğla','Çorlu'];

// Yurtdışı tespiti — ülke adı veya AB büyük şehir adı yer'de/başlıkta geçerse
const YURTDISI_ULKELER = {
  'HOLLANDA': { bayrak: '🇳🇱', kisa: 'NL', renk: 'from-orange-500 to-orange-700' },
  'NEDERLAND': { bayrak: '🇳🇱', kisa: 'NL', renk: 'from-orange-500 to-orange-700' },
  'AMSTERDAM': { bayrak: '🇳🇱', kisa: 'NL', renk: 'from-orange-500 to-orange-700' },
  'AVUSTURYA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'AUSTRIA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'VİYANA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'VIYANA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'VIENNA': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'WIEN': { bayrak: '🇦🇹', kisa: 'AT', renk: 'from-red-500 to-red-700' },
  'ALMANYA': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'GERMANY': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'BERLIN': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'MÜNİH': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'MUNIH': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'MÜNCHEN': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'FRANKFURT': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'HAMBURG': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'KÖLN': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'KOLN': { bayrak: '🇩🇪', kisa: 'DE', renk: 'from-yellow-500 to-yellow-700' },
  'BELÇİKA': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'BELGIUM': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'BRÜKSEL': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'BRUKSEL': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'BRUSSELS': { bayrak: '🇧🇪', kisa: 'BE', renk: 'from-yellow-600 to-red-600' },
  'FRANSA': { bayrak: '🇫🇷', kisa: 'FR', renk: 'from-blue-500 to-red-600' },
  'FRANCE': { bayrak: '🇫🇷', kisa: 'FR', renk: 'from-blue-500 to-red-600' },
  'PARİS': { bayrak: '🇫🇷', kisa: 'FR', renk: 'from-blue-500 to-red-600' },
  'PARIS': { bayrak: '🇫🇷', kisa: 'FR', renk: 'from-blue-500 to-red-600' },
  'İSVİÇRE': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'ISVICRE': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'SWITZERLAND': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'ZÜRİH': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'ZURICH': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'CENEVRE': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'GENEVA': { bayrak: '🇨🇭', kisa: 'CH', renk: 'from-red-600 to-pink-700' },
  'İNGİLTERE': { bayrak: '🇬🇧', kisa: 'UK', renk: 'from-blue-700 to-red-700' },
  'INGILTERE': { bayrak: '🇬🇧', kisa: 'UK', renk: 'from-blue-700 to-red-700' },
  'LONDRA': { bayrak: '🇬🇧', kisa: 'UK', renk: 'from-blue-700 to-red-700' },
  'LONDON': { bayrak: '🇬🇧', kisa: 'UK', renk: 'from-blue-700 to-red-700' },
  'AVRUPA': { bayrak: '🇪🇺', kisa: 'EU', renk: 'from-blue-600 to-amber-500' },
  'EUROPE': { bayrak: '🇪🇺', kisa: 'EU', renk: 'from-blue-600 to-amber-500' },
  // USA / Amerika
  'ABD': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'AMERİKA': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'AMERIKA': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'USA': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'UNITED STATES': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'DALLAS': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'TEXAS': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'NEW YORK': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'MIAMI': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'LAS VEGAS': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'LOS ANGELES': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'CHICAGO': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'ORLANDO': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'HOUSTON': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  'PHOENIX': { bayrak: '🇺🇸', kisa: 'US', renk: 'from-blue-700 to-red-600' },
  // South Africa
  'GÜNEY AFRİKA': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'GUNEY AFRIKA': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'SOUTH AFRICA': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'CAPE TOWN': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'CAPETOWN': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  'JOHANNESBURG': { bayrak: '🇿🇦', kisa: 'ZA', renk: 'from-emerald-600 to-amber-600' },
  // UAE / BAE
  'BAE': { bayrak: '🇦🇪', kisa: 'AE', renk: 'from-emerald-700 to-red-700' },
  'DUBAI': { bayrak: '🇦🇪', kisa: 'AE', renk: 'from-emerald-700 to-red-700' },
  'ABU DHABI': { bayrak: '🇦🇪', kisa: 'AE', renk: 'from-emerald-700 to-red-700' },
  // Asya / Pasifik
  'BALİ': { bayrak: '🇮🇩', kisa: 'ID', renk: 'from-red-600 to-white' },
  'BALI': { bayrak: '🇮🇩', kisa: 'ID', renk: 'from-red-600 to-white' },
  'ENDONEZYA': { bayrak: '🇮🇩', kisa: 'ID', renk: 'from-red-600 to-white' },
  'INDONESIA': { bayrak: '🇮🇩', kisa: 'ID', renk: 'from-red-600 to-white' },
  'TAYLAND': { bayrak: '🇹🇭', kisa: 'TH', renk: 'from-blue-700 to-red-700' },
  'THAILAND': { bayrak: '🇹🇭', kisa: 'TH', renk: 'from-blue-700 to-red-700' },
  'BANGKOK': { bayrak: '🇹🇭', kisa: 'TH', renk: 'from-blue-700 to-red-700' },
  'SINGAPUR': { bayrak: '🇸🇬', kisa: 'SG', renk: 'from-red-700 to-white' },
  'SINGAPORE': { bayrak: '🇸🇬', kisa: 'SG', renk: 'from-red-700 to-white' },
  'JAPONYA': { bayrak: '🇯🇵', kisa: 'JP', renk: 'from-white to-red-700' },
  'JAPAN': { bayrak: '🇯🇵', kisa: 'JP', renk: 'from-white to-red-700' },
  'TOKYO': { bayrak: '🇯🇵', kisa: 'JP', renk: 'from-white to-red-700' },
  'AVUSTRALYA': { bayrak: '🇦🇺', kisa: 'AU', renk: 'from-blue-700 to-red-700' },
  'AUSTRALIA': { bayrak: '🇦🇺', kisa: 'AU', renk: 'from-blue-700 to-red-700' },
  'SYDNEY': { bayrak: '🇦🇺', kisa: 'AU', renk: 'from-blue-700 to-red-700' },
  // Kanada
  'KANADA': { bayrak: '🇨🇦', kisa: 'CA', renk: 'from-red-600 to-red-700' },
  'CANADA': { bayrak: '🇨🇦', kisa: 'CA', renk: 'from-red-600 to-red-700' },
  'TORONTO': { bayrak: '🇨🇦', kisa: 'CA', renk: 'from-red-600 to-red-700' },
  'VANCOUVER': { bayrak: '🇨🇦', kisa: 'CA', renk: 'from-red-600 to-red-700' },
  // Global event markers (başlıkta geçerse uluslararası say)
  'GLOBAL CONVENTION': { bayrak: '🌍', kisa: 'GLOBAL', renk: 'from-amber-500 to-purple-700' },
  'WORLD CONVENTION': { bayrak: '🌍', kisa: 'GLOBAL', renk: 'from-amber-500 to-purple-700' },
  'INTERNATIONAL CONVENTION': { bayrak: '🌍', kisa: 'INTL', renk: 'from-amber-500 to-purple-700' },
};

// Yurtdışı tespit — yer veya başlıkta ülke/şehir adı
const getYurtdisi = (egitim) => {
  if (!egitim) return null;
  const yer = (egitim.yer || '').normalize('NFC').toLocaleUpperCase('tr-TR');
  const baslik = (egitim.egitim || '').normalize('NFC').toLocaleUpperCase('tr-TR');
  // ZOOM ise yurtdışı sayma (genelde online)
  if (yer.includes('ZOOM')) return null;
  const arananMetin = yer + ' ' + baslik;
  for (const [anahtar, val] of Object.entries(YURTDISI_ULKELER)) {
    if (arananMetin.includes(anahtar)) return { ...val, anahtar };
  }
  return null;
};
const parseTarih = (t) => { if (!t) return null; const parts = String(t).split('.').map(Number); if (parts.length !== 3 || parts.some(isNaN)) return null; const [d,m,y] = parts; const dt = new Date(y, m-1, d); return isNaN(dt.getTime()) ? null : dt; };
// Türkçe gün → çeviri anahtarı
const TR_DAY_KEY = { 'Pazartesi':'monday','Salı':'tuesday','Çarşamba':'wednesday','Perşembe':'thursday','Cuma':'friday','Cumartesi':'saturday','Pazar':'sunday', 'PAZARTESİ':'monday','SALI':'tuesday','ÇARŞAMBA':'wednesday','PERŞEMBE':'thursday','CUMA':'friday','CUMARTESİ':'saturday','PAZAR':'sunday' };
const trGun = (gun, t) => { if(!gun) return ''; const key = TR_DAY_KEY[gun] || TR_DAY_KEY[gun.trim()]; return key ? t(key) : gun; };
const splitEgitmen = (e) => { if (!e) return []; return e.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\u00A0/g,' ').split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/).map(n=>n.trim().replace(/\s*SÖYLEŞİ\s*/gi,'').replace(/\s*SÖYLEŞI\s*/gi,'').replace(/\s+[İI]LE\.{0,3}\s*$/i,'').replace(/\s+VE\s*$/i,'').replace(/\.{2,}$/g,'').trim()).filter(n=>n.length>1); };
const isOnline = (e) => e.sehir === 'Online' || (e.yer||'').toLocaleUpperCase('tr-TR').includes('ZOOM');
const getSehir = (e) => { if (e.sehir && e.sehir !== 'Online') return e.sehir; if (isOnline(e)) return null; const yer=e.yer||''; const u=yer.toLocaleUpperCase('tr-TR'); for (const s of SEHIRLER) { if (u.includes(s.toLocaleUpperCase('tr-TR'))) return s; } return 'Diğer'; };

// ── Countdown hesapla ────────────────────────────────────────────────────────
const getCountdown = (egitim) => {
  const d = parseTarih(egitim.tarih);
  if (!d) return null;
  // Saat girilmemişse countdown gösterme
  if (!egitim.saat || !egitim.saat.includes(':')) return null;
  const [saat = 0, dk = 0] = (egitim.saat || '0:0').split(':').map(Number);
  const [bSaat = 0, bDk = 0] = (egitim.bitisSaati || '').split(':').map(Number);
  const baslangic = new Date(d); baslangic.setHours(saat, dk, 0, 0);
  const bitis = egitim.bitisSaati ? new Date(d) : new Date(baslangic.getTime() + 60*60000);
  if (egitim.bitisSaati) bitis.setHours(bSaat, bDk, 0, 0);
  const simdi = new Date();
  if (simdi >= baslangic && simdi <= bitis) return { durum: 'canli', ms: 0, gun: 0, sa: 0, dakika: 0 };
  if (simdi > bitis) return { durum: 'gecmis', ms: -1, gun: 0, sa: 0, dakika: 0 };
  const fark = baslangic - simdi;
  const gun = Math.floor(fark / 86400000);
  const sa = Math.floor((fark % 86400000) / 3600000);
  const dakika = Math.floor((fark % 3600000) / 60000);
  if (gun > 0) return { durum: 'gelecek', ms: fark, gun, sa, dakika };
  if (sa > 0) return { durum: 'gelecek', ms: fark, gun, sa, dakika };
  return { durum: 'yakin', ms: fark, gun, sa, dakika };
};

// ── Konuşmacı Avatar ─────────────────────────────────────────────────────────
const KonusmaciAvatar = ({ ad, konusmacilar, onClick, size = 'md', dark = false }) => {
  const safeId = makeSafeId(ad);
  const coreId = makeCoreId(ad);
  const k = konusmacilar.find(k => k.id === safeId)
         || konusmacilar.find(k => k.id === coreId)
         || konusmacilar.find(k => makeCoreId(k.ad || k.id) === coreId);
  const foto = k?.fotoURL;
  const sz = size === 'sm' ? 'w-10 h-10' : size === 'xxl' ? 'w-32 h-32' : size === 'xl' ? 'w-24 h-24' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  return (
    <button onClick={() => onClick?.(ad, k)}
      aria-label={`${k?.ad||ad} konuşmacı detayını aç`}
      className="flex flex-col items-center gap-1 flex-shrink-0 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-full">
      {foto ? (
        <img src={foto} alt={k?.ad||ad} loading="lazy" decoding="async"
          className={`${sz} rounded-full object-cover object-top border-2 border-purple-200 shadow-sm group-hover:scale-110 group-hover:ring-4 group-hover:ring-purple-300 transition-all duration-200`} />
      ) : (
        <div className={`${sz} rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200 group-hover:scale-110 transition-all duration-200`} aria-hidden="true">
          <User className="w-1/2 h-1/2 text-purple-400" />
        </div>
      )}
      {size !== 'sm' && <span className={`text-[10px] text-center leading-tight max-w-[80px] ${dark ? 'text-white/80' : 'text-gray-600'}`}>{k?.ad||ad}</span>}
    </button>
  );
};

// ── Konuşmacı Detay Modal ────────────────────────────────────────────────────
const KonusmaciModal = ({ ad, kayit, onClose }) => !ad ? null : (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-scaleIn" onClick={e=>e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      <div className="flex flex-col items-center text-center">
        {kayit?.fotoURL ? <img src={kayit.fotoURL} alt={kayit.ad||ad} className="w-32 h-32 rounded-full object-cover object-top border-4 border-purple-200 shadow-lg mb-4" />
          : <div className="w-32 h-32 rounded-full bg-purple-100 flex items-center justify-center border-4 border-purple-200 mb-4"><User className="w-16 h-16 text-purple-300" /></div>}
        <h3 className="text-xl font-bold text-gray-800">{kayit?.ad||ad}</h3>
        {kayit?.unvan && <p className="text-purple-600 font-medium mt-1">{kayit.unvan}</p>}
        {kayit?.biyografi && <p className="text-gray-500 text-sm mt-3 leading-relaxed">{kayit.biyografi}</p>}
        {kayit?.linkedin && <a href={`mailto:${kayit.linkedin}`} className="flex items-center gap-1.5 text-blue-500 text-sm mt-3 hover:underline"><Mail className="w-4 h-4" />{kayit.linkedin}</a>}
      </div>
    </div>
  </div>
);

// ── Countdown Badge ──────────────────────────────────────────────────────────
const CountdownBadge = ({ egitim }) => {
  const { t } = useTranslation();
  const [cd, setCd] = useState(() => getCountdown(egitim));
  useEffect(() => { const iv = setInterval(() => setCd(getCountdown(egitim)), 60000); return () => clearInterval(iv); }, [egitim]);
  if (!cd) return null;
  const formatCd = (c) => {
    if (c.gun > 0) return `${c.gun} ${t('cd_days')} ${c.sa} ${t('cd_hours')}`;
    if (c.sa > 0) return `${c.sa} ${t('cd_hours')} ${c.dakika} ${t('cd_min').toLowerCase()}`;
    return `${c.dakika} ${t('cd_minutes')}`;
  };
  if (cd.durum === 'canli') return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-red-500 text-white animate-pulse ring-4 ring-red-300/40"><span className="w-2 h-2 bg-white rounded-full animate-ping" />ŞİMDİ CANLI</span>;
  if (cd.durum === 'gecmis') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">{t('cd_completed')}</span>;
  // 1 dakika kala — dev rozet + altın halka
  const oneMinuteAway = cd.durum === 'yakin' && cd.gun === 0 && cd.sa === 0 && cd.dakika <= 1;
  if (oneMinuteAway) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-amber-400 text-gray-900 imminent-pulse ring-4 ring-amber-300/60 gold-glow"><Timer className="w-4 h-4" />Birazdan başlıyor!</span>;
  // < 1 saat — orta boy + turuncu (acil)
  if (cd.durum === 'yakin') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white ring-2 ring-orange-300/40"><Timer className="w-3 h-3" />{formatCd(cd)}</span>;
  // < 24 saat — küçük + altın (yakın)
  if (cd.gun === 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300"><Timer className="w-3 h-3" />{formatCd(cd)}</span>;
  // > 1 gün — sade (sakin)
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"><Timer className="w-3 h-3" />{formatCd(cd)}</span>;
};

// ── Hero: Bir Sonraki Eğitim ─────────────────────────────────────────────────
const HeroBolum = ({ egitim, konusmacilar, onKonusmaci, onPoster, onHatirlatma, sira = 1 }) => {
  const { t, locale, tDynamic } = useTranslation();
  const [cd, setCd] = useState(() => getCountdown(egitim));
  useEffect(() => { const iv = setInterval(() => setCd(getCountdown(egitim)), 1000); return () => clearInterval(iv); }, [egitim]);
  const konusmacilar2 = splitEgitmen(egitim.egitmen);
  const tarih = parseTarih(egitim.tarih);
  const online = isOnline(egitim);

  const fark = cd?.ms > 0 ? cd.ms : 0;
  const gun = Math.floor(fark / 86400000);
  const saat = Math.floor((fark % 86400000) / 3600000);
  const dakika = Math.floor((fark % 3600000) / 60000);
  const saniye = Math.floor((fark % 60000) / 1000);

  const gradients = [
    'from-purple-800 via-indigo-800 to-blue-800',
    'from-indigo-800 via-purple-700 to-violet-800',
    'from-violet-800 via-fuchsia-800 to-purple-800',
  ];
  const labels = [t('cd_next'), t('cd_2nd'), t('cd_3rd')];
  const isFirst = sira === 1;
  const titleSize = isFirst ? 'text-xl md:text-5xl lg:text-6xl' : 'text-base md:text-xl';
  const padding = isFirst ? 'p-4 md:p-12 lg:p-16' : 'p-3 md:p-5';
  const posterSize = isFirst ? 'w-24 md:w-72 lg:w-96' : 'w-20 md:w-40';
  const countdownSize = isFirst ? 'text-lg md:text-4xl lg:text-5xl min-w-[36px] md:min-w-[76px] lg:min-w-[90px] px-2 md:px-5 lg:px-6 py-1.5 md:py-4 lg:py-5' : 'text-sm md:text-lg min-w-[32px] md:min-w-[40px] px-1.5 md:px-2 py-1';
  const avatarSizeVal = isFirst ? 'md' : 'sm';
  const avatarSizeDesktop = isFirst ? 'xxl' : 'lg';

  const yurtdisi = getYurtdisi(egitim);
  const zoomMatch = (egitim.yer || '').match(/(\d[\d\s]{6,})/);
  const zoomId = zoomMatch ? zoomMatch[1].replace(/\s/g, '') : null;

  // MOBIL: poster üstte tam, içerik altta sıkı
  // DESKTOP (md+): yan yana — content sol, poster sağ
  return (
    <div className={`relative overflow-hidden rounded-2xl ${isFirst && !yurtdisi ? 'hero-mesh' : yurtdisi ? `bg-gradient-to-br ${yurtdisi.renk} ring-4 ring-amber-400/30` : 'bg-gradient-to-r ' + (gradients[sira-1]||gradients[0])} shadow-2xl border border-white/10 ${cd?.durum === 'canli' ? 'canli-pulse' : ''}`}>
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />

      {/* MOBIL HERO — TÜM hero kartları için poster üstte (1. büyük, 2-3 daha küçük aspect) */}
      {egitim.gorselUrl && (
        <div className="md:hidden relative">
          {/* Poster — 1. için tam kare, 2-3 için daha kısa (4:3) */}
          <button onClick={()=>onPoster?.({url:egitim.gorselUrl,baslik:egitim.egitim})}
            className={`block w-full ${isFirst ? 'aspect-square' : 'aspect-[4/3]'} overflow-hidden bg-black/20`}>
            <img src={egitim.gorselUrl} alt={egitim.egitim} className="w-full h-full object-cover" />
          </button>
          {/* Üst overlay — label + rozetler */}
          <div className="absolute top-0 left-0 right-0 p-3 flex items-center gap-2 flex-wrap bg-gradient-to-b from-black/60 to-transparent">
            <span className={`${isFirst ? 'text-xs' : 'text-[10px]'} font-extrabold uppercase tracking-wider text-amber-300 gold-text-glow`}>{labels[sira-1]}</span>
            {yurtdisi && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-gray-900 shadow"><span>{yurtdisi.bayrak}</span>{yurtdisi.kisa}</span>}
            {cd?.durum === 'canli' && <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />ŞİMDİ CANLI</span>}
          </div>
        </div>
      )}

      <div className={`relative ${egitim.gorselUrl ? (isFirst ? 'md:p-12 lg:p-16 p-4' : 'md:p-5 p-3') : padding}`}>
        <div className="flex flex-col md:flex-row gap-5 items-stretch md:items-center">
          <div className="flex-1 min-w-0">
            {/* DESKTOP label + rozet (mobil'de yok, poster overlay'i var) */}
            <div className={`flex items-center gap-2 mb-2 flex-wrap ${egitim.gorselUrl ? 'hidden md:flex' : ''}`}>
              <span className={`${isFirst?'text-sm':'text-[10px]'} font-bold uppercase tracking-wider text-amber-300 gold-text-glow`}>{labels[sira-1]}</span>
              {yurtdisi && isFirst && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/20">{yurtdisi.bayrak} {yurtdisi.anahtar}</span>}
              {cd?.durum === 'canli' && <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />ŞİMDİ CANLI</span>}
            </div>

            <h2 className={`${titleSize} font-extrabold text-white leading-tight font-display`}>{tDynamic(egitim.egitim)}</h2>

            <div className={`flex flex-wrap items-center gap-2 md:gap-3 mt-2 ${isFirst?'text-xs md:text-sm':'text-[10px] md:text-xs'} text-purple-200`}>
              <span className="flex items-center gap-1.5"><Clock className={`${isFirst?'w-4 h-4':'w-3.5 h-3.5'} text-amber-300`} />{tarih?.toLocaleDateString(locale,{day:'numeric',month:'long',weekday:'long'})}{egitim.saat ? ` • ${egitim.saat}${egitim.bitisSaati?`–${egitim.bitisSaati}`:''}` : ''}</span>
              <span className="flex items-center gap-1.5">{online?<Wifi className="w-3.5 h-3.5 text-amber-300" />:<MapPin className="w-3.5 h-3.5 text-amber-300" />}{online?'Zoom':egitim.yer}</span>
            </div>

            {/* Geri sayım — mobil compact, desktop büyük */}
            {cd?.durum !== 'gecmis' && cd?.durum !== 'canli' && (
              <div className="flex gap-1.5 md:gap-2 mt-3">
                {[{v:gun,l:t('cd_day'),k:'g'},{v:saat,l:t('cd_hour'),k:'s'},{v:dakika,l:t('cd_min'),k:'d'},{v:saniye,l:t('cd_sec'),k:'sn'}].map(({v,l,k})=>(
                  <div key={l} className={`flex-1 md:flex-none bg-white/10 backdrop-blur rounded-xl ${isFirst ? 'py-2 md:py-4 px-2 md:px-5 lg:px-6' : 'py-1 px-1.5 md:px-2'} text-center border border-white/10`}>
                    <div className={`font-extrabold text-white tabular-nums font-display ${isFirst ? 'text-xl md:text-4xl lg:text-5xl' : 'text-sm md:text-lg'}`}><span key={`${k}-${v}`} className="cd-digit">{String(v).padStart(2,'0')}</span></div>
                    <div className="text-[8px] text-amber-300/80 uppercase tracking-wider">{l}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Aksiyon butonları — mobilde yan yana full width, desktop'ta sade */}
            {cd?.durum !== 'gecmis' && (
              <div className="flex gap-2 mt-3">
                {online && zoomId && (
                  <a href={`https://zoom.us/j/${zoomId}`} target="_blank" rel="noopener noreferrer"
                    className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 ${isFirst ? 'px-3 md:px-6 py-2.5 md:py-3 text-sm md:text-base' : 'px-3 py-2 text-xs'} bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition-all spring-tap`}>
                    <Wifi className={`${isFirst ? 'w-4 h-4 md:w-5 md:h-5' : 'w-3.5 h-3.5'}`} />{t('cal_join_meeting')}
                  </a>
                )}
                <button onClick={()=>onHatirlatma?.(egitim)}
                  className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 ${isFirst ? 'px-3 md:px-5 py-2.5 text-sm' : 'px-3 py-2 text-xs'} bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl border border-white/20 transition-all spring-tap`}>
                  <Bell className={`${isFirst ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />{t('cal_get_reminder')}
                </button>
              </div>
            )}

            {/* Konuşmacılar — alt satır (mobil + desktop) */}
            {konusmacilar2.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="hidden md:flex items-center gap-2 flex-wrap">
                  {konusmacilar2.map(ad => <KonusmaciAvatar key={ad} ad={ad} konusmacilar={konusmacilar||[]} onClick={onKonusmaci} size={avatarSizeDesktop} dark />)}
                </div>
                <div className="flex md:hidden items-center gap-2">
                  <div className="flex -space-x-2">
                    {konusmacilar2.slice(0, 4).map(ad => <KonusmaciAvatar key={ad} ad={ad} konusmacilar={konusmacilar||[]} onClick={onKonusmaci} size="sm" dark />)}
                  </div>
                  <span className="text-xs text-white/70 line-clamp-1 flex-1">{konusmacilar2.join(', ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP poster — sağda (mobilde üstte gösterildi) */}
          {egitim.gorselUrl && (
            <button onClick={()=>onPoster?.({url:egitim.gorselUrl,baslik:egitim.egitim})} className="hidden md:block flex-shrink-0 hover:scale-105 transition-transform">
              <img src={egitim.gorselUrl} alt="Poster" className={`${posterSize} rounded-xl shadow-2xl border-2 border-white/20`} />
            </button>
          )}
        </div>

        {/* DESKTOP yurtdışı badge — sağ üst absolute (mobilde poster overlay'inde) */}
        {yurtdisi && (
          <div className={`absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400 text-gray-900 shadow-2xl gold-glow ${egitim.gorselUrl ? 'hidden md:inline-flex' : ''}`}>
            <span className="text-base leading-none">{yurtdisi.bayrak}</span>
            ULUSLARARASI · {yurtdisi.kisa}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANA BİLEŞEN
// ═══════════════════════════════════════════════════════════════════════════════
const TakvimView = () => {
  useDocumentTitle('Eğitim Takvimi', 'Bu hafta ve gelecekteki canlı eğitimler');
  const navigate = useNavigate();
  const { takvim, takvimYayinlandi, loading, konusmacilar, hatirlatmaSayilari } = useData();
  const { t, locale, tDynamic, translateBatch, lang } = useTranslation();
  const contentRef = useRef(null); // sayfa scroll ref
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [filtre, setFiltre] = useState('tumu');
  const [sehirFiltre, setSehirFiltre] = useState(null);
  const [kategoriFiltre, setKategoriFiltre] = useState(null);
  const [konusmaciFiltre, setKonusmaciFiltre] = useState(null);
  const [zamanFiltre, setZamanFiltre] = useState(null); // 'bu-hafta' | 'gelecek-7' | 'gelecek-30' | null
  const [arama, setArama] = useState('');
  const [gorunum, setGorunum] = useState(() => window.innerWidth < 768 ? 'kart' : 'liste'); // mobilde kart, masaüstünde liste
  const [konusmaciModal, setKonusmaciModal] = useState(null);
  const [posterModal, setPosterModal] = useState(null);
  const [hatirlatmaModal, setHatirlatmaModal] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [yardimAcik, setYardimAcik] = useState(false);
  const [girisModalAcik, setGirisModalAcik] = useState(false);
  const aramaInputRef = useRef(null);
  const { isAuthenticated, email, displayName } = useAuth();

  // Klavye kısayolları
  useKeyboardShortcuts({
    '/': () => aramaInputRef.current?.focus(),
    '?': () => setYardimAcik(true),
    'Escape': () => {
      if (konusmaciModal) setKonusmaciModal(null);
      else if (posterModal) setPosterModal(null);
      else if (hatirlatmaModal) setHatirlatmaModal(null);
      else if (yardimAcik) setYardimAcik(false);
    },
  }, [konusmaciModal, posterModal, hatirlatmaModal, yardimAcik]);

  // Pull-to-refresh (mobile)
  const { pullY, refreshing } = usePullToRefresh(async () => {
    window.location.reload();
  });

  // Scroll-to-top floating button
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Deep link parsing — ?id=XYZ ile direkt eğitime scroll
  useEffect(() => {
    if (loading || !takvim?.length) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    // 500ms gecikme — DOM render olsun
    setTimeout(() => {
      const el = document.getElementById(`egitim-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-amber-400', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-4', 'ring-amber-400', 'ring-offset-2'), 3000);
      }
    }, 500);
  }, [loading, takvim?.length]);

  // "Bugün" butonuna scroll — önce bugünkü eğitim, yoksa bugünden sonra EN YAKIN
  const scrollToToday = () => {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const bugunStr = `${String(bugun.getDate()).padStart(2,'0')}.${String(bugun.getMonth()+1).padStart(2,'0')}.${bugun.getFullYear()}`;

    // 1) Bugün eğitim var mı? Varsa ona git
    const bugunEgitimleri = takvim
      .filter(e => e.tarih === bugunStr)
      .sort((a, b) => (a.saat || '').localeCompare(b.saat || ''));

    // 2) Bugün yoksa: bugünden sonraki EN YAKIN tarihli eğitim (sıralanır, ilk seçilir)
    const hedef = bugunEgitimleri[0] || takvim
      .map(e => ({ e, d: parseTarih(e.tarih) }))
      .filter(x => x.d && x.d >= bugun)
      .sort((a, b) => {
        const dt = a.d - b.d;
        if (dt !== 0) return dt;
        return (a.e.saat || '').localeCompare(b.e.saat || '');
      })[0]?.e;

    if (!hedef) return;

    const goTo = () => {
      const target = document.getElementById(`egitim-${hedef.id}`);
      if (!target) return;
      // Eğer kart kapalı bir <details> içindeyse aç
      let p = target.parentElement;
      while (p && p !== document.body) {
        if (p.tagName === 'DETAILS' && !p.open) p.open = true;
        p = p.parentElement;
      }
      // Tekrar scroll — details açıldıktan sonra düzgün konumlanır
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('ring-4', 'ring-amber-400');
        setTimeout(() => target.classList.remove('ring-4', 'ring-amber-400'), 2500);
      });
    };
    goTo();
  };

  // Tüm konuşmacı isimlerini liste haline getir (unique, sıralı)
  const tumKonusmacilar = useMemo(() => {
    const s = new Set();
    takvim.forEach(e => splitEgitmen(e.egitmen).forEach(k => s.add(k.trim())));
    return [...s].sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [takvim]);

  // Tüm kategoriler
  const tumKategoriler = useMemo(() => {
    const s = new Set();
    takvim.forEach(e => e.kategori && s.add(e.kategori));
    return [...s].sort();
  }, [takvim]);

  // Dil değiştiğinde tüm eğitim başlıklarını ve kategorilerini önceden çevir
  useEffect(() => {
    if (lang !== 'tr' && takvim.length > 0) {
      const basliklar = [...new Set(takvim.map(e => e.egitim).filter(Boolean))];
      const kategoriler = [...new Set(takvim.map(e => e.kategori).filter(Boolean))];
      const hepsi = [...new Set([...basliklar, ...kategoriler])];
      translateBatch(hepsi);
    }
  }, [lang, takvim.length]);

  const getHaftaKey = (tarihStr) => { const d=parseTarih(tarihStr); if(!d || isNaN(d.getTime())) return null; const p=new Date(d); const g=d.getDay(); p.setDate(d.getDate()+(g===0?-6:1-g)); if (isNaN(p.getTime())) return null; return p.toISOString().split('T')[0]; };

  // Filtrelenmiş + aranan eğitimler
  const filtrelenmis = useMemo(() => takvim.filter(e => {
    if (filtre === 'online' && !isOnline(e)) return false;
    if (filtre === 'offline') { if (isOnline(e)) return false; if (sehirFiltre && getSehir(e) !== sehirFiltre) return false; }
    if (filtre === 'yurtdisi' && !getYurtdisi(e)) return false;
    if (kategoriFiltre && e.kategori !== kategoriFiltre) return false;
    if (konusmaciFiltre) {
      const konusmacilar = splitEgitmen(e.egitmen).map(k => k.trim());
      if (!konusmacilar.includes(konusmaciFiltre)) return false;
    }
    if (zamanFiltre) {
      const d = parseTarih(e.tarih);
      if (!d) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const limit = new Date(now);
      if (zamanFiltre === 'bu-hafta') {
        const sonu = new Date(now);
        const gunFark = 7 - (now.getDay() === 0 ? 7 : now.getDay()); // pazar 7
        sonu.setDate(now.getDate() + gunFark);
        if (d < now || d > sonu) return false;
      } else if (zamanFiltre === 'gelecek-7') {
        limit.setDate(now.getDate() + 7);
        if (d < now || d > limit) return false;
      } else if (zamanFiltre === 'gelecek-30') {
        limit.setDate(now.getDate() + 30);
        if (d < now || d > limit) return false;
      }
    }
    if (arama.trim()) {
      const q = arama.toLocaleUpperCase('tr-TR');
      const fields = [e.egitim, e.egitmen, e.yer, e.kategori, e.tarih, e.gun].map(f=>(f||'').toLocaleUpperCase('tr-TR'));
      if (!fields.some(f => f.includes(q))) return false;
    }
    return true;
  }), [takvim, filtre, sehirFiltre, kategoriFiltre, konusmaciFiltre, zamanFiltre, arama]);

  const aktifFiltreSayisi = (filtre !== 'tumu' ? 1 : 0) + (sehirFiltre ? 1 : 0) + (kategoriFiltre ? 1 : 0) + (konusmaciFiltre ? 1 : 0) + (zamanFiltre ? 1 : 0) + (arama.trim() ? 1 : 0);

  // Yurtdışı yaklaşan eğitimler (gelecek 12 ay — büyük convention'lar erken planlanır)
  const yurtdisiYaklasan = useMemo(() => {
    const bugun = new Date(); bugun.setHours(0,0,0,0);
    const limit = new Date(bugun); limit.setDate(bugun.getDate() + 365);
    return takvim
      .map(e => ({ ...e, _yd: getYurtdisi(e), _d: parseTarih(e.tarih) }))
      .filter(e => e._yd && e._d && e._d >= bugun && e._d <= limit)
      .sort((a, b) => a._d - b._d);
  }, [takvim]);
  const filtreyiSifirla = () => { setFiltre('tumu'); setSehirFiltre(null); setKategoriFiltre(null); setKonusmaciFiltre(null); setZamanFiltre(null); setArama(''); };

  // Bugün özel — bugün gerçekleşen tüm eğitimleri ayır
  const bugunEgitimleri = useMemo(() => {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const bugunStr = `${String(bugun.getDate()).padStart(2,'0')}.${String(bugun.getMonth()+1).padStart(2,'0')}.${bugun.getFullYear()}`;
    return takvim
      .filter(e => e.tarih === bugunStr)
      .sort((a, b) => (a.saat || '').localeCompare(b.saat || ''));
  }, [takvim]);

  const bugunCanli = bugunEgitimleri.filter(e => getCountdown(e)?.durum === 'canli').length;
  const bugunGelecek = bugunEgitimleri.filter(e => {
    const cd = getCountdown(e);
    return cd && (cd.durum === 'gelecek' || cd.durum === 'yakin');
  }).length;
  const bugunGecmis = bugunEgitimleri.filter(e => getCountdown(e)?.durum === 'gecmis').length;

  const sehirler = [...new Set(takvim.filter(e=>!isOnline(e)).map(e=>getSehir(e)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr-TR'));

  // Haftalık grupla
  const { haftalikTakvim, haftaKeys } = useMemo(() => {
    const ht = {};
    filtrelenmis.forEach(e => { const k=getHaftaKey(e.tarih); if(!k) return; if(!ht[k]) ht[k]=[]; ht[k].push(e); });
    const keys = Object.keys(ht).sort();
    keys.forEach(k => ht[k].sort((a,b) => { const ta=parseTarih(a.tarih),tb=parseTarih(b.tarih); if(ta&&tb&&ta.getTime()!==tb.getTime()) return ta-tb; return (a.saat||'').localeCompare(b.saat||''); }));
    return { haftalikTakvim: ht, haftaKeys: keys };
  }, [filtrelenmis]);

  const haftaAralik = (egitimler) => { const tt=egitimler.map(e=>parseTarih(e.tarih)).filter(Boolean).sort((a,b)=>a-b); if(!tt.length)return''; const f=d=>d.toLocaleDateString(locale,{day:'numeric',month:'long'}); return tt.length===1?f(tt[0]):`${f(tt[0])} – ${f(tt[tt.length-1])}`; };

  // En yakın 3 gelecek eğitim (hero için)
  const enYakinEgitimler = useMemo(() => {
    return takvim
      .map(e => ({ ...e, cd: getCountdown(e) }))
      .filter(e => e.cd && (e.cd.durum === 'gelecek' || e.cd.durum === 'yakin' || e.cd.durum === 'canli'))
      .sort((a, b) => (a.cd.ms || 0) - (b.cd.ms || 0))
      .slice(0, 3);
  }, [takvim]);

  // PDF — sayfayı masaüstü genişliğinde yakala
  const exportPDF = async () => {
    if (!contentRef.current) return;
    setPdfYukleniyor(true);
    try {
      // Dinamik import — jsPDF + html2canvas sadece ihtiyaç anında yüklenir (~400KB)
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      // PDF'den hariç tutulacak elementleri gizle
      const noEx = contentRef.current.querySelectorAll('[data-no-pdf]');
      noEx.forEach(el => el.style.display = 'none');

      // Geçmiş eğitimler açılır menüsünü aç
      const detailsEls = contentRef.current.querySelectorAll('details');
      detailsEls.forEach(el => el.setAttribute('open', ''));

      // Sayfayı masaüstü genişliğine zorla
      const origStyle = contentRef.current.getAttribute('style') || '';
      contentRef.current.style.width = '1200px';
      contentRef.current.style.minWidth = '1200px';

      const canvas = await html2canvas(contentRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#1e1b4b',
        width: 1200, windowWidth: 1200,
      });

      // Her şeyi geri al
      contentRef.current.setAttribute('style', origStyle);
      noEx.forEach(el => el.style.display = '');
      detailsEls.forEach(el => el.removeAttribute('open'));

      const pdf = new jsPDF('portrait','mm','a4');
      const pw=210,ph=297,iw=pw,ih=(canvas.height*pw)/canvas.width;
      let y=0,rem=ih;
      while(rem>0){ if(y>0)pdf.addPage(); const sy=(y/ih)*canvas.height; const sh=Math.min(ph,rem); const sr=(sh/ih)*canvas.height; const sc=document.createElement('canvas'); sc.width=canvas.width;sc.height=sr; sc.getContext('2d').drawImage(canvas,0,sy,canvas.width,sr,0,0,canvas.width,sr); pdf.addImage(sc.toDataURL('image/jpeg',0.92),'JPEG',0,0,iw,sh); y+=ph;rem-=ph; }
      pdf.save('ONE_TEAM_Egitim_Takvimi.pdf');
    } catch(err){alert(t('cal_pdf_error')+err.message);} finally{setPdfYukleniyor(false);}
  };

  if (loading) return <LoadingProgress />;
  // null = bilinmiyor (mobil ağda fetch fail) → takvim gösterilir, false = explicit gizli
  if (takvimYayinlandi === false) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-12 px-4"><div className="container mx-auto max-w-2xl"><div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
      <AlertCircle className="w-20 h-20 text-yellow-500 mx-auto mb-4" /><h2 className="text-3xl font-bold text-gray-800 mb-4">{t('cal_not_published_title')}</h2><p className="text-gray-600 mb-6">{t('cal_not_published_desc')}</p>
      <p className="text-gray-500 text-sm mb-6">Eğer takvim yayında olduğu halde bu uyarıyı görüyorsanız, tarayıcı önbelleğini sıfırlamak için aşağıdaki butona tıklayın.</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={() => { window.location.href = window.location.pathname + '?bust=' + Date.now(); }} className="bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800 transition-colors flex items-center gap-2">
          <Loader2 className="w-4 h-4" /> Sayfayı Yenile
        </button>
        <button onClick={()=>navigate('/')} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">{t('back_home')}</button>
      </div>
    </div></div></div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────────
  const renderEgitimKart = (egitim) => {
    const tarih = parseTarih(egitim.tarih);
    const gunNo = tarih ? tarih.getDate() : '';
    const ayAd = tarih ? tarih.toLocaleDateString(locale, { month: 'short' }) : '';
    const konusmacilar2 = splitEgitmen(egitim.egitmen);
    const katRenk = KATEGORI_RENK[egitim.kategori] || KATEGORI_RENK['Diğer'];
    const online = isOnline(egitim);
    const cdKart = getCountdown(egitim);
    const gecmis = cdKart?.durum === 'gecmis';
    const egitimAdi = tDynamic(egitim.egitim);
    const kategoriAdi = tDynamic(egitim.kategori);
    const hatirlatmaCount = hatirlatmaSayilari?.[egitim.id] || 0;
    const yurtdisi = getYurtdisi(egitim);

    if (gorunum === 'kompakt') {
      return (
        <tr key={egitim.id} id={`egitim-${egitim.id}`} className={`hover:bg-purple-50 transition-colors ${gecmis ? 'past-event' : 'hover-lift'}`}>
          <td className="px-3 py-2 text-sm font-semibold text-gray-700 whitespace-nowrap">{trGun(egitim.gun, t)} {egitim.tarih}</td>
          <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{egitim.saat ? `${egitim.saat}${egitim.bitisSaati?`–${egitim.bitisSaati}`:''}` : '—'}</td>
          <td className="px-3 py-2 text-sm font-bold text-gray-800">{egitimAdi}</td>
          <td className="px-3 py-2 text-sm text-gray-600">{egitim.egitmen||'—'}</td>
          <td className="px-3 py-2">{egitim.kategori?<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${katRenk.bg} ${katRenk.text} ${katRenk.border}`}><span className={`w-1.5 h-1.5 rounded-full ${katRenk.dot}`} />{kategoriAdi}</span>:'—'}</td>
          <td className="px-3 py-2 flex items-center gap-1.5"><CountdownBadge egitim={egitim} /><EventActions egitim={egitim} compact /></td>
        </tr>
      );
    }

    if (gorunum === 'kart') {
      return (
        <div key={egitim.id} id={`egitim-${egitim.id}`} className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col ${gecmis ? 'past-event' : 'hover-lift'} ${yurtdisi ? 'ring-2 ring-amber-400/40' : ''}`}>
          {/* Yurtdışı rozeti — z-20 (poster üstünde) */}
          {yurtdisi && (
            <div className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 shadow-lg">
              <span className="text-xs leading-none">{yurtdisi.bayrak}</span>
              <span>{yurtdisi.kisa}</span>
            </div>
          )}
          {/* Kategori accent — üst kenar 3px (poster yoksa görünür) */}
          {egitim.kategori && !egitim.gorselUrl && <div className={`absolute left-0 right-0 top-0 h-1 z-10 ${katRenk.dot}`} aria-hidden="true" />}

          {/* SİNEMA POSTERİ TASARIMI — poster aspect-square + gradient overlay altta */}
          {egitim.gorselUrl ? (
            <button onClick={()=>setPosterModal({url:egitim.gorselUrl,baslik:egitim.egitim})}
              className="relative w-full aspect-square overflow-hidden group bg-gray-100">
              <img src={egitim.gorselUrl} alt={egitim.egitim} loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {/* Üst sağ: countdown overlay */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md ${online?'bg-blue-500/80 text-white':'bg-white/80 text-purple-800'}`}>
                  {online ? '🌐 Online' : '📍 ' + (getSehir(egitim) || 'Yer')}
                </span>
                <CountdownBadge egitim={egitim} />
              </div>
              {/* Alt gradient — başlık okunurluğu için */}
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none" />
              {/* Alt: başlık + tarih overlay */}
              <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                <div className="text-white/80 text-[10px] uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />{egitim.tarih} {trGun(egitim.gun, t).slice(0, 3)}{egitim.saat ? ` • ${egitim.saat}` : ''}
                </div>
                <h3 className="font-extrabold text-white leading-tight text-base line-clamp-2 font-display drop-shadow-md">{egitimAdi}</h3>
              </div>
            </button>
          ) : (
            /* Posteri olmayan kartlar için kompakt üst kısım */
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2 gap-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${online?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{online?t('cal_filter_online'):getSehir(egitim)||t('cal_filter_offline')}</span>
                <CountdownBadge egitim={egitim} />
              </div>
              <h3 className="font-bold text-gray-900 leading-tight text-base">{egitimAdi}</h3>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />{egitim.tarih} {trGun(egitim.gun, t)}{egitim.saat ? ` • ${egitim.saat}` : ''}
              </div>
            </div>
          )}

          {/* Alt kısım: konuşmacılar + butonlar */}
          <div className="p-4 flex-1 flex flex-col gap-3">
            {egitim.kategori && (
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${katRenk.bg} ${katRenk.text} ${katRenk.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${katRenk.dot}`} />{kategoriAdi}
                </span>
              </div>
            )}
            {konusmacilar2.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {konusmacilar2.slice(0, 3).map(ad => <KonusmaciAvatar key={ad} ad={ad} konusmacilar={konusmacilar||[]} onClick={(a,k)=>setKonusmaciModal({ad:a,kayit:k})} size="sm" />)}
                </div>
                <span className="text-xs text-gray-600 line-clamp-1 flex-1">{konusmacilar2.join(', ')}</span>
              </div>
            )}
            {!gecmis && (
              <div className="flex items-center gap-2 mt-auto pt-2">
                <button onClick={()=>setHatirlatmaModal(egitim)}
                  title="Eğitim öncesi 5dk/10dk/4sa/8sa/12sa/24sa email hatırlatması al"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors spring-tap">
                  <Bell className="w-3.5 h-3.5" />{t('cal_remind')}
                  {hatirlatmaCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] bg-white/30">{hatirlatmaCount}</span>}
                </button>
                <EventActions egitim={egitim} />
              </div>
            )}
          </div>
        </div>
      );
    }

    // Liste (default)
    const dateColumnGradient = yurtdisi
      ? `bg-gradient-to-b ${yurtdisi.renk}`
      : online
      ? 'bg-gradient-to-b from-blue-600 to-blue-800'
      : 'bg-gradient-to-b from-purple-700 to-purple-900';
    return (
      <div key={egitim.id} id={`egitim-${egitim.id}`} className={`relative bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${gecmis ? 'past-event' : 'hover-lift'} ${yurtdisi ? 'ring-2 ring-amber-400/40' : ''}`}>
        {/* Yurtdışı rozeti — kartın sağ üst köşesinde */}
        {yurtdisi && (
          <div className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 shadow-lg gold-glow">
            <span className="text-sm leading-none">{yurtdisi.bayrak}</span>
            <span>ULUSLARARASI · {yurtdisi.kisa}</span>
          </div>
        )}
        {/* Kategori accent — üst yatay bar */}
        {egitim.kategori && <div className={`absolute left-0 right-0 top-0 h-1 ${katRenk.dot}`} aria-hidden="true" />}
        <div className="flex items-start gap-3 p-3">
          {/* Date badge — FIXED size, her kartta aynı boyut */}
          <div className={`flex-shrink-0 flex flex-col items-center justify-center px-2 py-3 w-[64px] h-[88px] ${dateColumnGradient} text-white rounded-xl shadow-lg`}>
            <div className="text-xl font-extrabold leading-none font-display">{gunNo}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">{ayAd}</div>
            <div className="text-[9px] opacity-70 mt-1 leading-none">{trGun(egitim.gun, t).slice(0, 3)}</div>
            {yurtdisi ? <span className="text-sm mt-1">{yurtdisi.bayrak}</span> : online && <Wifi className="w-3 h-3 mt-1 opacity-70" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 text-base leading-tight">{egitimAdi}</h3>
                  <CountdownBadge egitim={egitim} />
                  {!gecmis && <button onClick={()=>setHatirlatmaModal(egitim)}
                    title="Eğitim öncesi 5dk/10dk/4sa/8sa/12sa/24sa email hatırlatması al"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"><Bell className="w-3 h-3" />{t('cal_remind')}</button>}
                  {hatirlatmaCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title={`${hatirlatmaCount} kişi hatırlatma kaydetti`}>
                      <UsersIcon className="w-2.5 h-2.5" />{hatirlatmaCount}
                    </span>
                  )}
                  {!gecmis && <EventActions egitim={egitim} />}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-purple-500" />{egitim.saat ? <>{egitim.saat}{egitim.bitisSaati?` – ${egitim.bitisSaati}`:''} {egitim.sure&&<span className="text-gray-400">({egitim.sure})</span>}</> : <span className="text-amber-600 italic">Saat henüz belirlenmedi</span>}</span>
                  {egitim.yer && <span className="flex items-center gap-1">{online?<Wifi className="w-3.5 h-3.5 text-blue-500" />:<MapPin className="w-3.5 h-3.5 text-red-400" />}<span className="truncate max-w-[220px]">{online?'Zoom':egitim.yer}</span></span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {egitim.kategori && <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${katRenk.bg} ${katRenk.text} ${katRenk.border}`}><span className={`w-1.5 h-1.5 rounded-full ${katRenk.dot}`} />{kategoriAdi}</span>}
                  {!online && getSehir(egitim) && getSehir(egitim)!=='Diğer' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><MapPin className="w-3 h-3" />{getSehir(egitim)}</span>}
                </div>
                {konusmacilar2.length>0 && <div className="flex items-center gap-1 mt-2 text-sm text-gray-600"><User className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" /><span className="line-clamp-1 min-w-0">{konusmacilar2.join(', ')}</span></div>}
                {online && !gecmis && (() => { const m=(egitim.yer||'').match(/(\d[\d\s]{6,})/); const id=m?m[1].replace(/\s/g,''):null; return id ? <a href={`https://zoom.us/j/${id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow hover:shadow-md transition-all"><Wifi className="w-3.5 h-3.5" />{t('cal_join_meeting')}</a> : null; })()}
              </div>
              <div className="hidden md:flex items-start gap-1.5 flex-shrink-0 justify-end max-w-[280px]">
                {konusmacilar2.slice(0, 4).map(ad => <KonusmaciAvatar key={ad} ad={ad} konusmacilar={konusmacilar||[]} onClick={(a,k)=>setKonusmaciModal({ad:a,kayit:k})} />)}
                {konusmacilar2.length > 4 && (
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200 text-purple-700 font-bold text-sm">+{konusmacilar2.length - 4}</div>
                    <span className="text-[10px] text-gray-500">daha</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {egitim.gorselUrl && (
            <button onClick={()=>setPosterModal({url:egitim.gorselUrl,baslik:egitim.egitim})} className="hidden sm:flex w-14 flex-shrink-0 border-l border-gray-100 hover:opacity-80 transition cursor-pointer items-center justify-center p-1">
              <img src={egitim.gorselUrl} alt="Afiş" className="w-full rounded shadow-sm object-cover" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Pull-to-refresh göstergesi (mobile) */}
      {pullY > 0 && (
        <div style={{ height: `${pullY}px` }}
          className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-end justify-center pb-2 bg-gradient-to-b from-purple-950 to-purple-900 transition-[height]">
          <RotateCw className={`w-6 h-6 text-amber-300 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? '' : `rotate(${Math.min(pullY * 3, 360)}deg)` }} />
        </div>
      )}
      <div ref={contentRef}>
        {/* Header */}
        <div className="pt-6 pb-2 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-wrap items-center justify-between gap-2" data-no-pdf>
              <button onClick={()=>navigate('/')} className="flex items-center text-white/70 hover:text-white text-sm"><ArrowLeft className="w-4 h-4 mr-1.5" />{t('back')}</button>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <LanguageSwitcher />
                {/* Bu butonlar mobile'da bottom nav ile duplicate — sadece md+ ekranlarda göster */}
                <button onClick={()=>navigate('/konusmacilar')}
                  className="hidden md:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold transition text-xs sm:text-sm spring-tap">
                  <User className="w-4 h-4" />Eğitmenler
                </button>
                <button onClick={()=>navigate('/kayitli-egitimler')}
                  className="hidden md:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold transition text-xs sm:text-sm spring-tap">
                  <Video className="w-4 h-4" />Kayıtlı Eğitimler
                </button>
                <button onClick={exportPDF} disabled={pdfYukleniyor} className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-3 sm:px-5 py-2 rounded-xl font-semibold hover:bg-white/20 transition disabled:opacity-50 text-xs sm:text-sm spring-tap">
                  {pdfYukleniyor?<><Loader2 className="w-4 h-4 animate-spin" />{t('cal_preparing')}</>:<><Download className="w-4 h-4" />{t('cal_download_pdf')}</>}
                </button>
                {/* Üye Girişi — pasif buton, isteyen tıklar */}
                {!isAuthenticated ? (
                  <button onClick={() => setGirisModalAcik(true)}
                    title="Üye girişi yap (email/telefon/Amare ID)"
                    className="flex items-center gap-1.5 bg-amber-400/20 hover:bg-amber-400/40 border border-amber-300/40 text-amber-100 px-3 sm:px-4 py-2 rounded-xl font-semibold transition text-xs sm:text-sm spring-tap">
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Üye Girişi</span>
                    <span className="sm:hidden">Giriş</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => navigate('/profil')}
                      title="Profilim"
                      className="flex items-center gap-1.5 bg-green-400/15 hover:bg-green-400/25 border border-green-300/30 text-green-100 px-3 py-2 rounded-xl text-xs font-semibold transition spring-tap">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="hidden sm:inline">{displayName?.split(' ')[0] || email?.split('@')[0] || 'Üye'}</span>
                      <UserCircle className="w-4 h-4 sm:hidden" />
                    </button>
                    <button onClick={() => signOut(auth)}
                      title="Çıkış yap"
                      className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-xl transition spring-tap">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-3">{t('cal_title')}</h1>
            <p className="text-purple-200 mt-1">{filtrelenmis.length} {t('cal_trainings')}</p>
          </div>
        </div>

        {/* Konuşmacı Şeridi — en çok eğitimi olan ilk, tıkla → konuşmacı modal */}
        <div className="px-4 pt-2">
          <div className="container mx-auto max-w-7xl">
            <StoryStrip takvim={takvim} konusmacilar={konusmacilar||[]} />
          </div>
        </div>

        {/* Bugün özel bölüm — eğer bugün eğitim varsa */}
        {bugunEgitimleri.length > 0 && (
          <div className="px-4 pt-2">
            <div className="container mx-auto max-w-7xl">
              <div className="bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-pink-500/20 border-2 border-amber-400/40 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-amber-400 text-gray-900 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider gold-glow">
                    📍 Bugün
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {bugunCanli > 0 && <span className="bg-red-500 text-white px-2.5 py-1 rounded-full font-bold animate-pulse inline-flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full" />{bugunCanli} CANLI</span>}
                    {bugunGelecek > 0 && <span className="bg-green-500 text-white px-2.5 py-1 rounded-full font-bold">{bugunGelecek} GELECEK</span>}
                    {bugunGecmis > 0 && <span className="bg-white/15 text-white/70 px-2.5 py-1 rounded-full">{bugunGecmis} TAMAMLANDI</span>}
                  </div>
                  <span className="text-purple-200 text-sm ml-auto hidden sm:inline">{bugunEgitimleri.length} toplam eğitim bugün</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Yurtdışı yaklaşan etkinlikler — özel altın bant */}
        {yurtdisiYaklasan.length > 0 && (
          <div className="px-4 pt-2">
            <div className="container mx-auto max-w-7xl">
              <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border-2 border-amber-400/40 rounded-2xl p-4 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider gold-glow">
                    🌍 Uluslararası
                  </span>
                  <span className="text-amber-200 text-sm font-semibold">
                    {yurtdisiYaklasan.length} yurtdışı etkinliği yaklaşıyor
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {yurtdisiYaklasan.slice(0, 8).map(e => (
                    <a key={e.id} href={`/e/${e.id}`}
                      className="flex-shrink-0 w-56 sm:w-64 bg-white/10 hover:bg-white/20 border border-amber-400/30 hover:border-amber-400 rounded-xl p-3 transition-all hover-lift spring-tap">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl leading-none">{e._yd.bayrak}</span>
                        <span className="bg-amber-400 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{e._yd.kisa}</span>
                        <span className="text-amber-200 text-[10px] font-semibold uppercase ml-auto">{e._yd.anahtar}</span>
                      </div>
                      <div className="text-white font-bold text-sm leading-tight line-clamp-2 mb-1">{tDynamic(e.egitim)}</div>
                      <div className="text-purple-200 text-xs">{e.tarih} {trGun(e.gun, t)}{e.saat ? ` • ${e.saat}` : ''}</div>
                      {e.yer && <div className="text-amber-300/70 text-[11px] mt-0.5 line-clamp-1">📍 {e.yer.slice(0, 45)}</div>}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero: En Yakın 3 Eğitim — 1. büyük üstte, 2-3 yan yana altta */}
        {enYakinEgitimler.length > 0 && (
          <div className="px-4 py-4">
            <div className="container mx-auto max-w-7xl space-y-3">
              <HeroBolum egitim={enYakinEgitimler[0]} sira={1} konusmacilar={konusmacilar||[]}
                onKonusmaci={(a,k)=>setKonusmaciModal({ad:a,kayit:k})}
                onPoster={(p)=>setPosterModal(p)} onHatirlatma={(e)=>setHatirlatmaModal(e)} />
              {enYakinEgitimler.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {enYakinEgitimler.slice(1).map((egitim, i) => (
                    <HeroBolum key={egitim.id} egitim={egitim} sira={i + 2} konusmacilar={konusmacilar||[]}
                      onKonusmaci={(a,k)=>setKonusmaciModal({ad:a,kayit:k})}
                      onPoster={(p)=>setPosterModal(p)} onHatirlatma={(e)=>setHatirlatmaModal(e)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Arama + Filtreler + Görünüm — sticky on scroll */}
        <div className="sticky top-0 z-30 bg-gradient-to-b from-purple-900/95 to-purple-900/85 backdrop-blur-md border-b border-white/10 px-4 py-3 shadow-lg" data-no-pdf>
          <div className="container mx-auto max-w-7xl">
            {/* Arama — daha belirgin */}
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
              <input type="text" ref={aramaInputRef} value={arama} onChange={e=>setArama(e.target.value)}
                placeholder={t('cal_search_placeholder')}
                className="w-full bg-white/15 backdrop-blur border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300 rounded-xl pl-12 pr-10 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all" />
              {arama && <button onClick={()=>setArama('')} aria-label="Aramayı temizle" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white spring-tap"><X className="w-4 h-4" /></button>}
            </div>

            {/* Hızlı zaman filtreleri + Bugün + Sıfırla */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <button onClick={scrollToToday} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-400 text-gray-900 hover:bg-amber-300 transition-all shadow">
                <CalendarIcon className="w-3.5 h-3.5" />Bugün
              </button>
              {[{key:'bu-hafta',label:'Bu Hafta'},{key:'gelecek-7',label:'7 Gün'},{key:'gelecek-30',label:'30 Gün'}].map(z=>(
                <button key={z.key} onClick={()=>setZamanFiltre(zamanFiltre===z.key?null:z.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${zamanFiltre===z.key?'bg-white text-purple-800 shadow':'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                  {z.label}
                </button>
              ))}
              {aktifFiltreSayisi > 0 && (
                <button onClick={filtreyiSifirla} className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-400/30 transition-all">
                  <X className="w-3 h-3" />Filtreyi Sıfırla ({aktifFiltreSayisi})
                </button>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Filtre butonları */}
              <div className="flex flex-wrap gap-2">
                {[
                  {key:'tumu',label:t('cal_filter_all')},
                  {key:'online',label:t('cal_filter_online'),icon:<Wifi className="w-3.5 h-3.5" />},
                  {key:'offline',label:t('cal_filter_offline'),icon:<Building2 className="w-3.5 h-3.5" />},
                  {key:'yurtdisi',label:'🌍 Yurt Dışı',special:true},
                ].map(f=>(
                  <button key={f.key} onClick={()=>{setFiltre(f.key);setSehirFiltre(null);}}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap ${filtre===f.key
                      ? (f.special ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 shadow-lg ring-2 ring-amber-300' : 'bg-white text-purple-800 shadow-lg')
                      : (f.special ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-400/30' : 'bg-white/10 text-white/80 hover:bg-white/20')}`}>
                    {f.icon}{f.label}
                  </button>
                ))}
                {filtre==='offline'&&sehirler.length>0&&<>
                  <div className="w-px h-8 bg-white/20 self-center mx-1" />
                  {sehirler.map(s=><button key={s} onClick={()=>setSehirFiltre(sehirFiltre===s?null:s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${sehirFiltre===s?'bg-amber-400 text-gray-900':'bg-white/10 text-white/70 hover:bg-white/20'}`}>{s}</button>)}
                </>}
              </div>

              {/* Görünüm butonları */}
              <div className="flex bg-white/10 rounded-lg p-0.5 gap-0.5">
                {[{key:'liste',icon:<List className="w-4 h-4" />,label:t('cal_view_list')},{key:'kart',icon:<LayoutGrid className="w-4 h-4" />,label:t('cal_view_card')},{key:'kompakt',icon:<Table2 className="w-4 h-4" />,label:t('cal_view_table')}].map(g=>(
                  <button key={g.key} onClick={()=>setGorunum(g.key)} title={g.label} aria-label={g.label} aria-pressed={gorunum===g.key}
                    className={`p-2 rounded-md transition-all spring-tap ${gorunum===g.key?'bg-white text-purple-800 shadow':'text-white/60 hover:text-white'}`}>
                    {g.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Kategori chip'leri */}
            {tumKategoriler.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-purple-300 font-semibold mr-1">Kategori:</span>
                {tumKategoriler.map(kat => {
                  const renk = KATEGORI_RENK[kat] || KATEGORI_RENK['Diğer'];
                  const active = kategoriFiltre === kat;
                  return (
                    <button key={kat} onClick={()=>setKategoriFiltre(active ? null : kat)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all spring-tap ${active ? renk.bg + ' ' + renk.text + ' shadow ring-2 ring-amber-400' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${renk.dot}`} />
                      {tDynamic(kat)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Konuşmacı dropdown */}
            {tumKonusmacilar.length > 0 && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                <UsersIcon className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
                <select value={konusmaciFiltre || ''} onChange={e=>setKonusmaciFiltre(e.target.value || null)}
                  className="bg-white/10 backdrop-blur border border-white/20 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-[280px]">
                  <option value="" className="bg-purple-900">Tüm Eğitmenler ({tumKonusmacilar.length})</option>
                  {tumKonusmacilar.map(k => <option key={k} value={k} className="bg-purple-900">{k}</option>)}
                </select>
                <a href="/api/ical" target="_blank" rel="noopener noreferrer" title="Google Calendar / Apple Calendar / Outlook aboneliği — otomatik senkronize"
                  className="ml-auto inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20 border border-white/20 transition-all">
                  <Rss className="w-3 h-3" />Takvim Aboneliği
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Haftalık Bölümler */}
        <div className="px-4 pb-bottom-nav pt-2">
          <div className="container mx-auto max-w-7xl space-y-8">
            {haftaKeys.length===0 && (
              aktifFiltreSayisi > 0
                ? <EmptySearch onReset={filtreyiSifirla} />
                : <EmptyCompleted />
            )}

            {haftaKeys.map((haftaKey,idx) => {
              const haftaEgitimleri = haftalikTakvim[haftaKey];
              if (!haftaEgitimleri?.length) return null;
              const aralik = haftaAralik(haftaEgitimleri);
              const gelecekler = haftaEgitimleri.filter(e => getCountdown(e)?.durum !== 'gecmis');
              const gecmisler = haftaEgitimleri.filter(e => getCountdown(e)?.durum === 'gecmis');

              const renderGrup = (egitimler) => {
                if (gorunum === 'kompakt') return (
                  <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-purple-50 border-b border-purple-200">
                        {[t('th_date'),t('th_time'),t('th_training'),t('th_speaker'),t('th_category'),t('th_status')].map(h=><th key={h} className="px-3 py-2 text-xs font-bold text-purple-700 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">{egitimler.map(renderEgitimKart)}</tbody>
                    </table>
                  </div>
                );
                if (gorunum === 'kart') return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{egitimler.map(renderEgitimKart)}</div>;
                return <div className="space-y-3">{egitimler.map(renderEgitimKart)}</div>;
              };

              return (
                <div key={haftaKey} className="relative">
                  {/* Timeline çubuğu — sol kenar mor → altın */}
                  <div className="absolute left-0 top-12 bottom-4 w-1 rounded-full bg-gradient-to-b from-amber-400/40 via-purple-400/30 to-transparent hidden lg:block" />

                  <div className="flex items-center gap-3 mb-4 lg:pl-6">
                    <div className="bg-white text-purple-800 rounded-xl px-4 py-2 font-extrabold text-lg shadow gold-glow font-display">{t('cal_week')} {idx+1}</div>
                    <div className="text-amber-200 text-sm font-medium">{aralik}</div>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/20 via-amber-400/30 to-transparent" />
                    <div className="text-purple-300 text-sm">{haftaEgitimleri.length} {t('cal_trainings')}</div>
                  </div>

                  {/* Geçmiş eğitimler — açılır kapanır, üstte */}
                  {gecmisler.length > 0 && (
                    <details className="mb-4 group">
                      <summary className="cursor-pointer select-none flex items-center gap-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-3 hover:bg-white/15 transition-all">
                        <svg className="w-5 h-5 text-purple-300 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        <span className="text-sm font-bold text-white">{t('cal_past')}</span>
                        <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{gecmisler.length}</span>
                        <span className="text-xs text-purple-300 ml-auto">{t('cal_past_show')}</span>
                      </summary>
                      <div className="mt-3">
                        {renderGrup(gecmisler)}
                      </div>
                    </details>
                  )}

                  {/* Gelecek eğitimler — normal göster */}
                  {gelecekler.length > 0 && renderGrup(gelecekler)}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 py-6 text-center text-white/40 text-sm">{t('copyright')}</div>
      </div>

      {konusmaciModal && <KonusmaciFullModal ad={konusmaciModal.ad} kayit={konusmaciModal.kayit} takvim={takvim} onClose={()=>setKonusmaciModal(null)} />}
      {posterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={()=>setPosterModal(null)}>
          <div className="relative max-w-lg w-full animate-scaleIn" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setPosterModal(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
            <img src={posterModal.url} alt={posterModal.baslik} className="w-full rounded-xl shadow-2xl" />
            <div className="mt-3 flex justify-center">
              <a href={posterModal.url} download={`${(posterModal.baslik||'poster').replace(/[^a-z0-9]/gi,'_')}.png`} className="flex items-center gap-2 bg-white text-purple-800 px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-50 transition shadow"><Download className="w-4 h-4" />{t('cal_download_poster')}</a>
            </div>
          </div>
        </div>
      )}
      {hatirlatmaModal && <HatirlatmaKayitModal egitim={hatirlatmaModal} onClose={()=>setHatirlatmaModal(null)} />}

      <KeyboardShortcutsHelp acik={yardimAcik} onClose={() => setYardimAcik(false)} />
      <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />

      {/* Floating Scroll-to-Top FAB */}
      {showScrollTop && (
        <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-gray-900 shadow-2xl flex items-center justify-center transition-all hover:scale-110 spring-tap"
          title="Yukarı çık" aria-label="Sayfanın başına dön" data-no-pdf>
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default TakvimView;
