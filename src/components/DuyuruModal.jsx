import React, { useState } from 'react';
import { X, Copy, Check, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import { auth } from '../utils/firebase';

const DuyuruModal = ({ egitim, onClose }) => {
  const [metin, setMetin] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hata, setHata] = useState(null);

  const handleOlustur = async () => {
    setYukleniyor(true);
    setHata(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Admin oturumu gerekli');
      const idToken = await user.getIdToken();

      const res = await fetch('/.netlify/functions/metin-uret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          tip: 'duyuru',
          baglam: {
            baslik: egitim.egitim,
            tarih: `${egitim.tarih} ${egitim.gun || ''}`.trim(),
            saat: `${egitim.saat}${egitim.bitisSaati ? ' - ' + egitim.bitisSaati : ''}`,
            yer: egitim.yer,
            egitmen: egitim.egitmen,
            kategori: egitim.kategori,
            aciklama: egitim.aciklama,
            link: egitim.link,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || `API Hatası: ${res.status}`);
      if (!data.metin) throw new Error('Boş cevap');
      setMetin(data.metin);
    } catch (err) {
      setHata(err.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const handleKopyala = () => {
    navigator.clipboard.writeText(metin);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Duyuru Metni Oluştur</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{egitim.egitim}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          {!metin && !yukleniyor && !hata && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 text-sm text-gray-600 border border-purple-100">
              <div className="font-semibold text-amare-purple mb-1 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />WhatsApp & Sosyal Medya Duyurusu
              </div>
              Eğitim bilgilerinden otomatik olarak etkileyici bir Türkçe duyuru metni oluşturulacak.
              Metni düzenleyip kopyalayabilirsiniz.
            </div>
          )}

          {hata && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{hata}</div>
          )}

          {metin && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Oluşturulan Metin</span>
                <span className="text-xs text-gray-400">{metin.length} karakter</span>
              </div>
              <textarea
                value={metin}
                onChange={e => setMetin(e.target.value)}
                rows={12}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-none leading-relaxed"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleOlustur}
              disabled={yukleniyor}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amare-purple to-amare-blue hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {yukleniyor
                ? <><Loader2 className="w-4 h-4 animate-spin" />Oluşturuluyor...</>
                : metin
                  ? <><RefreshCw className="w-4 h-4" />Yeniden Oluştur</>
                  : <><MessageCircle className="w-4 h-4" />Duyuru Oluştur</>}
            </button>
            {metin && (
              <button
                onClick={handleKopyala}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${kopyalandi ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {kopyalandi ? <><Check className="w-4 h-4" />Kopyalandı!</> : <><Copy className="w-4 h-4" />Kopyala</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuyuruModal;
