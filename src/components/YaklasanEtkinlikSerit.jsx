// Yaklaşan Etkinlik Şeridi — footer üstü tek satır canlı bilgi
// "🟢 İSTANBUL · 4 Mart Pazar 16:00 — AMARE PLAZA · 3 gün kaldı"
// Sade, üstü kalabalıklaştırmaz, "burada hayat var" sinyali.
import React, { useMemo } from 'react';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import { useData, makeSafeId } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

const parseTarih = (t) => {
  if (!t) return null;
  const parts = String(t).split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [d, m, y] = parts;
  return new Date(y, m - 1, d);
};

const YaklasanEtkinlikSerit = () => {
  const { takvim } = useData();
  const navigate = useNavigate();

  const yaklasan = useMemo(() => {
    if (!takvim || takvim.length === 0) return null;
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const sirali = takvim
      .map(e => ({ ...e, _d: parseTarih(e.tarih) }))
      .filter(e => e._d && e._d >= bugun)
      .sort((a, b) => a._d - b._d);
    return sirali[0] || null;
  }, [takvim]);

  if (!yaklasan) return null;

  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const diffGun = Math.round((yaklasan._d - bugun) / 86400000);
  const gunMetin =
    diffGun === 0 ? 'Bugün' :
    diffGun === 1 ? 'Yarın' :
    diffGun < 7 ? `${diffGun} gün kaldı` :
    diffGun < 30 ? `${Math.floor(diffGun / 7)} hafta kaldı` :
    `${Math.floor(diffGun / 30)} ay kaldı`;

  const sehir = yaklasan.sehir || (yaklasan.yer || '').split(',')[0]?.trim() || '';
  const tarihMetin = yaklasan._d.toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', weekday: 'long',
  });

  const onTikla = () => {
    const id = makeSafeId(yaklasan);
    if (id) navigate(`/e/${id}`);
  };

  return (
    <button
      onClick={onTikla}
      className="animate-strip-in group w-full inline-flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] border-y border-amber-400/15 hover:border-amber-400/30 transition-all text-left"
      aria-label="Yaklaşan etkinliğe git"
    >
      <span className="relative flex items-center">
        <span className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
        <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
      </span>
      <span className="text-amber-300 text-[10px] sm:text-xs uppercase tracking-[0.25em] font-bold whitespace-nowrap hidden sm:inline">
        Yaklaşan
      </span>
      <span className="text-purple-300/40 text-xs hidden sm:inline">·</span>
      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300/80" />
      <span className="text-white font-semibold text-xs sm:text-sm truncate">
        {sehir.toUpperCase()}
      </span>
      <span className="text-purple-300/40 text-xs">·</span>
      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-200/70" />
      <span className="text-purple-100/85 text-xs sm:text-sm truncate hidden sm:inline">
        {tarihMetin}
      </span>
      <span className="text-purple-300/40 text-xs">·</span>
      <span className="text-amber-300/90 text-xs sm:text-sm italic whitespace-nowrap">
        {gunMetin}
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-amber-300/60 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all ml-1 flex-shrink-0" />
    </button>
  );
};

export default YaklasanEtkinlikSerit;
