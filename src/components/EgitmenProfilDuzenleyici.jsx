// Eğitmen "kendi sayfası" düzenleyicisi
// Eğitmen olan kullanıcı (users/{uid}.egitmenCoreId set) Profil sayfasından
// kendi public bio'sunu, link'lerini, alıntılarını düzenleyebilsin
//
// Veri: konusmacilar/{coreId} koleksiyonuna kaydedilir
// Public alanlar: bio, kisaTanitim, linkler (instagram/linkedin/website), favori_alintilar

import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, Edit3, Instagram, Linkedin, Globe, Quote, Plus, Trash2 } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const EgitmenProfilDuzenleyici = ({ coreId, onClose }) => {
  const [veri, setVeri] = useState({
    bio: '',
    kisaTanitim: '',
    instagram: '',
    linkedin: '',
    website: '',
    favori_alintilar: [],
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
            bio: d.bio || d.biyografi || '',
            kisaTanitim: d.kisaTanitim || '',
            instagram: d.instagram || '',
            linkedin: d.linkedin || '',
            website: d.website || '',
            favori_alintilar: Array.isArray(d.favori_alintilar) ? d.favori_alintilar : [],
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
        bio: veri.bio.trim(),
        biyografi: veri.bio.trim(), // backward compat
        kisaTanitim: veri.kisaTanitim.trim(),
        instagram: veri.instagram.trim() || null,
        linkedin: veri.linkedin.trim() || null,
        website: veri.website.trim() || null,
        favori_alintilar: veri.favori_alintilar.filter(a => a.trim()),
        sonGuncelleme: serverTimestamp(),
      }, { merge: true });
      setBasari(true);
      setTimeout(() => setBasari(false), 2000);
    } catch (e) {
      alert('Kaydetme hatası: ' + e.message);
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
