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

  const haftaAralikPdf = (egitimler) => {
    const tarihler = egitimler.map(e => parseTarih(e.tarih)).filter(Boolean).sort((a,b)=>a-b);
    if (!tarihler.length) return '';
    const fmt = d => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    return tarihler.length === 1 ? fmt(tarihler[0]) : `${fmt(tarihler[0])} – ${fmt(tarihler[tarihler.length-1])}`;
  };

  const KRENK = {
    'Liderlik':'#7C3AED','Satış':'#059669','Motivasyon':'#D97706','Sağlık':'#DC2626',
    'Finansal Özgürlük':'#2563EB','Kişisel Gelişim':'#8B5CF6','Vizyon Günü':'#DB2777',
    'Panel':'#0891B2','Diğer':'#6B7280',
  };

  return (
    <div ref={ref} style={{
      width: '794px', background: '#f3f0ff', fontFamily: "'Segoe UI', Arial, sans-serif",
      fontSize: '12px', color: '#1f2937',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #581C87 0%, #3730A3 100%)',
        padding: '32px 40px 28px', color: '#fff',
      }}>
        <div style={{ fontSize: '10px', opacity: 0.7, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>OneTeam10x</div>
        <div style={{ fontSize: '28px', fontWeight: 800 }}>Eğitim Takvimi</div>
        <div style={{ fontSize: '13px', opacity: 0.8, marginTop: 6 }}>{ay} • {takvim.length} Eğitim</div>
      </div>

      <div style={{ padding: '20px 32px' }}>
        {haftaNumaralari.map(haftaNo => {
          const egitimler = haftalikTakvim[haftaNo];
          if (!egitimler || !egitimler.length) return null;
          const aralik = haftaAralikPdf(egitimler);

          return (
            <div key={haftaNo} style={{ marginBottom: 24 }}>
              {/* Hafta başlığı */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ background: '#6D28D9', color: '#fff', borderRadius: 8, padding: '4px 14px', fontWeight: 800, fontSize: 13 }}>Hafta {haftaNo}</div>
                <div style={{ color: '#7C3AED', fontSize: 12, fontWeight: 500 }}>{aralik}</div>
                <div style={{ flex: 1, height: 1, background: '#DDD6FE' }} />
                <div style={{ color: '#9CA3AF', fontSize: 11 }}>{egitimler.length} eğitim</div>
              </div>

              {/* Kart listesi */}
              {egitimler.map((e, i) => {
                const t = parseTarih(e.tarih);
                const gunNo = t ? t.getDate() : '';
                const ayKisa = t ? t.toLocaleDateString('tr-TR', { month: 'short' }) : '';
                const kRenk = KRENK[e.kategori] || '#6B7280';

                return (
                  <div key={e.id||i} style={{
                    display: 'flex', background: '#fff', borderRadius: 10, marginBottom: 6,
                    border: '1px solid #E9D5FF', overflow: 'hidden',
                  }}>
                    {/* Tarih badge */}
                    <div style={{
                      background: 'linear-gradient(180deg, #6D28D9, #4C1D95)', color: '#fff',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '8px 12px', minWidth: 56,
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{gunNo}</div>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', opacity: 0.8, marginTop: 2 }}>{ayKisa}</div>
                      <div style={{ fontSize: 8, opacity: 0.6, marginTop: 1 }}>{e.gun}</div>
                    </div>

                    {/* İçerik */}
                    <div style={{ flex: 1, padding: '8px 12px', minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#111827', marginBottom: 3 }}>{e.egitim}</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#6B7280', flexWrap: 'wrap' }}>
                        <span>🕐 {e.saat}{e.bitisSaati ? `–${e.bitisSaati}` : ''} {e.sure && `(${e.sure})`}</span>
                        {e.yer && <span>📍 {(e.yer||'').replace('ZOOM SALON ID: ','Zoom ')}</span>}
                      </div>
                      {e.egitmen && <div style={{ fontSize: 10, color: '#4B5563', marginTop: 3 }}>🎤 {e.egitmen}</div>}
                      {e.kategori && (
                        <span style={{
                          display: 'inline-block', marginTop: 3, background: kRenk+'18', color: kRenk,
                          padding: '1px 8px', borderRadius: 99, fontSize: 8.5, fontWeight: 600,
                        }}>{e.kategori}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #DDD6FE', display: 'flex', justifyContent: 'space-between', color: '#9CA3AF', fontSize: 10 }}>
          <span>OneTeam10x Eğitim Programı</span>
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
