import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Save, Loader2, Check, Palette, Layout, Sparkles, ImageIcon } from 'lucide-react';

const W = 1080;
const H = 1080;

const PRESETLER = [
  { id: 'klasik', ad: 'Klasik', aciklama: 'Mor başlık, beyaz zemin', emoji: '🎨' },
  { id: 'koyu', ad: 'Koyu', aciklama: 'Koyu zemin, parlak vurgu', emoji: '🌙' },
  { id: 'gradient', ad: 'Gradient', aciklama: 'Mor-mavi geçiş', emoji: '✨' },
  { id: 'minimal', ad: 'Minimal', aciklama: 'Sade, temiz tasarım', emoji: '⬜' },
];

const TEMA_RENKLERI = [
  '#6B46C1', '#3182CE', '#E53E3E', '#DD6B20',
  '#38A169', '#D69E2E', '#7B2D8B', '#0BC5EA',
];

// ── Canvas yardımcıları ────────────────────────────────────────────────────────
function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function txt(ctx, text, x, y, font, color, align = 'left') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

// ── Layout render fonksiyonları ───────────────────────────────────────────────
function renderKlasik(ctx, color) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const hg = ctx.createLinearGradient(0, 0, W, 290);
  hg.addColorStop(0, color);
  hg.addColorStop(1, color + 'BB');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, W, 290);

  [[W - 40, -60, 280], [60, 310, 140]].forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fill();
  });

  txt(ctx, 'AMARE GLOBAL', W - 50, 58, 'bold 28px Arial', 'rgba(255,255,255,0.85)', 'right');
  txt(ctx, 'ONE TEAM 10X', W - 50, 90, '22px Arial', 'rgba(255,255,255,0.55)', 'right');
  txt(ctx, 'Eğitim Başlığı', 60, 175, 'bold 62px Arial', '#FFFFFF', 'left');
  txt(ctx, 'Kategori / Konu', 60, 238, '34px Arial', 'rgba(255,255,255,0.78)', 'left');

  ctx.beginPath();
  ctx.arc(W - 175, 510, 160, 0, Math.PI * 2);
  ctx.fillStyle = color + '12';
  ctx.fill();
  ctx.strokeStyle = color + '35';
  ctx.lineWidth = 3;
  ctx.stroke();
  txt(ctx, '📷 Fotoğraf', W - 175, 520, '26px Arial', color + 'AA', 'center');

  [
    { icon: '📅', label: 'Tarih & Saat', y: 330 },
    { icon: '📍', label: 'Yer / Platform', y: 470 },
    { icon: '🎤', label: 'Konuşmacı', y: 610 },
  ].forEach(({ icon, label, y }) => {
    rrPath(ctx, 60, y, 700, 100, 16);
    ctx.fillStyle = '#F5F3FF';
    ctx.fill();
    ctx.strokeStyle = color + '28';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    txt(ctx, `${icon}  ${label}`, 95, y + 60, 'bold 30px Arial', color, 'left');
  });

  ctx.fillStyle = color;
  ctx.fillRect(0, H - 100, W, 100);
  txt(ctx, 'ONE TEAM  •  AMARE GLOBAL  •  oneteam10x', W / 2, H - 38, 'bold 24px Arial', '#FFFFFF', 'center');
}

function renderKoyu(ctx, color) {
  ctx.fillStyle = '#0F0C1D';
  ctx.fillRect(0, 0, W, H);

  const g1 = ctx.createRadialGradient(180, 200, 0, 180, 200, 620);
  g1.addColorStop(0, color + '38');
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W - 100, H - 100, 0, W - 100, H - 100, 550);
  g2.addColorStop(0, '#3182CE28');
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  const lg = ctx.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, color);
  lg.addColorStop(0.5, '#3182CE');
  lg.addColorStop(1, color);
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, 8, H);

  txt(ctx, 'AMARE GLOBAL', W - 50, 68, '26px Arial', 'rgba(255,255,255,0.35)', 'right');

  rrPath(ctx, 60, 80, 220, 50, 25);
  ctx.fillStyle = color + '28';
  ctx.fill();
  ctx.strokeStyle = color + '55';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  txt(ctx, 'KATEGORİ', 170, 114, 'bold 22px Arial', color, 'center');

  txt(ctx, 'Eğitim', 60, 240, 'bold 78px Arial', '#FFFFFF', 'left');
  txt(ctx, 'Başlığı', 60, 336, 'bold 78px Arial', '#FFFFFF', 'left');

  const dl = ctx.createLinearGradient(60, 0, 560, 0);
  dl.addColorStop(0, color);
  dl.addColorStop(1, 'transparent');
  ctx.fillStyle = dl;
  ctx.fillRect(60, 368, 520, 4);

  ['📅  Tarih & Saat', '📍  Yer / Platform', '🎤  Konuşmacı'].forEach((info, i) => {
    txt(ctx, info, 60, 450 + i * 95, '34px Arial', 'rgba(255,255,255,0.65)', 'left');
    if (i < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(60, 472 + i * 95, W - 120, 1);
    }
  });

  ctx.beginPath();
  ctx.arc(W - 200, 560, 185, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fill();
  ctx.strokeStyle = color + '45';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 9]);
  ctx.stroke();
  ctx.setLineDash([]);
  txt(ctx, '📷 Fotoğraf', W - 200, 570, '26px Arial', 'rgba(255,255,255,0.25)', 'center');

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, H - 92, W, 92);
  const fg = ctx.createLinearGradient(0, 0, W, 0);
  fg.addColorStop(0, color);
  fg.addColorStop(1, '#3182CE');
  ctx.fillStyle = fg;
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('ONE TEAM  •  AMARE GLOBAL', W / 2, H - 38);
}

function renderGradient(ctx, color) {
  const bg = ctx.createLinearGradient(0, 0, W * 0.8, H);
  bg.addColorStop(0, color);
  bg.addColorStop(1, '#3182CE');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  [[W * 0.88, H * 0.12, 320], [W * 0.08, H * 0.82, 240], [W * 0.5, H * 0.5, 200]].forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fill();
  });

  rrPath(ctx, 60, 195, W - 120, H - 380, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  txt(ctx, 'Eğitim Başlığı', W / 2, 138, 'bold 68px Arial', '#FFFFFF', 'center');
  txt(ctx, 'Kategori & Konu', W / 2, 186, '32px Arial', 'rgba(255,255,255,0.80)', 'center');

  ctx.beginPath();
  ctx.arc(W / 2, 380, 110, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth = 2;
  ctx.stroke();
  txt(ctx, '📷', W / 2, 392, '54px Arial', 'rgba(255,255,255,0.5)', 'center');

  ['📅  Tarih & Saat', '📍  Platform', '🎤  Konuşmacı'].forEach((info, i) => {
    rrPath(ctx, 100, 520 + i * 100, W - 200, 78, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();
    txt(ctx, info, W / 2, 570 + i * 100, '34px Arial', 'rgba(255,255,255,0.92)', 'center');
  });

  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.fillRect(0, H - 108, W, 108);
  txt(ctx, 'ONE TEAM  •  AMARE GLOBAL', W / 2, H - 55, 'bold 28px Arial', '#FFFFFF', 'center');
  txt(ctx, 'oneteam10x', W / 2, H - 22, '20px Arial', 'rgba(255,255,255,0.65)', 'center');
}

function renderMinimal(ctx, color) {
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 18, H);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, 7);
  ctx.fillStyle = color;
  ctx.fillRect(0, H - 7, W, 7);

  txt(ctx, 'AMARE GLOBAL', W - 50, 58, 'bold 28px Arial', color, 'right');
  txt(ctx, 'oneteam10x', W - 50, 90, '22px Arial', color + '80', 'right');

  txt(ctx, 'Eğitim', 60, 210, 'bold 88px Arial', '#1A202C', 'left');
  txt(ctx, 'Başlığı', 60, 315, 'bold 88px Arial', '#1A202C', 'left');

  ctx.fillStyle = color;
  ctx.fillRect(60, 352, 170, 8);

  rrPath(ctx, W - 395, 95, 325, 325, 22);
  ctx.fillStyle = color + '0D';
  ctx.fill();
  ctx.strokeStyle = color + '45';
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
  txt(ctx, '📷 Konuşmacı', W - 232, 265, '26px Arial', color + '88', 'center');
  txt(ctx, 'Fotoğrafı', W - 232, 300, '26px Arial', color + '88', 'center');

  ['📅  Tarih & Saat', '📍  Yer / Platform', '🎤  Konuşmacı'].forEach((info, i) => {
    txt(ctx, info, 60, 455 + i * 95, '36px Arial', '#4A5568', 'left');
    if (i < 2) {
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(60, 477 + i * 95, W - 120, 1.5);
    }
  });

  rrPath(ctx, 60, H - 115, 220, 50, 25);
  ctx.fillStyle = color + '15';
  ctx.fill();
  ctx.strokeStyle = color + '35';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  txt(ctx, 'KATEGORİ', 170, H - 82, 'bold 22px Arial', color, 'center');
}

const RENDER_FUNCS = {
  klasik: renderKlasik,
  koyu: renderKoyu,
  gradient: renderGradient,
  minimal: renderMinimal,
};

// ── Gemini image generation ───────────────────────────────────────────────────
async function geminiGorselUret(apiKey, prompt) {
  const fullPrompt = `Create a professional 1080x1080 px social media template for a Turkish network marketing education event called "Amare Global - OneTeam10x". The design should be modern, visually striking, and suitable for Instagram. ${prompt}. Include placeholder areas for: event title, speaker name, date/time, and location. Add "AMARE GLOBAL" and "ONE TEAM 10X" branding text. Make it look professional and polished.`;

  // Try Imagen 3 first (dedicated image generation model)
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: fullPrompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API hatası: ${res.status}`);
  }

  const data = await res.json();
  const pred = data?.predictions?.[0];
  if (!pred?.bytesBase64Encoded) throw new Error('AI görsel döndürmedi');

  return `data:${pred.mimeType || 'image/png'};base64,${pred.bytesBase64Encoded}`;
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
const SablonTasarimModal = ({ onKaydet, onClose, geminiApiKey }) => {
  const [preset, setPreset] = useState('klasik');
  const [primaryColor, setPrimaryColor] = useState('#6B46C1');
  const [sablonAd, setSablonAd] = useState('Yeni Şablon');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);

  // AI
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [aiGorsel, setAiGorsel] = useState(null); // base64 data URL
  const [mod, setMod] = useState('canvas'); // 'canvas' | 'ai'

  const canvasRef = useRef(null);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const fn = RENDER_FUNCS[preset];
    if (fn) fn(ctx, primaryColor);
  }, [preset, primaryColor]);

  useEffect(() => { if (mod === 'canvas') renderCanvas(); }, [renderCanvas, mod]);

  const handleAiUret = async () => {
    if (!geminiApiKey) { alert('Gemini API anahtarı eksik. Ayarlar > API Anahtarları bölümünden ekleyin.'); return; }
    if (!aiPrompt.trim()) { alert('Lütfen bir tasarım açıklaması girin.'); return; }
    setAiYukleniyor(true);
    try {
      const url = await geminiGorselUret(geminiApiKey, aiPrompt.trim());
      setAiGorsel(url);
      setMod('ai');
    } catch (err) {
      alert('AI görsel oluşturulamadı: ' + err.message);
    } finally {
      setAiYukleniyor(false);
    }
  };

  const handleKaydet = async () => {
    if (!sablonAd.trim()) { alert('Şablon adı girin.'); return; }
    setKaydediliyor(true);
    try {
      let blob;

      if (mod === 'ai' && aiGorsel) {
        // AI görselini blob'a çevir
        const res = await fetch(aiGorsel);
        blob = await res.blob();
      } else {
        // Canvas'ı full res render et
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = W;
        fullCanvas.height = H;
        const fn = RENDER_FUNCS[preset];
        if (fn) fn(fullCanvas.getContext('2d'), primaryColor);
        const dataUrl = fullCanvas.toDataURL('image/png');
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }

      const file = new File([blob], `${sablonAd.trim()}.png`, { type: 'image/png' });
      await onKaydet(sablonAd.trim(), file);
      setKaydedildi(true);
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      alert('Kaydedilemedi: ' + err.message);
      setKaydediliyor(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        {/* Başlık */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Palette className="w-5 h-5 text-amare-purple" />Şablon Tasarım Editörü
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Kendi şablonunuzu tasarlayın ve kaydedin</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-6 p-6">
          {/* Sol panel: Ayarlar */}
          <div className="w-72 flex-shrink-0 space-y-5">

            {/* Şablon adı */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Şablon Adı</label>
              <input
                type="text"
                value={sablonAd}
                onChange={e => setSablonAd(e.target.value)}
                placeholder="Örn: Mor Klasik"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30"
              />
            </div>

            {/* Mod seçimi */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-semibold">
              <button
                onClick={() => setMod('canvas')}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${mod === 'canvas' ? 'bg-amare-purple text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Layout className="w-3.5 h-3.5" />Hazır Layout
              </button>
              <button
                onClick={() => setMod('ai')}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${mod === 'ai' ? 'bg-amare-purple text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Sparkles className="w-3.5 h-3.5" />AI Tasarım
              </button>
            </div>

            {mod === 'canvas' && (
              <>
                {/* Layout seçimi */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Layout className="w-4 h-4 text-amare-purple" />Layout
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETLER.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPreset(p.id)}
                        className={`p-3 rounded-xl text-xs font-semibold text-center border-2 transition-all ${preset === p.id ? 'border-amare-purple bg-purple-50 text-amare-purple shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                      >
                        <div className="text-2xl mb-1">{p.emoji}</div>
                        <div>{p.ad}</div>
                        <div className="text-gray-400 font-normal mt-0.5">{p.aciklama}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ana renk */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amare-purple" />Ana Renk
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {TEMA_RENKLERI.map(renk => (
                      <button
                        key={renk}
                        onClick={() => setPrimaryColor(renk)}
                        title={renk}
                        className={`w-9 h-9 rounded-full border-4 transition-all hover:scale-110 ${primaryColor === renk ? 'border-gray-700 scale-110 shadow-md' : 'border-transparent'}`}
                        style={{ backgroundColor: renk }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 flex-shrink-0">Özel:</label>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                    />
                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{primaryColor}</span>
                  </div>
                </div>
              </>
            )}

            {mod === 'ai' && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amare-purple" />AI Tasarım Promptu
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={5}
                  placeholder={`Örn: arka planı koyu mor yap, altın rengi aksan kullan, modern ve lüks görünüm, sağ üste büyük daire arka plan elementi ekle...`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-none"
                />
                <button
                  onClick={handleAiUret}
                  disabled={aiYukleniyor || !aiPrompt.trim()}
                  className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {aiYukleniyor
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Oluşturuluyor...</>
                    : <><Sparkles className="w-4 h-4" />Görsel Hazırla</>}
                </button>
                {!geminiApiKey && (
                  <p className="text-xs text-red-500 text-center">
                    ⚠️ API anahtarı gerekli. Ayarlar sekmesinden ekleyin.
                  </p>
                )}
                {aiGorsel && (
                  <button
                    onClick={() => { setAiGorsel(null); }}
                    className="w-full py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />Yeniden Oluştur
                  </button>
                )}
              </div>
            )}

            {/* Kaydet butonu */}
            <button
              onClick={handleKaydet}
              disabled={kaydediliyor || kaydedildi || (mod === 'ai' && !aiGorsel)}
              className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md ${
                kaydedildi
                  ? 'bg-green-500'
                  : 'bg-gradient-to-r from-amare-purple to-amare-blue hover:opacity-90 disabled:opacity-50'
              }`}
            >
              {kaydediliyor
                ? <><Loader2 className="w-5 h-5 animate-spin" />Kaydediliyor...</>
                : kaydedildi
                  ? <><Check className="w-5 h-5" />Kaydedildi!</>
                  : <><Save className="w-5 h-5" />Şablon Olarak Kaydet</>}
            </button>

            {mod === 'ai' && !aiGorsel && !kaydedildi && (
              <p className="text-xs text-gray-400 text-center">Kaydetmek için önce AI görsel oluşturun.</p>
            )}
            {mod === 'canvas' && (
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Kaydedilen şablon 1080×1080 px PNG olarak Firestore'a yüklenir.
              </p>
            )}
          </div>

          {/* Sağ panel: Önizleme */}
          <div className="flex-1 flex flex-col items-center justify-start">
            <div className="text-xs text-gray-400 mb-2 font-semibold">
              {mod === 'ai' ? 'AI ÇIKTISI (1080×1080)' : 'CANLI ÖNİZLEME (1080×1080)'}
            </div>
            <div
              className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100 relative"
              style={{ width: 480, height: 480 }}
            >
              {/* Canvas */}
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                style={{ width: 480, height: 480, display: mod === 'canvas' ? 'block' : 'none' }}
              />
              {/* AI görsel */}
              {mod === 'ai' && (
                aiGorsel
                  ? <img src={aiGorsel} alt="AI Tasarım" style={{ width: 480, height: 480, objectFit: 'cover', display: 'block' }} />
                  : (
                    <div style={{ width: 480, height: 480 }} className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-blue-50 gap-3">
                      {aiYukleniyor
                        ? <><Loader2 className="w-10 h-10 text-amare-purple animate-spin" /><p className="text-sm text-amare-purple font-semibold">AI görsel oluşturuluyor...</p></>
                        : <><Sparkles className="w-12 h-12 text-amare-purple/30" /><p className="text-sm text-gray-400">Prompt yazın ve "Görsel Hazırla"ya basın</p></>
                      }
                    </div>
                  )
              )}
            </div>

            {mod === 'canvas' && (
              <div className="mt-4 grid grid-cols-4 gap-2 w-full max-w-xs">
                {PRESETLER.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${preset === p.id ? 'bg-amare-purple text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {p.emoji} {p.ad}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SablonTasarimModal;
