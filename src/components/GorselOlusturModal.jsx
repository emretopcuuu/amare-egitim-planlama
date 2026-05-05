import React, { useState } from 'react';
import { X, Upload, ImageIcon, Download, Loader2, AlertCircle, CheckCircle2, Link2, Sparkles, FileImage, Zap } from 'lucide-react';
import { gorselOlustur } from '../utils/gorselOlustur';
import { gorselOlusturOpenAI } from '../utils/gorselOlusturOpenAI';
import { gorselOlusturCanvas } from '../utils/gorselOlusturCanvas';
import { gorselOlusturHibrit } from '../utils/gorselOlusturHibrit';

const GorselOlusturModal = ({ egitim, egitmenFotoURL, egitmenFotoURLs, egitmenler, apiKey, openaiApiKey, onClose, sablonlar = [], onGorselBagla }) => {
  const [mod, setMod] = useState('ai'); // 'ai' | 'upload'

  // AI mod state
  const [secilenSablon, setSecilenSablon] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [resultBlobUrl, setResultBlobUrl] = useState(null);
  const [error, setError] = useState(null);
  const [yeniYukle, setYeniYukle] = useState(sablonlar.length === 0);
  // Model seçimi: 'hibrit' | 'gemini' | 'canvas' | 'openai' — default 'hibrit'
  const [aiModel, setAiModel] = useState(() => {
    const saved = localStorage.getItem('aiModel');
    if (saved === 'canvas' || saved === 'openai' || saved === 'gemini' || saved === 'hibrit') return saved;
    return 'hibrit';
  });
  // Format: 'square' (1:1) | 'story' (9:16) | 'landscape' (16:9)
  const [format, setFormat] = useState(() => localStorage.getItem('aiFormat') || 'square');
  // Fallback toggle — default KAPALI çünkü OpenAI image-edits Türkçe karakter ve yüz koruma kötü
  const [fallbackOn, setFallbackOn] = useState(localStorage.getItem('aiFallback') === 'on');
  const [aktifModel, setAktifModel] = useState(null); // üretim sırasında hangisinin çalıştığını göster

  // Ek prompt — modal açılırken konuşmacı isim+unvan listesi ile otomatik doldurulur.
  // Kullanıcı bu listeyi görür ve etkinliğe özel rol değişiklikleri yapabilir
  // (örn. panel modaratörü = "Modaratör"). Boş satırla ayrılan bloklar Gemini'ye
  // her konuşmacının ekranda nasıl yazılacağını kesin söyler.
  const [ekPrompt, setEkPrompt] = useState(() => {
    if (!egitmenler || egitmenler.length === 0) return '';
    const lines = [
      'KONUŞMACI ALTI YAZILACAK ETİKETLER (her bloğu görselde aynen göster, sıra önemli):',
      '',
    ];
    egitmenler.forEach((e, i) => {
      lines.push(`${i + 1}. ${(e.ad || '').toUpperCase()}`);
      lines.push(`   ${e.unvan || '(unvan girilmemiş — boş bırak)'}`);
      lines.push('');
    });
    lines.push('NOT: Yukarıdaki unvanlar dışında HİÇBİR şey yazma, başka unvan UYDURMA.');
    return lines.join('\n');
  });

  // Upload mod state
  const [uploadedFile, setUploadedFile] = useState(null); // { file, preview, dataUrl }
  const [uploadError, setUploadError] = useState(null);

  // Ortak (bağla)
  const [baglandi, setBaglandi] = useState(false);
  const [baglaniyor, setBaglaniyor] = useState(false);

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

  const handleUploadSec = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Lütfen bir resim dosyası seçin (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Dosya 10MB\'dan büyük olamaz.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({ file, preview: reader.result, dataUrl: reader.result });
      setUploadError(null);
      setBaglandi(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSablonSec = (s) => {
    setSecilenSablon({ type: 'saved', url: s.url, ad: s.ad });
    setResultBlobUrl(null);
    setError(null);
  };

  // Format → boyut dönüşümü
  const getDimensions = (fmt) => {
    if (fmt === 'story') return { width: 1080, height: 1920 };
    if (fmt === 'landscape') return { width: 1920, height: 1080 };
    return { width: 1080, height: 1080 };
  };

  // Modeli çalıştıran inner fonksiyon — fallback için kullanılır
  const runModel = async (model, sablonKaynak) => {
    setAktifModel(model);
    const dims = getDimensions(format);
    if (model === 'hibrit') {
      return await gorselOlusturHibrit({
        apiKey, egitim, egitmenler: egitmenler || [],
        sablonFile: sablonKaynak, ekPrompt, ...dims,
      });
    }
    if (model === 'canvas') {
      return await gorselOlusturCanvas({
        egitim, egitmenler: egitmenler || [],
        sablonFile: sablonKaynak, ekPrompt, ...dims,
      });
    }
    if (model === 'openai') {
      const result = await gorselOlusturOpenAI({
        apiKey: openaiApiKey,
        egitim, egitmenler: egitmenler || [],
        sablonFile: sablonKaynak, ekPrompt,
        quality: 'medium', format,
      });
      return result;
    }
    return await gorselOlustur({ apiKey, egitim, egitmenFotoURL, egitmenFotoURLs, egitmenler, sablonFile: sablonKaynak, ekPrompt, format });
  };

  const handleOlustur = async () => {
    if (!secilenSablon) { setError('Lütfen bir şablon seçin.'); return; }
    setGenerating(true);
    setError(null);
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setResultBlobUrl(null);
    setAktifModel(null);
    const sablonKaynak = secilenSablon.type === 'file' ? secilenSablon.file : secilenSablon.url;

    // Önce seçili model, başarısız olursa fallback
    const modelSirasi = fallbackOn
      ? (aiModel === 'gemini' ? ['gemini', 'openai'] : ['openai', 'gemini'])
      : [aiModel];

    let lastErr = null;
    let result = null;
    for (const m of modelSirasi) {
      try {
        if (m === 'openai' && !openaiApiKey) { lastErr = new Error('OpenAI API anahtarı yok.'); continue; }
        if (m === 'gemini' && !apiKey) { lastErr = new Error('Gemini API anahtarı yok.'); continue; }
        result = await runModel(m, sablonKaynak);
        break;
      } catch (err) {
        console.warn(`[gorsel] ${m} başarısız:`, err.message);
        lastErr = err;
        continue;
      }
    }

    try {
      if (!result) throw lastErr || new Error('Tüm modeller başarısız.');
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

  const handleBaglaAI = async () => {
    setBaglaniyor(true);
    try {
      const resp = await fetch(resultBlobUrl);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        await onGorselBagla(egitim.id, reader.result);
        setBaglandi(true);
        setBaglaniyor(false);
      };
      reader.readAsDataURL(blob);
    } catch { setBaglaniyor(false); }
  };

  const handleBaglaUpload = async () => {
    if (!uploadedFile) return;
    setBaglaniyor(true);
    try {
      await onGorselBagla(egitim.id, uploadedFile.dataUrl);
      setBaglandi(true);
    } catch (err) {
      setUploadError('Bağlanamadı: ' + err.message);
    } finally {
      setBaglaniyor(false);
    }
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

        {/* Mod seçici (sekmeler) */}
        <div className="flex border-b">
          <button
            onClick={() => { setMod('ai'); setBaglandi(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2 ${
              mod === 'ai' ? 'border-amare-purple text-amare-purple bg-purple-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />AI ile Oluştur
          </button>
          <button
            onClick={() => { setMod('upload'); setBaglandi(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2 ${
              mod === 'upload' ? 'border-amare-purple text-amare-purple bg-purple-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileImage className="w-4 h-4" />Dosyadan Yükle
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Eğitim Bilgileri */}
          <div className="bg-purple-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="font-bold text-amare-purple text-base">{egitim.egitim}</div>
            <div className="text-gray-600">📅 {egitim.gun} {egitim.tarih} &nbsp;|&nbsp; 🕐 {egitim.saat}{egitim.bitisSaati ? ` - ${egitim.bitisSaati}` : ''}</div>
            {egitim.egitmen && <div className="text-gray-600">🎤 {egitim.egitmen}</div>}
            {egitim.yer && <div className="text-gray-600">📍 {egitim.yer}</div>}
            {egitim.gorselUrl && <div className="text-blue-600 font-medium">📎 Bağlı bir görsel zaten mevcut</div>}
          </div>

          {/* ─── AI MOD ─── */}
          {mod === 'ai' && (
            <>
              {/* Şablon Seçimi */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Şablon Seçin</div>
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
                            {secili && <div className="absolute inset-0 bg-amare-purple/20 flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-amare-purple drop-shadow" /></div>}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center truncate">{s.ad}</div>
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setYeniYukle(!yeniYukle)} className="text-xs text-amare-purple hover:underline">
                      {yeniYukle ? '▲ Yeni şablon yüklemeyi gizle' : '▼ Farklı bir şablon yükle'}
                    </button>
                  </div>
                )}
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
                  <button onClick={() => setSecilenSablon(null)} className="text-xs text-red-500 mt-1 hover:underline">Yüklenen şablonu kaldır</button>
                )}
              </div>

              {/* Ek Prompt */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Ek İstek / Konuşmacı Etiketleri
                  <span className="text-gray-400 font-normal"> (otomatik dolduruldu, dilersen düzenle)</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  💡 Konuşmacıların altında yazılacak isim+unvan etiketleri. Panel/Vizyon günlerinde özel rol (örn. "Modaratör") yazmak istersen burayı düzenle. Tasarım için ek istek varsa en alta ekle.
                </p>
                <textarea value={ekPrompt} onChange={(e) => setEkPrompt(e.target.value)} placeholder="Örn: arka planı koyu mor yap..." rows={10} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-y" />
              </div>

              {/* Format Seçici */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">GÖRSEL FORMATI</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setFormat('square'); localStorage.setItem('aiFormat', 'square'); }}
                    className={`p-2.5 rounded-lg border-2 text-center text-xs transition-all ${format === 'square' ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex justify-center mb-1">
                      <div className="w-8 h-8 border-2 border-current rounded" />
                    </div>
                    <div className="font-bold">Kare</div>
                    <div className="text-gray-500 text-[10px]">Instagram post · 1:1</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormat('story'); localStorage.setItem('aiFormat', 'story'); }}
                    className={`p-2.5 rounded-lg border-2 text-center text-xs transition-all ${format === 'story' ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex justify-center mb-1">
                      <div className="w-5 h-9 border-2 border-current rounded" />
                    </div>
                    <div className="font-bold">Story</div>
                    <div className="text-gray-500 text-[10px]">IG/FB story · 9:16</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormat('landscape'); localStorage.setItem('aiFormat', 'landscape'); }}
                    className={`p-2.5 rounded-lg border-2 text-center text-xs transition-all ${format === 'landscape' ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex justify-center mb-1">
                      <div className="w-9 h-5 border-2 border-current rounded" />
                    </div>
                    <div className="font-bold">Yatay</div>
                    <div className="text-gray-500 text-[10px]">LinkedIn/Banner · 16:9</div>
                  </button>
                </div>
              </div>

              {/* Model Seçici */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">ÜRETİM YÖNTEMİ</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAiModel('hibrit'); localStorage.setItem('aiModel', 'hibrit'); }}
                    className={`p-2.5 rounded-lg border-2 text-left text-xs transition-all ${aiModel === 'hibrit' ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-1 font-bold">🎯 Hibrit <span className="text-[10px] bg-green-200 text-green-900 px-1 rounded">önerilen</span></div>
                    <div className="text-gray-500 mt-0.5">AI tasarım + Gerçek yüzler · ~$0.04</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiModel('gemini'); localStorage.setItem('aiModel', 'gemini'); }}
                    className={`p-2.5 rounded-lg border-2 text-left text-xs transition-all ${aiModel === 'gemini' ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-1 font-bold">🍌 Gemini</div>
                    <div className="text-gray-500 mt-0.5">Tam AI · Yüz değişebilir · ~$0.04</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiModel('canvas'); localStorage.setItem('aiModel', 'canvas'); }}
                    className={`p-2.5 rounded-lg border-2 text-left text-xs transition-all ${aiModel === 'canvas' ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-1 font-bold">🎨 Canvas</div>
                    <div className="text-gray-500 mt-0.5">Yüz garantili · Anlık · ÜCRETSİZ</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiModel('openai'); localStorage.setItem('aiModel', 'openai'); }}
                    className={`p-2.5 rounded-lg border-2 text-left text-xs transition-all ${aiModel === 'openai' ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-1 font-bold">🤖 OpenAI</div>
                    <div className="text-gray-500 mt-0.5">AI tasarım + Gerçek yüzler · ~$0.04</div>
                  </button>
                </div>
                {aiModel !== 'canvas' && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={fallbackOn}
                      onChange={(e) => { setFallbackOn(e.target.checked); localStorage.setItem('aiFallback', e.target.checked ? 'on' : 'off'); }}
                      className="rounded"
                    />
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Fallback: seçili model başarısız olursa diğeri otomatik denensin
                  </label>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              {!resultBlobUrl && (
                <button onClick={handleOlustur} disabled={!secilenSablon || generating} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amare-purple to-amare-blue hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {aktifModel === 'hibrit' ? '🎯 Gemini arka plan + Canvas yüzleri...' :
                       aktifModel === 'canvas' ? '🎨 Canvas çiziyor...' :
                       aktifModel === 'openai' ? '🤖 OpenAI üretiyor...' :
                       aktifModel === 'gemini' ? '🍌 Gemini üretiyor...' :
                       'Görsel Oluşturuluyor...'}
                    </>
                  ) : <><ImageIcon className="w-5 h-5" />Görsel Hazırla</>}
                </button>
              )}

              {resultBlobUrl && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-green-700">✅ Görsel hazırlandı!</div>
                  <img src={resultBlobUrl} alt="Oluşturulan Görsel" className="w-full rounded-xl border shadow" />
                  <div className="flex gap-3">
                    <button onClick={handleIndir} className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition flex items-center justify-center gap-2">
                      <Download className="w-5 h-5" />İndir
                    </button>
                    {onGorselBagla && (
                      <button onClick={handleBaglaAI} disabled={baglandi || baglaniyor} className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${baglandi ? 'bg-green-100 text-green-700' : 'bg-amare-purple text-white hover:bg-amare-dark'} disabled:opacity-60`}>
                        {baglaniyor ? <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor...</> : baglandi ? <><CheckCircle2 className="w-4 h-4" />Bağlandı</> : <><Link2 className="w-4 h-4" />Eğitime Bağla</>}
                      </button>
                    )}
                    <button onClick={() => { setResultBlobUrl(null); setError(null); setBaglandi(false); }} className="py-3 px-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition">Yeniden</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── UPLOAD MOD ─── */}
          {mod === 'upload' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <b>Başka yerde hazırlanmış bir görseli mi eklemek istiyorsun?</b>
                <div className="mt-1 text-blue-700">Canva, Photoshop veya herhangi bir yerde hazırladığın posteri burada yükle, doğrudan bu eğitime bağla.</div>
              </div>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-amare-purple hover:bg-purple-50 transition-colors">
                {uploadedFile ? (
                  <img src={uploadedFile.preview} alt="Yüklenen görsel" className="max-h-96 rounded-lg object-contain" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-300 mb-3" />
                    <span className="text-gray-700 text-base font-semibold">Görseli seçmek için tıkla</span>
                    <span className="text-gray-400 text-xs mt-1">JPG, PNG, WEBP — max 10MB</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleUploadSec} className="hidden" />
              </label>

              {uploadedFile && (
                <div className="text-xs text-gray-500 text-center">
                  <b>{uploadedFile.file.name}</b> · {(uploadedFile.file.size / 1024).toFixed(0)} KB
                  <button onClick={() => { setUploadedFile(null); setBaglandi(false); }} className="ml-2 text-red-500 hover:underline">Kaldır</button>
                </div>
              )}

              {uploadError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{uploadError}</span>
                </div>
              )}

              {uploadedFile && onGorselBagla && (
                <button onClick={handleBaglaUpload} disabled={baglandi || baglaniyor} className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${baglandi ? 'bg-green-100 text-green-700' : 'bg-amare-purple text-white hover:bg-amare-dark'} disabled:opacity-60`}>
                  {baglaniyor ? <><Loader2 className="w-4 h-4 animate-spin" />Yükleniyor ve bağlanıyor...</> : baglandi ? <><CheckCircle2 className="w-4 h-4" />Eğitime Bağlandı</> : <><Link2 className="w-4 h-4" />Bu Görseli Eğitime Bağla</>}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GorselOlusturModal;
