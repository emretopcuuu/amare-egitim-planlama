// Eğitmen "kendi sayfası" düzenleyicisi
// Eğitmen olan kullanıcı (users/{uid}.egitmenCoreId set) Profil sayfasından
// kendi public bio'sunu, link'lerini, alıntılarını düzenleyebilsin
//
// Veri: konusmacilar/{coreId} koleksiyonuna kaydedilir
// Public alanlar: bio, kisaTanitim, linkler (instagram/linkedin/website), favori_alintilar

import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, Edit3, Instagram, Linkedin, Globe, Quote, Plus, Trash2, TrendingUp } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from './Toast';
import { KARIYER_BASAMAKLARI, kariyerTarih } from '../utils/kariyer';

const EgitmenProfilDuzenleyici = ({ coreId, onClose }) => {
  const { toast } = useToast();
  const [veri, setVeri] = useState({
    ad: '',
    unvan: '',
    bio: '',
    kisaTanitim: '',
    instagram: '',
    linkedin: '',
    website: '',
    favori_alintilar: [],
    katilimTarihi: '',
    kariyerGecmis: [],
  });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basari, setBasari] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, `konusmacilar/${coreId}`));
        if (snap.exists()) {
          const d = snap.data();
          setVeri({
            ad: d.ad || '',
            unvan: d.unvan || '',
            bio: d.bio || d.biyografi || '',
            kisaTanitim: d.kisaTanitim || '',
            instagram: d.instagram || '',
            linkedin: d.linkedin || '',
            website: d.website || '',
            favori_alintilar: Array.isArray(d.favori_alintilar) ? d.favori_alintilar : [],
            katilimTarihi: d.katilimTarihi || '',
            kariyerGecmis: Array.isArray(d.kariyerGecmis) ? d.kariyerGecmis : [],
          });
        }
      } catch (e) {
        console.warn('[egitmen-profil] read err:', e.message);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [coreId]);

  async function kaydet() {
    setKaydediliyor(true);
    try {
      await setDoc(doc(db, `konusmacilar/${coreId}`), {
        ...(veri.ad.trim() ? { ad: veri.ad.trim() } : {}), // boşsa mevcut ismi silme
        unvan: veri.unvan.trim() || null,                  // ünvan/meslek (boş → temizle)
        bio: veri.bio.trim(),
        biyografi: veri.bio.trim(), // backward compat
        kisaTanitim: veri.kisaTanitim.trim(),
        instagram: veri.instagram.trim() || null,
        linkedin: veri.linkedin.trim() || null,
        website: veri.website.trim() || null,
        favori_alintilar: veri.favori_alintilar.filter(a => a.trim()),
        katilimTarihi: veri.katilimTarihi.trim() || null,
        // kariyer geçmişi: dolu satırlar, tarihe göre sıralı
        kariyerGecmis: veri.kariyerGecmis
          .filter(k => k.kariyer && k.tarih)
          .sort((a, b) => (kariyerTarih(a.tarih)?.getTime() || 0) - (kariyerTarih(b.tarih)?.getTime() || 0)),
        sonGuncelleme: serverTimestamp(),
      }, { merge: true });
      setBasari(true);
      setTimeout(() => setBasari(false), 2000);
    } catch (e) {
      toast('Kaydedemedik, tekrar dener misin?', { type: 'error' });
    } finally {
      setKaydediliyor(false);
    }
  }

  function alintiEkle() {
    if (veri.favori_alintilar.length >= 5) return;
    setVeri(v => ({ ...v, favori_alintilar: [...v.favori_alintilar, ''] }));
  }

  function alintiDegistir(i, deger) {
    setVeri(v => ({
      ...v,
      favori_alintilar: v.favori_alintilar.map((a, idx) => idx === i ? deger : a),
    }));
  }

  function alintiSil(i) {
    setVeri(v => ({
      ...v,
      favori_alintilar: v.favori_alintilar.filter((_, idx) => idx !== i),
    }));
  }

  function kariyerEkle() {
    setVeri(v => ({ ...v, kariyerGecmis: [...v.kariyerGecmis, { kariyer: '', tarih: '' }] }));
  }
  function kariyerDegistir(i, alan, deger) {
    setVeri(v => ({ ...v, kariyerGecmis: v.kariyerGecmis.map((k, idx) => idx === i ? { ...k, [alan]: deger } : k) }));
  }
  function kariyerSil(i) {
    setVeri(v => ({ ...v, kariyerGecmis: v.kariyerGecmis.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}>
      <div className="bg-gradient-to-br from-purple-900 to-indigo-950 border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[95dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-white font-extrabold text-lg sm:text-xl inline-flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-300" />
              Profilini Düzenle
            </h2>
            <p className="text-purple-200/70 text-xs mt-0.5">Eğitmen sayfanda public olarak gösterilir</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {yukleniyor ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
          ) : (
            <>
              {/* İsim + Ünvan/Meslek */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/90 text-xs font-bold uppercase tracking-wider mb-1 block">İsim Soyisim</label>
                  <input type="text" value={veri.ad} onChange={e => setVeri(s => ({ ...s, ad: e.target.value }))}
                    placeholder="Ad Soyad"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400/60" />
                </div>
                <div>
                  <label className="text-white/90 text-xs font-bold uppercase tracking-wider mb-1 block">Ünvan / Meslek</label>
                  <input type="text" value={veri.unvan} onChange={e => setVeri(s => ({ ...s, unvan: e.target.value }))}
                    placeholder="örn. Nefroloji Uzmanı (boş bırakılabilir)"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400/60" />
                </div>
              </div>

              {/* Kısa tanıtım */}
              <Field label="Kısa Tanıtım" max={150} value={veri.kisaTanitim}
                onChange={v => setVeri(s => ({ ...s, kisaTanitim: v }))}
                placeholder="Tek satırda kendini özetle (örn: Liderlik Koçu · 15 yıl deneyim)"
                rows={1} />

              {/* Bio */}
              <Field label="Hakkında (Bio)" max={1000} value={veri.bio}
                onChange={v => setVeri(s => ({ ...s, bio: v }))}
                placeholder="Daha detaylı kendini anlat. Tecrübelerin, yaklaşımın, neden ders veriyorsun..."
                rows={5} />

              {/* Kariyer Geçmişi (başarı grafiğinin kaynağı) */}
              <div className="bg-white/5 border border-amber-400/20 rounded-xl p-3">
                <div className="text-white/90 text-xs font-bold mb-2 uppercase tracking-wider flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-amber-300" />Kariyer Geçmişi</span>
                  <button onClick={kariyerEkle}
                    className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 spring-tap">
                    <Plus className="w-3 h-3" />Basamak
                  </button>
                </div>
                {/* Amare'ye katılım tarihi */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-200/80 text-[11px] w-28 flex-shrink-0">Amare'ye katılım</span>
                  <input type="text" value={veri.katilimTarihi} onChange={e => setVeri(s => ({ ...s, katilimTarihi: e.target.value }))}
                    placeholder="AA.YYYY (örn. 03.2022)"
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400/60" />
                </div>
                <div className="space-y-2">
                  {veri.kariyerGecmis.map((k, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={k.kariyer} onChange={e => kariyerDegistir(i, 'kariyer', e.target.value)}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/60">
                        <option value="" className="text-gray-800">— Kariyer —</option>
                        {KARIYER_BASAMAKLARI.map(b => <option key={b} value={b} className="text-gray-800">{b}</option>)}
                      </select>
                      <input type="text" value={k.tarih} onChange={e => kariyerDegistir(i, 'tarih', e.target.value)}
                        placeholder="AA.YYYY" maxLength={10}
                        className="w-28 bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400/60" />
                      <button onClick={() => kariyerSil(i)} className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-2 py-1.5 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {veri.kariyerGecmis.length === 0 && (
                    <p className="text-purple-300/40 text-[11px] text-center py-2">Henüz kariyer basamağı yok. "Basamak" ile ekle (örn. DIAMOND · 12.2024).</p>
                  )}
                </div>
                <p className="text-purple-300/40 text-[10px] mt-2">Tarihi AA.YYYY yaz (ulaşılan ay). Sıralama otomatik. Bu veri "ne kadar sürede" ve başarı grafiğini besler.</p>
              </div>

              {/* Sosyal medya */}
              <div>
                <div className="text-white/90 text-xs font-bold mb-2 uppercase tracking-wider">Sosyal & Web</div>
                <div className="space-y-2">
                  <InputIkonlu icon={<Instagram className="w-4 h-4 text-pink-400" />}
                    value={veri.instagram} onChange={v => setVeri(s => ({ ...s, instagram: v }))}
                    placeholder="@kullaniciadi veya https://instagram.com/..." />
                  <InputIkonlu icon={<Linkedin className="w-4 h-4 text-sky-400" />}
                    value={veri.linkedin} onChange={v => setVeri(s => ({ ...s, linkedin: v }))}
                    placeholder="LinkedIn profil URL'i" />
                  <InputIkonlu icon={<Globe className="w-4 h-4 text-emerald-400" />}
                    value={veri.website} onChange={v => setVeri(s => ({ ...s, website: v }))}
                    placeholder="Kişisel web siteniz" />
                </div>
              </div>

              {/* Alıntılar */}
              <div>
                <div className="text-white/90 text-xs font-bold mb-2 uppercase tracking-wider flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5" />Favori Alıntıların ({veri.favori_alintilar.length}/5)
                  </span>
                  {veri.favori_alintilar.length < 5 && (
                    <button onClick={alintiEkle}
                      className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 spring-tap">
                      <Plus className="w-3 h-3" />Ekle
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {veri.favori_alintilar.map((a, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={a} onChange={e => alintiDegistir(i, e.target.value)}
                        placeholder={`Alıntı ${i + 1}`} maxLength={200}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400/60" />
                      <button onClick={() => alintiSil(i)}
                        className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-2 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {veri.favori_alintilar.length === 0 && (
                    <p className="text-purple-300/40 text-[11px] text-center py-2">Henüz alıntı yok.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex-shrink-0 flex gap-2">
          <button onClick={onClose} disabled={kaydediliyor}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl spring-tap text-sm disabled:opacity-50">
            İptal
          </button>
          <button onClick={kaydet} disabled={kaydediliyor || yukleniyor}
            className={`flex-[2] font-bold py-3 rounded-xl spring-tap text-sm inline-flex items-center justify-center gap-2 ${
              basari
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-400 hover:bg-amber-300 text-purple-900'
            } disabled:opacity-50`}>
            {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {basari ? 'Kaydedildi ✓' : kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder, max = 500, rows = 1 }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-white/90 text-xs font-bold uppercase tracking-wider">{label}</label>
      <span className="text-purple-300/50 text-[10px]">{value.length}/{max}</span>
    </div>
    <textarea value={value} onChange={e => onChange(e.target.value.slice(0, max))}
      placeholder={placeholder} rows={rows}
      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400/60 resize-none" />
  </div>
);

const InputIkonlu = ({ icon, value, onChange, placeholder }) => (
  <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-2 focus-within:border-amber-400/60">
    {icon}
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="flex-1 bg-transparent text-sm text-white placeholder-purple-300/40 focus:outline-none" />
  </div>
);

export default EgitmenProfilDuzenleyici;
