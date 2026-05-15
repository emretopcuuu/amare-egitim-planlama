// Profil avatar — 3 fallback zinciri:
//   1. Kullanıcı kendi yüklemişse → users/{uid}.fotoURL (Storage)
//   2. Yoksa eğitmen mi? → konusmacilar koleksiyonunda makeCoreId match → fotoURL
//   3. O da yoksa → ad baş harfleri (gradient)
//
// Avatar'a tıklayınca file picker açılır → client-side resize → Storage upload
// → Firestore'a URL yaz.

import React, { useRef, useState, useEffect } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../utils/firebase';
import { Camera, Loader2 } from 'lucide-react';

// Ad baş harflerini al ("Murat Kaya" → "MK", "ali" → "AL")
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Renk gradient'i ada göre seçilir (deterministik)
function gradientFor(name) {
  if (!name) return 'from-purple-600 to-indigo-700';
  const palettes = [
    'from-purple-600 to-indigo-700',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-cyan-600',
    'from-fuchsia-500 to-purple-700',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return palettes[h % palettes.length];
}

// Client-side resize → Blob (max 512px, JPEG q=0.85)
async function resizeImage(file, maxDim = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Resize başarısız'));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ProfilAvatar = ({ uid, fullName, fotoURL, size = 'xl', editable = true, onUploaded }) => {
  const fileRef = useRef(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [highlight, setHighlight] = useState(false);

  // Dışarıdan tetikleme — eksik chip "Profil fotosu" tıklandığında bu event fırlar
  useEffect(() => {
    if (!editable) return;
    const handler = () => {
      setHighlight(true);
      setTimeout(() => setHighlight(false), 2000);
      setTimeout(() => fileRef.current?.click(), 600); // scroll bitsin
    };
    window.addEventListener('amare-open-avatar-picker', handler);
    return () => window.removeEventListener('amare-open-avatar-picker', handler);
  }, [editable]);

  const sizeCfg = {
    sm: { w: 'w-10 h-10', text: 'text-xs', cam: 'w-3 h-3' },
    md: { w: 'w-16 h-16', text: 'text-base', cam: 'w-3.5 h-3.5' },
    lg: { w: 'w-24 h-24', text: 'text-2xl', cam: 'w-4 h-4' },
    xl: { w: 'w-32 h-32', text: 'text-4xl', cam: 'w-5 h-5' },
  }[size] || { w: 'w-32 h-32', text: 'text-4xl', cam: 'w-5 h-5' };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!uid) { setHata('Önce giriş yap'); return; }
    if (f.size > 5 * 1024 * 1024) { setHata('Dosya 5MB\'den büyük'); return; }
    if (!/^image\//.test(f.type)) { setHata('Sadece resim'); return; }

    setHata('');
    setYukleniyor(true);
    try {
      const blob = await resizeImage(f, 512);
      const path = `users-foto/${uid}.jpg`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(ref);
      // Cache-bust için timestamp ekle
      const finalUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      await updateDoc(doc(db, 'users', uid), { fotoURL: finalUrl });
      if (onUploaded) onUploaded(finalUrl);
    } catch (err) {
      console.error('[avatar] upload hata:', err);
      setHata(err.message || 'Yükleme başarısız');
    } finally {
      setYukleniyor(false);
    }
  };

  const initials = getInitials(fullName);
  const gradient = gradientFor(fullName);
  const hasPhoto = !!fotoURL;

  return (
    <div className={`relative inline-block avatar-aurora ${highlight ? 'animate-pulse' : ''}`}>
      {/* Highlight halkası (chip-tıklamada) */}
      {highlight && (
        <div className="absolute -inset-2 rounded-full border-4 border-amber-400 animate-ping" />
      )}
      <button
        type="button"
        disabled={!editable || yukleniyor}
        onClick={() => editable && fileRef.current?.click()}
        className={`${sizeCfg.w} rounded-full overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold ${sizeCfg.text} shadow-xl border-4 ${highlight ? 'border-amber-400' : 'border-white/20'} ${editable ? 'cursor-pointer hover:scale-105 transition-all' : ''}`}
        aria-label="Profil fotosunu değiştir"
      >
        {hasPhoto ? (
          <img src={fotoURL} alt={fullName || 'Profil'} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {editable && !yukleniyor && (
        <div className="absolute bottom-0 right-0 bg-amber-400 hover:bg-amber-300 text-purple-900 rounded-full p-1.5 shadow-lg border-2 border-white/30 cursor-pointer"
          onClick={() => fileRef.current?.click()}>
          <Camera className={sizeCfg.cam} />
        </div>
      )}

      {yukleniyor && (
        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {hata && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          {hata}
        </div>
      )}
    </div>
  );
};

export default ProfilAvatar;
