import React, { useState } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

const RaporModal = ({ takvim, onClose }) => {
  const bugun = new Date();
  const [secilenAy, setSecilenAy] = useState(bugun.getMonth());
  const [secilenYil, setSecilenYil] = useState(bugun.getFullYear());
  const [yukleniyor, setYukleniyor] = useState(false);

  // Seçilen aya göre filtre
  const parseTarih = (t) => { if (!t) return null; const [d,m,y] = t.split('.').map(Number); return new Date(y,m-1,d); };
  const ayEgitimleri = takvim.filter(e => {
    const d = parseTarih(e.tarih);
    return d && d.getMonth() === secilenAy && d.getFullYear() === secilenYil;
  }).sort((a,b) => (parseTarih(a.tarih) - parseTarih(b.tarih)) || (a.saat||'').localeCompare(b.saat||''));

  const toplamKatilim = ayEgitimleri.reduce((s,e) => s + (Number(e.katilimSayisi)||0), 0);
  const tamamlanan = ayEgitimleri.filter(e => e.tamamlandi).length;

  // Konuşmacı istatistikleri
  const konusmaciStat = {};
  ayEgitimleri.forEach(e => {
    if (!e.egitmen) return;
    e.egitmen.split(/[\/,]/).map(n=>n.trim()).filter(Boolean).forEach(ad => {
      if (!konusmaciStat[ad]) konusmaciStat[ad] = { egitim: 0, katilim: 0 };
      konusmaciStat[ad].egitim++;
      konusmaciStat[ad].katilim += Number(e.katilimSayisi)||0;
    });
  });

  // Kategori dağılımı
  const kategoriStat = {};
  ayEgitimleri.forEach(e => {
    const k = e.kategori || 'Kategorisiz';
    kategoriStat[k] = (kategoriStat[k]||0) + 1;
  });

  const handlePdfIndir = async () => {
    setYukleniyor(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;

      // ── Başlık ──────────────────────────────────────────────
      doc.setFillColor(107, 70, 193); // amare-purple
      doc.rect(0, 0, W, 38, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(20);
      doc.setFont('helvetica','bold');
      doc.text('AMARE GLOBAL', 14, 15);
      doc.setFontSize(13);
      doc.setFont('helvetica','normal');
      doc.text('Egitim Faaliyet Raporu', 14, 24);
      doc.setFontSize(10);
      doc.text(`${AYLAR[secilenAy]} ${secilenYil}  |  ONE TEAM 10X`, 14, 33);

      // Tarih sağda
      doc.setFontSize(9);
      doc.text(`Olusturma: ${bugun.toLocaleDateString('tr-TR')}`, W-14, 33, { align:'right' });

      let y = 48;

      // ── Özet Kartlar ─────────────────────────────────────────
      const kartlar = [
        { baslik: 'Toplam Egitim', deger: ayEgitimleri.length.toString(), renk: [107,70,193] },
        { baslik: 'Tamamlanan',    deger: tamamlanan.toString(),           renk: [56,161,105] },
        { baslik: 'Toplam Katilim', deger: toplamKatilim.toString(),       renk: [49,130,206] },
        { baslik: 'Konusmaci',     deger: Object.keys(konusmaciStat).length.toString(), renk: [221,107,32] },
      ];
      const kW = (W-28)/4;
      kartlar.forEach(({ baslik, deger, renk }, i) => {
        const kx = 14 + i*(kW+2);
        doc.setFillColor(...renk);
        doc.roundedRect(kx, y, kW, 18, 2, 2, 'F');
        doc.setTextColor(255,255,255);
        doc.setFontSize(16);
        doc.setFont('helvetica','bold');
        doc.text(deger, kx + kW/2, y+10, { align:'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica','normal');
        doc.text(baslik, kx + kW/2, y+16, { align:'center' });
      });
      y += 26;

      // ── Eğitim Listesi tablosu ────────────────────────────────
      doc.setTextColor(50,50,50);
      doc.setFontSize(11);
      doc.setFont('helvetica','bold');
      doc.text('Egitim Listesi', 14, y+5);
      y += 8;

      if (ayEgitimleri.length === 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica','normal');
        doc.setTextColor(150,150,150);
        doc.text('Bu ay icin egitim bulunamadi.', 14, y+6);
        y += 12;
      } else {
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Tarih', 'Gun', 'Saat', 'Egitim Adi', 'Konusmaci', 'Katilim', 'Durum']],
          body: ayEgitimleri.map(e => [
            e.tarih || '-',
            e.gun || '-',
            e.saat || '-',
            e.egitim || '-',
            e.egitmen || '-',
            e.katilimSayisi ? `${e.katilimSayisi} kisi` : '-',
            e.tamamlandi ? 'Tamamlandi' : 'Bekliyor',
          ]),
          headStyles: { fillColor: [107,70,193], textColor:255, fontStyle:'bold', fontSize:8 },
          bodyStyles: { fontSize: 8, textColor: [50,50,50] },
          alternateRowStyles: { fillColor: [248,245,255] },
          columnStyles: {
            0: { cellWidth: 20 }, 1: { cellWidth: 18 }, 2: { cellWidth: 14 },
            3: { cellWidth: 52 }, 4: { cellWidth: 38 }, 5: { cellWidth: 18 }, 6: { cellWidth: 22 },
          },
          didParseCell: (data) => {
            if (data.column.index === 6 && data.section === 'body') {
              if (data.cell.raw === 'Tamamlandi') {
                data.cell.styles.textColor = [56,161,105];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── Konuşmacı istatistikleri ──────────────────────────────
      const topKonusmacilar = Object.entries(konusmaciStat).sort(([,a],[,b]) => b.egitim - a.egitim).slice(0,8);
      if (topKonusmacilar.length > 0) {
        // Yeni sayfa gerekiyorsa
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setTextColor(50,50,50);
        doc.setFontSize(11);
        doc.setFont('helvetica','bold');
        doc.text('Konusmaci Istatistikleri', 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Konusmaci', 'Egitim Sayisi', 'Toplam Katilim']],
          body: topKonusmacilar.map(([ad, s]) => [ad, s.egitim, s.katilim > 0 ? `${s.katilim} kisi` : '-']),
          headStyles: { fillColor: [49,130,206], textColor:255, fontStyle:'bold', fontSize:9 },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [235,248,255] },
          columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 } },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── Kategori dağılımı ─────────────────────────────────────
      const kategoriEntries = Object.entries(kategoriStat).sort(([,a],[,b]) => b-a);
      if (kategoriEntries.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setTextColor(50,50,50);
        doc.setFontSize(11);
        doc.setFont('helvetica','bold');
        doc.text('Kategori Dagilimi', 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Kategori', 'Egitim Sayisi', 'Oran']],
          body: kategoriEntries.map(([k, s]) => [k, s, `%${Math.round((s/ayEgitimleri.length)*100)}`]),
          headStyles: { fillColor: [221,107,32], textColor:255, fontStyle:'bold', fontSize:9 },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [255,247,237] },
          columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 } },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── Footer ───────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(240,237,255);
        doc.rect(0, 285, W, 12, 'F');
        doc.setTextColor(107,70,193);
        doc.setFontSize(8);
        doc.setFont('helvetica','normal');
        doc.text('Amare Global  |  ONE TEAM 10X  |  Gizli', W/2, 292, { align:'center' });
        doc.text(`Sayfa ${i}/${pageCount}`, W-14, 292, { align:'right' });
      }

      doc.save(`amare_rapor_${AYLAR[secilenAy]}_${secilenYil}.pdf`);
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
          {/* Ay & Yıl seçimi */}
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

          {/* Önizleme özet */}
          <div className="bg-purple-50 rounded-2xl p-4 grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-amare-purple">{ayEgitimleri.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Toplam Eğitim</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{tamamlanan}</div>
              <div className="text-xs text-gray-500 mt-0.5">Tamamlanan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{toplamKatilim}</div>
              <div className="text-xs text-gray-500 mt-0.5">Toplam Katılım</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{Object.keys(konusmaciStat).length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Konuşmacı</div>
            </div>
          </div>

          {/* İçerik */}
          <div className="space-y-1.5 text-sm text-gray-600">
            <div className="flex items-center gap-2"><span className="w-4 h-4 bg-amare-purple rounded text-white text-xs flex items-center justify-center">✓</span>Eğitim listesi (tarih, saat, konuşmacı, katılım)</div>
            <div className="flex items-center gap-2"><span className="w-4 h-4 bg-blue-500 rounded text-white text-xs flex items-center justify-center">✓</span>Konuşmacı istatistikleri</div>
            <div className="flex items-center gap-2"><span className="w-4 h-4 bg-orange-500 rounded text-white text-xs flex items-center justify-center">✓</span>Kategori dağılımı</div>
          </div>

          <button onClick={handlePdfIndir} disabled={yukleniyor || ayEgitimleri.length === 0}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-amare-purple to-amare-blue hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {yukleniyor
              ? <><Loader2 className="w-5 h-5 animate-spin" />PDF Oluşturuluyor...</>
              : <><Download className="w-5 h-5" />PDF İndir — {AYLAR[secilenAy]} {secilenYil}</>}
          </button>
          {ayEgitimleri.length === 0 && (
            <p className="text-center text-xs text-gray-400">Bu ay için eğitim bulunamadı</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaporModal;
