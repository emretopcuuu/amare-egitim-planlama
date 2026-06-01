// useScrollReveal — element görünür alana girdiğinde class ekleyen hook
// Tek bir intersection observer'la performanslı.
//
// Kullanım:
//   const ref = useScrollReveal();
//   <div ref={ref} className="scroll-reveal">...</div>
//
// İlk render'da scroll-reveal sınıfı opacity:0 translateY:20px verir.
// Görünür olunca otomatik "is-visible" eklenir → animasyon başlar.
import { useEffect, useRef } from 'react';

export function useScrollReveal({ threshold = 0.15, once = true } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // prefers-reduced-motion → animasyon yok, hemen göster
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            el.classList.add('is-visible');
            if (once) observer.unobserve(el);
          } else if (!once) {
            el.classList.remove('is-visible');
          }
        });
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return ref;
}

export default useScrollReveal;
