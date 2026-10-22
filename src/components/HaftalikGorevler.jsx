// src/components/HaftalikGorevler.jsx
// ─────────────────────────────────────────────────────────────────────────
// "Bu haftanın görevleri" — McGonigal FIX #1: gönüllü engeller.
// Otomatik üretilir (haftalikGorevler kuralı), mevcut haftalık veriden hesaplanır.
// Admin yönetimi gerekmez. Pazartesi sıfırlanır (haftalık veri zaten haftalık).
// ─────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Users, Flame, Clock, UserCheck, Check, Target } from 'lucide-react';
import { haftalikGorevler, gorevSayildiMi } from '../utils/xp';
import { useTranslation } from '../context/LanguageContext';

const IKON = { users: Users, flame: Flame, clock: Clock, 'user-check': UserCheck };

// kayit/hafta (23 Eki 2026): görev puanı kişinin kaydına haftada bir kez yazılır (Profil); kart "sayıldı"yı oradan bilir.
const HaftalikGorevler = ({ veri = {}, kayit = null, hafta = '', onProfilTamamla }) => {
  const { t } = useTranslation();
  const gorevler = haftalikGorevler(veri);
  const tamamSayisi = gorevler.filter(g => g.tamam).length;

  return (
    <section className="stagger-fade" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-300" />
          <h3 className="text-white font-bold text-sm">{t('xp_gorevler_baslik')}</h3>
        </div>
        <span className="text-purple-300/60 text-[10px] uppercase tracking-wider font-bold">
          {t('xp_gorev_tamam_sayisi').replace('{n}', tamamSayisi).replace('{m}', gorevler.length)}
        </span>
      </div>
      <p className="text-white/50 text-[11px] -mt-1 mb-3">{t('xp_gorev_not')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {gorevler.map(g => {
          const Icon = IKON[g.ikon] || Target;
          const pct = Math.round(g.pct * 100);
          // Görev birimini akıllı göster: yüzde mi sayı mı
          const mevcutGoster = g.key === 'profil' ? `%${g.mevcut}` : g.mevcut;
          const hedefGoster = g.key === 'profil' ? '%100' : g.hedef;
          const clickable = g.key === 'profil' && !g.tamam && onProfilTamamla;
          return (
            <div
              key={g.key}
              onClick={clickable ? onProfilTamamla : undefined}
              className={`relative bg-white/10 backdrop-blur-md border rounded-2xl p-4 transition-all ${
                g.tamam
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : 'border-white/15'
              } ${clickable ? 'cursor-pointer hover:bg-white/15 spring-tap' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  g.tamam ? 'bg-emerald-400/25' : 'bg-amber-400/20'
                }`}>
                  {g.tamam
                    ? <Check className="w-5 h-5 text-emerald-300" />
                    : <Icon className="w-5 h-5 text-amber-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] font-semibold leading-snug">{t(g.baslik)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${g.tamam ? 'bg-emerald-400' : 'bg-purple-400'}`}
                        style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
                      />
                    </div>
                    <span className="text-white/50 text-[11px] font-medium whitespace-nowrap">
                      {mevcutGoster}/{hedefGoster}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`absolute top-3 right-3 text-[11px] font-bold ${
                g.tamam ? 'text-emerald-300' : 'text-amber-300/80'
              }`}>
                {g.tamam && gorevSayildiMi(g.key, kayit, hafta) ? '✓ +' + g.xp : '+' + g.xp} XP
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HaftalikGorevler;
