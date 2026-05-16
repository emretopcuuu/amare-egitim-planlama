// useRoutePreload — link hover'da sonraki route'un JS chunk'ını önyükle
// Tıklamaya kalmadan modül indirilir → tıklama anında snap görünür

const preloadEdilen = new Set();

// Lazy import'ları map'le
const ROUTE_MAP = {
  '/takvim': () => import('../pages/TakvimView'),
  '/profil': () => import('../pages/Profil'),
  '/ekibim': () => import('../pages/Ekibim'),
  '/liderler': () => import('../pages/LiderlerSayfasi'),
  '/kayitli-egitimler': () => import('../pages/KayitliEgitimlerSayfasi'),
  '/konusmacilar': () => import('../pages/KonusmacilarSayfasi'),
  '/admin': () => import('../pages/AdminPanel'),
  '/admin-giris': () => import('../pages/AdminLogin'),
};

export function preloadRoute(path) {
  if (preloadEdilen.has(path)) return;
  const loader = ROUTE_MAP[path];
  if (loader) {
    loader().catch(() => {});
    preloadEdilen.add(path);
  }
}

/**
 * <Link> üzerinde kullanılacak onMouseEnter/onFocus handler
 */
export function useRoutePreloadHandlers(path) {
  return {
    onMouseEnter: () => preloadRoute(path),
    onFocus: () => preloadRoute(path),
    onTouchStart: () => preloadRoute(path),
  };
}
