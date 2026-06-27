// Lider/Konuşmacı tam sayfası (/lider/:id) — modal yerine.
// Header + kariyer yolculuğu (kaç ayda hangi kariyer) + gelecek/geçmiş/kayıtlı video/sözler/bio.
// Admin ise kariyer geçmişini sayfadan düzenleyebilir.
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Clock, MapPin, Wifi, ExternalLink, Tag, UserPlus, Play, Video, Star, TrendingUp, Edit3, Download, Share2, Check, ChevronRight, Bell } from 'lucide-react';
import { useData, makeCoreId } from '../context/DataContext';
import { useDocumentTitle } from '../utils/useDocumentTitle';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTakipEgitmenler } from '../utils/takip';
import { db } from '../utils/firebase';
import { collection, query, where, orderBy, limit as fbLimit, getDocs } from 'firebase/firestore';
import { KARIYER_BASAMAKLARI, kariyerSira, kariyerTarih, ayFarki, sureMetni } from '../utils/kariyer';
import KonusmaciTakipModal from '../components/KonusmaciTakipModal';
import VideoOynatModal from '../components/VideoOynatModal';
import UyeGirisModal from '../components/UyeGirisModal';
import EgitmenSozleri from '../components/EgitmenSozleri';
import EgitmenProfilDuzenleyici from '../components/EgitmenProfilDuzenleyici';
import { gorselOlusturBasariKarti } from '../utils/gorselOlusturBasariKarti';

const parseTarih = (t) => {
  if (!t) return null;
  const p = String(t).split('.').map(Number);
  if (p.length !== 3 || p.some(isNaN)) return null;
  const dt = new Date(p[2], p[1] - 1, p[0]);
  return isNaN(dt.getTime()) ? null : dt;
};
const splitEgitmen = (e) => {
  if (!e) return [];
  return e.normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()).filter(n => n.length > 1);
};

export default function LiderProfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, locale, tDynamic, lang } = useTranslation();
  const { takvim, konusmacilar, isAdmin } = useData();
  const { isAuthenticated, email } = useAuth();
  const { toggle: takipToggle, isTakip } = useTakipEgitmenler();

  const [tab, setTab] = useState('kariyer');
  const [takipModal, setTakipModal] = useState(false);
  const [kayitliVideolar, setKayitliVideolar] = useState(null);
  const [kayitliLoading, setKayitliLoading] = useState(false);
  const [oynatilanVideo, setOynatilanVideo] = useState(null);
  const [oynatSeekTo, setOynatSeekTo] = useState(null);
  const [girisModalAcik, setGirisModalAcik] = useState(false);
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [kartUretiliyor, setKartUretiliyor] = useState(false);
  const [kucukBaslik, setKucukBaslik] = useState(false); // UX1 — scroll'da mini başlık

  // Konuşmacı kaydını coreId ile bul
  const kayit = useMemo(() => {
    const liste = konusmacilar || [];
    return liste.find(k => k.id === id)
      || liste.find(k => makeCoreId(k.ad || k.id) === id)
      || null;
  }, [konusmacilar, id]);

  // Veri henüz yükleniyor mu (header skeleton için) — UX10
  const veriYukleniyor = !konusmacilar || konusmacilar.length === 0;

  const ad = kayit?.ad || (id || '').replace(/-/g, ' ').toLocaleUpperCase('tr-TR');
  const coreId = id;
  const favori = coreId ? isTakip(coreId) : false;
  // Lider kendi profilini düzenleyebilir mi? (giriş e-postası kayıttaki email ile aynı) — admin her zaman
  const benimProfilim = !!email && !!kayit?.email && email.toLowerCase() === String(kayit.email).toLowerCase();
  const duzenleyebilir = isAdmin || benimProfilim;

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  // UX1 — scroll dinleyici: 260px geçince mini başlık
  useEffect(() => {
    const onScroll = () => setKucukBaslik(window.scrollY > 260);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // İlgili eğitimler
  const adNorm = (ad || '').normalize('NFC').toLocaleUpperCase('tr-TR').trim();
  const ilgili = useMemo(() => (takvim || [])
    .filter(e => splitEgitmen(e.egitmen).map(a => a.toLocaleUpperCase('tr-TR').trim())
      .some(a => a === adNorm || a.includes(adNorm) || adNorm.includes(a)))
    .map(e => ({ ...e, d: parseTarih(e.tarih) })).filter(e => e.d), [takvim, adNorm]);
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const gelecek = ilgili.filter(e => e.d >= bugun).sort((a, b) => a.d - b.d);
  const gecmis = ilgili.filter(e => e.d < bugun).sort((a, b) => b.d - a.d);

  // Kariyer yolculuğu (kaç ayda hangi kariyer)
  const kariyerGecmis = Array.isArray(kayit?.kariyerGecmis) ? kayit.kariyerGecmis : [];
  const katilim = kariyerTarih(kayit?.katilimTarihi);
  const yolculuk = useMemo(() => {
    const sirali = kariyerGecmis
      .map(k => ({ ...k, dt: kariyerTarih(k.tarih) }))
      .filter(k => k.kariyer && k.dt)
      .sort((a, b) => a.dt - b.dt);
    let onceki = katilim;
    return sirali.map(k => {
      const fark = onceki ? ayFarki(onceki, k.dt) : null;
      onceki = k.dt;
      return { ...k, fark };
    });
  }, [kariyerGecmis, katilim]);
  const guncelKariyer = yolculuk.length ? yolculuk[yolculuk.length - 1].kariyer : (kayit?.unvan || '');
  const toplamAy = katilim ? ayFarki(katilim, new Date()) : null;
  const isiltiSeviye = kariyerSira(guncelKariyer) / Math.max(1, KARIYER_BASAMAKLARI.length - 1);

  // UX2 — Kıyas: tüm liderlerden rütbe-başına ortalama kümülatif ay (katılımdan)
  const benchmark = useMemo(() => {
    const acc = {}; // sira -> [ay]
    const kaynaklar = new Set();
    (konusmacilar || []).forEach(k => {
      const kat = kariyerTarih(k.katilimTarihi);
      if (!kat || !Array.isArray(k.kariyerGecmis)) return;
      let katkili = false;
      k.kariyerGecmis.forEach(g => {
        const dt = kariyerTarih(g.tarih);
        if (!dt) return;
        const m = ayFarki(kat, dt);
        if (m == null || m < 0) return;
        const s = kariyerSira(g.kariyer);
        if (s < 0) return;
        (acc[s] || (acc[s] = [])).push(m);
        katkili = true;
      });
      if (katkili) kaynaklar.add(k.id || k.ad);
    });
    const avg = {};
    Object.entries(acc).forEach(([s, arr]) => {
      if (arr.length >= 3) avg[s] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    });
    return { avg, kaynakSayisi: kaynaklar.size, yeterli: Object.keys(avg).length > 0 };
  }, [konusmacilar]);

  useDocumentTitle(ad, guncelKariyer ? `${guncelKariyer}${toplamAy != null ? ` · Amare'de ${sureMetni(toplamAy)}` : ''}` : undefined);

  // Paylaş (Web Share API → yoksa panoya kopyala)
  const [paylasildi, setPaylasildi] = useState(false);
  const paylas = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const baslik = `${ad}${guncelKariyer ? ' — ' + guncelKariyer : ''}`;
    try {
      if (navigator.share) { await navigator.share({ title: baslik, url }); return; }
      await navigator.clipboard.writeText(url);
      setPaylasildi(true); setTimeout(() => setPaylasildi(false), 1800);
    } catch {}
  };

  // Kayıtlı eğitimler — UX5: artık SAYFA AÇILIŞINDA çekilir (sekme rozeti için), 24s cache
  useEffect(() => {
    if (kayitliVideolar !== null || !coreId) return;
    const cacheKey = `amare_videos_${coreId}_v1`, TTL = 24 * 60 * 60 * 1000;
    try { const c = localStorage.getItem(cacheKey); if (c) { const { ts, data } = JSON.parse(c); if (Date.now() - ts < TTL && Array.isArray(data)) { setKayitliVideolar(data); return; } } } catch {}
    setKayitliLoading(true);
    (async () => {
      try {
        const q = query(collection(db, 'kayitli_egitimler'), where('egitmenler', 'array-contains', coreId), where('kayeneFiltrelendi', '==', false), orderBy('tarih', 'desc'), fbLimit(50));
        const snap = await getDocs(q);
        const videos = snap.docs.map(d => { const { transcript, ...rest } = d.data(); return { id: d.id, ...rest }; });
        setKayitliVideolar(videos);
        try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: videos })); } catch {}
      } catch (e) { console.warn('[kayitli] hata:', e.message); setKayitliVideolar([]); }
      finally { setKayitliLoading(false); }
    })();
  }, [coreId, kayitliVideolar]);

  const handleKayitliOynat = (v) => { if (!isAuthenticated) { setGirisModalAcik(true); return; } setOynatSeekTo(null); setOynatilanVideo(v); };
  const handleSozTikla = (soz) => {
    if (!isAuthenticated) { setGirisModalAcik(true); return; }
    const v = (kayitliVideolar || []).find(x => (x.vimeoId || x.id) === soz.vimeoId) || { id: soz.vimeoId, vimeoId: soz.vimeoId, baslik: soz.baslik, thumbnailUrl: soz.thumbnailUrl };
    setOynatSeekTo(Math.floor(soz.start || 0)); setOynatilanVideo(v);
  };

  const indirBasariKarti = async () => {
    setKartUretiliyor(true);
    try {
      const res = await gorselOlusturBasariKarti({
        ad, fotoURL: kayit?.fotoURL || null, guncelKariyer,
        toplamMetni: toplamAy != null ? sureMetni(toplamAy) : '',
        isilti: isiltiSeviye,
        adimlar: yolculuk.map(k => ({ kariyer: k.kariyer, tarih: k.dt.toLocaleDateString('tr-TR', { month: '2-digit', year: 'numeric' }), sure: katilim ? `${ayFarki(katilim, k.dt) + 1}. ay` : (k.fark != null ? sureMetni(k.fark) : '') })),
      });
      const bin = atob(res.base64); const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: 'image/png' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${(ad || 'lider').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_basari_karti.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { console.warn('[basari-karti] hata:', e.message); }
    finally { setKartUretiliyor(false); }
  };

  const renderEgitim = (egitim) => {
    const isOnline = egitim.sehir === 'Online' || (egitim.yer || '').toLocaleUpperCase('tr-TR').includes('ZOOM');
    return (
      <Link key={egitim.id} to={`/e/${egitim.id}`} className="block bg-white border border-gray-200 hover:border-purple-400 hover:shadow-md rounded-xl p-4 transition-all">
        <div className="flex items-start gap-3">
          <div className={`flex flex-col items-center justify-center px-2 py-2 min-w-[56px] rounded-lg ${isOnline ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
            <div className="text-xl font-extrabold leading-none">{egitim.d.getDate()}</div>
            <div className="text-[10px] uppercase tracking-wider mt-0.5">{egitim.d.toLocaleDateString(locale, { month: 'short' })}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 truncate">{tDynamic(egitim.egitim)}</h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
              {egitim.saat && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{egitim.saat}{egitim.bitisSaati ? `-${egitim.bitisSaati}` : ''}</span>}
              {egitim.yer && <span className="flex items-center gap-1">{isOnline ? <Wifi className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}{isOnline ? 'Zoom' : egitim.yer.slice(0, 30)}</span>}
              {egitim.kategori && <span className="inline-flex items-center gap-1 text-purple-600"><Tag className="w-3 h-3" />{tDynamic(egitim.kategori)}</span>}
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
        </div>
      </Link>
    );
  };

  // UX5 — sekme sayıları + boşları gizle
  const kayitliSayi = kayitliVideolar?.length ?? null;
  const sekmeler = [
    { key: 'kariyer', label: 'Kariyer Yolculuğu', show: yolculuk.length > 0 },
    { key: 'gelecek', label: `Gelecek (${gelecek.length})`, show: gelecek.length > 0 },
    { key: 'gecmis', label: `Geçmiş (${gecmis.length})`, show: gecmis.length > 0 },
    { key: 'kayitli', label: kayitliSayi != null ? `Kayıtlı Eğitimler (${kayitliSayi})` : 'Kayıtlı Eğitimler', show: kayitliSayi == null || kayitliSayi > 0 },
    { key: 'sozler', label: 'İlham Sözleri', show: true },
    { key: 'bio', label: 'Biyografi', show: !!kayit?.biyografi },
  ].filter(x => x.show);
  // varsayılan sekme geçerli mi
  useEffect(() => { if (!sekmeler.some(s => s.key === tab)) setTab(sekmeler[0]?.key || 'sozler'); /* eslint-disable-next-line */ }, [yolculuk.length, gelecek.length, gecmis.length, kayitliSayi, kayit?.biyografi]);

  // UX9 — ziyaretçi için birincil aksiyon: yaklaşan eğitim
  const yaklasanEgitim = gelecek[0] || null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Üst geri bar — UX1: scroll'da mini profil */}
      <div className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-600 hover:text-amare-purple text-sm font-semibold flex-shrink-0"><ArrowLeft className="w-4 h-4" /> Geri</button>
          <div className="flex-1 flex items-center justify-center min-w-0">
            <div className={`flex items-center gap-2 min-w-0 transition-all duration-300 ${kucukBaslik ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
              {kayit?.fotoURL
                ? <img src={kayit.fotoURL} alt="" className="w-7 h-7 rounded-full object-cover border border-amber-300/60" style={{ objectPosition: 'center 25%' }} />
                : <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center"><User className="w-4 h-4 text-purple-500" /></div>}
              <div className="min-w-0 leading-tight text-left">
                <div className="text-sm font-bold text-gray-900 truncate">{ad}</div>
                {guncelKariyer && <div className="text-[10px] text-amber-600 font-semibold truncate -mt-0.5">{guncelKariyer}</div>}
              </div>
            </div>
          </div>
          <Link to="/takvim" className="text-sm text-gray-500 hover:text-amare-purple flex-shrink-0">Takvim</Link>
        </div>
      </div>

      {/* HEADER — rütbeye göre ışıltılı */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-900" />
        {/* ışıltı katmanı (rütbe yükseldikçe daha belirgin) */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 30% 20%, rgba(216,177,90,${0.12 + isiltiSeviye * 0.33}), transparent 60%)` }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 text-white">
          {veriYukleniyor ? (
            /* UX10 — header skeleton */
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 animate-pulse">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white/15" />
              <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                <div className="h-8 bg-white/15 rounded w-2/3 mx-auto sm:mx-0" />
                <div className="h-4 bg-white/10 rounded w-1/3 mx-auto sm:mx-0" />
                <div className="flex gap-2 justify-center sm:justify-start"><div className="h-7 w-24 bg-white/10 rounded-full" /><div className="h-7 w-24 bg-white/10 rounded-full" /></div>
              </div>
            </div>
          ) : (
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="relative">
              {kayit?.fotoURL ? (
                <img src={kayit.fotoURL} alt={ad} className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover border-4 shadow-2xl" style={{ borderColor: `rgba(216,177,90,${0.4 + isiltiSeviye * 0.6})`, objectPosition: 'center 25%' }} />
              ) : (
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white/15 flex items-center justify-center border-4 border-amber-300/40"><User className="w-16 h-16 text-white/70" /></div>
              )}
              {isiltiSeviye > 0.6 && <div className="absolute -inset-1 rounded-full pointer-events-none animate-pulse" style={{ boxShadow: `0 0 ${20 + isiltiSeviye * 40}px rgba(216,177,90,${isiltiSeviye})` }} />}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold gold-text-glow">{ad}</h1>
              {guncelKariyer && <p className="text-amber-300 font-bold text-lg mt-1">{guncelKariyer}</p>}
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-3 text-sm">
                {toplamAy != null && <span className="bg-white/10 px-3 py-1 rounded-full">Amare'de <b>{sureMetni(toplamAy)}</b></span>}
                {gelecek.length > 0 && <span className="bg-white/10 px-3 py-1 rounded-full"><b>{gelecek.length}</b> gelecek</span>}
                {gecmis.length > 0 && <span className="bg-white/10 px-3 py-1 rounded-full"><b>{gecmis.length}</b> geçmiş</span>}
                {/* UX9 — Favori (uygulamada kaydet) */}
                <button onClick={() => coreId && takipToggle(coreId)} title="Uygulamada favorilerine kaydet" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all ${favori ? 'bg-yellow-400 text-gray-900' : 'bg-white/10 hover:bg-white/20 border border-white/20'}`}>
                  <Star className="w-3.5 h-3.5" fill={favori ? 'currentColor' : 'none'} />{favori ? 'Favori' : 'Favoriye ekle'}
                </button>
                {/* UX9 — E-posta ile bildirim */}
                <button onClick={() => setTakipModal(true)} title="Yeni eğitiminde e-posta bildirimi al" className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-gray-900 px-3 py-1 rounded-full font-bold gold-glow"><Bell className="w-3.5 h-3.5" />Yeni eğitimde haber ver</button>
                <button onClick={paylas} className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full font-bold">{paylasildi ? <><Check className="w-3.5 h-3.5" />Kopyalandı</> : <><Share2 className="w-3.5 h-3.5" />Paylaş</>}</button>
                {duzenleyebilir && <button onClick={() => setDuzenleAcik(true)} className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full font-bold"><Edit3 className="w-3.5 h-3.5" />{benimProfilim && !isAdmin ? 'Profilimi düzenle' : 'Profili düzenle'}</button>}
              </div>
              {/* UX9 — yaklaşan eğitim birincil CTA */}
              {yaklasanEgitim && (
                <Link to={`/e/${yaklasanEgitim.id}`} className="mt-3 inline-flex items-center gap-2 bg-white text-purple-800 hover:bg-amber-50 px-4 py-2 rounded-xl font-bold shadow-lg transition-all">
                  <Calendar className="w-4 h-4" />
                  Yaklaşan eğitimi gör · {yaklasanEgitim.d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Admin ipucu — kariyer verisi yoksa */}
      {duzenleyebilir && !veriYukleniyor && yolculuk.length === 0 && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-4">
          <button onClick={() => setDuzenleAcik(true)} className="w-full text-left bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-amber-100 transition">
            <TrendingUp className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1 text-sm text-amber-900"><b>Kariyer yolculuğu boş.</b> "Kariyeri düzenle" ile Amare'ye katılım + basamakları (kariyer + AA.YYYY) gir → ışıltılı başarı grafiği ve PNG kart belirir.</div>
            <Edit3 className="w-4 h-4 text-amber-600 flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Sekmeler */}
      <div className="bg-white border-b border-gray-200 sticky top-[45px] z-20">
        <div className="max-w-4xl mx-auto px-2 sm:px-6 flex overflow-x-auto scrollbar-hide">
          {sekmeler.map(s => (
            <button key={s.key} onClick={() => setTab(s.key)} className={`px-3 sm:px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${tab === s.key ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'kariyer' && (() => {
          const KS = KARIYER_BASAMAKLARI.length;
          const guncelSira = kariyerSira(guncelKariyer);
          const farklar = yolculuk.filter(k => k.fark != null && k.fark > 0).map(k => k.fark);
          const enHizli = farklar.length ? Math.min(...farklar) : null;
          const tarihMap = new Map(yolculuk.map(k => [kariyerSira(k.kariyer), k]));
          const diamondSira = kariyerSira('DIAMOND'); // UX8 — dönüm noktası

          // ulaşılan basamaklar — en üst geldiği kariyer en tepede (ters sıra); ulaşılmayanlar gösterilmez.
          // Tarihsiz ulaşılan basamaklar (Brand Partner/Builder ya da atlanmış Platinum gibi ara basamaklar)
          // alttaki en yakın dolu basamağın ayını/tarihini miras alır → boş kalmasın.
          let firstFilledIdx = -1;
          for (let i = 0; i <= guncelSira; i++) { if (tarihMap.has(i)) { firstFilledIdx = i; break; } }
          const eff = []; const mirasliArr = []; const mirasTipArr = [];
          let altDolu = null;
          for (let i = 0; i <= guncelSira; i++) {
            const own = tarihMap.get(i);
            if (own) { altDolu = own; eff[i] = own; mirasliArr[i] = false; mirasTipArr[i] = null; }
            else { eff[i] = altDolu; mirasliArr[i] = true; mirasTipArr[i] = (firstFilledIdx >= 0 && i < firstFilledIdx) ? 'baslangic' : 'gecis'; }
          }
          const ilkDolu = eff.find(Boolean) || null;
          for (let i = 0; i <= guncelSira; i++) if (!eff[i]) { eff[i] = ilkDolu; mirasliArr[i] = true; mirasTipArr[i] = 'baslangic'; }
          const satirlar = [];
          for (let i = guncelSira; i >= 0; i--) {
            satirlar.push({ idx: i, k: eff[i], mirasli: mirasliArr[i], mirasTip: mirasTipArr[i], yil: eff[i]?.dt ? eff[i].dt.getFullYear() : null });
          }
          // UX8 — yıl ayracı: bir öncekiyle yılı değişen ilk satıra
          satirlar.forEach((r, i) => { const prev = satirlar[i - 1]; r.yilAyraci = r.yil && (!prev || prev.yil !== r.yil); });

          return (
            <div className="space-y-5">
              {/* ÖZET KART */}
              <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br from-purple-700 to-indigo-900">
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 80% 10%, rgba(216,177,90,${0.15 + isiltiSeviye * 0.4}), transparent 55%)` }} />
                <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="col-span-2 sm:col-span-1 text-left">
                    <div className="text-amber-300 text-[11px] uppercase tracking-wider">Güncel kariyer</div>
                    <div className="text-xl font-extrabold gold-text-glow leading-tight">{guncelKariyer || '—'}</div>
                  </div>
                  <div><div className="text-2xl font-extrabold">{toplamAy != null ? sureMetni(toplamAy) : '—'}</div><div className="text-purple-200/70 text-[11px]">Amare'de</div></div>
                  <div><div className="text-2xl font-extrabold">{yolculuk.length}</div><div className="text-purple-200/70 text-[11px]">basamak</div></div>
                  <div><div className="text-2xl font-extrabold text-amber-300">{enHizli != null ? sureMetni(enHizli) : '—'}</div><div className="text-purple-200/70 text-[11px]">en hızlı yükseliş</div></div>
                </div>
              </div>

              {/* Işıltılı başarı kartı PNG indir */}
              <button onClick={indirBasariKarti} disabled={kartUretiliyor}
                className="w-full py-3 rounded-xl font-bold text-gray-900 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-60">
                <Download className="w-5 h-5" />{kartUretiliyor ? 'Hazırlanıyor…' : 'Başarı kartını indir (PNG)'}
              </button>

              {/* MERDİVEN — sadece ulaşılan kariyerler, en üst geldiği kariyer en tepede */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amare Kariyer Yolculuğu <span className="text-gray-400 normal-case font-normal">· katılımından bu yana</span></div>
                {/* UX2 — kıyas dipnotu */}
                {benchmark.yeterli && <div className="text-[11px] text-gray-400 mb-3">Kıyas: {benchmark.kaynakSayisi} liderin verisiyle ortalama süreye göre</div>}
                <div className="relative bg-gradient-to-b from-gray-900 via-purple-950 to-gray-900 rounded-2xl p-4 sm:p-5 overflow-hidden">
                  {/* üst altın hâle */}
                  <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, rgba(216,177,90,${0.08 + isiltiSeviye * 0.25}), transparent 70%)` }} />
                  {/* dikey bağlantı çizgisi */}
                  <div className="absolute left-[31px] sm:left-[43px] top-7 bottom-7 w-0.5 bg-gradient-to-b from-amber-300/70 via-amber-500/40 to-amber-700/10" />
                  <div className="relative space-y-1.5">
                    {satirlar.map(({ idx, k, yil, yilAyraci, mirasli, mirasTip }) => {
                      const suAn = idx === guncelSira;
                      const sv = idx / Math.max(1, KS - 1);
                      const hizli = !mirasli && k?.fark != null && k.fark > 0 && k.fark <= 6;
                      const ayNo = (k?.dt && katilim) ? ayFarki(katilim, k.dt) + 1 : null;       // katılımın kaçıncı ayı (1-tabanlı)
                      const benimAy = ayNo != null ? ayNo - 1 : null;                              // kümülatif (0-tabanlı)
                      const ort = benchmark.avg[idx];                                              // ortalama kümülatif ay
                      const ortFark = (ort != null && benimAy != null) ? ort - benimAy : null;     // + → ortalamadan hızlı
                      const ilkDiamond = idx === diamondSira;                                       // UX8 dönüm noktası
                      return (
                        <React.Fragment key={KARIYER_BASAMAKLARI[idx]}>
                          {/* UX8 — yıl ayracı */}
                          {yilAyraci && (
                            <div className="flex items-center gap-2 pl-1 pt-1.5 pb-0.5">
                              <span className="text-[10px] font-bold text-amber-300/70 bg-amber-400/10 px-2 py-0.5 rounded-full">{yil}</span>
                              <div className="flex-1 h-px bg-white/5" />
                            </div>
                          )}
                          <div className="relative flex items-center gap-2.5 sm:gap-3 rounded-xl px-1.5 sm:px-2 py-2 transition-all" style={suAn ? { background: 'rgba(216,177,90,0.12)', boxShadow: 'inset 0 0 0 1px rgba(216,177,90,0.5)' } : {}}>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-sm z-10" style={{ background: 'linear-gradient(135deg,#b8923f,#d8b15a)', color: '#2a1c06', boxShadow: `0 0 ${6 + sv * 24}px rgba(216,177,90,${0.35 + sv * 0.65})` }}>{idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-white flex items-center gap-x-2 gap-y-0.5 flex-wrap leading-tight text-sm sm:text-base">
                                {KARIYER_BASAMAKLARI[idx]}
                                {sv > 0.7 && <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="currentColor" />}
                                {ilkDiamond && <span className="text-[10px] font-bold bg-cyan-400/20 text-cyan-200 px-1.5 py-0.5 rounded-full">💎 ilk Diamond</span>}
                                {hizli && <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full">⚡ hızlı</span>}
                                {suAn && <span className="text-[10px] font-extrabold text-gray-900 bg-amber-400 px-1.5 py-0.5 rounded-full">ŞU AN</span>}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                                {k && <span className="text-[11px] text-amber-200/60">{k.dt.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</span>}
                                {/* UX2 — kıyas rozeti */}
                                {ortFark != null && Math.abs(ortFark) >= 2 && (
                                  <span className={`text-[10px] font-semibold ${ortFark > 0 ? 'text-emerald-300' : 'text-rose-300/80'}`}>
                                    {ortFark > 0 ? `ort. ${ortFark} ay önde` : `ort. ${-ortFark} ay geride`}
                                  </span>
                                )}
                              </div>
                            </div>
                            {ayNo != null && (
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-bold text-amber-300">{ayNo}. ay</div>
                                {/* UX4 — kümülatif yanında önceki basamaktan delta (miras satırda başlangıç) */}
                                <div className="text-[10px] text-white/40">{mirasli ? (mirasTip === 'baslangic' ? 'başlangıç' : '≈ geçiş') : (k.fark != null ? (k.fark === 0 ? 'aynı ay atladı' : `önceki +${k.fark} ay`) : 'katılımdan')}</div>
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        {tab === 'gelecek' && (gelecek.length ? <div className="space-y-2">{gelecek.map(renderEgitim)}</div> : <div className="text-center py-12 text-gray-400"><Calendar className="w-16 h-16 mx-auto mb-3 opacity-30" /><p>Planlanmış eğitim yok.</p></div>)}
        {tab === 'gecmis' && <div className="space-y-2">{gecmis.map(renderEgitim)}</div>}
        {tab === 'kayitli' && (
          <>
            {kayitliLoading && (
              /* UX10 — kayıtlı iskelet grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-video bg-gray-200" />
                    <div className="p-3 space-y-2"><div className="h-3 bg-gray-200 rounded w-5/6" /><div className="h-2.5 bg-gray-100 rounded w-1/3" /></div>
                  </div>
                ))}
              </div>
            )}
            {!kayitliLoading && kayitliVideolar?.length === 0 && <div className="text-center py-12 text-gray-400"><Video className="w-16 h-16 mx-auto mb-3 opacity-30" /><p>Kayıtlı eğitim yok.</p></div>}
            {!kayitliLoading && kayitliVideolar?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {kayitliVideolar.map(v => (
                  <button key={v.id} onClick={() => handleKayitliOynat(v)} className="bg-white border border-gray-200 hover:border-purple-400 hover:shadow-md rounded-xl overflow-hidden text-left transition-all group">
                    <div className="relative aspect-video bg-gray-100">
                      {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt={v.baslik} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Video className="w-10 h-10 text-gray-300" /></div>}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><Play className="w-6 h-6 text-purple-700 ml-0.5" fill="currentColor" /></div>
                      </div>
                    </div>
                    <div className="p-3"><h4 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{v.baslik}</h4>{v.tarih && <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{v.tarih}</span>}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {tab === 'sozler' && <EgitmenSozleri coreId={coreId} onSozTikla={handleSozTikla} dil={(lang || 'tr').toUpperCase()} />}
        {tab === 'bio' && kayit?.biyografi && (() => {
          // Biyografiyi cümlelere böl → madde madde. "65.000" gibi sayıları bölme (nokta+boşluk+harf/rakam).
          const maddeler = String(kayit.biyografi)
            .split(/(?<=\.)\s+(?=[0-9A-ZÇĞİÖŞÜ])/)
            .map(s => s.trim().replace(/\s+/g, ' '))
            .filter(s => s.length > 1);
          return (
            <ul className="space-y-2.5">
              {maddeler.map((m, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          );
        })()}
      </div>

      {takipModal && <KonusmaciTakipModal konusmaciAd={ad} onClose={() => setTakipModal(false)} />}
      {oynatilanVideo && <VideoOynatModal video={oynatilanVideo} seekTo={oynatSeekTo} tumVideolar={kayitliVideolar || []} onOynat={(v) => { setOynatSeekTo(null); setOynatilanVideo(v); }} onClose={() => { setOynatilanVideo(null); setOynatSeekTo(null); }} />}
      <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />
      {duzenleAcik && <EgitmenProfilDuzenleyici coreId={coreId} onClose={() => setDuzenleAcik(false)} />}
    </div>
  );
}
