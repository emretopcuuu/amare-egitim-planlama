import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import {
  LogOut, Users, Calendar, Settings, CheckCircle, XCircle,
  RefreshCw, Download, Trash2, Eye, EyeOff, Upload, FileSpreadsheet,
  UserCircle, Camera, X, ImageIcon, Key, Save
} from 'lucide-react';
import GorselOlusturModal from '../components/GorselOlusturModal';

const AdminPanel = () => {
  const navigate = useNavigate();
  const {
    egitmenler,
    takvim,
    takvimYayinlandi,
    isAdmin,
    loading,
    otomatikTakvimOlustur,
    exceldenTakvimYukle,
    egitimSil,
    konusmacilar,
    konusmaciFotoYukle,
    konusmaciFotoSil,
    geminiApiKey,
    geminiApiKeyKaydet,
    sablonlar,
    sablonEkle,
    sablonSil,
    takvimDurumDegistir,
    adminCikis
  } = useData();

  const [activeTab, setActiveTab] = useState('basvurular');
  const [processing, setProcessing] = useState(false);
  const [fotoUploadingId, setFotoUploadingId] = useState(null);
  const [gorselModal, setGorselModal] = useState(null); // { egitim, egitmenFotoURL }
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [sablonYukleniyor, setSablonYukleniyor] = useState(false);

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

  const handleExcelYukle = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Lütfen bir Excel dosyası (.xlsx) seçin.');
      return;
    }

    if (!window.confirm(`"${file.name}" dosyası yüklenecek ve mevcut takvim silinecek. Emin misiniz?`)) {
      e.target.value = '';
      return;
    }

    setProcessing(true);
    const result = await exceldenTakvimYukle(file);
    setProcessing(false);
    e.target.value = '';

    if (result.success) {
      alert(`Takvim başarıyla yüklendi! ${result.count} eğitim eklendi.`);
      setActiveTab('takvim');
    } else {
      alert('Yükleme başarısız: ' + result.error);
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

  // Takvimden benzersiz konuşmacıları çıkar
  const benzersizKonusmacilar = [...new Set(
    takvim
      .map(e => e.egitmen)
      .filter(Boolean)
      .flatMap(e => e.split(/[\/,]/).map(n => n.trim()).filter(n => n.length > 1))
  )].sort();

  const handleFotoYukle = async (konusmaciAdi, file) => {
    if (!file) return;
    const safeId = konusmaciAdi.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    setFotoUploadingId(safeId);
    const result = await konusmaciFotoYukle(konusmaciAdi, file);
    setFotoUploadingId(null);
    if (!result.success) {
      alert('Fotoğraf yüklenemedi: ' + result.error);
    }
  };

  const handleFotoSil = async (konusmaciId, konusmaciAd) => {
    if (!window.confirm(`"${konusmaciAd}" fotoğrafını silmek istediğinize emin misiniz?`)) return;
    const result = await konusmaciFotoSil(konusmaciId, konusmaciAd);
    if (!result.success) {
      alert('Silme başarısız: ' + result.error);
    }
  };

  const handleGorselAc = (egitim) => {
    // Konuşmacının kaydedilmiş fotoğrafını bul
    const konusmacilar2 = konusmacilar || [];
    const egitmenAdlari = (egitim.egitmen || '').split(/[\/,]/).map(n => n.trim()).filter(Boolean);
    let fotoURL = null;
    for (const ad of egitmenAdlari) {
      const safeId = ad.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const k = konusmacilar2.find(k => k.id === safeId);
      if (k?.fotoURL) { fotoURL = k.fotoURL; break; }
    }
    setGorselModal({ egitim, egitmenFotoURL: fotoURL });
  };

  const handleApiKeySave = () => {
    geminiApiKeyKaydet(apiKeyInput.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  const handleSablonYukle = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setSablonYukleniyor(true);
    try {
      const ad = file.name.replace(/\.[^.]+$/, '');
      const result = await sablonEkle(ad, file);
      if (!result.success) alert('Şablon yüklenemedi: ' + result.error);
    } catch (err) {
      alert('Şablon yüklenemedi: ' + err.message);
    } finally {
      setSablonYukleniyor(false);
    }
  };

  const handleSablonSil = async (sablonId, sablonAd) => {
    if (!window.confirm(`"${sablonAd}" şablonunu silmek istediğinize emin misiniz?`)) return;
    const result = await sablonSil(sablonId);
    if (!result.success) alert('Silme başarısız: ' + result.error);
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
              onClick={() => setActiveTab('konusmacilar')}
              className={`py-4 px-2 border-b-2 font-semibold transition-colors ${
                activeTab === 'konusmacilar'
                  ? 'border-amare-purple text-amare-purple'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <UserCircle className="w-5 h-5 inline mr-2" />
              Konuşmacılar ({benzersizKonusmacilar.length})
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
                  <label
                    className={`flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer ${processing ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    {processing ? 'Yükleniyor...' : 'Excel Yükle'}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelYukle}
                      className="hidden"
                      disabled={processing}
                    />
                  </label>
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
                          <div key={egitim.id || index} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between group hover:border-amare-purple/40 hover:bg-purple-50/30 transition-colors">
                            <div className="flex-1">
                              <div className="font-bold text-gray-800">{egitim.egitim}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {egitim.gun} {egitim.tarih} - {egitim.saat}{egitim.bitisSaati ? `-${egitim.bitisSaati}` : ''} ({egitim.sure})
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {egitim.egitmen && <span>Konuşmacı: {egitim.egitmen}</span>}
                                {egitim.yer && <span className="ml-3">Yer: {egitim.yer}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleGorselAc(egitim)}
                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-amare-purple text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amare-dark transition-all"
                                title="Görsel Hazırla"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                Görsel Hazırla
                              </button>
                              <button
                                onClick={() => handleEgitimSil(egitim.id, egitim.egitim)}
                                className="text-red-500 hover:text-red-700 p-2"
                                title="Sil"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
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

        {/* Konuşmacılar Tab */}
        {activeTab === 'konusmacilar' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Konuşmacılar</h2>
              <p className="text-gray-500 text-sm">
                Takvimden otomatik oluşturulan konuşmacı listesi. Her konuşmacı için fotoğraf yükleyebilirsiniz.
              </p>
            </div>

            {benzersizKonusmacilar.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Takvimde henüz konuşmacı yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {benzersizKonusmacilar.map((ad) => {
                  const safeId = ad.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                  const kayitliKonusmaci = konusmacilar.find(k => k.id === safeId);
                  const isUploading = fotoUploadingId === safeId;

                  return (
                    <div key={safeId} className="bg-white rounded-xl shadow p-4 flex flex-col items-center gap-3">
                      {/* Fotoğraf Alanı */}
                      <div className="relative w-24 h-24">
                        {kayitliKonusmaci?.fotoURL ? (
                          <>
                            <img
                              src={kayitliKonusmaci.fotoURL}
                              alt={ad}
                              className="w-24 h-24 rounded-full object-cover border-2 border-amare-purple"
                            />
                            <button
                              onClick={() => handleFotoSil(safeId, ad)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                              title="Fotoğrafı sil"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                            <UserCircle className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-amare-purple border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* İsim */}
                      <p className="text-center text-sm font-semibold text-gray-800 leading-tight">{ad}</p>

                      {/* Upload Butonu */}
                      <label className="cursor-pointer flex items-center gap-1 text-xs bg-amare-purple text-white px-3 py-1.5 rounded-lg hover:bg-amare-dark transition-colors">
                        <Camera className="w-3 h-3" />
                        {kayitliKonusmaci?.fotoURL ? 'Değiştir' : 'Fotoğraf Yükle'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            if (e.target.files[0]) handleFotoYukle(ad, e.target.files[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
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

              {/* Gemini API Key */}
              <div className="border-b pb-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amare-purple" />
                  Görsel Oluşturma (Nanobanana / Gemini API)
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Eğitim görseli oluşturmak için Google AI Studio'dan aldığınız API anahtarını girin.{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amare-purple underline">
                    API anahtarı al →
                  </a>
                </p>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => { setApiKeyInput(e.target.value); setApiKeySaved(false); }}
                    placeholder="AIzaSy..."
                    className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/40"
                  />
                  <button
                    onClick={handleApiKeySave}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${apiKeySaved ? 'bg-green-500 text-white' : 'bg-amare-purple text-white hover:bg-amare-dark'}`}
                  >
                    <Save className="w-4 h-4" />
                    {apiKeySaved ? 'Kaydedildi!' : 'Kaydet'}
                  </button>
                </div>
                {geminiApiKey && (
                  <p className="text-xs text-green-600 mt-1">✅ API anahtarı kayıtlı</p>
                )}
              </div>

              {/* Şablon Görseller */}
              <div className="border-b pb-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-amare-purple" />
                      Şablon Görseller
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">Görsel hazırlarken kullanılacak şablon tasarımları</p>
                  </div>
                  <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-colors ${sablonYukleniyor ? 'bg-gray-400' : 'bg-amare-purple hover:bg-amare-dark'}`}>
                    <Upload className="w-4 h-4" />
                    {sablonYukleniyor ? 'Yükleniyor...' : 'Şablon Ekle'}
                    <input type="file" accept="image/*" className="hidden" disabled={sablonYukleniyor} onChange={handleSablonYukle} />
                  </label>
                </div>
                {sablonlar.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm">
                    Henüz şablon eklenmedi
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {sablonlar.map((s) => (
                      <div key={s.id} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                        <img src={s.url} alt={s.ad} className="w-full aspect-square object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                          <p className="text-white text-xs text-center font-medium leading-tight line-clamp-2">{s.ad}</p>
                          <button
                            onClick={() => handleSablonSil(s.id, s.ad)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-2 py-1 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Sil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Görsel Oluşturma Modal */}
      {gorselModal && (
        <GorselOlusturModal
          egitim={gorselModal.egitim}
          egitmenFotoURL={gorselModal.egitmenFotoURL}
          apiKey={geminiApiKey}
          sablonlar={sablonlar}
          onClose={() => setGorselModal(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
