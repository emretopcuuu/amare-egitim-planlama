// Admin: Yorum Bildirimleri (mağaza O3 — Apple 1.2 moderasyon)
// Kullanıcıların "Bildir" dediği video yorumları. Yönetici yorumu siler ya da
// bildirimi yoksayar (3 bildirimle otomatik gizlenen yorum yeniden görünür).
// Veri: netlify/functions/yorum-bildir.mjs (admin SDK; istemci Firestore'u okumaz).

import React, { useCallback, useEffect, useState } from 'react';
import { auth } from '../utils/firebase';
import { Flag, Loader2, Trash2, Check, RotateCw } from 'lucide-react';

const DURUMLAR = [
  { key: 'beklemede', label: 'Bekleyen' },
  { key: 'silindi', label: 'Silinen' },
  { key: 'yoksayildi', label: 'Yoksayılan' },
];

async function cagir(govde) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch('/.netlify/functions/yorum-bildir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(govde),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Hata (${res.status})`);
  return data;
}

const AdminYorumBildirimTab = () => {
  const [durum, setDurum] = useState('beklemede');
  const [kayitlar, setKayitlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [islemId, setIslemId] = useState(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata('');
    try {
      const d = await cagir({ islem: 'liste', durum });
      setKayitlar(d.kayitlar || []);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }, [durum]);

  useEffect(() => { yukle(); }, [yukle]);

  const karar = async (id, k) => {
    if (k === 'sil' && !window.confirm('Yorum kalıcı olarak silinsin mi?')) return;
    setIslemId(id);
    try {
      await cagir({ islem: 'karar', id, karar: k });
      await yukle();
    } catch (e) {
      setHata(e.message);
    } finally {
      setIslemId(null);
    }
  };

  // Aynı yorum için birden çok bildirim → tek satır
  const gruplar = Object.values(kayitlar.reduce((acc, k) => {
    const anahtar = `${k.vimeoId}/${k.yorumId}`;
    if (!acc[anahtar]) acc[anahtar] = { ...k, sebepler: [], adet: 0 };
    acc[anahtar].adet += 1;
    if (k.sebep) acc[anahtar].sebepler.push(k.sebep);
    return acc;
  }, {}));

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Flag className="w-5 h-5 text-rose-500" />Yorum Bildirimleri
        </h2>
        <div className="flex items-center gap-2">
          {DURUMLAR.map(d => (
            <button key={d.key} onClick={() => setDurum(d.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${durum === d.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {d.label}
            </button>
          ))}
          <button onClick={yukle} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" aria-label="Yenile">
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-gray-500 text-xs mb-4">
        Apple kuralı: bildirilen içeriğe 24 saat içinde bakılmalı. Aynı yoruma 3 kişi bildirince yorum otomatik gizlenir.
      </p>

      {hata && <p className="text-rose-600 text-sm mb-3">{hata}</p>}
      {yukleniyor && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
      {!yukleniyor && gruplar.length === 0 && <p className="text-gray-500 text-sm">Kayıt yok.</p>}

      <div className="space-y-3">
        {gruplar.map(g => (
          <div key={`${g.vimeoId}/${g.yorumId}`} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500 mb-1">
                  <b className="text-gray-700">{g.yorumAd || '?'}</b> · video {g.vimeoId} · {g.adet} bildirim
                  {g.tarih ? ` · ${new Date(g.tarih).toLocaleString('tr-TR')}` : ''}
                </div>
                <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">{g.yorumMetin}</p>
                {g.sebepler.length > 0 && (
                  <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                    {g.sebepler.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                )}
              </div>
              {durum === 'beklemede' && (
                <div className="flex gap-2">
                  <button onClick={() => karar(g.id, 'sil')} disabled={islemId === g.id}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />Yorumu sil
                  </button>
                  <button onClick={() => karar(g.id, 'yoksay')} disabled={islemId === g.id}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                    <Check className="w-4 h-4" />Sorun yok
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminYorumBildirimTab;
