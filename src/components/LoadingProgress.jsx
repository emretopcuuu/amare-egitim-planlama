// Akıllı loading ekranı — animated progress + bilgilendirici metinler
// Sistem takıldı algısını engeller
import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

const LOADING_TIPS = [
  'Eğitim takvimi yükleniyor...',
  'Konuşmacılar hazırlanıyor...',
  'Yaklaşan eğitimler getiriliyor...',
  'Son güncellemeler kontrol ediliyor...',
  'Az kaldı, neredeyse hazır...',
];

const LoadingProgress = () => {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // Progress: hızlı başlar, 80%'de yavaşlar, 95%'te durur (gerçek load bitince context yenilenir)
    const tick = () => {
      setProgress(p => {
        if (p < 30) return p + 5;
        if (p < 60) return p + 3;
        if (p < 85) return p + 1.5;
        if (p < 95) return p + 0.3;
        return p; // 95'te bekler
      });
    };
    const interval = setInterval(tick, 80);

    // Tip değişimi her 2.5s
    const tipInterval = setInterval(() => {
      setTipIndex(i => (i + 1) % LOADING_TIPS.length);
    }, 2500);

    return () => { clearInterval(interval); clearInterval(tipInterval); };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-400 transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, boxShadow: '0 0 12px rgba(245, 215, 122, 0.7)' }}
        />
      </div>

      {/* Centered status */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Animated icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-pink-500 rounded-full blur-2xl opacity-50 animate-pulse" />
          <div className="relative w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-amber-400/50">
            <Sparkles className="w-10 h-10 text-amber-300 animate-pulse" />
          </div>
        </div>

        {/* Progress text */}
        <div className="text-center mb-4">
          <div className="text-white text-2xl font-extrabold font-display tabular-nums mb-1">
            %{Math.round(progress)}
          </div>
          <div className="text-amber-200 text-sm font-medium min-h-[20px] transition-opacity duration-300" key={tipIndex}>
            {LOADING_TIPS[tipIndex]}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-pink-500 to-amber-400 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%`, backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }}
            />
          </div>
        </div>

        {/* Skeleton previews — daha az ama daha şık */}
        <div className="container mx-auto max-w-7xl mt-12 w-full">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl h-20 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>

        {/* Yavaş bağlantı uyarısı 5sn sonra */}
        <SlowConnectionWarning />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

const SlowConnectionWarning = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="mt-6 text-center text-white/60 text-xs max-w-xs">
      <p>📡 Bağlantı biraz yavaş gibi görünüyor — sabırla bekleyin, son güncellemeleri çekiyoruz...</p>
    </div>
  );
};

export default LoadingProgress;
