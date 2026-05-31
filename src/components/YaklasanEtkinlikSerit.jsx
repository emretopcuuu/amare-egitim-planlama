// Yaklaşan Etkinlik Şeridi v2 — premium UX
//
// İyileştirmeler:
// - Etkinlik BAŞLIĞI öne çıkar (asıl bilgi)
// - Çok sayıda yaklaşan varsa otomatik 5sn'de bir geçiş (hover'da durur)
// - <24 saat kala canlı geri sayım (saat:dakika:saniye)
// - Aciliyet renk kodu: bugün=kırmızı, bu hafta=altın, ileri=mor
// - Online (zoom) vs fiziki yer ayrı ikon
// - Mobilde 2 satır (başlık + meta), desktop'ta tek satır
// - Sayfa görünür değilse (tab arka planda) timer durur
//
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, ArrowRight, Wifi, Clock, Sparkles } from 'lucide-react';
import { useData, makeSafeId } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

const parseTarihSaat = (e) => {
  if (!e?.tarih) return null;
  const parts = String(e.tarih).split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [d, m, y] = parts;
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return null;
  if (e.saat) {
    const [s, dk] = String(e.saat).split(':').map(Number);
    if (!isNaN(s)) dt.setHours(s, dk || 0, 0, 0);
  } else {
    dt.setHours(23, 59, 0, 0); // gün sonu, kaçırılmadı
  }
  return dt;
};

const isOnline = (e) => {
  const yer = (e?.yer || '').toLowerCase();
  return yer.includes('zoom') || yer.includes('online') || yer.includes('http') || /\d{6,}/.test(yer);
};

// Geri sayım formatla — yakınsa saat:dk:sn, uzaksa gün/saat
const sayilForm = (ms) => {
  if (ms <= 0) return 'BAŞLIYOR';
  const sn = Math.floor(ms / 1000);
  const dk = Math.floor(sn / 60);
  const sa = Math.floor(dk / 60);
  const gn = Math.floor(sa / 24);

  if (gn >= 1) {
    return gn === 1 ? 'Yarın' : `${gn} gün kaldı`;
  }
  if (sa >= 1) {
    return `${sa} saat ${dk % 60} dk kaldı`;
  }
  if (dk >= 1) {
    return `${dk} dk ${sn % 60} sn`;
  }
  return `${sn} saniye`;
};

// Aciliyet sınıflandır
const aciliyetGetir = (msKalan) => {
  if (msKalan <= 60 * 60 * 1000) return 'simdi';   // 1 saat veya az
  if (msKalan <= 24 * 60 * 60 * 1000) return 'bugun'; // bugün/yarın
  if (msKalan <= 7 * 24 * 60 * 60 * 1000) return 'bu-hafta';
  return 'ileri';
};

const ACILIYET_STIL = {
  simdi: {
    nokta: 'bg-rose-400',
    ring: 'bg-rose-400/60',
    cizgi: 'border-rose-400/30 hover:border-rose-400/60',
    kicker: 'text-rose-300',
    sayac: 'text-rose-200 font-bold',
    label: 'CANLI YAKLAŞIYOR',
  },
  bugun: {
    nokta: 'bg-amber-300',
    ring: 'bg-amber-300/60',
    cizgi: 'border-amber-400/30 hover:border-amber-400/50',
    kicker: 'text-amber-300',
    sayac: 'text-amber-200 font-semibold',
    label: 'BUGÜN/YARIN',
  },
  'bu-hafta': {
    nokta: 'bg-emerald-400',
    ring: 'bg-emerald-400/60',
    cizgi: 'border-amber-400/20 hover:border-amber-400/40',
    kicker: 'text-amber-300',
    sayac: 'text-amber-200/90 italic',
    label: 'YAKLAŞAN',
  },
  ileri: {
    nokta: 'bg-purple-400',
    ring: 'bg-purple-400/60',
    cizgi: 'border-amber-400/15 hover:border-amber-400/30',
    kicker: 'text-purple-200',
    sayac: 'text-purple-200/80 italic',
    label: 'YAKLAŞAN',
  },
};

const YaklasanEtkinlikSerit = () => {
  const { takvim } = useData();
  const navigate = useNavigate();
  const [aktifIdx, setAktifIdx] = useState(0);
  const [simdi, setSimdi] = useState(() => new Date());
  const [duraklat, setDuraklat] = useState(false);
  const containerRef = useRef(null);

  // Yaklaşan 3 etkinliği seç (zaten geçenler hariç)
  const yaklasanlar = useMemo(() => {
    if (!takvim || takvim.length === 0) return [];
    return takvim
      .map(e => ({ ...e, _d: parseTarihSaat(e) }))
      .filter(e => e._d && e._d.getTime() > Date.now() - 60 * 60 * 1000) // 1 saat öncesine kadar göster (canlıyken bile)
      .sort((a, b) => a._d - b._d)
      .slice(0, 3);
  }, [takvim]);

  // Her saniye güncel zamanı tut — aktif etkinliğe yakınsa
  useEffect(() => {
    if (yaklasanlar.length === 0) return;
    const aktifEtkinlik = yaklasanlar[aktifIdx];
    if (!aktifEtkinlik?._d) return;
    const msKalan = aktifEtkinlik._d - Date.now();
    // <24 saat kala → her saniye, aksi → her dakika
    const interval = msKalan < 24 * 60 * 60 * 1000 ? 1000 : 60000;
    const tick = () => {
      // Sayfa görünür değilse atla
      if (document.visibilityState === 'hidden') return;
      setSimdi(new Date());
    };
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [yaklasanlar, aktifIdx]);

  // Otomatik rotasyon — birden fazla varsa 5sn'de bir geç
  useEffect(() => {
    if (yaklasanlar.length <= 1 || duraklat) return;
    const id = setInterval(() => {
      setAktifIdx(i => (i + 1) % yaklasanlar.length);
    }, 5000);
    return () => clearInterval(id);
  }, [yaklasanlar.length, duraklat]);

  if (yaklasanlar.length === 0) return null;

  const aktif = yaklasanlar[aktifIdx] || yaklasanlar[0];
  const msKalan = (aktif._d?.getTime() || 0) - simdi.getTime();
  const aciliyet = aciliyetGetir(msKalan);
  const stil = ACILIYET_STIL[aciliyet];
  const online = isOnline(aktif);
  const sehir = aktif.sehir || (aktif.yer || '').split(',')[0]?.trim() || '';
  const saat = aktif.saat || '';
  const baslik = aktif.egitim || aktif.baslik || 'Eğitim';
  const tarihKisa = aktif._d?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
  const sayac = sayilForm(msKalan);

  const goToDetay = () => {
    const id = makeSafeId(aktif);
    if (id) navigate(`/e/${id}`);
  };

  return (
    <div className="animate-strip-in">
      <div
        ref={containerRef}
        onMouseEnter={() => setDuraklat(true)}
        onMouseLeave={() => setDuraklat(false)}
        className={`group relative w-full rounded-2xl border ${stil.cizgi} bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-md transition-all overflow-hidden`}
      >
        {/* Sol kenar aciliyet rengi şeridi */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${stil.nokta} opacity-70`} />

        <button
          onClick={goToDetay}
          className="w-full text-left px-4 sm:px-6 py-3 sm:py-3.5 flex items-center gap-3 sm:gap-4 spring-tap"
          aria-label={`${aktif.egitim} etkinliğine git`}
        >
          {/* Pulsing dot — aciliyet rengi */}
          <span className="relative flex items-center justify-center flex-shrink-0">
            <span className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${stil.ring} animate-ping`} />
            <span className={`relative w-2.5 h-2.5 rounded-full ${stil.nokta}`} />
          </span>

          {/* Ana içerik — başlık + meta tek satır (sm+) / 2 satır (mobil) */}
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-3">
            {/* Üst satır (mobilde): kicker + sayaç */}
            <div className="flex items-center gap-2 mb-0.5 sm:mb-0 sm:order-2 sm:ml-auto flex-shrink-0">
              <span className={`text-[10px] uppercase tracking-[0.2em] font-bold ${stil.kicker} hidden sm:inline`}>
                {stil.label}
              </span>
              <span className="text-purple-300/30 text-xs hidden sm:inline">·</span>
              <Clock className={`w-3 h-3 ${stil.sayac}`} />
              <span className={`text-xs sm:text-sm whitespace-nowrap ${stil.sayac}`}>
                {sayac}
              </span>
            </div>

            {/* Başlık + meta */}
            <div className="flex-1 min-w-0 sm:order-1">
              {/* Başlık (asıl bilgi) */}
              <div className="text-white font-bold text-sm sm:text-base leading-tight truncate">
                {baslik}
              </div>
              {/* Meta: yer · tarih · saat */}
              <div className="flex items-center gap-1.5 mt-0.5 text-purple-200/70 text-[11px] sm:text-xs">
                {online ? (
                  <Wifi className="w-3 h-3 text-blue-300 flex-shrink-0" />
                ) : (
                  <MapPin className="w-3 h-3 text-amber-300/70 flex-shrink-0" />
                )}
                <span className="truncate">
                  {online ? 'Online' : sehir}
                  {tarihKisa && <span className="text-purple-300/40 mx-1.5">·</span>}
                  {tarihKisa}
                  {saat && <span className="text-purple-300/40 mx-1.5">·</span>}
                  {saat}
                </span>
              </div>
            </div>
          </div>

          {/* Sağ ok */}
          <ArrowRight className={`w-4 h-4 ${stil.kicker} group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center`} />
        </button>

        {/* Alt indikator — birden fazla etkinlik varsa */}
        {yaklasanlar.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pb-2 -mt-1 px-4">
            {yaklasanlar.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setAktifIdx(i); setDuraklat(true); }}
                className={`h-1 rounded-full transition-all ${
                  i === aktifIdx ? 'w-6 bg-amber-300' : 'w-1.5 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`${i + 1}. etkinlik`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Alt mikro mesaj — birden fazla varsa "tümünü gör" daveti */}
      {yaklasanlar.length > 1 && (
        <div className="mt-2 text-center">
          <button
            onClick={() => navigate('/takvim')}
            className="inline-flex items-center gap-1 text-purple-300/50 hover:text-amber-300 text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Tüm Takvim
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default YaklasanEtkinlikSerit;
