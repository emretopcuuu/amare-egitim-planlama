// Admin paneli — yeni eğitmen ekleme modal'ı
// Form: Ad, Unvan, Biyografi, LinkedIn, Foto (otomatik resize + base64 Firestore)
import React, { useState, useEffect } from 'react';
import { X, User, Save, Loader2, Camera, Trash2 } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { makeSafeId } from '../context/DataContext';

// Foto'yu canvas ile küçült (max 600px), base64'e çevir
async function resizeImageToBase64(file, maxSize = 600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const YeniEgitmenModal = ({ onClose, onSaved, egitmen }) => {
  const [ad, setAd] = useState(egitmen?.ad || '');
  const [unvan, setUnvan] = useState(egitmen?.unvan || '');
  const [meslek, setMeslek] = useState(egitmen?.meslek || '');
  const [amareKariyer, setAmareKariyer] = useState(egitmen?.amareKariyer || '');
  const [doktorBrans, setDoktorBrans] = useState(egitmen?.doktorBrans || '');
  const [biyografi, setBiyografi] = useState(egitmen?.biyografi || '');
  const [linkedin, setLinkedin] = useState(egitmen?.linkedin || '');
  const [fotoBase64, setFotoBase64] = useState(egitmen?.fotoURL || '');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape' && !kaydediliyor) onClose?.(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose, kaydediliyor]);

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setHata('Lütfen bir resim dosyası seçin');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setHata('Resim çok büyük (max 10 MB)');
      return;
    }
    try {
      setHata('');
      const base64 = await resizeImageToBase64(file);
      setFotoBase64(base64);
    } catch (err) {
      setHata('Resim işlenemedi: ' + err.message);
    }
  };

  const handleKaydet = async () => {
    setHata('');
    if (!ad.trim()) {
      setHata('Ad zorunlu');
      return;
    }
    setKaydediliyor(true);
    try {
      const safeId = makeSafeId(ad);
      const ref = doc(db, 'konusmacilar', safeId);
      // Aynı id ile kayıt var mı?
      const existing = await getDoc(ref);
      if (existing.exists()) {
        const onay = window.confirm(
          `"${ad}" adında bir eğitmen zaten var. Bilgileri güncellemek ister misin?`
        );
        if (!onay) {
          setKaydediliyor(false);
          return;
        }
      }
      await setDoc(ref, {
        ad: ad.trim(),
        unvan: unvan.trim() || null,
        meslek: meslek.trim() || null,
        amareKariyer: amareKariyer.trim() || null,
        doktorBrans: doktorBrans.trim() || null,
        biyografi: biyografi.trim() || null,
        linkedin: linkedin.trim() || null,
        fotoURL: fotoBase64 || null,
        guncellemeTarihi: serverTimestamp(),
      }, { merge: true });
      onSaved?.({ id: safeId, ad: ad.trim() });
      onClose?.();
    } catch (err) {
      setHata('Kaydedilemedi: ' + err.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-fade-in overflow-y-auto"
      onClick={onClose}>
      <div className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl my-4 flex flex-col animate-scaleIn"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-700 to-indigo-700 px-6 py-4 flex items-center justify-between sm:rounded-t-2xl rounded-t-3xl">
          <div>
            <h3 className="text-white text-lg font-bold inline-flex items-center gap-2">
              <User className="w-5 h-5" />{egitmen ? 'Eğitmen Düzenle' : 'Yeni Eğitmen Ekle'}
            </h3>
            <p className="text-purple-100 text-xs mt-0.5">Profil bilgileri ve fotoğrafı gir.</p>
          </div>
          <button onClick={onClose} disabled={kaydediliyor} aria-label="Kapat"
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-50 flex items-center justify-center text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Foto */}
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex-shrink-0">
              {fotoBase64 ? (
                <img src={fotoBase64} alt="Önizleme" className="w-full h-full object-cover" style={{ objectPosition: 'center 25%' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-300" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors">
                <Camera className="w-4 h-4" />Foto Seç
                <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
              </label>
              {fotoBase64 && (
                <button onClick={() => setFotoBase64('')} type="button"
                  className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs">
                  <Trash2 className="w-3 h-3" />Kaldır
                </button>
              )}
              <p className="text-[11px] text-gray-500">Otomatik 600px küçültülür</p>
            </div>
          </div>

          {/* Ad */}
          <Field label="Ad Soyad" required>
            <input type="text" value={ad} onChange={e => setAd(e.target.value)}
              placeholder="Örn: Dr. Tunç Tuncer"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
          </Field>

          {/* Genel unvan (yedek/fallback) */}
          <Field label="Genel unvan (yedek)">
            <input type="text" value={unvan} onChange={e => setUnvan(e.target.value)}
              placeholder="Rol etiketi boşsa kullanılır"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
          </Field>

          {/* Rol-bazlı etiketler — afiş türüne göre otomatik seçilir */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-purple-100 bg-purple-50/40 p-3">
            <p className="text-[11px] text-purple-700 font-semibold">
              Afiş türüne göre otomatik yazılır: Vizyon Günü → meslek, Sağlıklı Yaşam Paneli → branş, online eğitim → Amare kariyeri.
            </p>
            <Field label="Amare-dışı meslek">
              <input type="text" value={meslek} onChange={e => setMeslek(e.target.value)}
                placeholder="Örn: Kd.Albay (E), Avukat"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
            </Field>
            <Field label="Amare kariyeri">
              <input type="text" value={amareKariyer} onChange={e => setAmareKariyer(e.target.value)}
                placeholder="Örn: 3 Star Diamond"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
            </Field>
            <Field label="Doktor branşı">
              <input type="text" value={doktorBrans} onChange={e => setDoktorBrans(e.target.value)}
                placeholder="Örn: Dahiliye ve Fonksiyonel Tıp Uzm."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
            </Field>
          </div>

          {/* Biyografi */}
          <Field label="Biyografi">
            <textarea value={biyografi} onChange={e => setBiyografi(e.target.value)}
              rows="3" placeholder="Kısa biyografi..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 resize-none" />
          </Field>

          {/* LinkedIn / İletişim */}
          <Field label="LinkedIn / E-posta">
            <input type="text" value={linkedin} onChange={e => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/... veya email@..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
          </Field>

          {/* Hata */}
          {hata && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {hata}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex gap-2 justify-end">
          <button onClick={onClose} disabled={kaydediliyor}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold disabled:opacity-50 transition-colors">
            İptal
          </button>
          <button onClick={handleKaydet} disabled={kaydediliyor || !ad.trim()}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-bold disabled:opacity-50 transition-colors">
            {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

export default YeniEgitmenModal;
