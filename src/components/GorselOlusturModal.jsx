import React, { useState } from 'react';
import { X, Upload, ImageIcon, Download, Loader2, AlertCircle } from 'lucide-react';
import { gorselOlustur } from '../utils/gorselOlustur';

const GorselOlusturModal = ({ egitim, egitmenFotoURL, apiKey, onClose }) => {
  const [sablonFile, setSablonFile] = useState(null);
  const [sablonPreview, setSablonPreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [resultDataUrl, setResultDataUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleSablonSec = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSablonFile(file);
    const reader = new FileReader();
    reader.onload = () => setSablonPreview(reader.result);
    reader.readAsDataURL(file);
    setResultDataUrl(null);
    setError(null);
    e.target.value = '';
  };

  const handleOlustur = async () => {
    if (!sablonFile) { setError('Lütfen önce bir şablon görseli seçin.'); return; }
    setGenerating(true);
    setError(null);
    if (resultDataUrl) URL.revokeObjectURL(resultDataUrl);
    setResultDataUrl(null);
    try {
      const result = await gorselOlustur({ apiKey, egitim, egitmenFotoURL, sablonFile });
      // base64 → Blob URL (URL-safe base64 ve büyük data URL sorununu çözer)
      const standardB64 = result.base64.replace(/-/g, '+').replace(/_/g, '/');
      const byteChars = atob(standardB64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: result.mimeType });
      setResultDataUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleIndir = () => {
    const a = document.createElement('a');
    a.href = resultDataUrl;
    const ad = (egitim.egitim || 'gorsel').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${ad}_${egitim.tarih || ''}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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

        <div className="p-6 space-y-6">
          {/* Eğitim Bilgileri */}
          <div className="bg-purple-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="font-bold text-amare-purple text-base">{egitim.egitim}</div>
            <div className="text-gray-600">📅 {egitim.gun} {egitim.tarih} &nbsp;|&nbsp; 🕐 {egitim.saat}{egitim.bitisSaati ? ` - ${egitim.bitisSaati}` : ''}</div>
            {egitim.egitmen && <div className="text-gray-600">🎤 {egitim.egitmen}</div>}
            {egitim.yer && <div className="text-gray-600">📍 {egitim.yer}</div>}
            {egitmenFotoURL
              ? <div className="flex items-center gap-2 text-green-600 font-medium">✅ Konuşmacı fotoğrafı mevcut</div>
              : <div className="text-orange-500">⚠️ Konuşmacı fotoğrafı yüklenmemiş — görselsiz oluşturulacak</div>}
          </div>

          {/* Şablon Yükleme */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Şablon Görsel Seçin</div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-amare-purple hover:bg-purple-50 transition-colors">
              {sablonPreview ? (
                <img src={sablonPreview} alt="Şablon" className="max-h-40 rounded-lg object-contain" />
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-300 mb-2" />
                  <span className="text-gray-500 text-sm">Şablon görsel seçmek için tıklayın</span>
                  <span className="text-gray-400 text-xs mt-1">JPG, PNG, WEBP</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleSablonSec} className="hidden" />
            </label>
            {sablonPreview && (
              <button onClick={() => { setSablonFile(null); setSablonPreview(null); }} className="text-xs text-red-500 mt-1 hover:underline">
                Şablonu Kaldır
              </button>
            )}
          </div>

          {/* Hata */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Oluştur Butonu */}
          {!resultDataUrl && (
            <button
              onClick={handleOlustur}
              disabled={!sablonFile || generating}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amare-purple to-amare-blue hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Görsel Oluşturuluyor...
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5" />
                  Görsel Hazırla
                </>
              )}
            </button>
          )}

          {/* Sonuç */}
          {resultDataUrl && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-green-700">✅ Görsel hazırlandı!</div>
              <img src={resultDataUrl} alt="Oluşturulan Görsel" className="w-full rounded-xl border shadow" />
              <div className="flex gap-3">
                <button
                  onClick={handleIndir}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  İndir
                </button>
                <button
                  onClick={() => { setResultDataUrl(null); setError(null); }}
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
