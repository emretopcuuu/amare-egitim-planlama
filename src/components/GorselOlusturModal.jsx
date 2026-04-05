import React, { useState } from 'react';
import { X, Upload, ImageIcon, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { gorselOlustur } from '../utils/gorselOlustur';

const GorselOlusturModal = ({ egitim, egitmenFotoURL, apiKey, onClose, sablonlar = [] }) => {
  const [secilenSablon, setSecilenSablon] = useState(null); // { type: 'saved', url, ad } | { type: 'file', file, preview }
  const [generating, setGenerating] = useState(false);
  const [resultBlobUrl, setResultBlobUrl] = useState(null);
  const [error, setError] = useState(null);
  const [yeniYukle, setYeniYukle] = useState(sablonlar.length === 0);
  const [ekPrompt, setEkPrompt] = useState('');

  const handleDosyaSec = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSecilenSablon({ type: 'file', file, preview: reader.result });
    reader.readAsDataURL(file);
    setResultBlobUrl(null);
    setError(null);
    e.target.value = '';
  };

  const handleSablonSec = (s) => {
    setSecilenSablon({ type: 'saved', url: s.url, ad: s.ad });
    setResultBlobUrl(null);
    setError(null);
  };

  const handleOlustur = async () => {
    if (!secilenSablon) { setError('Lütfen bir şablon seçin.'); return; }
    setGenerating(true);
    setError(null);
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setResultBlobUrl(null);
    try {
      const sablonKaynak = secilenSablon.type === 'file' ? secilenSablon.file : secilenSablon.url;
      const result = await gorselOlustur({ apiKey, egitim, egitmenFotoURL, sablonFile: sablonKaynak, ekPrompt });
      const standardB64 = result.base64.replace(/-/g, '+').replace(/_/g, '/');
      const byteChars = atob(standardB64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: result.mimeType });
      setResultBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleIndir = () => {
    const a = document.createElement('a');
    a.href = resultBlobUrl;
    const ad = (egitim.egitim || 'gorsel').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${ad}_${egitim.tarih || ''}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const sablonPreview = secilenSablon?.type === 'file' ? secilenSablon.preview : secilenSablon?.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Başlık */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Görsel Hazırla</h2>
            <p className="text-sm text-gray-500 mt-0.5">{egitim.egitim}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Eğitim Bilgileri */}
          <div className="bg-purple-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="font-bold text-amare-purple text-base">{egitim.egitim}</div>
            <div className="text-gray-600">📅 {egitim.gun} {egitim.tarih} &nbsp;|&nbsp; 🕐 {egitim.saat}{egitim.bitisSaati ? ` - ${egitim.bitisSaati}` : ''}</div>
            {egitim.egitmen && <div className="text-gray-600">🎤 {egitim.egitmen}</div>}
            {egitim.yer && <div className="text-gray-600">📍 {egitim.yer}</div>}
            {egitmenFotoURL
              ? <div className="text-green-600 font-medium">✅ Konuşmacı fotoğrafı mevcut</div>
              : <div className="text-orange-500">⚠️ Konuşmacı fotoğrafı yüklenmemiş — görselsiz oluşturulacak</div>}
          </div>

          {/* Şablon Seçimi */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Şablon Seçin</div>

            {/* Kayıtlı şablonlar */}
            {sablonlar.length > 0 && (
              <div className="mb-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                  {sablonlar.map((s) => {
                    const secili = secilenSablon?.type === 'saved' && secilenSablon.url === s.url;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSablonSec(s)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${secili ? 'border-amare-purple ring-2 ring-amare-purple/30' : 'border-gray-200 hover:border-amare-purple/50'}`}
                      >
                        <img src={s.url} alt={s.ad} className="w-full h-full object-cover" />
                        {secili && (
                          <div className="absolute inset-0 bg-amare-purple/20 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-amare-purple drop-shadow" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center truncate">{s.ad}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Yeni şablon yükleme toggle */}
                <button
                  onClick={() => setYeniYukle(!yeniYukle)}
                  className="text-xs text-amare-purple hover:underline"
                >
                  {yeniYukle ? '▲ Yeni şablon yüklemeyi gizle' : '▼ Farklı bir şablon yükle'}
                </button>
              </div>
            )}

            {/* Dosya yükleme alanı */}
            {yeniYukle && (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-5 cursor-pointer hover:border-amare-purple hover:bg-purple-50 transition-colors">
                {secilenSablon?.type === 'file' ? (
                  <img src={secilenSablon.preview} alt="Şablon" className="max-h-36 rounded-lg object-contain" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-300 mb-2" />
                    <span className="text-gray-500 text-sm">Şablon yüklemek için tıklayın</span>
                    <span className="text-gray-400 text-xs mt-1">JPG, PNG, WEBP</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleDosyaSec} className="hidden" />
              </label>
            )}

            {secilenSablon?.type === 'file' && (
              <button onClick={() => setSecilenSablon(null)} className="text-xs text-red-500 mt-1 hover:underline">
                Yüklenen şablonu kaldır
              </button>
            )}
          </div>

          {/* Ek Prompt */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Ek İstek / Prompt <span className="text-gray-400 font-normal">(isteğe bağlı)</span></label>
            <textarea
              value={ekPrompt}
              onChange={(e) => setEkPrompt(e.target.value)}
              placeholder="Örn: arka planı koyu mor yap, metinleri daha büyük göster, sağ alta logo ekle..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-none"
            />
          </div>

          {/* Hata */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Oluştur Butonu */}
          {!resultBlobUrl && (
            <button
              onClick={handleOlustur}
              disabled={!secilenSablon || generating}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amare-purple to-amare-blue hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Görsel Oluşturuluyor...</>
              ) : (
                <><ImageIcon className="w-5 h-5" />Görsel Hazırla</>
              )}
            </button>
          )}

          {/* Sonuç */}
          {resultBlobUrl && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-green-700">✅ Görsel hazırlandı!</div>
              <img src={resultBlobUrl} alt="Oluşturulan Görsel" className="w-full rounded-xl border shadow" />
              <div className="flex gap-3">
                <button
                  onClick={handleIndir}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  İndir
                </button>
                <button
                  onClick={() => { setResultBlobUrl(null); setError(null); }}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Yeniden Oluştur
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GorselOlusturModal;
