// Aylık ekip raporu PDF üreticisi
// jsPDF + autoTable ile ekibin aylık karnesini PDF olarak indirir

import React, { useState } from 'react';
import { FileText, Loader2, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AylikRaporPdf = ({ veri, sponsorAd = 'Sponsor' }) => {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [basari, setBasari] = useState(false);

  if (!veri?.ekip) return null;

  async function olustur() {
    setYukleniyor(true);
    setBasari(false);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const tarih = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
      const ay = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

      // Header
      doc.setFillColor(58, 23, 114);
      doc.rect(0, 0, pageW, 35, 'F');
      doc.setFontSize(22);
      doc.setTextColor(251, 191, 36);
      doc.setFont('helvetica', 'bold');
      doc.text('One Team', 15, 16);
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.text('Ekip Karnesi', 15, 24);
      doc.setFontSize(10);
      doc.setTextColor(196, 181, 253);
      doc.text(`${ay} · ${tarih}`, 15, 30);
      doc.setFontSize(10);
      doc.text(sponsorAd, pageW - 15, 22, { align: 'right' });
      doc.setFontSize(8);
      doc.text(`Amare ID: ${veri.amareId}`, pageW - 15, 28, { align: 'right' });

      let y = 45;

      // Karne skoru — büyük blok
      if (veri.karne) {
        doc.setFillColor(245, 158, 11);
        doc.rect(15, y, pageW - 30, 22, 'F');
        doc.setTextColor(58, 23, 114);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text(`${veri.karne.skor}`, pageW / 2 - 18, y + 16);
        doc.setFontSize(10);
        doc.text('/100', pageW / 2, y + 16);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('LİDER KARNESİ SKORU', pageW / 2, y + 5, { align: 'center' });
        const etiket = veri.karne.skor >= 75 ? 'Mükemmel' : veri.karne.skor >= 50 ? 'İyi' : veri.karne.skor >= 25 ? 'Geliştir' : 'Acil';
        doc.text(etiket, pageW / 2, y + 21, { align: 'center' });

        y += 28;

        // Skor bileşenleri
        const bilesenler = [
          ['Aktiflik', veri.karne.aktifPuan, 40],
          ['Site Kullanım', veri.karne.sitePuan, 25],
          ['Curriculum', veri.karne.curriculumPuan, 20],
          ['Davet Hızı', veri.karne.davetPuan, 15],
        ];
        autoTable(doc, {
          startY: y,
          head: [['Bileşen', 'Puan', 'Max']],
          body: bilesenler,
          theme: 'striped',
          headStyles: { fillColor: [58, 23, 114], textColor: 255, fontStyle: 'bold' },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 9 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // Özet
      if (veri.ozet) {
        doc.setTextColor(58, 23, 114);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Ekip Özeti', 15, y);
        y += 6;
        const ozetData = [
          ['Toplam üye', veri.toplam],
          ['Aktif', veri.ozet.aktif],
          ['Yavaşladı', veri.ozet.yavasladi],
          ['Risk', veri.ozet.risk],
          ['Pasif', veri.ozet.pasif],
          ['Siteyi kullanan', `${veri.ozet.siteyiKullanan} / ${veri.toplam}`],
          ['Bu ay davet gönderilen', veri.ozet.davetEdilen],
        ];
        autoTable(doc, {
          startY: y,
          body: ozetData,
          theme: 'plain',
          margin: { left: 15, right: 15 },
          styles: { fontSize: 10 },
          columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // Üye listesi
      doc.setTextColor(58, 23, 114);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Ekip Üyeleri', 15, y);
      y += 5;
      const uyeData = veri.ekip.map(u => [
        u.adSoyad,
        u.rank || '—',
        u.risk?.etiket || '—',
        u.curriculumPct !== null ? `%${u.curriculumPct}` : '—',
        u.sonAktiviteGun === null ? 'Hiç' : `${u.sonAktiviteGun}g`,
        u.amare?.pv || '—',
        u.amare?.gv ? formatNum(u.amare.gv) : '—',
      ]);
      autoTable(doc, {
        startY: y,
        head: [['Ad', 'Rank', 'Durum', 'Curriculum', 'Son Aktivite', 'PV', 'GV']],
        body: uyeData,
        theme: 'striped',
        headStyles: { fillColor: [58, 23, 114], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        margin: { left: 15, right: 15 },
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 22 },
          5: { cellWidth: 15 },
          6: { cellWidth: 20 },
        },
      });

      // Footer
      const sayfaSayisi = doc.internal.pages.length - 1;
      for (let i = 1; i <= sayfaSayisi; i++) {
        doc.setPage(i);
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('One Team Eğitim Sistemi · egitimtakvimi.oneteamglobal.ai', 15, ph - 8);
        doc.text(`Sayfa ${i} / ${sayfaSayisi}`, pageW - 15, ph - 8, { align: 'right' });
      }

      // Indir
      const dosyaAdi = `OneTeam_Ekip_Karnesi_${ay.replace(/\s/g, '_')}.pdf`;
      doc.save(dosyaAdi);
      setBasari(true);
      setTimeout(() => setBasari(false), 2500);
    } catch (e) {
      console.error('[PDF] err:', e);
      alert('PDF oluşturulamadı: ' + e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <button onClick={olustur} disabled={yukleniyor}
      className="w-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold py-3 rounded-2xl spring-tap text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
      {yukleniyor ? <Loader2 className="w-4 h-4 animate-spin" />
        : basari ? <Check className="w-4 h-4 text-emerald-300" />
        : <FileText className="w-4 h-4 text-amber-300" />}
      {basari ? 'PDF indirildi' : yukleniyor ? 'PDF hazırlanıyor...' : 'Aylık karne raporunu PDF indir'}
    </button>
  );
};

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

export default AylikRaporPdf;
