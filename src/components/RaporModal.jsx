import React, { useState, useRef } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

const parseTarih = (t) => { if (!t) return null; const [d,m,y] = t.split('.').map(Number); return new Date(y,m-1,d); };

// ── Sayfa render bileşeni (HTML → Canvas → PDF) ─────────────────────────────
const RaporSayfasi = React.forwardRef(({ egitimler, ay, yil }, ref) => {
  const toplamKatilim = egitimler.reduce((s,e) => s + (Number(e.katilimSayisi)||0), 0);
  const tamamlanan = egitimler.filter(e => e.tamamlandi).length;

  const konusmaciStat = {};
  egitimler.forEach(e => {
    if (!e.egitmen) return;
    e.egitmen.split(/[\/,]/).map(n=>n.trim()).filter(Boolean).forEach(ad => {
      if (!konusmaciStat[ad]) konusmaciStat[ad] = { egitim: 0, katilim: 0 };
      konusmaciStat[ad].egitim++;
      konusmaciStat[ad].katilim += Number(e.katilimSayisi)||0;
    });
  });
  const topKonusmacilar = Object.entries(konusmaciStat).sort(([,a],[,b]) => b.egitim - a.egitim).slice(0, 8);

  const kategoriStat = {};
  egitimler.forEach(e => {
    const k = e.kategori || 'Kategorisiz';
    kategoriStat[k] = (kategoriStat[k]||0) + 1;
  });

  return (
    <div ref={ref} style={{ width: 794, fontFamily: 'Arial, sans-serif', backgroundColor: '#fff', padding: 0 }}>

      {/* ── BAŞLIK ── */}
      <div style={{ background: 'linear-gradient(135deg, #6B46C1 0%, #3182CE 100%)', padding: '32px 40px 24px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.7, marginBottom: 6, textTransform: 'uppercase' }}>Amare Global</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>Eğitim Faaliyet Raporu</div>
            <div style={{ fontSize: 14, marginTop: 6, opacity: 0.85 }}>{AYLAR[ay]} {yil}</div>
          </div>
          <div style={{ textAlign: 'right', opacity: 0.7, fontSize: 11 }}>
            <div style={{ fontSize: 18, fontWeight: 700, opacity: 1 }}>ONE TEAM 10X</div>
            <div style={{ marginTop: 4 }}>Oluşturma: {new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>
      </div>

      {/* ── ÖZET KARTLAR ── */}
      <div style={{ display: 'flex', gap: 0, background: '#f8f5ff', borderBottom: '1px solid #e9e3ff' }}>
        {[
          { label: 'Toplam Eğitim', value: egitimler.length, color: '#6B46C1', bg: '#f3eeff' },
          { label: 'Tamamlanan',    value: tamamlanan,        color: '#38A169', bg: '#f0fff4' },
          { label: 'Toplam Katılım', value: toplamKatilim,   color: '#3182CE', bg: '#ebf8ff' },
          { label: 'Konuşmacı',     value: Object.keys(konusmaciStat).length, color: '#DD6B20', bg: '#fffaf0' },
        ].map(({ label, value, color, bg }, i) => (
          <div key={i} style={{ flex: 1, padding: '20px 0', textAlign: 'center', background: bg, borderRight: i < 3 ? '1px solid #e9e3ff' : 'none' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '28px 40px' }}>

        {/* ── EĞİTİM LİSTESİ ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#4a1d96', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#6B46C1', color: '#fff', borderRadius: 4, padding: '2px 10px', fontSize: 12 }}>Eğitim Listesi</span>
          </div>
          {egitimler.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 24, background: '#fafafa', borderRadius: 8 }}>Bu ay için eğitim bulunamadı.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#6B46C1', color: '#fff' }}>
                  {['Tarih', 'Gün', 'Saat', 'Eğitim Adı', 'Konuşmacı', 'Katılım', 'Durum'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {egitimler.map((e, i) => (
                  <tr key={e.id || i} style={{ background: i%2===0 ? '#faf8ff' : '#fff', borderBottom: '1px solid #ede9fe' }}>
                    <td style={{ padding: '7px 10px', color: '#444', whiteSpace: 'nowrap' }}>{e.tarih || '—'}</td>
                    <td style={{ padding: '7px 10px', color: '#666' }}>{e.gun || '—'}</td>
                    <td style={{ padding: '7px 10px', color: '#444', whiteSpace: 'nowrap' }}>{e.saat || '—'}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 600, color: '#1a1a2e', maxWidth: 200 }}>{e.egitim || '—'}</td>
                    <td style={{ padding: '7px 10px', color: '#6B46C1' }}>{e.egitmen || '—'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: '#3182CE', fontWeight: 600 }}>{e.katilimSayisi || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{
                        background: e.tamamlandi ? '#c6f6d5' : '#fef3c7',
                        color: e.tamamlandi ? '#276749' : '#92400e',
                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                      }}>
                        {e.tamamlandi ? '✓ Tamamlandı' : '⏳ Bekliyor'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── KONUŞMACI İSTATİSTİKLERİ ── */}
        {topKonusmacilar.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#4a1d96', marginBottom: 12 }}>
              <span style={{ background: '#3182CE', color: '#fff', borderRadius: 4, padding: '2px 10px', fontSize: 12 }}>Konuşmacı İstatistikleri</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {topKonusmacilar.map(([ad, s], i) => (
                <div key={ad} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8faff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6B46C1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad}</div>
                    <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{s.egitim} eğitim{s.katilim > 0 ? ` • ${s.katilim} katılımcı` : ''}</div>
                  </div>
                  <div style={{ background: '#6B46C1', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 13, fontWeight: 700 }}>{s.egitim}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── KATEGORİ DAĞILIMI ── */}
        {Object.keys(kategoriStat).length > 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#4a1d96', marginBottom: 12 }}>
              <span style={{ background: '#DD6B20', color: '#fff', borderRadius: 4, padding: '2px 10px', fontSize: 12 }}>Kategori Dağılımı</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(kategoriStat).sort(([,a],[,b])=>b-a).map(([k, s]) => (
                <div key={k} style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#6B46C1' }}>{s}</div>
                  <div style={{ fontSize: 10, color: '#7c3aed', marginTop: 2 }}>{k}</div>
                  <div style={{ fontSize: 9, color: '#aaa' }}>%{Math.round((s/egitimler.length)*100)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#f3eeff', borderTop: '2px solid #6B46C1', padding: '12px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#6B46C1', fontWeight: 700 }}>Amare Global  •  ONE TEAM 10X</div>
        <div style={{ fontSize: 10, color: '#999' }}>Bu belge gizlidir. {new Date().toLocaleDateString('tr-TR')}</div>
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
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = 210;
      const pdfH = (canvas.height * pdfW) / canvas.width;

      // Sayfaya sığmıyorsa birden fazla sayfa
      if (pdfH <= 297) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      } else {
        let pos = 0;
        const pageH = 297;
        while (pos < pdfH) {
          if (pos > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -pos, pdfW, pdfH);
          pos += pageH;
        }
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
          {/* Ay & Yıl */}
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

          {/* Özet */}
          <div className="bg-purple-50 rounded-2xl p-4 grid grid-cols-4 gap-3 text-center">
            <div><div className="text-xl font-bold text-amare-purple">{ayEgitimleri.length}</div><div className="text-xs text-gray-500">Eğitim</div></div>
            <div><div className="text-xl font-bold text-green-600">{tamamlanan}</div><div className="text-xs text-gray-500">Tamamlanan</div></div>
            <div><div className="text-xl font-bold text-blue-600">{toplamKatilim}</div><div className="text-xs text-gray-500">Katılım</div></div>
            <div><div className="text-xl font-bold text-orange-500">{[...new Set(ayEgitimleri.flatMap(e => (e.egitmen||'').split(/[\/,]/).map(n=>n.trim()).filter(Boolean)))].length}</div><div className="text-xs text-gray-500">Konuşmacı</div></div>
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
