import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const TRAINING_KEYS = [
  'training_beginner', 'training_product', 'training_objection',
  'training_leads', 'training_leadership', 'training_motivation',
  'training_social', 'training_storytelling', 'training_closing',
  'training_career', 'training_action', 'training_network',
  'training_resilience', 'training_diamond', 'training_stage',
];

// Original Turkish names for Firebase storage
const TRAINING_TR = [
  "Yeni başlangıç eğitimi", "Ürün eğitimi", "İtiraz karşılama",
  "Görüşme üretme", "Liderlik", "Takım motivasyonu",
  "Sosyal medya kullanımı", "Hikâye anlatımı / Story selling", "Kapanış teknikleri",
  "Kariyer planlama", "Haftalık aksiyon yönetimi", "Network büyütme",
  "Duygusal dayanıklılık", "Diamond'a giden yol", "Sahne / Sunum eğitimi",
];

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

const EgitmenBasvuru = () => {
  const navigate = useNavigate();
  const { egitmenEkle } = useData();
  const { t } = useTranslation();
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

    if (!formData.adSoyad || !formData.telefon || !formData.email) {
      setError(t('form_err_required'));
      setLoading(false);
      return;
    }

    if (formData.egitimler.length === 0 && !formData.ozelKonu) {
      setError(t('form_err_topic'));
      setLoading(false);
      return;
    }

    if (formData.uygunGunler.length === 0 || formData.uygunSaatler.length === 0) {
      setError(t('form_err_schedule'));
      setLoading(false);
      return;
    }

    try {
      const result = await egitmenEkle(formData);
      if (result.success) {
        setSubmitted(true);
        setTimeout(() => navigate('/'), 3000);
      } else {
        setError(t('form_err_save'));
      }
    } catch (err) {
      setError(t('form_err_generic'));
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
            {t('form_success_title')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('form_success_desc')}
          </p>
          <p className="text-sm text-gray-500">
            {t('form_success_redirect')}
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
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-amare-purple hover:text-amare-dark"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('back_home')}
            </button>
            <LanguageSwitcher />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {t('form_title')}
          </h1>
          <p className="text-gray-600">
            {t('form_desc')}
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

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              {t('form_name')} <span className="text-red-500">*</span>
            </label>
            <input type="text" value={formData.adSoyad}
              onChange={(e) => setFormData({ ...formData, adSoyad: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent" required />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              {t('form_phone')} <span className="text-red-500">*</span>
            </label>
            <input type="tel" value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent"
              placeholder={t('form_phone_placeholder')} required />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              {t('form_email')} <span className="text-red-500">*</span>
            </label>
            <input type="email" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent" required />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              {t('form_career')} <span className="text-red-500">*</span>
            </label>
            <select value={formData.kariyerSeviyesi}
              onChange={(e) => setFormData({ ...formData, kariyerSeviyesi: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent" required>
              <option value="">{t('select')}</option>
              <option value="Leader">Leader</option>
              <option value="Senior Leader">Senior Leader</option>
              <option value="Executive Leader">Executive Leader</option>
              <option value="Diamond">Diamond</option>
              <option value="1 Star Diamond">1 Star Diamond</option>
              <option value="2 Star Diamond">2 Star Diamond</option>
              <option value="3 Star Diamond">3 Star Diamond</option>
              <option value="Presidential Diamond">Presidential Diamond</option>
              <option value="Kurumsal">{t('form_corporate')}</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">
              {t('form_trainings')} <span className="text-red-500">*</span>
            </label>
            <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {TRAINING_KEYS.map((key, i) => (
                <label key={key} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input type="checkbox"
                    checked={formData.egitimler.includes(TRAINING_TR[i])}
                    onChange={() => handleCheckboxChange('egitimler', TRAINING_TR[i])}
                    className="w-4 h-4 text-amare-purple focus:ring-amare-purple border-gray-300 rounded" />
                  <span className="ml-2 text-gray-700 text-sm">{t(key)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              {t('form_custom_topic')}
            </label>
            <textarea value={formData.ozelKonu}
              onChange={(e) => setFormData({ ...formData, ozelKonu: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent"
              rows="3" placeholder={t('form_custom_placeholder')} />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              {t('form_experience')} <span className="text-red-500">*</span>
            </label>
            <select value={formData.deneyim}
              onChange={(e) => setFormData({ ...formData, deneyim: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amare-purple focus:border-transparent" required>
              <option value="">{t('select')}</option>
              <option value="Evet, birçok kez (5+)">{t('form_exp_many')}</option>
              <option value="Evet, birkaç kez (2-4)">{t('form_exp_few')}</option>
              <option value="İlk defa vereceğim">{t('form_exp_first')}</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">
              {t('form_days')} <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {DAY_KEYS.map((key, i) => (
                <label key={key} className="flex items-center cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg">
                  <input type="checkbox"
                    checked={formData.uygunGunler.includes(DAYS_TR[i])}
                    onChange={() => handleCheckboxChange('uygunGunler', DAYS_TR[i])}
                    className="w-4 h-4 text-amare-purple focus:ring-amare-purple border-gray-300 rounded" />
                  <span className="ml-2 text-gray-700">{t(key)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">
              {t('form_hours')} <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {['08:00', '21:00', '22:00'].map((saat) => (
                <label key={saat} className="flex items-center cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg">
                  <input type="checkbox"
                    checked={formData.uygunSaatler.includes(saat)}
                    onChange={() => handleCheckboxChange('uygunSaatler', saat)}
                    className="w-4 h-4 text-amare-purple focus:ring-amare-purple border-gray-300 rounded" />
                  <span className="ml-2 text-gray-700">{saat}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-gray-700 font-semibold mb-3">
              {t('form_duration')} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {['30 dakika', '45 dakika'].map((val, i) => (
                <label key={val} className="flex items-center cursor-pointer">
                  <input type="radio" value={val}
                    checked={formData.sureTercihi === val}
                    onChange={(e) => setFormData({ ...formData, sureTercihi: e.target.value })}
                    className="w-4 h-4 text-amare-purple focus:ring-amare-purple" />
                  <span className="ml-2 text-gray-700">{i === 0 ? t('form_30min') : t('form_45min')}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-amare-purple text-white py-4 rounded-lg font-bold text-lg hover:bg-amare-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            {loading ? t('form_submitting') : t('form_submit')}
          </button>

          <p className="text-sm text-gray-500 mt-4 text-center">
            <span className="text-red-500">*</span> {t('required_fields')}
          </p>
        </form>
      </div>
    </div>
  );
};

export default EgitmenBasvuru;
