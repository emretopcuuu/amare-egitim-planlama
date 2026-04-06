import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Download, Calendar, Clock, User, AlertCircle, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ── PDF içerik bileşeni (gizli, sadece render için) ──────────────────────────
const TakvimPdfIcerik = React.forwardRef(({ takvim, haftaNumaralari, haftalikTakvim }, ref) => {
  const bugun = new Date();
  const ay = bugun.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

  const KATEGORI_RENK = {
    'Liderlik': '#7C3AED', 'Satış': '#059669', 'Motivasyon': '#D97706',
    'Sağlık': '#DC2626', 'Finansal Özgürlük': '#2563EB', 'Kişisel Gelişim': '#7C3AED',
    'Vizyon Günü': '#DB2777', 'Panel': '#0891B2', 'Diğer': '#6B7280',
  };

  return (
    <div ref={ref} style={{
      width: '794px', background: '#fff', fontFamily: "'Segoe UI', Arial, sans-serif",
      fontSize: '12px', color: '#1f2937',
    }}>
      {/* Başlık */}
      <div style={{
        background: 'linear-gradient(135deg, #6B21A8 0%, #4F46E5 100%)',
        padding: '32px 40px', color: '#fff',
      }}>
        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '6px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Amare Global | OneTeam10x
        </div>
        <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '1px' }}>
          EĞİTİM TAKVİMİ
        </div>
        <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '6px' }}>
          {ay} • Toplam {takvim.length} Eğitim
        </div>
      </div>

      {/* Haftalar */}
      <div style={{ padding: '24px 32px' }}>
        {haftaNumaralari.map(haftaNo => {
          const egitimler = haftalikTakvim[haftaNo];
          if (!egitimler || egitimler.length === 0) return null;

          const tarihler = egitimler.map(e => e.tarih).filter(Boolean);
          const aralik = tarihler.length > 1
            ? `${tarihler[0]} – ${tarihler[tarihler.length - 1]}`
            : tarihler[0] || '';

          return (
            <div key={haftaNo} style={{ marginBottom: '28px' }}>
              {/* Hafta başlığı */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '12px', paddingBottom: '8px',
                borderBottom: '2px solid #6B21A8',
              }}>
                <div style={{
                  background: '#6B21A8', color: '#fff', borderRadius: '8px',
                  padding: '4px 14px', fontWeight: '700', fontSize: '13px',
                }}>
                  HAFTA {haftaNo}
                </div>
                <div style={{ color: '#6B7280', fontSize: '12px' }}>{aralik}</div>
                <div style={{ marginLeft: 'auto', color: '#6B21A8', fontWeight: '600', fontSize: '12px' }}>
                  {egitimler.length} eğitim
                </div>
              </div>

              {/* Tablo */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead>
                  <tr style={{ background: '#F5F3FF' }}>
                    {['Gün / Tarih', 'Saat', 'Eğitim Konusu', 'Konuşmacı', 'Kategori', 'Süre'].map(h => (
                      <th key={h} style={{
                        padding: '8px 10px', textAlign: 'left', fontWeight: '700',
                        color: '#5B21B6', borderBottom: '2px solid #DDD6FE',
                        fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {egitimler.map((e, i) => (
                    <tr key={e.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#374151' }}>{e.gun}</div>
                        <div style={{ color: '#9CA3AF', fontSize: '10.5px' }}>{e.tarih}</div>
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap', color: '#374151' }}>
                        {e.saat}{e.bitisSaati ? `–${e.bitisSaati}` : ''}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB', fontWeight: '600', color: '#111827', maxWidth: '180px' }}>
                        {e.egitim}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB', color: '#4B5563', maxWidth: '150px' }}>
                        {e.egitmen || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>
                        {e.kategori ? (
                          <span style={{
                            background: (KATEGORI_RENK[e.kategori] || '#6B7280') + '18',
                            color: KATEGORI_RENK[e.kategori] || '#6B7280',
                            padding: '2px 8px', borderRadius: '999px',
                            fontWeight: '600', fontSize: '10px', whiteSpace: 'nowrap',
                          }}>
                            {e.kategori}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB', color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {e.sure || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Alt bilgi */}
        <div style={{
          marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-between', color: '#9CA3AF', fontSize: '10px',
        }}>
          <span>Amare Global | OneTeam10x Eğitim Programı</span>
          <span>{bugun.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} tarihinde oluşturuldu</span>
        </div>
      </div>
    </div>
  );
});

// ── Ana bileşen ──────────────────────────────────────────────────────────────
const TakvimView = () => {
  const navigate = useNavigate();
  const { takvim, takvimYayinlandi, loading } = useData();
  const pdfRef = useRef(null);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);

  const haftaNumaralari = [...new Set(takvim.map(e => e.hafta))].sort((a, b) => a - b);
  const haftalikTakvim = {};
  haftaNumaralari.forEach(h => {
    haftalikTakvim[h] = takvim.filter(e => e.hafta === h);
  });

  const exportPDF = async () => {
    if (!pdfRef.current) return;
    setPdfYukleniyor(true);
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = 210;
      const pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;

      let y = 0;
      let remaining = imgH;

      while (remaining > 0) {
        if (y > 0) pdf.addPage();
        const srcY = (y / imgH) * canvas.height;
        const sliceH = Math.min(pageH, remaining);
        const srcH = (sliceH / imgH) * canvas.height;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgW, sliceH);
        y += pageH;
        remaining -= pageH;
      }

      pdf.save('ONE_TEAM_Egitim_Takvimi.pdf');
    } catch (err) {
      alert('PDF oluşturulamadı: ' + err.message);
    } finally {
      setPdfYukleniyor(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amare-purple to-amare-blue flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (!takvimYayinlandi) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amare-purple to-amare-blue py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <AlertCircle className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Takvim Henüz Yayınlanmadı</h2>
            <p className="text-gray-600 mb-6">
              Eğitim takvimi henüz yayınlanmadı. Takvim hazır olduğunda burada görüntülenecektir.
            </p>
            <button onClick={() => navigate('/')}
              className="bg-amare-purple text-white px-6 py-3 rounded-lg font-semibold hover:bg-amare-dark transition-colors">
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amare-purple to-amare-blue py-12 px-4">
      {/* Gizli PDF içeriği */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <TakvimPdfIcerik ref={pdfRef} takvim={takvim} haftaNumaralari={haftaNumaralari} haftalikTakvim={haftalikTakvim} />
      </div>

      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <button onClick={() => navigate('/')}
            className="flex items-center text-amare-purple hover:text-amare-dark mb-6">
            <ArrowLeft className="w-5 h-5 mr-2" />Ana Sayfaya Dön
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Eğitim Takvimi</h1>
              <p className="text-gray-600">Toplam {takvim.length} eğitim planlandı</p>
            </div>
            <button onClick={exportPDF} disabled={pdfYukleniyor}
              className="mt-4 md:mt-0 flex items-center bg-amare-purple text-white px-6 py-3 rounded-lg font-semibold hover:bg-amare-dark transition-colors disabled:opacity-60">
              {pdfYukleniyor
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Hazırlanıyor...</>
                : <><Download className="w-5 h-5 mr-2" />PDF İndir</>
              }
            </button>
          </div>
        </div>

        {/* Takvim - Haftalık */}
        {haftaNumaralari.map(haftaNo => {
          const haftaEgitimleri = haftalikTakvim[haftaNo];
          if (!haftaEgitimleri || haftaEgitimleri.length === 0) return null;

          const tarihler = haftaEgitimleri.map(e => e.tarih).filter(Boolean);
          const ilkTarih = tarihler[0] || '';
          const sonTarih = tarihler[tarihler.length - 1] || '';
          const haftaBaslik = ilkTarih === sonTarih
            ? `Hafta ${haftaNo} (${ilkTarih})`
            : `Hafta ${haftaNo} (${ilkTarih} - ${sonTarih})`;

          return (
            <div key={haftaNo} className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-amare-purple mb-6">{haftaBaslik}</h2>
              <div className="space-y-4">
                {haftaEgitimleri.map((egitim, index) => (
                  <div key={egitim.id || index}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-amare-purple mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-gray-500">Tarih</div>
                          <div className="font-semibold text-gray-800">{egitim.gun} {egitim.tarih}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 text-amare-blue mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-gray-500">Saat</div>
                          <div className="font-semibold text-gray-800">
                            {egitim.saat}{egitim.bitisSaati ? ` - ${egitim.bitisSaati}` : ''} ({egitim.sure})
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-sm text-gray-500 mb-1">Eğitim Konusu</div>
                        <div className="font-bold text-gray-800 text-lg">{egitim.egitim}</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <span className="text-sm text-gray-500 mr-2">Eğitmen:</span>
                          <span className="font-semibold text-gray-800">{egitim.egitmen}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 bg-blue-50 rounded-lg p-3">
                      <div className="text-sm text-blue-800">
                        <strong>Platform:</strong> {egitim.yer || 'Zoom (Link eğitim gününde paylaşılacaktır)'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TakvimView;
