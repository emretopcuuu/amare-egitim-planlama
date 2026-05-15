// Mobile alt navigasyon — md:hidden ile sadece küçük ekranlarda
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Users, Video, UserCircle } from 'lucide-react';

const ITEMS = [
  { to: '/',                  label: 'Anasayfa',  Icon: Home },
  { to: '/takvim',            label: 'Takvim',    Icon: Calendar },
  { to: '/konusmacilar',      label: 'Eğitmenler', Icon: Users },
  { to: '/kayitli-egitimler', label: 'Kayıtlı',   Icon: Video },
  { to: '/profil',            label: 'Profil',    Icon: UserCircle },
];

const BottomNav = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-purple-950 border-t border-white/10 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
      <div className="grid grid-cols-5">
        {ITEMS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
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
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
