import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Download, Calendar, Clock, User, AlertCircle, Loader2, MapPin, Tag } from 'lucide-react';
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

const parseTarih = (tarih) => {
  if (!tarih) return null;
  const [d, m, y] = tarih.split('.').map(Number);
  return new Date(y, m - 1, d);
};

const splitEgitmen = (egitmen) => {
  if (!egitmen) return [];
  return egitmen
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim())
    .filter(n => n.length > 1);
};

// ── PDF içerik bileşeni ──────────────────────────────────────────────────────
const TakvimPdfIcerik = React.forwardRef(({ takvim, haftaNumaralari, haftalikTakvim }, ref) => {
  const bugun = new Date();
  const ay = bugun.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <div ref={ref} style={{
      width: '794px', background: '#fff', fontFamily: "'Segoe UI', Arial, sans-serif",
      fontSize: '12px', color: '#1f2937',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #6B21A8 0%, #4F46E5 100%)',
        padding: '32px 40px', color: '#fff',
      }}>
        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '6px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Amare Global | OneTeam10x
        </div>
        <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '1px' }}>EĞİTİM TAKVİMİ</div>
        <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '6px' }}>{ay} • Toplam {takvim.length} Eğitim</div>
      </div>
      <div style={{ padding: '24px 32px' }}>
        {haftaNumaralari.map(haftaNo => {
          const egitimler = haftalikTakvim[haftaNo];
          if (!egitimler || egitimler.length === 0) return null;
          const tarihler = egitimler.map(e => e.tarih).filter(Boolean);
          const aralik = tarihler.length > 1 ? `${tarihler[0]} – ${tarihler[tarihler.length - 1]}` : tarihler[0] || '';
          return (
            <div key={haftaNo} style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #6B21A8' }}>
                <div style={{ background: '#6B21A8', color: '#fff', borderRadius: '8px', padding: '4px 14px', fontWeight: '700', fontSize: '13px' }}>HAFTA {haftaNo}</div>
                <div style={{ color: '#6B7280', fontSize: '12px' }}>{aralik}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed' }}>
                <colgroup><col style={{ width: '12%' }} /><col style={{ width: '11%' }} /><col style={{ width: '25%' }} /><col style={{ width: '22%' }} /><col style={{ width: '12%' }} /><col style={{ width: '8%' }} /><col style={{ width: '10%' }} /></colgroup>
                <thead>
                  <tr style={{ background: '#F5F3FF' }}>
                    {['Gün / Tarih', 'Saat', 'Eğitim', 'Konuşmacı', 'Kategori', 'Süre', 'Platform'].map(h => (
                      <th key={h} style={{ padding: '6px', textAlign: 'left', fontWeight: 700, color: '#5B21B6', borderBottom: '2px solid #DDD6FE', fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {egitimler.map((e, i) => (
                    <tr key={e.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '6px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'top' }}><div style={{ fontWeight: 600, fontSize: '10.5px' }}>{e.gun}</div><div style={{ color: '#9CA3AF', fontSize: '9.5px' }}>{e.tarih}</div></td>
                      <td style={{ padding: '6px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'top', fontSize: '10.5px' }}>{e.saat}{e.bitisSaati ? `–${e.bitisSaati}` : ''}</td>
                      <td style={{ padding: '6px', borderBottom: '1px solid #E5E7EB', fontWeight: 600, verticalAlign: 'top', wordBreak: 'break-word', fontSize: '10.5px' }}>{e.egitim}</td>
                      <td style={{ padding: '6px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'top', wordBreak: 'break-word', fontSize: '10px', color: '#4B5563' }}>{e.egitmen || '—'}</td>
                      <td style={{ padding: '6px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'top', fontSize: '9px' }}>{e.kategori || '—'}</td>
                      <td style={{ padding: '6px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'top', fontSize: '10px', color: '#6B7280' }}>{e.sure || '—'}</td>
                      <td style={{ padding: '6px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'top', fontSize: '9px', color: '#6B7280', wordBreak: 'break-word' }}>{(e.yer || 'Zoom').replace('ZOOM SALON ID: ', 'Zoom ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', color: '#9CA3AF', fontSize: '10px' }}>
          <span>Amare Global | OneTeam10x Eğitim Programı</span>
          <span>{bugun.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} tarihinde oluşturuldu</span>
        </div>
      </div>
    </div>
  );
});

// ── Konuşmacı Avatar ─────────────────────────────────────────────────────────
const KonusmaciAvatar = ({ ad, konusmacilar }) => {
  const safeId = ad.trim().toLocaleUpperCase('tr-TR').replace(/[^A-Z0-9]/g, '_').toLowerCase();
  const k = konusmacilar.find(k => k.id === safeId);
  if (!k?.fotoURL) return null;
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <img src={k.fotoURL} alt={k.ad || ad} className="w-12 h-12 rounded-full object-cover border-2 border-purple-200 shadow-sm" />
      <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[70px] truncate">{k.ad || ad}</span>
    </div>
  );
};

// ── Ana bileşen ──────────────────────────────────────────────────────────────
const TakvimView = () => {
  const navigate = useNavigate();
  const { takvim, takvimYayinlandi, loading, konusmacilar } = useData();
  const pdfRef = useRef(null);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);

  const haftaNumaralari = [...new Set(takvim.map(e => e.hafta))].sort((a, b) => a - b);
  const haftalikTakvim = {};
  haftaNumaralari.forEach(h => {
    haftalikTakvim[h] = takvim
      .filter(e => e.hafta === h)
      .sort((a, b) => {
        const ta = parseTarih(a.tarih), tb = parseTarih(b.tarih);
        if (ta && tb && ta.getTime() !== tb.getTime()) return ta - tb;
        return (a.saat || '').localeCompare(b.saat || '');
      });
  });

  const exportPDF = async () => {
    if (!pdfRef.current) return;
    setPdfYukleniyor(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
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
        pdf.addImage(sc.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgW, sliceH);
        y += pageH; remaining -= pageH;
      }
      pdf.save('ONE_TEAM_Egitim_Takvimi.pdf');
    } catch (err) {
      alert('PDF oluşturulamadı: ' + err.message);
    } finally { setPdfYukleniyor(false); }
  };

  // Hafta tarih aralığı hesapla
  const haftaAralik = (egitimler) => {
    const tarihler = egitimler.map(e => parseTarih(e.tarih)).filter(Boolean).sort((a, b) => a - b);
    if (tarihler.length === 0) return '';
    const fmt = (d) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    return tarihler.length === 1 ? fmt(tarihler[0]) : `${fmt(tarihler[0])} – ${fmt(tarihler[tarihler.length - 1])}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  if (!takvimYayinlandi) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <AlertCircle className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Takvim Henüz Yayınlanmadı</h2>
            <p className="text-gray-600 mb-6">Eğitim takvimi hazır olduğunda burada görüntülenecektir.</p>
            <button onClick={() => navigate('/')} className="bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800 transition-colors">
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Gizli PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <TakvimPdfIcerik ref={pdfRef} takvim={takvim} haftaNumaralari={haftaNumaralari} haftalikTakvim={haftalikTakvim} />
      </div>

      {/* Header */}
      <div className="pt-8 pb-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <button onClick={() => navigate('/')} className="flex items-center text-white/70 hover:text-white mb-6 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />Ana Sayfa
          </button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="text-purple-300 text-sm font-medium tracking-wider uppercase mb-1">OneTeam10x</div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white">Eğitim Takvimi</h1>
              <p className="text-purple-200 mt-2">{takvim.length} eğitim planlandı</p>
            </div>
            <button onClick={exportPDF} disabled={pdfYukleniyor}
              className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-white/20 transition disabled:opacity-50 text-sm">
              {pdfYukleniyor ? <><Loader2 className="w-4 h-4 animate-spin" />Hazırlanıyor...</> : <><Download className="w-4 h-4" />PDF İndir</>}
            </button>
          </div>
        </div>
      </div>

      {/* Haftalık Bölümler */}
      <div className="px-4 pb-12">
        <div className="container mx-auto max-w-5xl space-y-8">
          {haftaNumaralari.map(haftaNo => {
            const haftaEgitimleri = haftalikTakvim[haftaNo];
            if (!haftaEgitimleri || haftaEgitimleri.length === 0) return null;
            const aralik = haftaAralik(haftaEgitimleri);

            return (
              <div key={haftaNo}>
                {/* Hafta Başlığı */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white text-purple-800 rounded-xl px-4 py-2 font-extrabold text-lg shadow">
                    Hafta {haftaNo}
                  </div>
                  <div className="text-purple-200 text-sm font-medium">{aralik}</div>
                  <div className="flex-1 h-px bg-white/20" />
                  <div className="text-purple-300 text-sm">{haftaEgitimleri.length} eğitim</div>
                </div>

                {/* Eğitim Kartları */}
                <div className="space-y-3">
                  {haftaEgitimleri.map((egitim) => {
                    const tarih = parseTarih(egitim.tarih);
                    const gunNo = tarih ? tarih.getDate() : '';
                    const ayAd = tarih ? tarih.toLocaleDateString('tr-TR', { month: 'short' }) : '';
                    const konusmacilar2 = splitEgitmen(egitim.egitmen);
                    const katRenk = KATEGORI_RENK[egitim.kategori] || KATEGORI_RENK['Diğer'];

                    return (
                      <div key={egitim.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                        <div className="flex">
                          {/* Sol: Tarih Badge */}
                          <div className="bg-gradient-to-b from-purple-700 to-purple-900 text-white flex flex-col items-center justify-center px-4 py-4 min-w-[72px]">
                            <div className="text-2xl font-extrabold leading-none">{gunNo}</div>
                            <div className="text-[11px] uppercase tracking-wider opacity-80 mt-0.5">{ayAd}</div>
                            <div className="text-[10px] opacity-60 mt-1">{egitim.gun}</div>
                          </div>

                          {/* Orta: Bilgiler */}
                          <div className="flex-1 p-4 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{egitim.egitim}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                                    {egitim.saat}{egitim.bitisSaati ? ` – ${egitim.bitisSaati}` : ''} {egitim.sure && <span className="text-gray-400">({egitim.sure})</span>}
                                  </span>
                                  {egitim.yer && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                      <span className="truncate max-w-[200px]">{egitim.yer}</span>
                                    </span>
                                  )}
                                </div>
                                {egitim.kategori && (
                                  <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${katRenk.bg} ${katRenk.text}`}>
                                    <Tag className="w-3 h-3" />{egitim.kategori}
                                  </span>
                                )}
                                {konusmacilar2.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                                    <User className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                                    <span className="truncate">{konusmacilar2.join(', ')}</span>
                                  </div>
                                )}
                              </div>

                              {/* Sağ: Konuşmacı Fotoları + Afiş */}
                              <div className="flex items-start gap-2 flex-shrink-0">
                                {konusmacilar2.slice(0, 3).map(ad => (
                                  <KonusmaciAvatar key={ad} ad={ad} konusmacilar={konusmacilar || []} />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Sağ kenar: Afiş thumbnail */}
                          {egitim.gorselUrl && (
                            <div className="hidden sm:block w-20 flex-shrink-0 border-l border-gray-100">
                              <img src={egitim.gorselUrl} alt="Afiş" className="w-full h-full object-cover" />
                            </div>
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
  );
};

export default TakvimView;
