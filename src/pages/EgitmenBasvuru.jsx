import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const EGITIM_SECENEKLERI = [
  "Yeni başlangıç eğitimi",
  "Ürün eğitimi",
  "İtiraz karşılama",
  "Görüşme üretme",
  "Liderlik",
  "Takım motivasyonu",
  "Sosyal medya kullanımı",
  "Hikâye anlatımı / Story selling",
  "Kapanış teknikleri",
  "Kariyer planlama",
  "Haftalık aksiyon yönetimi",
  "Network büyütme",
  "Duygusal dayanıklılık",
  "Diamond'a giden yol",
  "Sahne / Sunum eğitimi"
];

const EgitmenBasvuru = () => {
  const navigate = useNavigate();
  const { egitmenEkle } = useData();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    adSoyad: '',
    telefon: '',
    email: '',
    kariyerSeviyesi: '',
    egitimVermekIster: 'Evet',
    egitimler: [],
    ozelKonu: '',
    deneyim: '',
    uygunGunler: [],
    uygunSaatler: [],
    sureTercihi: '45 dakika'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validasyon
    if (!formData.adSoyad || !formData.telefon || !formData.email) {
      setError('Lütfen tüm zorunlu alanları doldurun');
      setLoading(false);
      return;
    }

    if (formData.egitimler.length === 0 && !formData.ozelKonu) {
      setError('Lütfen en az bir eğitim konusu seçin veya özel konu belirtin');
      setLoading(false);
      return;
    }

    if (formData.uygunGunler.length === 0 || formData.uygunSaatler.length === 0) {
      setError('Lütfen uygun olduğunuz gün ve saatleri seçin');
      setLoading(false);
      return;
    }

    try {
      const result = await egitmenEkle(formData);
      if (result.success) {
        setSubmitted(true);
        // 3 saniye sonra ana sayfaya yönlendir
        setTimeout(() => navigate('/'), 3000);
      } else {
        setError('Başvuru kaydedilemedi. Lütfen tekrar deneyin.');
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amare-purple to-amare-blue flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Başvurunuz Alındı!
          </h2>
          <p className="text-gray-600 mb-6">
            Mayıs 2026 eğitim takviminde yer almak için başvurunuz başarıyla kaydedildi.
            Takvim yayınlandığında size bildirim yapılacaktır.
          </p>
          <p className="text-sm text-gray-500">
            Ana sayfaya yönlendiriliyorsunuz...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amare-purple to-amare-blue py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-amare-purple hover:text-amare-dark mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Ana Sayfaya Dön
          </button>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Eğitmen Başvuru Formu
          </h1>
          <p className="text-gray-600">
            Mayıs 2026 eğitim takviminde yer almak için lütfen formu eksiksiz doldurun.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Ad Soyad */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Ad Soyad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.adSoyad}
              onChange={(e) => setFormData({ ...formData, adSoyad: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent"
              required
            />
          </div>

          {/* Telefon */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Telefon (WhatsApp) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent"
              placeholder="05XX XXX XX XX"
              required
            />
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              E-posta <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent"
              required
            />
          </div>

          {/* Kariyer Seviyesi */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Kariyer Seviyeniz <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.kariyerSeviyesi}
              onChange={(e) => setFormData({ ...formData, kariyerSeviyesi: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent"
              required
            >
              <option value="">Seçin...</option>
              <option value="Diamond">Diamond</option>
              <option value="1 Star Diamond">1 Star Diamond</option>
              <option value="2 Star Diamond">2 Star Diamond</option>
              <option value="Presidential Diamond">Presidential Diamond</option>
              <option value="Above Presidential">Above Presidential</option>
            </select>
          </div>

          {/* Eğitimler */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">
              Hangi eğitimleri verebilirsiniz? <span className="text-red-500">*</span>
            </label>
            <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {EGITIM_SECENEKLERI.map((egitim) => (
                <label key={egitim} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.egitimler.includes(egitim)}
                    onChange={() => handleCheckboxChange('egitimler', egitim)}
                    className="w-4 h-4 text-amare-purple focus:ring-amare-purple border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700 text-sm">{egitim}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Özel Konu */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Kendi özel eğitim konunuz (Opsiyonel)
            </label>
            <textarea
              value={formData.ozelKonu}
              onChange={(e) => setFormData({ ...formData, ozelKonu: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent"
              rows="3"
              placeholder="Örnek: Satış psikolojisi, Takım kültürü, vb."
            />
          </div>

          {/* Deneyim */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Bu eğitimi daha önce verdiniz mi? <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.deneyim}
              onChange={(e) => setFormData({ ...formData, deneyim: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent"
              required
            >
              <option value="">Seçin...</option>
              <option value="Evet, birçok kez (5+)">Evet, birçok kez (5+)</option>
              <option value="Evet, birkaç kez (2-4)">Evet, birkaç kez (2-4)</option>
              <option value="İlk defa vereceğim">İlk defa vereceğim</option>
            </select>
          </div>

          {/* Uygun Günler */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">
              Uygun olduğunuz günler <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'].map((gun) => (
                <label key={gun} className="flex items-center cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.uygunGunler.includes(gun)}
                    onChange={() => handleCheckboxChange('uygunGunler', gun)}
                    className="w-4 h-4 text-amare-purple focus:ring-amare-purple border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700">{gun}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Uygun Saatler */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">
              Uygun olduğunuz saatler <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {['08:00', '21:00', '22:00'].map((saat) => (
                <label key={saat} className="flex items-center cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.uygunSaatler.includes(saat)}
                    onChange={() => handleCheckboxChange('uygunSaatler', saat)}
                    className="w-4 h-4 text-amare-purple focus:ring-amare-purple border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700">{saat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Süre Tercihi */}
          <div className="mb-8">
            <label className="block text-gray-700 font-semibold mb-3">
              Eğitim süresi tercihiniz <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="30 dakika"
                  checked={formData.sureTercihi === '30 dakika'}
                  onChange={(e) => setFormData({ ...formData, sureTercihi: e.target.value })}
                  className="w-4 h-4 text-amare-purple focus:ring-amare-purple"
                />
                <span className="ml-2 text-gray-700">30 dakika</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="45 dakika"
                  checked={formData.sureTercihi === '45 dakika'}
                  onChange={(e) => setFormData({ ...formData, sureTercihi: e.target.value })}
                  className="w-4 h-4 text-amare-purple focus:ring-amare-purple"
                />
                <span className="ml-2 text-gray-700">45 dakika</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amare-purple text-white py-4 rounded-lg font-bold text-lg hover:bg-amare-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
          </button>

          <p className="text-sm text-gray-500 mt-4 text-center">
            <span className="text-red-500">*</span> Zorunlu alanlar
          </p>
        </form>
      </div>
    </div>
  );
};

export default EgitmenBasvuru;
