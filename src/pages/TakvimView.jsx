import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Download, Calendar, Clock, User, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const TakvimView = () => {
  const navigate = useNavigate();
  const { takvim, takvimYayinlandi, loading } = useData();

  // Takvimi haftalara göre grupla
  const haftalikTakvim = {};
  for (let i = 1; i <= 4; i++) {
    haftalikTakvim[i] = takvim.filter(e => e.hafta === i);
  }

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(107, 70, 193);
    doc.text('AMARE - MAYIS 2026 EĞİTİM TAKVİMİ', 14, 20);
    
    let yPos = 35;
    
    for (let hafta = 1; hafta <= 4; hafta++) {
      const egitimler = haftalikTakvim[hafta];
      
      if (egitimler.length === 0) continue;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Hafta ${hafta}`, 14, yPos);
      yPos += 10;
      
      const tableData = egitimler.map(e => [
        `${e.gun} ${e.tarih}`,
        e.saat,
        e.egitim,
        e.egitmen,
        e.sure
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Tarih', 'Saat', 'Eğitim', 'Eğitmen', 'Süre']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [107, 70, 193] }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    }
    
    doc.save('AMARE_Mayis_2026_Egitim_Takvimi.pdf');
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
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Takvim Henüz Yayınlanmadı
            </h2>
            <p className="text-gray-600 mb-6">
              Mayıs 2026 eğitim takvimi henüz yayınlanmadı. Takvim hazır olduğunda burada görüntülenecektir.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-amare-purple text-white px-6 py-3 rounded-lg font-semibold hover:bg-amare-dark transition-colors"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amare-purple to-amare-blue py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-amare-purple hover:text-amare-dark mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Ana Sayfaya Dön
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Mayıs 2026 Eğitim Takvimi
              </h1>
              <p className="text-gray-600">
                Toplam {takvim.length} eğitim planlandı
              </p>
            </div>
            <button
              onClick={exportPDF}
              className="mt-4 md:mt-0 flex items-center bg-amare-purple text-white px-6 py-3 rounded-lg font-semibold hover:bg-amare-dark transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              PDF İndir
            </button>
          </div>
        </div>

        {/* Takvim - Haftalık */}
        {[1, 2, 3, 4].map(haftaNo => {
          const haftaEgitimleri = haftalikTakvim[haftaNo];
          
          if (haftaEgitimleri.length === 0) return null;
          
          const haftaBasliklari = [
            "Hafta 1 (1-7 Mayıs) - Motivasyon & Temel",
            "Hafta 2 (8-14 Mayıs) - Aksiyon & Satış",
            "Hafta 3 (15-21 Mayıs) - Liderlik & Sistem",
            "Hafta 4 (22-31 Mayıs) - Büyüme & Kariyer"
          ];
          
          return (
            <div key={haftaNo} className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-amare-purple mb-6">
                {haftaBasliklari[haftaNo - 1]}
              </h2>
              
              <div className="space-y-4">
                {haftaEgitimleri.map((egitim, index) => (
                  <div
                    key={egitim.id || index}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-amare-purple mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-gray-500">Tarih</div>
                          <div className="font-semibold text-gray-800">
                            {egitim.gun} {egitim.tarih}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 text-amare-blue mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-gray-500">Saat & Süre</div>
                          <div className="font-semibold text-gray-800">
                            {egitim.saat} ({egitim.sure})
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <div className="text-sm text-gray-500 mb-1">Eğitim Konusu</div>
                        <div className="font-bold text-gray-800 text-lg">
                          {egitim.egitim}
                        </div>
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
                        <strong>Platform:</strong> Zoom (Link eğitim gününde paylaşılacaktır)
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
