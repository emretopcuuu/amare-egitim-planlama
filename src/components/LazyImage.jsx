// LazyImage — IntersectionObserver + blur placeholder ile akıllı image
// Yer tutucu blur'lu mor gradient → yüklenince smooth transition

import React, { useEffect, useRef, useState } from 'react';

const LazyImage = ({
  src,
  alt = '',
  className = '',
  aspectRatio = null,
  loading = 'lazy',
  onLoad,
  fallback = null,
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

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}
      style={aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined}>
      {hata && fallback}
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
