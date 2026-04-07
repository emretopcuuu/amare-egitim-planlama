import React, { useState } from 'react';
import { X, Copy, Check, Loader2, MessageCircle, RefreshCw } from 'lucide-react';

const DuyuruModal = ({ egitim, apiKey, onClose }) => {
  const [metin, setMetin] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hata, setHata] = useState(null);

  const handleOlustur = async () => {
    if (!apiKey) { setHata('API anahtarı eksik. Ayarlar sekmesinden ekleyin.'); return; }
    setYukleniyor(true);
    setHata(null);

    const prompt = `Aşağıdaki eğitim etkinliği için WhatsApp ve sosyal medya paylaşımına uygun, Türkçe, etkileyici bir duyuru metni yaz.
Emoji kullan, heyecan verici ve motive edici bir dil kullan. ONE TEAM ruhunu yansıt.
3-4 kısa paragraf olsun. Sadece duyuru metnini yaz, başka açıklama ekleme.

ETKİNLİK BİLGİLERİ:
- Eğitim Adı: ${egitim.egitim}
- Tarih: ${egitim.tarih} ${egitim.gun || ''}
- Saat: ${egitim.saat}${egitim.bitisSaati ? ' - ' + egitim.bitisSaati : ''}
- Platform/Yer: ${egitim.yer || 'ZOOM'}${egitim.egitmen ? '\n- Konuşmacı: ' + egitim.egitmen : ''}${egitim.kategori ? '\n- Kategori: ' + egitim.kategori : ''}${egitim.aciklama ? '\n- Açıklama: ' + egitim.aciklama : ''}`;

    try {
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9 },
      };
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API Hatası: ${res.status}`);
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('API metin döndürmedi.');
      setMetin(text);
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
