import React, { useState, useRef } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

const parseTarih = (t) => { if (!t) return null; const [d,m,y] = t.split('.').map(Number); return new Date(y,m-1,d); };

const KATEGORI_RENK = {
  'Liderlik': '#7C3AED', 'Satış': '#059669', 'Motivasyon': '#D97706',
  'Sağlık': '#DC2626', 'Finansal Özgürlük': '#2563EB', 'Kişisel Gelişim': '#8B5CF6',
  'Vizyon Günü': '#DB2777', 'Panel': '#0891B2', 'Diğer': '#6B7280',
};

// ── Sayfa render bileşeni ──────────────────────────────────────────────────────
const RaporSayfasi = React.forwardRef(({ egitimler, ay, yil }, ref) => {
  const toplamKatilim = egitimler.reduce((s,e) => s + (Number(e.katilimSayisi)||0), 0);
  const tamamlanan = egitimler.filter(e => e.tamamlandi).length;

  const konusmaciStat = {};
  egitimler.forEach(e => {
    if (!e.egitmen) return;
    e.egitmen.split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜ])/).map(n=>n.trim()).filter(n=>n.length>1).forEach(ad => {
      if (!konusmaciStat[ad]) konusmaciStat[ad] = { egitim: 0, katilim: 0 };
      konusmaciStat[ad].egitim++;
      konusmaciStat[ad].katilim += Number(e.katilimSayisi)||0;
    });
  });
  const topKonusmacilar = Object.entries(konusmaciStat).sort(([,a],[,b]) => b.egitim - a.egitim).slice(0, 10);

  const kategoriStat = {};
  egitimler.forEach(e => { const k = e.kategori || 'Kategorisiz'; kategoriStat[k] = (kategoriStat[k]||0) + 1; });

  const haftaGruplari = {};
  egitimler.forEach(e => { const h = e.hafta || 1; if (!haftaGruplari[h]) haftaGruplari[h] = []; haftaGruplari[h].push(e); });

  const S = { // Stil sabitleri
    page: { width: 794, fontFamily: "'Segoe UI', Arial, sans-serif", backgroundColor: '#fff', color: '#1f2937' },
    headerBg: 'linear-gradient(135deg, #6B21A8 0%, #4F46E5 100%)',
  };

  return (
    <div ref={ref} style={S.page}>

      {/* ── BAŞLIK ── */}
      <div style={{ background: S.headerBg, padding: '36px 44px 28px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.7, marginBottom: 8, textTransform: 'uppercase' }}>Amare Global  •  OneTeam10x</div>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>Eğitim Faaliyet Raporu</div>
            <div style={{ fontSize: 15, marginTop: 8, opacity: 0.85, fontWeight: 500 }}>{AYLAR[ay]} {yil}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, opacity: 0.9 }}>ONE TEAM</div>
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 6 }}>Oluşturma: {new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>
      </div>

      {/* ── ÖZET KARTLAR ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E9D5FF' }}>
        {[
          { label: 'Toplam Eğitim', value: egitimler.length, color: '#7C3AED', bg: '#FAF5FF' },
          { label: 'Tamamlanan', value: tamamlanan, color: '#059669', bg: '#ECFDF5' },
          { label: 'Toplam Katılım', value: toplamKatilim, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Konuşmacı', value: Object.keys(konusmaciStat).length, color: '#D97706', bg: '#FFFBEB' },
        ].map(({ label, value, color, bg }, i) => (
          <div key={i} style={{
            flex: 1, padding: '22px 16px', textAlign: 'center', background: bg,
            borderRight: i < 3 ? '1px solid #E9D5FF' : 'none',
          }}>
            <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '28px 44px 20px' }}>

        {/* ── EĞİTİM TABLOSU (Hafta bazlı) ── */}
        {Object.keys(haftaGruplari).sort((a,b)=>a-b).map(hafta => {
          const egitimlerH = haftaGruplari[hafta];
          return (
            <div key={hafta} style={{ marginBottom: 24 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                paddingBottom: 6, borderBottom: '2px solid #7C3AED',
              }}>
                <div style={{
                  background: '#7C3AED', color: '#fff', borderRadius: 6,
                  padding: '3px 12px', fontWeight: 700, fontSize: 12,
                }}>HAFTA {hafta}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{egitimlerH.length} eğitim</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#F5F3FF' }}>
                    {['Gün / Tarih', 'Saat', 'Eğitim Adı', 'Konuşmacı', 'Kategori', 'Katılım', 'Durum'].map(h => (
                      <th key={h} style={{
                        padding: '7px 6px', textAlign: 'left', fontWeight: 700,
                        color: '#5B21B6', borderBottom: '2px solid #DDD6FE',
                        fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.3,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {egitimlerH.map((e, i) => (
                    <tr key={e.id || i} style={{ background: i%2===0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: '#374151', fontSize: 10.5 }}>{e.gun || '—'}</div>
                        <div style={{ color: '#9CA3AF', fontSize: 9.5 }}>{e.tarih || ''}</div>
                      </td>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #E5E7EB', color: '#374151', fontSize: 10.5, verticalAlign: 'top' }}>
                        {e.saat || '—'}{e.bitisSaati ? `–${e.bitisSaati}` : ''}
                      </td>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #E5E7EB', fontWeight: 600, color: '#111827', fontSize: 10.5, verticalAlign: 'top', wordBreak: 'break-word' }}>
                        {e.egitim || '—'}
                      </td>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: 10, verticalAlign: 'top', wordBreak: 'break-word', lineHeight: 1.3 }}>
                        {e.egitmen || '—'}
                      </td>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'top' }}>
                        {e.kategori ? (
                          <span style={{
                            background: (KATEGORI_RENK[e.kategori] || '#6B7280') + '18',
                            color: KATEGORI_RENK[e.kategori] || '#6B7280',
                            padding: '2px 6px', borderRadius: 99, fontWeight: 600, fontSize: 8.5, whiteSpace: 'nowrap',
                          }}>{e.kategori}</span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 700, color: '#2563EB', fontSize: 11, verticalAlign: 'top' }}>
                        {e.katilimSayisi || '—'}
                      </td>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'top' }}>
                        <span style={{
                          background: e.tamamlandi ? '#D1FAE5' : '#FEF3C7',
                          color: e.tamamlandi ? '#065F46' : '#92400E',
                          padding: '2px 8px', borderRadius: 99, fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          {e.tamamlandi ? 'Tamamlandı' : 'Bekliyor'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

      </div>

      {/* ── FOOTER ── */}
      <div style={{
        background: '#F5F3FF', borderTop: '2px solid #7C3AED', padding: '14px 44px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 700 }}>Amare Global  •  OneTeam10x Eğitim Programı</div>
        <div style={{ fontSize: 10, color: '#9CA3AF' }}>{new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} tarihinde oluşturuldu</div>
      </div>
    </div>
  );
});

// ── Ana Modal ────────────────────────────────────────────────────────────────
const RaporModal = ({ takvim, onClose }) => {
  const bugun = new Date();
  const [secilenAy, setSecilenAy] = useState(bugun.getMonth());
  const [secilenYil, setSecilenYil] = useState(bugun.getFullYear());
  const [yukleniyor, setYukleniyor] = useState(false);
  const sayfaRef = useRef(null);

  const ayEgitimleri = takvim.filter(e => {
    const d = parseTarih(e.tarih);
    return d && d.getMonth() === secilenAy && d.getFullYear() === secilenYil;
  }).sort((a,b) => (parseTarih(a.tarih) - parseTarih(b.tarih)) || (a.saat||'').localeCompare(b.saat||''));

  const toplamKatilim = ayEgitimleri.reduce((s,e) => s + (Number(e.katilimSayisi)||0), 0);
  const tamamlanan = ayEgitimleri.filter(e => e.tamamlandi).length;

  const handlePdfIndir = async () => {
    if (!sayfaRef.current) return;
    setYukleniyor(true);
    try {
      const canvas = await html2canvas(sayfaRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      });

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

      pdf.save(`amare_rapor_${AYLAR[secilenAy]}_${secilenYil}.pdf`);
    } catch (err) {
      alert('PDF oluşturulamadı: ' + err.message);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amare-purple" />Aylık PDF Raporu
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Seçilen aya ait eğitim raporu</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Ay</label>
              <select value={secilenAy} onChange={e => setSecilenAy(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30">
                {AYLAR.map((a, i) => <option key={i} value={i}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Yıl</label>
              <select value={secilenYil} onChange={e => setSecilenYil(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30">
                {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-purple-50 rounded-2xl p-4 grid grid-cols-4 gap-3 text-center">
            <div><div className="text-xl font-bold text-amare-purple">{ayEgitimleri.length}</div><div className="text-xs text-gray-500">Eğitim</div></div>
            <div><div className="text-xl font-bold text-green-600">{tamamlanan}</div><div className="text-xs text-gray-500">Tamamlanan</div></div>
            <div><div className="text-xl font-bold text-blue-600">{toplamKatilim}</div><div className="text-xs text-gray-500">Katılım</div></div>
            <div><div className="text-xl font-bold text-orange-500">{[...new Set(ayEgitimleri.flatMap(e => (e.egitmen||'').split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜ])/).map(n=>n.trim()).filter(n=>n.length>1)))].length}</div><div className="text-xs text-gray-500">Konuşmacı</div></div>
          </div>

          <button onClick={handlePdfIndir} disabled={yukleniyor || ayEgitimleri.length === 0}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-amare-purple to-amare-blue hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {yukleniyor
              ? <><Loader2 className="w-5 h-5 animate-spin" />PDF Oluşturuluyor...</>
              : <><Download className="w-5 h-5" />PDF İndir — {AYLAR[secilenAy]} {secilenYil}</>}
          </button>
          {ayEgitimleri.length === 0 && <p className="text-center text-xs text-gray-400">Bu ay için eğitim bulunamadı</p>}
        </div>
      </div>

      {/* Gizli render alanı */}
      <div style={{ position: 'fixed', left: -9999, top: -9999, zIndex: -1 }}>
        <RaporSayfasi ref={sayfaRef} egitimler={ayEgitimleri} ay={secilenAy} yil={secilenYil} />
      </div>
    </div>
  );
};

export default RaporModal;
