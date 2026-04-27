import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import { Shield, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { adminGiris, isAdmin, authLoading } = useData();
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Zaten admin ise direkt panele yönlendir
  useEffect(() => {
    if (!authLoading && isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await adminGiris();
      if (result.success) {
        navigate('/admin');
      } else if (result.error) {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('back_home')}
          </button>
          <LanguageSwitcher />
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-gray-700 rounded-full p-4">
            <Shield className="w-12 h-12 text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          {t('admin_title')}
        </h2>
        <p className="text-gray-600 text-center mb-8">
          Admin paneline erişmek için yetkili Google hesabınızla giriş yapın.
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || authLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Giriş yapılıyor...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Google ile Giriş Yap
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 mt-6 text-center">
          Sadece yetkili hesaplar admin paneline erişebilir.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
