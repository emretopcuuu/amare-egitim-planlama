import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, makeSafeId } from '../context/DataContext';
import { ArrowLeft, Download, Clock, AlertCircle, Loader2, MapPin, Tag, User, Wifi, Building2, X, Mail, Search, List, LayoutGrid, Table2, Timer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const KATEGORI_RENK = {
  'Liderlik': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Satış': { bg: 'bg-green-100', text: 'text-green-700' },
  'Motivasyon': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Sağlık': { bg: 'bg-red-100', text: 'text-red-700' },
  'Finansal Özgürlük': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Kişisel Gelişim': { bg: 'bg-violet-100', text: 'text-violet-700' },
  'Vizyon Günü': { bg: 'bg-pink-100', text: 'text-pink-700' },
  'Panel': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  'Diğer': { bg: 'bg-gray-100', text: 'text-gray-600' },
};
const SEHIRLER = ['İstanbul','Ankara','İzmir','Bursa','Kayseri','Antalya','Konya','Nevşehir','Eskişehir','Trabzon','Adana','Mersin','Gaziantep','Diyarbakır','Samsun','Denizli','Muğla','Çorlu'];
const parseTarih = (t) => { if (!t) return null; const [d,m,y] = t.split('.').map(Number); return new Date(y,m-1,d); };
const splitEgitmen = (e) => { if (!e) return []; return e.split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/).map(n=>n.trim()).filter(n=>n.length>1); };
const isOnline = (e) => e.sehir === 'Online' || (e.yer||'').toLocaleUpperCase('tr-TR').includes('ZOOM');
const getSehir = (e) => { if (e.sehir && e.sehir !== 'Online') return e.sehir; if (isOnline(e)) return null; const yer=e.yer||''; const u=yer.toLocaleUpperCase('tr-TR'); for (const s of SEHIRLER) { if (u.includes(s.toLocaleUpperCase('tr-TR'))) return s; } return 'Diğer'; };

// ── Countdown hesapla ────────────────────────────────────────────────────────
const getCountdown = (egitim) => {
  const d = parseTarih(egitim.tarih);
  if (!d) return null;
  const [saat = 0, dk = 0] = (egitim.saat || '0:0').split(':').map(Number);
  const [bSaat = 0, bDk = 0] = (egitim.bitisSaati || '').split(':').map(Number);
  const baslangic = new Date(d); baslangic.setHours(saat, dk, 0, 0);
  const bitis = egitim.bitisSaati ? new Date(d) : new Date(baslangic.getTime() + 60*60000);
  if (egitim.bitisSaati) bitis.setHours(bSaat, bDk, 0, 0);
  const simdi = new Date();
  if (simdi >= baslangic && simdi <= bitis) return { durum: 'canli', text: 'Şu an canlı', ms: 0 };
  if (simdi > bitis) return { durum: 'gecmis', text: 'Tamamlandı', ms: -1 };
  const fark = baslangic - simdi;
  const gun = Math.floor(fark / 86400000);
  const sa = Math.floor((fark % 86400000) / 3600000);
  const dakika = Math.floor((fark % 3600000) / 60000);
  if (gun > 0) return { durum: 'gelecek', text: `${gun} gün ${sa} saat`, ms: fark };
  if (sa > 0) return { durum: 'gelecek', text: `${sa} saat ${dakika} dk`, ms: fark };
  return { durum: 'yakin', text: `${dakika} dakika sonra`, ms: fark };
};

// ── Konuşmacı Avatar ─────────────────────────────────────────────────────────
const KonusmaciAvatar = ({ ad, konusmacilar, onClick, size = 'md' }) => {
  const safeId = makeSafeId(ad);
  const k = konusmacilar.find(k => k.id === safeId);
  const foto = k?.fotoURL;
  const sz = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  return (
    <button onClick={() => onClick?.(ad, k)} className="flex flex-col items-center gap-1 flex-shrink-0 group cursor-pointer">
      {foto ? (
        <img src={foto} alt={k?.ad||ad} className={`${sz} rounded-full object-cover object-top border-2 border-purple-200 shadow-sm group-hover:scale-110 group-hover:ring-4 group-hover:ring-purple-300 transition-all duration-200`} />
      ) : (
        <div className={`${sz} rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200 group-hover:scale-110 transition-all duration-200`}>
          <User className="w-1/2 h-1/2 text-purple-400" />
        </div>
      )}
      {size !== 'sm' && <span className="text-[10px] text-gray-600 text-center leading-tight max-w-[80px]">{k?.ad||ad}</span>}
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
  const [cd, setCd] = useState(() => getCountdown(egitim));
  useEffect(() => { const t = setInterval(() => setCd(getCountdown(egitim)), 60000); return () => clearInterval(t); }, [egitim]);
  if (!cd) return null;
  if (cd.durum === 'canli') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white animate-pulse"><span className="w-1.5 h-1.5 bg-white rounded-full" />Canlı</span>;
  if (cd.durum === 'gecmis') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">Tamamlandı</span>;
  if (cd.durum === 'yakin') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white"><Timer className="w-3 h-3" />{cd.text}</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"><Timer className="w-3 h-3" />{cd.text}</span>;
};

// ── Hero: Bir Sonraki Eğitim ─────────────────────────────────────────────────
const HeroBolum = ({ egitim, konusmacilar, onKonusmaci, onPoster, sira = 1 }) => {
  const [cd, setCd] = useState(() => getCountdown(egitim));
  useEffect(() => { const t = setInterval(() => setCd(getCountdown(egitim)), 1000); return () => clearInterval(t); }, [egitim]);
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
  const labels = ['Sıradaki Eğitim', '2. Sıradaki Eğitim', '3. Sıradaki Eğitim'];
  const isFirst = sira === 1;
  const titleSize = isFirst ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl';
  const padding = isFirst ? 'p-6 md:p-8' : 'p-5 md:p-6';
  const posterSize = isFirst ? 'w-48 md:w-60' : 'w-40 md:w-48';
  const avatarSize = 'lg';
  const countdownSize = isFirst ? 'text-2xl min-w-[52px] px-3 py-2' : 'text-lg min-w-[42px] px-2.5 py-1.5';

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradients[sira-1]||gradients[0]} ${padding} shadow-2xl border border-white/10`}>
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full" />

      <div className="relative flex flex-col md:flex-row gap-5 items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`${isFirst?'text-xs':'text-[10px]'} font-bold uppercase tracking-wider text-purple-300`}>{labels[sira-1]}</span>
            {cd?.durum === 'canli' && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white animate-pulse">CANLI</span>}
          </div>
          <h2 className={`${titleSize} font-extrabold text-white leading-tight`}>{egitim.egitim}</h2>
          <div className={`flex flex-wrap items-center gap-3 mt-2 ${isFirst?'text-sm':'text-xs'} text-purple-200`}>
            <span className="flex items-center gap-1"><Clock className={`${isFirst?'w-4 h-4':'w-3.5 h-3.5'}`} />{tarih?.toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'})} • {egitim.saat}{egitim.bitisSaati?`–${egitim.bitisSaati}`:''}</span>
            <span className="flex items-center gap-1">{online?<Wifi className="w-3.5 h-3.5" />:<MapPin className="w-3.5 h-3.5" />}{online?'Zoom':egitim.yer}</span>
          </div>

          {cd?.durum !== 'gecmis' && cd?.durum !== 'canli' && (
            <div className={`flex ${isFirst?'gap-3':'gap-2'} mt-3`}>
              {[{v:gun,l:'Gün'},{v:saat,l:'Saat'},{v:dakika,l:'Dk'},{v:saniye,l:'Sn'}].map(({v,l})=>(
                <div key={l} className={`bg-white/10 backdrop-blur rounded-xl ${countdownSize} text-center`}>
                  <div className={`font-extrabold text-white tabular-nums`}>{String(v).padStart(2,'0')}</div>
                  <div className="text-[9px] text-purple-300 uppercase tracking-wider">{l}</div>
                </div>
              ))}
            </div>
          )}

          <div className={`flex items-center ${isFirst?'gap-3':'gap-2'} mt-3`}>
            {konusmacilar2.map(ad => <KonusmaciAvatar key={ad} ad={ad} konusmacilar={konusmacilar||[]} onClick={onKonusmaci} size={avatarSize} />)}
          </div>
        </div>

        {egitim.gorselUrl && (
          <button onClick={()=>onPoster?.({url:egitim.gorselUrl,baslik:egitim.egitim})} className="flex-shrink-0 hover:scale-105 transition-transform">
            <img src={egitim.gorselUrl} alt="Poster" className={`${posterSize} rounded-xl shadow-2xl border-2 border-white/20`} />
          </button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANA BİLEŞEN
// ═══════════════════════════════════════════════════════════════════════════════
const TakvimView = () => {
  const navigate = useNavigate();
  const { takvim, takvimYayinlandi, loading, konusmacilar } = useData();
  const contentRef = useRef(null);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [filtre, setFiltre] = useState('tumu');
  const [sehirFiltre, setSehirFiltre] = useState(null);
  const [arama, setArama] = useState('');
  const [gorunum, setGorunum] = useState('liste'); // liste | kart | kompakt
  const [konusmaciModal, setKonusmaciModal] = useState(null);
  const [posterModal, setPosterModal] = useState(null);

  const getHaftaKey = (tarihStr) => { const d=parseTarih(tarihStr); if(!d) return null; const p=new Date(d); const g=d.getDay(); p.setDate(d.getDate()+(g===0?-6:1-g)); return p.toISOString().split('T')[0]; };

  // Filtrelenmiş + aranan eğitimler
  const filtrelenmis = useMemo(() => takvim.filter(e => {
    if (filtre === 'online' && !isOnline(e)) return false;
    if (filtre === 'offline') { if (isOnline(e)) return false; if (sehirFiltre && getSehir(e) !== sehirFiltre) return false; }
    if (arama.trim()) {
      const q = arama.toLocaleUpperCase('tr-TR');
      const fields = [e.egitim, e.egitmen, e.yer, e.kategori, e.tarih, e.gun].map(f=>(f||'').toLocaleUpperCase('tr-TR'));
      if (!fields.some(f => f.includes(q))) return false;
    }
    return true;
  }), [takvim, filtre, sehirFiltre, arama]);

  const sehirler = [...new Set(takvim.filter(e=>!isOnline(e)).map(e=>getSehir(e)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr-TR'));

  // Haftalık grupla
  const { haftalikTakvim, haftaKeys } = useMemo(() => {
    const ht = {};
    filtrelenmis.forEach(e => { const k=getHaftaKey(e.tarih); if(!k) return; if(!ht[k]) ht[k]=[]; ht[k].push(e); });
    const keys = Object.keys(ht).sort();
    keys.forEach(k => ht[k].sort((a,b) => { const ta=parseTarih(a.tarih),tb=parseTarih(b.tarih); if(ta&&tb&&ta.getTime()!==tb.getTime()) return ta-tb; return (a.saat||'').localeCompare(b.saat||''); }));
    return { haftalikTakvim: ht, haftaKeys: keys };
  }, [filtrelenmis]);

  const haftaAralik = (egitimler) => { const t=egitimler.map(e=>parseTarih(e.tarih)).filter(Boolean).sort((a,b)=>a-b); if(!t.length)return''; const f=d=>d.toLocaleDateString('tr-TR',{day:'numeric',month:'long'}); return t.length===1?f(t[0]):`${f(t[0])} – ${f(t[t.length-1])}`; };

  // En yakın 3 gelecek eğitim (hero için)
  const enYakinEgitimler = useMemo(() => {
    return takvim
      .map(e => ({ ...e, cd: getCountdown(e) }))
      .filter(e => e.cd && (e.cd.durum === 'gelecek' || e.cd.durum === 'yakin' || e.cd.durum === 'canli'))
      .sort((a, b) => (a.cd.ms || 0) - (b.cd.ms || 0))
      .slice(0, 3);
  }, [takvim]);

  // PDF
  const exportPDF = async () => {
    if (!contentRef.current) return;
    setPdfYukleniyor(true);
    try {
      const noEx = contentRef.current.querySelectorAll('[data-no-pdf]');
      noEx.forEach(el => el.style.display = 'none');
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#1e1b4b' });
      noEx.forEach(el => el.style.display = '');
      const pdf = new jsPDF('portrait','mm','a4');
      const pw=210,ph=297,iw=pw,ih=(canvas.height*pw)/canvas.width;
      let y=0,rem=ih;
      while(rem>0){ if(y>0)pdf.addPage(); const sy=(y/ih)*canvas.height; const sh=Math.min(ph,rem); const sr=(sh/ih)*canvas.height; const sc=document.createElement('canvas'); sc.width=canvas.width;sc.height=sr; sc.getContext('2d').drawImage(canvas,0,sy,canvas.width,sr,0,0,canvas.width,sr); pdf.addImage(sc.toDataURL('image/jpeg',0.92),'JPEG',0,0,iw,sh); y+=ph;rem-=ph; }
      pdf.save('ONE_TEAM_Egitim_Takvimi.pdf');
    } catch(err){alert('PDF oluşturulamadı: '+err.message);} finally{setPdfYukleniyor(false);}
  };

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center"><Loader2 className="w-10 h-10 text-white animate-spin" /></div>;
  if (!takvimYayinlandi) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-12 px-4"><div className="container mx-auto max-w-2xl"><div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
      <AlertCircle className="w-20 h-20 text-yellow-500 mx-auto mb-4" /><h2 className="text-3xl font-bold text-gray-800 mb-4">Takvim Henüz Yayınlanmadı</h2><p className="text-gray-600 mb-6">Eğitim takvimi hazır olduğunda burada görüntülenecektir.</p>
      <button onClick={()=>navigate('/')} className="bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800 transition-colors">Ana Sayfaya Dön</button>
    </div></div></div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────────
  const renderEgitimKart = (egitim) => {
    const tarih = parseTarih(egitim.tarih);
    const gunNo = tarih ? tarih.getDate() : '';
    const ayAd = tarih ? tarih.toLocaleDateString('tr-TR', { month: 'short' }) : '';
    const konusmacilar2 = splitEgitmen(egitim.egitmen);
    const katRenk = KATEGORI_RENK[egitim.kategori] || KATEGORI_RENK['Diğer'];
    const online = isOnline(egitim);

    if (gorunum === 'kompakt') {
      return (
        <tr key={egitim.id} className="hover:bg-purple-50 transition-colors">
          <td className="px-3 py-2 text-sm font-semibold text-gray-700 whitespace-nowrap">{egitim.gun} {egitim.tarih}</td>
          <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{egitim.saat}{egitim.bitisSaati?`–${egitim.bitisSaati}`:''}</td>
          <td className="px-3 py-2 text-sm font-bold text-gray-800">{egitim.egitim}</td>
          <td className="px-3 py-2 text-sm text-gray-600">{egitim.egitmen||'—'}</td>
          <td className="px-3 py-2">{egitim.kategori?<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${katRenk.bg} ${katRenk.text}`}>{egitim.kategori}</span>:'—'}</td>
          <td className="px-3 py-2"><CountdownBadge egitim={egitim} /></td>
        </tr>
      );
    }

    if (gorunum === 'kart') {
      return (
        <div key={egitim.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col">
          {egitim.gorselUrl && (
            <button onClick={()=>setPosterModal({url:egitim.gorselUrl,baslik:egitim.egitim})} className="w-full h-40 overflow-hidden">
              <img src={egitim.gorselUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
            </button>
          )}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${online?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{online?'Online':getSehir(egitim)||'Yüz Yüze'}</span>
              <CountdownBadge egitim={egitim} />
            </div>
            <h3 className="font-bold text-gray-900 leading-tight mb-2">{egitim.egitim}</h3>
            <div className="text-sm text-gray-500 space-y-1">
              <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-purple-500" />{egitim.tarih} {egitim.gun} • {egitim.saat}</div>
              {egitim.kategori && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${katRenk.bg} ${katRenk.text}`}><Tag className="w-3 h-3" />{egitim.kategori}</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
              {konusmacilar2.map(ad => <KonusmaciAvatar key={ad} ad={ad} konusmacilar={konusmacilar||[]} onClick={(a,k)=>setKonusmaciModal({ad:a,kayit:k})} size="sm" />)}
              {konusmacilar2.length > 0 && <span className="text-xs text-gray-500 ml-1">{konusmacilar2.join(', ')}</span>}
            </div>
          </div>
        </div>
      );
    }

    // Liste (default)
    return (
      <div key={egitim.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className="flex">
          <div className={`flex flex-col items-center justify-center px-4 py-4 min-w-[72px] ${online?'bg-gradient-to-b from-blue-600 to-blue-800':'bg-gradient-to-b from-purple-700 to-purple-900'} text-white`}>
            <div className="text-2xl font-extrabold leading-none">{gunNo}</div>
            <div className="text-[11px] uppercase tracking-wider opacity-80 mt-0.5">{ayAd}</div>
            <div className="text-[10px] opacity-60 mt-1">{egitim.gun}</div>
            {online && <Wifi className="w-3.5 h-3.5 mt-1.5 opacity-70" />}
          </div>
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 text-base leading-tight">{egitim.egitim}</h3>
                  <CountdownBadge egitim={egitim} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-purple-500" />{egitim.saat}{egitim.bitisSaati?` – ${egitim.bitisSaati}`:''} {egitim.sure&&<span className="text-gray-400">({egitim.sure})</span>}</span>
                  {egitim.yer && <span className="flex items-center gap-1">{online?<Wifi className="w-3.5 h-3.5 text-blue-500" />:<MapPin className="w-3.5 h-3.5 text-red-400" />}<span className="truncate max-w-[220px]">{online?'Zoom':egitim.yer}</span></span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {egitim.kategori && <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${katRenk.bg} ${katRenk.text}`}><Tag className="w-3 h-3" />{egitim.kategori}</span>}
                  {!online && getSehir(egitim) && getSehir(egitim)!=='Diğer' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><MapPin className="w-3 h-3" />{getSehir(egitim)}</span>}
                </div>
                {konusmacilar2.length>0 && <div className="flex items-center gap-1 mt-2 text-sm text-gray-600"><User className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" /><span>{konusmacilar2.join(', ')}</span></div>}
              </div>
              <div className="flex items-start gap-1.5 flex-shrink-0 flex-wrap justify-end">
                {konusmacilar2.map(ad => <KonusmaciAvatar key={ad} ad={ad} konusmacilar={konusmacilar||[]} onClick={(a,k)=>setKonusmaciModal({ad:a,kayit:k})} />)}
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div ref={contentRef}>
        {/* Header */}
        <div className="pt-6 pb-2 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between" data-no-pdf>
              <button onClick={()=>navigate('/')} className="flex items-center text-white/70 hover:text-white text-sm"><ArrowLeft className="w-4 h-4 mr-1.5" />Ana Sayfa</button>
              <button onClick={exportPDF} disabled={pdfYukleniyor} className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-5 py-2 rounded-xl font-semibold hover:bg-white/20 transition disabled:opacity-50 text-sm">
                {pdfYukleniyor?<><Loader2 className="w-4 h-4 animate-spin" />Hazırlanıyor...</>:<><Download className="w-4 h-4" />PDF İndir</>}
              </button>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-3">Eğitim Takvimi</h1>
            <p className="text-purple-200 mt-1">{filtrelenmis.length} eğitim</p>
          </div>
        </div>

        {/* Hero: En Yakın 3 Eğitim — alt alta, kademeli */}
        {enYakinEgitimler.length > 0 && (
          <div className="px-4 py-4">
            <div className="container mx-auto max-w-6xl space-y-3">
              {enYakinEgitimler.map((egitim, i) => (
                <HeroBolum key={egitim.id} egitim={egitim} sira={i + 1} konusmacilar={konusmacilar||[]}
                  onKonusmaci={(a,k)=>setKonusmaciModal({ad:a,kayit:k})}
                  onPoster={(p)=>setPosterModal(p)} />
              ))}
            </div>
          </div>
        )}

        {/* Arama + Filtreler + Görünüm */}
        <div className="px-4 py-3" data-no-pdf>
          <div className="container mx-auto max-w-6xl">
            {/* Arama */}
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
              <input type="text" value={arama} onChange={e=>setArama(e.target.value)}
                placeholder="Eğitim, konuşmacı, şehir, kategori ara..."
                className="w-full bg-white/10 backdrop-blur border border-white/20 text-white placeholder-purple-300 rounded-xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              {arama && <button onClick={()=>setArama('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white"><X className="w-4 h-4" /></button>}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Filtre butonları */}
              <div className="flex flex-wrap gap-2">
                {[{key:'tumu',label:'Tümü'},{key:'online',label:'Online',icon:<Wifi className="w-3.5 h-3.5" />},{key:'offline',label:'Yüz Yüze',icon:<Building2 className="w-3.5 h-3.5" />}].map(f=>(
                  <button key={f.key} onClick={()=>{setFiltre(f.key);setSehirFiltre(null);}}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${filtre===f.key?'bg-white text-purple-800 shadow-lg':'bg-white/10 text-white/80 hover:bg-white/20'}`}>
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
                {[{key:'liste',icon:<List className="w-4 h-4" />,label:'Liste'},{key:'kart',icon:<LayoutGrid className="w-4 h-4" />,label:'Kart'},{key:'kompakt',icon:<Table2 className="w-4 h-4" />,label:'Tablo'}].map(g=>(
                  <button key={g.key} onClick={()=>setGorunum(g.key)} title={g.label}
                    className={`p-2 rounded-md transition-all ${gorunum===g.key?'bg-white text-purple-800 shadow':'text-white/60 hover:text-white'}`}>
                    {g.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Haftalık Bölümler */}
        <div className="px-4 pb-12 pt-2">
          <div className="container mx-auto max-w-6xl space-y-8">
            {haftaKeys.length===0 && <div className="text-center py-16 text-white/50"><p className="text-lg">Eğitim bulunamadı.</p></div>}

            {haftaKeys.map((haftaKey,idx) => {
              const haftaEgitimleri = haftalikTakvim[haftaKey];
              if (!haftaEgitimleri?.length) return null;
              const aralik = haftaAralik(haftaEgitimleri);

              return (
                <div key={haftaKey}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white text-purple-800 rounded-xl px-4 py-2 font-extrabold text-lg shadow">Hafta {idx+1}</div>
                    <div className="text-purple-200 text-sm font-medium">{aralik}</div>
                    <div className="flex-1 h-px bg-white/20" />
                    <div className="text-purple-300 text-sm">{haftaEgitimleri.length} eğitim</div>
                  </div>

                  {gorunum === 'kompakt' ? (
                    <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="bg-purple-50 border-b border-purple-200">
                          {['Tarih','Saat','Eğitim','Konuşmacı','Kategori','Durum'].map(h=><th key={h} className="px-3 py-2 text-xs font-bold text-purple-700 uppercase">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">{haftaEgitimleri.map(renderEgitimKart)}</tbody>
                      </table>
                    </div>
                  ) : gorunum === 'kart' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{haftaEgitimleri.map(renderEgitimKart)}</div>
                  ) : (
                    <div className="space-y-3">{haftaEgitimleri.map(renderEgitimKart)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 py-6 text-center text-white/40 text-sm">© 2026 Powered by OneTeam</div>
      </div>

      {konusmaciModal && <KonusmaciModal ad={konusmaciModal.ad} kayit={konusmaciModal.kayit} onClose={()=>setKonusmaciModal(null)} />}
      {posterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={()=>setPosterModal(null)}>
          <div className="relative max-w-lg w-full animate-scaleIn" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setPosterModal(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
            <img src={posterModal.url} alt={posterModal.baslik} className="w-full rounded-xl shadow-2xl" />
            <div className="mt-3 flex justify-center">
              <a href={posterModal.url} download={`${(posterModal.baslik||'poster').replace(/[^a-z0-9]/gi,'_')}.png`} className="flex items-center gap-2 bg-white text-purple-800 px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-50 transition shadow"><Download className="w-4 h-4" />Posteri İndir</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakvimView;
