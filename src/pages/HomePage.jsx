import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Shield, Sparkles } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amare-purple via-amare-blue to-amare-light">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-6">
            <Sparkles className="w-20 h-20 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            ONE TEAM
          </h1>
          <h2 className="text-3xl md:text-4xl font-semibold text-white/90 mb-4">
            Eğitim Planlama Sistemi
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Diamond ve üzeri liderler için profesyonel eğitim takvimi
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Eğitmen Başvuru Kartı */}
          <div 
            onClick={() => navigate('/egitmen-basvuru')}
            className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-amare-purple rounded-full p-4">
                <Users className="w-12 h-12 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
              Eğitmen Başvurusu
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Eğitim takviminde yer almak için başvurunuzu yapın
            </p>
            <button className="w-full bg-amare-purple text-white py-3 rounded-lg font-semibold hover:bg-amare-dark transition-colors">
              Başvur
            </button>
          </div>

          {/* Takvim Görüntüle Kartı */}
          <div 
            onClick={() => navigate('/takvim')}
            className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-amare-blue rounded-full p-4">
                <Calendar className="w-12 h-12 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
              Eğitim Takvimi
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Eğitim takvimini görüntüleyin ve indirin
            </p>
            <button className="w-full bg-amare-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Takvimi Gör
            </button>
          </div>

          {/* Admin Girişi Kartı */}
          <div 
            onClick={() => navigate('/admin-giris')}
            className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-gray-700 rounded-full p-4">
                <Shield className="w-12 h-12 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
              Eğitim Komisyonu Admin Paneli
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Başvuruları yönetin ve takvimi düzenleyin
            </p>
            <button className="w-full bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
              Giriş Yap
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 max-w-3xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-4 text-center">
            Nasıl Çalışır?
          </h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                <span className="font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Başvuru Yapın</h4>
                <p className="text-white/80">
                  Diamond ve üzeri liderler, verebilecekleri eğitimleri ve uygun oldukları günleri belirtir
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                <span className="font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Otomatik Planlama</h4>
                <p className="text-white/80">
                  Sistem, tüm başvuruları optimize ederek dengeli bir eğitim takvimi oluşturur
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                <span className="font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Takvim Yayınlanır</h4>
                <p className="text-white/80">
                  Tüm ekip, eğitim takvimini görebilir ve eğitimlere katılabilir
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-white/70">
          <p>© 2026 Amare Global | Powered by OneTeam10x</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
