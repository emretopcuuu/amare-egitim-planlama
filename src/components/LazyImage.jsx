// LazyImage — IntersectionObserver + blur placeholder ile akıllı image
// Yer tutucu blur'lu mor gradient → yüklenince smooth transition
// Hata: kullanıcı dostu fallback (initials veya placeholder)

import React, { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';

const LazyImage = ({
  src,
  alt = '',
  className = '',
  aspectRatio = null,
  loading = 'lazy',
  onLoad,
  fallback = null,
  fallbackInitials = null,
  ...props
}) => {
  const [yuklendi, setYuklendi] = useState(false);
  const [hata, setHata] = useState(false);
  const [gorulebilir, setGorulebilir] = useState(loading !== 'lazy');
  const ref = useRef(null);

  useEffect(() => {
    if (gorulebilir || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setGorulebilir(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' } // 200px önce yüklemeye başla
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [gorulebilir]);

  function handleLoad() {
    setYuklendi(true);
    onLoad?.();
  }

  function handleError() {
    setHata(true);
  }

  // Hata durumu için default fallback — initials veya icon
  const hataFallback = hata && (fallback || (
    fallbackInitials ? (
      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-bold text-base">
        {fallbackInitials.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
      </div>
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-purple-700/40 to-indigo-700/40 flex items-center justify-center text-white/40">
        <ImageOff className="w-1/3 h-1/3" />
      </div>
    )
  ));

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}
      style={aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined}>
      {hataFallback}
      {!hata && gorulebilir && src && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover img-blur-load ${yuklendi ? 'img-loaded' : ''}`}
          {...props}
        />
      )}
      {(!gorulebilir || (!yuklendi && !hata)) && (
        <div className="absolute inset-0 skeleton-shimmer" />
      )}
    </div>
  );
};

export default LazyImage;
