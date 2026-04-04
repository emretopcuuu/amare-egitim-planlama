import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Shield, ArrowLeft, AlertCircle } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { adminGiris } = useData();
  const [sifre, setSifre] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (adminGiris(sifre)) {
      navigate('/admin');
    } else {
      setError('Hatalı şifre! Lütfen tekrar deneyin.');
      setSifre('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Ana Sayfaya Dön
        </button>

        <div className="flex justify-center mb-6">
          <div className="bg-gray-700 rounded-full p-4">
            <Shield className="w-12 h-12 text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Admin Girişi
        </h2>
        <p className="text-gray-600 text-center mb-8">
          Başvuruları yönetmek için şifrenizi girin
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Şifre
            </label>
            <input
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent"
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gray-700 text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors"
          >
            Giriş Yap
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Şifrenizi unuttuysan z sistem yöneticisine başvurun
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
