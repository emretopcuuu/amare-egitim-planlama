// Mobile alt navigasyon — md:hidden ile sadece küçük ekranlarda
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Users, Video, UserCircle } from 'lucide-react';
import { preloadRoute } from '../utils/useRoutePreload';
import { useTranslation } from '../context/LanguageContext';

// Etiketler çeviri anahtarı — dil değişince alt menü de değişir (2026-07-12:
// eskiden sabit Türkçe'ydi, EN/DE/NL seçilince mobilde Türkçe kalıyordu).
const ITEMS = [
  { to: '/',                  labelKey: 'nav_home',     Icon: Home,       tourId: 'nav-anasayfa' },
  { to: '/takvim',            labelKey: 'nav_calendar', Icon: Calendar,   tourId: 'nav-takvim' },
  { to: '/konusmacilar',      labelKey: 'nav_trainers', Icon: Users,      tourId: 'nav-egitmenler' },
  { to: '/kayitli-egitimler', labelKey: 'nav_recorded', Icon: Video,      tourId: 'nav-kayitli' },
  { to: '/profil',            labelKey: 'nav_profile',  Icon: UserCircle, tourId: 'nav-profil' },
];

const BottomNav = () => {
  const { t } = useTranslation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-purple-950 border-t border-white/10 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
      <div className="grid grid-cols-5">
        {ITEMS.map(({ to, labelKey, Icon, tourId }) => {
          const label = t(labelKey);
          return (
          <NavLink key={to} to={to} end={to === '/'}
            data-tour={tourId}
            onTouchStart={() => preloadRoute(to)}
            onMouseEnter={() => preloadRoute(to)}
            aria-label={label}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 min-h-[56px] transition-all ${
                isActive
                  ? 'text-amber-400'
                  : 'text-white/60 hover:text-white active:bg-white/5'
              }`
            }>
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">{label}</span>
          </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
