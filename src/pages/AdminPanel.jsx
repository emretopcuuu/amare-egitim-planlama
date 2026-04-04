import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { 
  LogOut, Users, Calendar, Settings, CheckCircle, XCircle, 
  RefreshCw, Download, Trash2, Eye, EyeOff 
} from 'lucide-react';

const AdminPanel = () => {
  const navigate = useNavigate();
  const {
    egitmenler,
    takvim,
    takvimYayinlandi,
    isAdmin,
    loading,
    otomatikTakvimOlustur,
    egitimSil,
    takvimDurumDegistir,
    adminCikis
  } = useData();

  const [activeTab, setActiveTab] = useState('basvurular');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin-giris');
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) {
    return null;
  }

  const handleLogout = () => {
    adminCikis();
    navigate('/');
  };

  const handleOtomatikOlustur = async () => {
    if (!window.confirm('Mevcut takvim silinecek ve yeni takvim oluşturulacak. Emin misiniz?')) {
      return;
    }

    setProcessing(true);
    const result = await otomatikTakvimOlustur();
    setProcessing(false);

    if (result.success) {
      alert(`Takvim başarıyla oluşturuldu! ${result.count} eğitim planlandı.`);
      setActiveTab('takvim');
    } else {
      alert('Takvim oluşturulamadı: ' + result.error);
    }
  };

  const handleTakvimYayinla = async () => {
    const yeniDurum = !takvimYayinlandi;
    const mesaj = yeniDurum 
      ? 'Takvim yayınlanacak ve herkes görebilecek. Emin misiniz?'
      : 'Takvim gizlenecek ve kimse göremeyecek. Emin misiniz?';

    if (!window.confirm(mesaj)) {
      return;
    }

    const result = await takvimDurumDegistir(yeniDurum);
    if (result.success) {
      alert(yeniDurum ? 'Takvim yayınlandı!' : 'Takvim gizlendi!');
    } else {
      alert('İşlem başarısız: ' + result.error);
    }
  };

  const handleEgitimSil = async (egitimId, egitimAdi) => {
    if (!window.confirm(`"${egitimAdi}" eğitimini silmek istediğinize emin misiniz?`)) {
      return;
    }

    const result = await egitimSil(egitimId);
    if (result.success) {
      alert('Eğitim silindi!');
    } else {
      alert('Silme işlemi başarısız: ' + result.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-800 text-white py-4 px-6 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Amare Admin Paneli</h1>
          <button
            onClick={handleLogout}
            className="flex items-center bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('basvurular')}
              className={`py-4 px-2 border-b-2 font-semibold transition-colors ${
                activeTab === 'basvurular'
                  ? 'border-amare-purple text-amare-purple'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Başvurular ({egitmenler.length})
            </button>
            <button
              onClick={() => setActiveTab('takvim')}
              className={`py-4 px-2 border-b-2 font-semibold transition-colors ${
                activeTab === 'takvim'
                  ? 'border-amare-purple text-amare-purple'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Calendar className="w-5 h-5 inline mr-2" />
              Takvim ({takvim.length})
            </button>
            <button
              onClick={() => setActiveTab('ayarlar')}
              className={`py-4 px-2 border-b-2 font-semibold transition-colors ${
                activeTab === 'ayarlar'
                  ? 'border-amare-purple text-amare-purple'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings className="w-5 h-5 inline mr-2" />
              Ayarlar
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 px-4">
        {/* Başvurular Tab */}
        {activeTab === 'basvurular' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Eğitmen Başvuruları
              </h2>
              <p className="text-gray-600 mb-4">
                Toplam {egitmenler.length} başvuru alındı
              </p>
            </div>

            {egitmenler.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz başvuru yapılmadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {egitmenler.map((egitmen, index) => (
                  <div key={egitmen.id || index} className="bg-white rounded-lg shadow p-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                          {egitmen.adSoyad}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Kariyer:</span>{' '}
                            <span className="font-semibold">{egitmen.kariyerSeviyesi}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Telefon:</span>{' '}
                            <span className="font-semibold">{egitmen.telefon}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Email:</span>{' '}
                            <span className="font-semibold">{egitmen.email}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Deneyim:</span>{' '}
                            <span className="font-semibold">{egitmen.deneyim}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-3">
                          <div className="text-sm text-gray-500 mb-1">Verebileceği Eğitimler:</div>
                          <div className="flex flex-wrap gap-2">
                            {egitmen.egitimler.map((eg, i) => (
                              <span key={i} className="bg-amare-purple/10 text-amare-purple px-3 py-1 rounded-full text-xs font-semibold">
                                {eg}
                              </span>
                            ))}
                          </div>
                        </div>
                        {egitmen.ozelKonu && (
                          <div className="mb-3">
                            <div className="text-sm text-gray-500 mb-1">Özel Konu:</div>
                            <div className="text-sm bg-yellow-50 px-3 py-2 rounded">
                              {egitmen.ozelKonu}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500 mb-1">Uygun Günler:</div>
                            <div className="font-semibold">{egitmen.uygunGunler.join(', ')}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Uygun Saatler:</div>
                            <div className="font-semibold">{egitmen.uygunSaatler.join(', ')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Takvim Tab */}
        {activeTab === 'takvim' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Eğitim Takvimi
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Toplam {takvim.length} eğitim planlandı
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleOtomatikOlustur}
                    disabled={processing || egitmenler.length === 0}
                    className="flex items-center bg-amare-purple text-white px-4 py-2 rounded-lg hover:bg-amare-dark transition-colors disabled:bg-gray-400"
                  >
                    <RefreshCw className={`w-5 h-5 mr-2 ${processing ? 'animate-spin' : ''}`} />
                    {processing ? 'Oluşturuluyor...' : 'Otomatik Oluştur'}
                  </button>
                </div>
              </div>
            </div>

            {takvim.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Henüz takvim oluşturulmadı</p>
                {egitmenler.length > 0 && (
                  <button
                    onClick={handleOtomatikOlustur}
                    className="bg-amare-purple text-white px-6 py-3 rounded-lg font-semibold hover:bg-amare-dark transition-colors"
                  >
                    Otomatik Takvim Oluştur
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {[1, 2, 3, 4].map(haftaNo => {
                  const haftaEgitimleri = takvim.filter(e => e.hafta === haftaNo);
                  
                  if (haftaEgitimleri.length === 0) return null;
                  
                  return (
                    <div key={haftaNo} className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-xl font-bold text-amare-purple mb-4">
                        Hafta {haftaNo} ({haftaEgitimleri.length} eğitim)
                      </h3>
                      <div className="space-y-3">
                        {haftaEgitimleri.map((egitim, index) => (
                          <div key={egitim.id || index} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-bold text-gray-800">{egitim.egitim}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {egitim.gun} {egitim.tarih} - {egitim.saat} ({egitim.sure}) - {egitim.egitmen}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEgitimSil(egitim.id, egitim.egitim)}
                              className="text-red-500 hover:text-red-700 p-2"
                              title="Sil"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Ayarlar Tab */}
        {activeTab === 'ayarlar' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Takvim Ayarları
              </h2>

              {/* Takvim Durumu */}
              <div className="border-b pb-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Takvim Görünürlüğü
                </h3>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-800 mb-1">
                      Takvim Durumu
                    </div>
                    <div className="text-sm text-gray-600">
                      {takvimYayinlandi 
                        ? 'Takvim yayınlandı - Herkes görebilir'
                        : 'Takvim gizli - Sadece admin görebilir'
                      }
                    </div>
                  </div>
                  <button
                    onClick={handleTakvimYayinla}
                    className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                      takvimYayinlandi
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {takvimYayinlandi ? (
                      <>
                        <EyeOff className="w-5 h-5 mr-2" />
                        Takvimi Gizle
                      </>
                    ) : (
                      <>
                        <Eye className="w-5 h-5 mr-2" />
                        Takvimi Yayınla
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* İstatistikler */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  İstatistikler
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-blue-600 font-semibold mb-1">
                      Toplam Başvuru
                    </div>
                    <div className="text-3xl font-bold text-blue-700">
                      {egitmenler.length}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-600 font-semibold mb-1">
                      Planlanan Eğitim
                    </div>
                    <div className="text-3xl font-bold text-purple-700">
                      {takvim.length}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-green-600 font-semibold mb-1">
                      Takvim Durumu
                    </div>
                    <div className="text-lg font-bold text-green-700">
                      {takvimYayinlandi ? 'Yayında' : 'Gizli'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
