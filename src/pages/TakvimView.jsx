import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Download, Clock, AlertCircle, Loader2, MapPin, Tag, User, Wifi, Building2, X, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const KATEGORI_RENK = {
  'Liderlik': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'Satış': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  'Motivasyon': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  'Sağlık': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  'Finansal Özgürlük': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  'Kişisel Gelişim': { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  'Vizyon Günü': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  'Panel': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Diğer': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
};

const SEHIRLER = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Kayseri', 'Antalya', 'Konya', 'Nevşehir', 'Eskişehir', 'Trabzon', 'Adana', 'Mersin', 'Gaziantep', 'Diyarbakır', 'Samsun', 'Denizli', 'Muğla', 'Çorlu'];

const parseTarih = (t) => { if (!t) return null; const [d,m,y] = t.split('.').map(Number); return new Date(y,m-1,d); };
const splitEgitmen = (e) => {
  if (!e) return [];
  return e.split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/).map(n=>n.trim()).filter(n=>n.length>1);
};
const isOnline = (e) => e.sehir === 'Online' || (e.yer||'').toLocaleUpperCase('tr-TR').includes('ZOOM');
const getSehir = (e) => {
  if (e.sehir && e.sehir !== 'Online') return e.sehir;
  if (isOnline(e)) return null;
  const yer = e.yer || '';
  const upper = yer.toLocaleUpperCase('tr-TR');
  for (const s of SEHIRLER) { if (upper.includes(s.toLocaleUpperCase('tr-TR'))) return s; }
  return 'Diğer';
};

// ── Konuşmacı Avatar ─────────────────────────────────────────────────────────
const KonusmaciAvatar = ({ ad, konusmacilar, onClick }) => {
  const safeId = ad.trim().toLocaleUpperCase('tr-TR').replace(/[^A-Z0-9]/g, '_').toLowerCase();
  const k = konusmacilar.find(k => k.id === safeId);
  const foto = k?.fotoURL;
  return (
    <button onClick={() => onClick && onClick(ad, k)} className="flex flex-col items-center gap-1 flex-shrink-0 group cursor-pointer">
      {foto ? (
        <img src={foto} alt={k?.ad || ad}
          className="w-16 h-16 rounded-full object-cover object-top border-2 border-purple-200 shadow-sm group-hover:scale-110 group-hover:ring-4 group-hover:ring-purple-300 transition-all duration-200" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200 group-hover:scale-110 transition-all duration-200">
          <User className="w-7 h-7 text-purple-400" />
        </div>
      )}
      <span className="text-[11px] text-gray-600 text-center leading-tight max-w-[80px]">{k?.ad || ad}</span>
    </button>
  );
};

// ── Konuşmacı Detay Modal ────────────────────────────────────────────────────
const KonusmaciModal = ({ ad, kayit, onClose }) => {
  if (!ad) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        <div className="flex flex-col items-center text-center">
          {kayit?.fotoURL ? (
            <img src={kayit.fotoURL} alt={kayit.ad || ad} className="w-32 h-32 rounded-full object-cover object-top border-4 border-purple-200 shadow-lg mb-4" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-purple-100 flex items-center justify-center border-4 border-purple-200 mb-4">
              <User className="w-16 h-16 text-purple-300" />
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-800">{kayit?.ad || ad}</h3>
          {kayit?.unvan && <p className="text-purple-600 font-medium mt-1">{kayit.unvan}</p>}
          {kayit?.biyografi && <p className="text-gray-500 text-sm mt-3 leading-relaxed">{kayit.biyografi}</p>}
          {kayit?.linkedin && (
            <a href={`mailto:${kayit.linkedin}`} className="flex items-center gap-1.5 text-blue-500 text-sm mt-3 hover:underline">
              <Mail className="w-4 h-4" />{kayit.linkedin}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Ana bileşen ──────────────────────────────────────────────────────────────
const TakvimView = () => {
  const navigate = useNavigate();
  const { takvim, takvimYayinlandi, loading, konusmacilar } = useData();
  const contentRef = useRef(null);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [filtre, setFiltre] = useState('tumu'); // tumu | online | offline
  const [sehirFiltre, setSehirFiltre] = useState(null);
  const [konusmaciModal, setKonusmaciModal] = useState(null); // { ad, kayit }
  const [posterModal, setPosterModal] = useState(null); // { url, baslik }

  // Hafta gruplandırması (Pazartesi-Pazar)
  const getHaftaKey = (tarihStr) => {
    const d = parseTarih(tarihStr);
    if (!d) return null;
    const pzt = new Date(d);
    const gun = d.getDay();
    pzt.setDate(d.getDate() + (gun === 0 ? -6 : 1 - gun));
    return pzt.toISOString().split('T')[0];
  };

  // Filtrelenmiş eğitimler
  const filtrelenmis = takvim.filter(e => {
    if (filtre === 'online') return isOnline(e);
    if (filtre === 'offline') {
      if (isOnline(e)) return false;
      if (sehirFiltre) return getSehir(e) === sehirFiltre;
      return true;
    }
    return true;
  });

  // Şehir listesi (offline eğitimlerden)
  const sehirler = [...new Set(takvim.filter(e => !isOnline(e)).map(e => getSehir(e)).filter(Boolean))].sort((a,b) => a.localeCompare(b,'tr-TR'));

  // Haftalık grupla
  const haftalikTakvim = {};
  filtrelenmis.forEach(e => {
    const key = getHaftaKey(e.tarih);
    if (!key) return;
    if (!haftalikTakvim[key]) haftalikTakvim[key] = [];
    haftalikTakvim[key].push(e);
  });
  const haftaKeys = Object.keys(haftalikTakvim).sort();
  haftaKeys.forEach(key => {
    haftalikTakvim[key].sort((a,b) => {
      const ta = parseTarih(a.tarih), tb = parseTarih(b.tarih);
      if (ta && tb && ta.getTime() !== tb.getTime()) return ta - tb;
      return (a.saat||'').localeCompare(b.saat||'');
    });
  });

  const haftaAralik = (egitimler) => {
    const tarihler = egitimler.map(e => parseTarih(e.tarih)).filter(Boolean).sort((a,b)=>a-b);
    if (!tarihler.length) return '';
    const fmt = d => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    return tarihler.length === 1 ? fmt(tarihler[0]) : `${fmt(tarihler[0])} – ${fmt(tarihler[tarihler.length-1])}`;
  };

  // PDF = sayfanın kendisi
  const exportPDF = async () => {
    if (!contentRef.current) return;
    setPdfYukleniyor(true);
    try {
      // Filtre butonlarını gizle
      const noExport = contentRef.current.querySelectorAll('[data-no-pdf]');
      noExport.forEach(el => el.style.display = 'none');

      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#1e1b4b' });

      noExport.forEach(el => el.style.display = '');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210, pageH = 297;
      const imgW = pageW, imgH = (canvas.height * pageW) / canvas.width;
      let y = 0, remaining = imgH;
      while (remaining > 0) {
        if (y > 0) pdf.addPage();
        const srcY = (y / imgH) * canvas.height;
        const sliceH = Math.min(pageH, remaining);
        const srcH = (sliceH / imgH) * canvas.height;
        const sc = document.createElement('canvas');
        sc.width = canvas.width; sc.height = srcH;
        sc.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        pdf.addImage(sc.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, sliceH);
        y += pageH; remaining -= pageH;
      }
      pdf.save('ONE_TEAM_Egitim_Takvimi.pdf');
    } catch (err) { alert('PDF oluşturulamadı: ' + err.message); }
    finally { setPdfYukleniyor(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-white animate-spin" />
    </div>
  );

  if (!takvimYayinlandi) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <AlertCircle className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Takvim Henüz Yayınlanmadı</h2>
          <p className="text-gray-600 mb-6">Eğitim takvimi hazır olduğunda burada görüntülenecektir.</p>
          <button onClick={() => navigate('/')} className="bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800 transition-colors">Ana Sayfaya Dön</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div ref={contentRef}>
        {/* Header */}
        <div className="pt-8 pb-4 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="flex items-center justify-between" data-no-pdf>
              <button onClick={() => navigate('/')} className="flex items-center text-white/70 hover:text-white text-sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />Ana Sayfa
              </button>
              <button onClick={exportPDF} disabled={pdfYukleniyor}
                className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-5 py-2 rounded-xl font-semibold hover:bg-white/20 transition disabled:opacity-50 text-sm">
                {pdfYukleniyor ? <><Loader2 className="w-4 h-4 animate-spin" />Hazırlanıyor...</> : <><Download className="w-4 h-4" />PDF İndir</>}
              </button>
            </div>
            <div className="mt-4">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white">Eğitim Takvimi</h1>
              <p className="text-purple-200 mt-1">{filtrelenmis.length} eğitim {filtre !== 'tumu' && `(${filtre === 'online' ? 'Online' : sehirFiltre || 'Offline'})`}</p>
            </div>

            {/* Filtre Sekmeleri */}
            <div className="mt-5 flex flex-wrap gap-2" data-no-pdf>
              {[
                { key: 'tumu', label: 'Tümü', icon: null },
                { key: 'online', label: 'Online', icon: <Wifi className="w-3.5 h-3.5" /> },
                { key: 'offline', label: 'Yüz Yüze', icon: <Building2 className="w-3.5 h-3.5" /> },
              ].map(f => (
                <button key={f.key}
                  onClick={() => { setFiltre(f.key); setSehirFiltre(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    filtre === f.key ? 'bg-white text-purple-800 shadow-lg' : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}>
                  {f.icon}{f.label}
                </button>
              ))}

              {/* Şehir alt filtreleri */}
              {filtre === 'offline' && sehirler.length > 0 && (
                <>
                  <div className="w-px h-8 bg-white/20 self-center mx-1" />
                  {sehirler.map(s => (
                    <button key={s}
                      onClick={() => setSehirFiltre(sehirFiltre === s ? null : s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        sehirFiltre === s ? 'bg-amber-400 text-gray-900' : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}>
                      {s}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Haftalık Bölümler */}
        <div className="px-4 pb-12 pt-4">
          <div className="container mx-auto max-w-5xl space-y-8">
            {haftaKeys.length === 0 && (
              <div className="text-center py-16 text-white/50">
                <p className="text-lg">Bu filtreye uygun eğitim bulunamadı.</p>
              </div>
            )}

            {haftaKeys.map((haftaKey, idx) => {
              const haftaEgitimleri = haftalikTakvim[haftaKey];
              if (!haftaEgitimleri?.length) return null;
              const aralik = haftaAralik(haftaEgitimleri);

              return (
                <div key={haftaKey} className="animate-fadeIn">
                  {/* Hafta Başlığı */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white text-purple-800 rounded-xl px-4 py-2 font-extrabold text-lg shadow">
                      Hafta {idx + 1}
                    </div>
                    <div className="text-purple-200 text-sm font-medium">{aralik}</div>
                    <div className="flex-1 h-px bg-white/20" />
                    <div className="text-purple-300 text-sm">{haftaEgitimleri.length} eğitim</div>
                  </div>

                  {/* Eğitim Kartları */}
                  <div className="space-y-3">
                    {haftaEgitimleri.map(egitim => {
                      const tarih = parseTarih(egitim.tarih);
                      const gunNo = tarih ? tarih.getDate() : '';
                      const ayAd = tarih ? tarih.toLocaleDateString('tr-TR', { month: 'short' }) : '';
                      const konusmacilar2 = splitEgitmen(egitim.egitmen);
                      const katRenk = KATEGORI_RENK[egitim.kategori] || KATEGORI_RENK['Diğer'];
                      const online = isOnline(egitim);

                      return (
                        <div key={egitim.id}
                          className="bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                          <div className="flex">
                            {/* Sol: Tarih Badge */}
                            <div className={`flex flex-col items-center justify-center px-4 py-4 min-w-[72px] ${
                              online ? 'bg-gradient-to-b from-blue-600 to-blue-800' : 'bg-gradient-to-b from-purple-700 to-purple-900'
                            } text-white`}>
                              <div className="text-2xl font-extrabold leading-none">{gunNo}</div>
                              <div className="text-[11px] uppercase tracking-wider opacity-80 mt-0.5">{ayAd}</div>
                              <div className="text-[10px] opacity-60 mt-1">{egitim.gun}</div>
                              {online && <Wifi className="w-3.5 h-3.5 mt-1.5 opacity-70" />}
                            </div>

                            {/* Orta: Bilgiler */}
                            <div className="flex-1 p-4 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-bold text-gray-900 text-base leading-tight">{egitim.egitim}</h3>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-purple-500" />
                                      {egitim.saat}{egitim.bitisSaati ? ` – ${egitim.bitisSaati}` : ''} {egitim.sure && <span className="text-gray-400">({egitim.sure})</span>}
                                    </span>
                                    {egitim.yer && (
                                      <span className="flex items-center gap-1">
                                        {online ? <Wifi className="w-3.5 h-3.5 text-blue-500" /> : <MapPin className="w-3.5 h-3.5 text-red-400" />}
                                        <span className="truncate max-w-[220px]">{online ? 'Zoom' : egitim.yer}</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {egitim.kategori && (
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${katRenk.bg} ${katRenk.text}`}>
                                        <Tag className="w-3 h-3" />{egitim.kategori}
                                      </span>
                                    )}
                                    {!online && getSehir(egitim) && getSehir(egitim) !== 'Diğer' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                        <MapPin className="w-3 h-3" />{getSehir(egitim)}
                                      </span>
                                    )}
                                  </div>
                                  {konusmacilar2.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                                      <User className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                                      <span>{konusmacilar2.join(', ')}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Sağ: Konuşmacı Fotoları */}
                                <div className="flex items-start gap-2 flex-shrink-0">
                                  {konusmacilar2.slice(0, 3).map(ad => (
                                    <KonusmaciAvatar key={ad} ad={ad} konusmacilar={konusmacilar || []}
                                      onClick={(ad2, k) => setKonusmaciModal({ ad: ad2, kayit: k })} />
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Sağ kenar: Afiş thumbnail */}
                            {egitim.gorselUrl && (
                              <button onClick={() => setPosterModal({ url: egitim.gorselUrl, baslik: egitim.egitim })}
                                className="hidden sm:block w-24 flex-shrink-0 border-l border-gray-100 hover:opacity-80 transition cursor-pointer">
                                <img src={egitim.gorselUrl} alt="Afiş" className="w-full h-full object-cover" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 py-6 text-center text-white/40 text-sm">
          © 2026 Powered by OneTeam
        </div>
      </div>

      {/* Konuşmacı Detay Modal */}
      {konusmaciModal && (
        <KonusmaciModal ad={konusmaciModal.ad} kayit={konusmaciModal.kayit} onClose={() => setKonusmaciModal(null)} />
      )}

      {/* Poster Modal */}
      {posterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPosterModal(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPosterModal(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
            <img src={posterModal.url} alt={posterModal.baslik} className="w-full rounded-xl shadow-2xl" />
            <div className="mt-3 flex justify-center">
              <a href={posterModal.url} download={`${(posterModal.baslik||'poster').replace(/[^a-z0-9]/gi,'_')}.png`}
                className="flex items-center gap-2 bg-white text-purple-800 px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-50 transition shadow">
                <Download className="w-4 h-4" />Posteri İndir
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakvimView;
