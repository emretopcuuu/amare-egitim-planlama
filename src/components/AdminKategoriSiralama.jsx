// Admin paneli — kategori sıralama (drag-drop + yukarı/aşağı butonlar)
// Firestore: settings/kategori_sirasi → { sira: string[] }
import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { ChevronUp, ChevronDown, Save, Loader2, GripVertical, RotateCcw } from 'lucide-react';

const VARSAYILAN_KATEGORILER = [
  'Liderlik', 'Satış', 'Motivasyon', 'Davet', 'Kapanış',
  'Sunum Teknikleri', 'Zaman Yönetimi', 'Kişisel Gelişim',
  'Sağlık', 'Finansal Özgürlük', 'Vizyon', 'Hikaye', 'Ürün Eğitimi',
  'Liste', 'Kazanç Planı', 'Backoffice', 'Odak', 'İtiraz Karşılama',
  'Takip', 'Doğru Başlangıç', 'Kamp', 'Katlama',
];

const KATEGORI_RENK = {
  'Liderlik':          'bg-blue-500',
  'Satış':             'bg-emerald-500',
  'Motivasyon':        'bg-orange-500',
  'Davet':             'bg-purple-500',
  'Kapanış':           'bg-yellow-500',
  'Sunum Teknikleri':  'bg-cyan-500',
  'Zaman Yönetimi':    'bg-indigo-500',
  'Kişisel Gelişim':   'bg-rose-500',
  'Sağlık':            'bg-teal-500',
  'Finansal Özgürlük': 'bg-green-600',
  'Vizyon':            'bg-fuchsia-500',
  'Hikaye':            'bg-amber-500',
  'Ürün Eğitimi':      'bg-sky-500',
  'Liste':             'bg-lime-500',
  'Kazanç Planı':      'bg-emerald-700',
  'Backoffice':        'bg-slate-500',
  'Odak':              'bg-red-500',
  'İtiraz Karşılama':  'bg-pink-600',
  'Takip':             'bg-violet-500',
  'Doğru Başlangıç':   'bg-green-700',
  'Kamp':              'bg-amber-700',
  'Katlama':           'bg-stone-500',
};

const AdminKategoriSiralama = () => {
  const [sira, setSira] = useState(VARSAYILAN_KATEGORILER);
  const [orjinalSira, setOrjinalSira] = useState(VARSAYILAN_KATEGORILER);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState('');
  const [draggedIdx, setDraggedIdx] = useState(null);

  // Firestore'dan oku
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'kategori_sirasi'));
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.sira) && data.sira.length > 0) {
            // Eksikleri sona ekle, fazlaları kaldır
            const mevcut = data.sira.filter(k => VARSAYILAN_KATEGORILER.includes(k));
            const eksikler = VARSAYILAN_KATEGORILER.filter(k => !mevcut.includes(k));
            const tam = [...mevcut, ...eksikler];
            setSira(tam);
            setOrjinalSira(tam);
            setYukleniyor(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Sıra yüklenemedi:', err.message);
      }
      // Yoksa varsayılan
      setSira(VARSAYILAN_KATEGORILER);
      setOrjinalSira(VARSAYILAN_KATEGORILER);
      setYukleniyor(false);
    })();
  }, []);

  const hasChanges = sira.some((k, i) => k !== orjinalSira[i]);

  const yukari = (i) => {
    if (i === 0) return;
    const yeni = [...sira];
    [yeni[i - 1], yeni[i]] = [yeni[i], yeni[i - 1]];
    setSira(yeni);
  };

  const asagi = (i) => {
    if (i === sira.length - 1) return;
    const yeni = [...sira];
    [yeni[i], yeni[i + 1]] = [yeni[i + 1], yeni[i]];
    setSira(yeni);
  };

  // Drag-drop (desktop)
  const onDragStart = (i) => setDraggedIdx(i);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (i) => {
    if (draggedIdx === null || draggedIdx === i) return;
    const yeni = [...sira];
    const [tasinacak] = yeni.splice(draggedIdx, 1);
    yeni.splice(i, 0, tasinacak);
    setSira(yeni);
    setDraggedIdx(null);
  };

  const varsayilanaDon = () => {
    if (!window.confirm('Sıralamayı varsayılana sıfırlamak istediğine emin misin?')) return;
    setSira([...VARSAYILAN_KATEGORILER]);
  };

  const kaydet = async () => {
    setKaydediliyor(true);
    setMesaj('');
    try {
      await setDoc(doc(db, 'settings', 'kategori_sirasi'), {
        sira,
        guncellemeTarihi: serverTimestamp(),
      });
      setOrjinalSira(sira);
      setMesaj('✓ Sıralama kaydedildi');
      setTimeout(() => setMesaj(''), 3000);
    } catch (err) {
      setMesaj('✗ Hata: ' + err.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  if (yukleniyor) return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <Loader2 className="w-8 h-8 mx-auto animate-spin text-amare-purple" />
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Kategori Sıralaması</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Kayıtlı Eğitimler sayfasındaki chip sırasını belirler.
            Sürükle-bırak veya yukarı/aşağı oklarla düzenle.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={varsayilanaDon}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
            <RotateCcw className="w-4 h-4" />Varsayılan
          </button>
          <button onClick={kaydet} disabled={!hasChanges || kaydediliyor}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              hasChanges && !kaydediliyor
                ? 'bg-amare-purple hover:bg-purple-700 text-white shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
        </div>
      </div>

      {mesaj && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm font-semibold ${mesaj.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {mesaj}
        </div>
      )}

      <ul className="space-y-1.5">
        {sira.map((kategori, i) => (
          <li key={kategori}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
              draggedIdx === i ? 'border-amare-purple bg-purple-50 opacity-50' : 'border-gray-100 hover:bg-gray-50'
            }`}>
            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
            <span className="text-xs font-bold text-gray-400 w-6 text-center">{i + 1}</span>
            <span className={`inline-block ${KATEGORI_RENK[kategori] || 'bg-gray-400'} text-white text-xs font-bold px-3 py-1 rounded-full`}>
              {kategori}
            </span>
            <div className="ml-auto flex gap-1">
              <button onClick={() => yukari(i)} disabled={i === 0}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronUp className="w-4 h-4 text-gray-600" />
              </button>
              <button onClick={() => asagi(i)} disabled={i === sira.length - 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminKategoriSiralama;
