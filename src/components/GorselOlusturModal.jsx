import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, ImageIcon, Download, Loader2, AlertCircle, CheckCircle2, Link2, Sparkles, FileImage, Zap, ChevronDown, Settings2, KeyRound } from 'lucide-react';
import { gorselOlustur } from '../utils/gorselOlustur';
import { gorselOlusturOpenAIPro } from '../utils/gorselOlusturOpenAIPro';
import { gorselOlusturCanvas } from '../utils/gorselOlusturCanvas';
import { gorselOlusturHibrit } from '../utils/gorselOlusturHibrit';
import { gorselOlusturAiAfis } from '../utils/gorselOlusturAiAfis';
import { afisTuru, afisTuruLabel } from '../utils/egitmenEtiket';

// Üretim motorları — meta (ad, ikon, açıklama, tahmini süre sn, hangi anahtar gerekir)
const MOTORLAR = {
  hibrit: { ad: 'Hibrit', emoji: '🎯', not: 'AI tasarım + gerçek yüzler', sure: 55, key: 'gemini' },
  'ai-afis': { ad: 'AI Afiş', emoji: '🎨', not: 'Şablonsuz · şehir illüstrasyonu', sure: 30, key: 'gemini', sablonsuz: true },
  gemini: { ad: 'Gemini', emoji: '🍌', not: 'Tam AI · yüz değişebilir', sure: 45, key: 'gemini' },
  canvas: { ad: 'Canvas', emoji: '🖌️', not: 'Anlık · ücretsiz · her zaman çalışır', sure: 3, key: null },
  'openai-pro': { ad: 'OpenAI Pro', emoji: '✨', not: 'gpt-image · sunucu', sure: 45, key: 'openai' },
};

// Yapısal konuşmacı etiketlerinden generator'ların beklediği metin bloğunu üret.
const buildEkPrompt = (etiketler, ekIstek) => {
  const lines = ['KONUŞMACI ALTI YAZILACAK ETİKETLER (her bloğu görselde aynen göster, sıra önemli):', ''];
  (etiketler || []).forEach((e, i) => {
    lines.push(`${i + 1}. ${(e.ad || '').toUpperCase()}`);
    lines.push(`   ${(e.etiket || '').trim() || '(unvan girilmemiş — boş bırak)'}`);
    lines.push('');
  });
  lines.push('NOT: Yukarıdaki unvanlar dışında HİÇBİR şey yazma, başka unvan UYDURMA.');
  if (ekIstek && ekIstek.trim()) lines.push('', 'EK TASARIM İSTEĞİ: ' + ekIstek.trim());
  return lines.join('\n');
};

const GorselOlusturModal = ({ egitim, egitmenFotoURL, egitmenFotoURLs, egitmenler, apiKey, openaiApiKey, onClose, sablonlar = [], onGorselBagla }) => {
  const [mod, setMod] = useState('ai'); // 'ai' | 'upload'

  // AI mod state
  const [secilenSablon, setSecilenSablon] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [resultBlobUrl, setResultBlobUrl] = useState(null);
  const [error, setError] = useState(null);
  const [yeniYukle, setYeniYukle] = useState(sablonlar.length === 0);
  // Model seçimi: 'hibrit' | 'gemini' | 'canvas' | 'openai-pro' — default 'hibrit'
  const [aiModel, setAiModel] = useState(() => {
    const saved = localStorage.getItem('aiModel');
    // Eski 'openai' kayıtlarını 'openai-pro'ya migrate et
    if (saved === 'openai') return 'openai-pro';
    if (['canvas', 'openai-pro', 'gemini', 'hibrit', 'ai-afis'].includes(saved)) return saved;
    return 'hibrit';
  });
  // Format: 'square' (1:1) | 'story' (9:16) | 'landscape' (16:9)
  const [format, setFormat] = useState(() => localStorage.getItem('aiFormat') || 'square');
  // Fallback toggle — DEFAULT AÇIK: Gemini cap dolduğunda otomatik OpenAI Pro'ya geçer
  const [fallbackOn, setFallbackOn] = useState(() => {
    const v = localStorage.getItem('aiFallback');
    return v === null ? true : v === 'on';
  });
  const [aktifModel, setAktifModel] = useState(null); // üretim sırasında hangisinin çalıştığını göster
  const [gelismis, setGelismis] = useState(false); // motor seçimi gizli, "Gelişmiş" altında
  const [tumSablon, setTumSablon] = useState(false); // şablon grid: ilk 8 mi hepsi mi
  const [elapsed, setElapsed] = useState(0); // üretim geçen süre (sn)
  const iptalRef = useRef(false); // soft-cancel: sonucu yoksay

  // Üretim süresi sayacı
  useEffect(() => {
    if (!generating) { setElapsed(0); return; }
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [generating]);

  const keyDurum = { gemini: !!apiKey, openai: !!openaiApiKey };

  // Ek prompt — modal açılırken konuşmacı isim+unvan listesi ile otomatik doldurulur.
  // Kullanıcı bu listeyi görür ve etkinliğe özel rol değişiklikleri yapabilir
  // (örn. panel modaratörü = "Modaratör"). Boş satırla ayrılan bloklar Gemini'ye
  // her konuşmacının ekranda nasıl yazılacağını kesin söyler.
  // Konuşmacı etiketleri — yapısal (foto + isim + düzenlenebilir etiket)
  const [etiketler, setEtiketler] = useState(() =>
    (egitmenler || []).map(e => ({ ad: e.ad || '', etiket: e.unvan || '', fotoURL: e.fotoURL || null })));
  const [ekIstek, setEkIstek] = useState(''); // serbest tasarım isteği

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
  const runModel = async (model, sablonKaynak, ekPromptStr) => {
    setAktifModel(model);
    const dims = getDimensions(format);
    if (model === 'hibrit') {
      return await gorselOlusturHibrit({
        apiKey, egitim, egitmenler: egitmenler || [],
        sablonFile: sablonKaynak, ekPrompt: ekPromptStr, ...dims,
      });
    }
    if (model === 'canvas') {
      return await gorselOlusturCanvas({
        egitim, egitmenler: egitmenler || [],
        sablonFile: sablonKaynak, ekPrompt: ekPromptStr, ...dims,
      });
    }
    if (model === 'ai-afis') {
      return await gorselOlusturAiAfis({
        geminiApiKey: apiKey, openaiApiKey,
        egitim, egitmenler: egitmenler || [],
        ekPrompt: ekPromptStr, format: 'portrait',
      });
    }
    if (model === 'openai-pro') {
      const result = await gorselOlusturOpenAIPro({
        apiKey: openaiApiKey,
        egitim, egitmenler: egitmenler || [],
        sablonFile: sablonKaynak, ekPrompt: ekPromptStr,
        quality: 'medium', format,
      });
      return result;
    }
    return await gorselOlustur({ apiKey, egitim, egitmenFotoURL, egitmenFotoURLs, egitmenler, sablonFile: sablonKaynak, ekPrompt: ekPromptStr, format });
  };

  const iptalEt = () => { iptalRef.current = true; setGenerating(false); setAktifModel(null); };

  const handleOlustur = async () => {
    // AI Afiş şablonsuz çalışır; diğer yöntemler şablon ister
    if (aiModel !== 'ai-afis' && !secilenSablon) { setError('Lütfen bir şablon seçin (ya da "AI Afiş" yöntemini seç — şablonsuz çalışır).'); return; }
    iptalRef.current = false;
    setGenerating(true);
    setError(null);
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setResultBlobUrl(null);
    setAktifModel(null);
    const sablonKaynak = secilenSablon
      ? (secilenSablon.type === 'file' ? secilenSablon.file : secilenSablon.url)
      : null;
    const ekPromptStr = buildEkPrompt(etiketler, ekIstek);

    // Önce seçili model, başarısız olursa fallback zinciri
    // Hibrit/Gemini başarısız → OpenAI Pro
    // OpenAI Pro başarısız → Hibrit (varsa)
    const modelSirasi = fallbackOn
      ? (aiModel === 'hibrit' ? ['hibrit', 'openai-pro', 'canvas']
        : aiModel === 'gemini' ? ['gemini', 'openai-pro', 'canvas']
        : aiModel === 'openai-pro' ? ['openai-pro', 'hibrit', 'canvas']
        : aiModel === 'ai-afis' ? ['ai-afis']
        : [aiModel])
      : [aiModel];

    let lastErr = null;
    let result = null;
    for (const m of modelSirasi) {
      try {
        if (m === 'openai-pro' && !openaiApiKey) { lastErr = new Error('OpenAI API anahtarı yok.'); continue; }
        if ((m === 'gemini' || m === 'hibrit') && !apiKey) { lastErr = new Error('Gemini API anahtarı yok.'); continue; }
        result = await runModel(m, sablonKaynak, ekPromptStr);
        break;
      } catch (err) {
        console.warn(`[gorsel] ${m} başarısız:`, err.message);
        lastErr = err;
        continue;
      }
    }

    if (iptalRef.current) return; // kullanıcı iptal etti — sonucu yoksay
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
              {/* Anahtar durumu */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-gray-600"><KeyRound className="w-3.5 h-3.5" />Anahtarlar:</span>
                <span className={keyDurum.gemini ? 'text-green-600 font-semibold' : 'text-gray-400'}>Gemini {keyDurum.gemini ? '✓' : '✗'}</span>
                <span className={keyDurum.openai ? 'text-green-600 font-semibold' : 'text-gray-400'}>OpenAI {keyDurum.openai ? '✓' : '✗'}</span>
                {!keyDurum.gemini && !keyDurum.openai && <span className="text-amber-600">AI için anahtar gerekli — Canvas ücretsiz çalışır</span>}
              </div>
              {/* Şablon Seçimi */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Şablon Seçin</div>
                {sablonlar.length > 0 && (
                  <div className="mb-3">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                      {(tumSablon ? sablonlar : sablonlar.slice(0, 8)).map((s) => {
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
                    <div className="flex items-center gap-3">
                      {sablonlar.length > 8 && (
                        <button onClick={() => setTumSablon(t => !t)} className="text-xs text-gray-500 hover:underline">
                          {tumSablon ? '▲ Daha az göster' : `▼ Tüm şablonlar (${sablonlar.length})`}
                        </button>
                      )}
                      <button onClick={() => setYeniYukle(!yeniYukle)} className="text-xs text-amare-purple hover:underline">
                        {yeniYukle ? '▲ Yeni şablon yüklemeyi gizle' : '▼ Farklı bir şablon yükle'}
                      </button>
                    </div>
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

              {/* Konuşmacı etiketleri — yapısal form */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Konuşmacı Etiketleri</label>
                <p className="text-[11px] text-amare-purple font-semibold mb-2">
                  Tespit edilen tür: {afisTuruLabel(afisTuru(egitim))} — etiketler buna göre dolduruldu, gerekirse düzenle.
                </p>
                {etiketler.length === 0 ? (
                  <p className="text-xs text-gray-400">Bu etkinlikte konuşmacı bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {etiketler.map((e, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {e.fotoURL
                          ? <img src={e.fotoURL} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                          : <div className="w-9 h-9 rounded-full bg-purple-100 text-amare-purple flex items-center justify-center text-xs font-bold flex-shrink-0">{(e.ad || '?').slice(0, 1).toUpperCase()}</div>}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-700 truncate">{e.ad}</div>
                          <input value={e.etiket}
                            onChange={(ev) => setEtiketler(prev => prev.map((x, idx) => idx === i ? { ...x, etiket: ev.target.value } : x))}
                            placeholder="Unvan / rol (örn. Diamond, Moderatör)"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <label className="text-xs font-semibold text-gray-600 mt-3 mb-1 block">Tasarıma ek istek (opsiyonel)</label>
                <textarea value={ekIstek} onChange={(e) => setEkIstek(e.target.value)} rows={2}
                  placeholder="Örn: arka planı koyu mor yap, üstte ışık efekti…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-y" />
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

              {/* Yöntem özeti + Gelişmiş aç/kapa */}
              <button type="button" onClick={() => setGelismis(g => !g)}
                className="w-full flex items-center justify-between gap-2 text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-100 transition">
                <span className="text-gray-700">
                  Yöntem: <b>{MOTORLAR[aiModel].emoji} {MOTORLAR[aiModel].ad}</b>
                  <span className="text-gray-400 font-normal"> · {MOTORLAR[aiModel].not}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-amare-purple font-semibold">
                  <Settings2 className="w-3.5 h-3.5" />Gelişmiş
                  <ChevronDown className={`w-4 h-4 transition-transform ${gelismis ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {/* Model Seçici (Gelişmiş) */}
              {gelismis && (
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
                    onClick={() => { setAiModel('openai-pro'); localStorage.setItem('aiModel', 'openai-pro'); }}
                    className={`p-2.5 rounded-lg border-2 text-left text-xs transition-all ${aiModel === 'openai-pro' ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-1 font-bold">✨ OpenAI Pro</div>
                    <div className="text-gray-500 mt-0.5">gpt-image-1 · Tam AI · ~$0.08</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiModel('ai-afis'); localStorage.setItem('aiModel', 'ai-afis'); }}
                    className={`p-2.5 rounded-lg border-2 text-left text-xs transition-all ${aiModel === 'ai-afis' ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-1 font-bold">🎨 AI Afiş</div>
                    <div className="text-gray-500 mt-0.5">Şablonsuz · şehir illüstrasyonu · ~$0.08</div>
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
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      {/anahtar|api key|incorrect|unauthor|401|403/i.test(error)
                        ? <>API anahtarın geçersiz görünüyor. Üstteki <b>AI API Anahtarları</b> panelinden düzelt — ya da aşağıdan <b>Canvas (ücretsiz)</b> ile üret.<div className="text-[11px] text-red-400 mt-1">{error}</div></>
                        : <span>{error}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-red-200">
                    {!fallbackOn && aiModel !== 'canvas' && (
                      <button onClick={() => { setFallbackOn(true); localStorage.setItem('aiFallback', 'on'); setError(null); }}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">⚡ Fallback'i aç</button>
                    )}
                    <button onClick={() => { setAiModel('canvas'); localStorage.setItem('aiModel', 'canvas'); setError(null); }}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg">🖌️ Canvas'a geç (ücretsiz)</button>
                    <button onClick={() => { setError(null); handleOlustur(); }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg">↻ Tekrar dene</button>
                  </div>
                </div>
              )}

              {!resultBlobUrl && (
                <div className="space-y-2">
                  <button onClick={handleOlustur}
                    disabled={generating || (aiModel !== 'ai-afis' && !secilenSablon)}
                    className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amare-purple to-amare-blue hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {(MOTORLAR[aktifModel]?.emoji || '⏳')} {MOTORLAR[aktifModel]?.ad || 'Afiş'} üretiyor… {elapsed}sn
                        <span className="opacity-70 font-normal">/ ~{MOTORLAR[aktifModel]?.sure || MOTORLAR[aiModel]?.sure || 30}sn</span>
                      </>
                    ) : <><ImageIcon className="w-5 h-5" />Afiş Oluştur</>}
                  </button>
                  {generating && (
                    <button onClick={iptalEt} className="w-full py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                      İptal
                    </button>
                  )}
                </div>
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
                  </div>
                  {/* İterasyon: varyasyon üret / baştan */}
                  <div className="flex gap-2">
                    <button onClick={handleOlustur} disabled={generating}
                      className="flex-1 py-2.5 rounded-xl font-bold text-amare-purple bg-purple-50 hover:bg-purple-100 border border-amare-purple/30 transition flex items-center justify-center gap-2 disabled:opacity-50">
                      <Sparkles className="w-4 h-4" />Varyasyon üret
                    </button>
                    <button onClick={() => { setResultBlobUrl(null); setError(null); setBaglandi(false); }}
                      className="py-2.5 px-4 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition">Baştan</button>
                  </div>
                  <p className="text-[11px] text-gray-500 text-center">
                    Beğenmedin mi? Yukarıdan <b>"Tasarıma ek istek"</b>e not yaz (örn. "başlığı büyüt", "arka planı koyulaştır") → <b>Varyasyon üret</b>.
                  </p>
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
