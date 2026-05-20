// FotoKirpModal — Eğitmen fotoğrafı yükleme öncesi kırpma/zoom modali
// Daire şeklinde crop alanı + zoom slider + drag ile pozisyonlama
// "Kaydet" canvas'a render eder, kırpılmış JPEG döner

import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Loader2 } from 'lucide-react';

const CONTAINER_SIZE = 320;   // Önizleme alanı (px)
const OUTPUT_SIZE = 600;      // Kaydedilen JPEG boyutu (px)

const FotoKirpModal = ({ file, onSave, onCancel }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const dragState = useRef({ active: false, startX: 0, startY: 0, startOffset: null });

  // Dosyadan blob URL oluştur
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Image natural size yakalama
  const onImgLoad = (e) => {
    setImgNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight });
  };

  // Drag (mouse + touch unified)
  const getPt = (e) => e.touches ? e.touches[0] : e;
  const onDragStart = (e) => {
    e.preventDefault();
    const pt = getPt(e);
    dragState.current = {
      active: true,
      startX: pt.clientX,
      startY: pt.clientY,
      startOffset: { ...offset },
    };
  };
  const onDragMove = (e) => {
    if (!dragState.current.active) return;
    e.preventDefault();
    const pt = getPt(e);
    const dx = pt.clientX - dragState.current.startX;
    const dy = pt.clientY - dragState.current.startY;
    setOffset({
      x: dragState.current.startOffset.x + dx,
      y: dragState.current.startOffset.y + dy,
    });
  };
  const onDragEnd = () => { dragState.current.active = false; };

  // Cover-fit scale hesapla
  const coverScale = imgNatural.w && imgNatural.h
    ? Math.max(CONTAINER_SIZE / imgNatural.w, CONTAINER_SIZE / imgNatural.h)
    : 1;

  // Sıfırla
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Canvas'a kırpılmış görüntü render et + JPEG dön
  const handleSave = async () => {
    if (!imageUrl || !imgNatural.w) return;
    setKaydediliyor(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

      const scaleTotal = coverScale * zoom;
      const displayW = imgNatural.w * scaleTotal;
      const displayH = imgNatural.h * scaleTotal;

      // Container içinde image top-left (offset dahil)
      const imageX = CONTAINER_SIZE / 2 - displayW / 2 + offset.x;
      const imageY = CONTAINER_SIZE / 2 - displayH / 2 + offset.y;

      // Visible kısım image koordinatlarında
      const srcX = -imageX / scaleTotal;
      const srcY = -imageY / scaleTotal;
      const srcW = CONTAINER_SIZE / scaleTotal;
      const srcH = CONTAINER_SIZE / scaleTotal;

      // Output canvas
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Canvas blob oluşturulamadı');

      // File adı koruyalım, ama uzantısı jpg
      const baseName = (file.name || 'foto').replace(/\.[^.]+$/, '') || 'foto';
      const croppedFile = new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' });
      await onSave(croppedFile);
    } catch (err) {
      console.error('[foto-kirp] hata:', err);
      alert('Kırpma hatası: ' + err.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button onClick={onCancel} disabled={kaydediliyor}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 disabled:opacity-50">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-gray-800 mb-1">Fotoğrafı Ayarla</h3>
        <p className="text-xs text-gray-500 mb-4">Sürükle ve zoom ile yüzü ortala</p>

        {/* Daire crop alanı */}
        <div
          className="relative mx-auto bg-gray-100 rounded-full overflow-hidden border-4 border-purple-200 select-none"
          style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE, cursor: dragState.current.active ? 'grabbing' : 'grab' }}
          onMouseDown={onDragStart}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="kirpilacak"
              onLoad={onImgLoad}
              draggable={false}
              className="absolute pointer-events-none object-cover"
              style={{
                left: '50%',
                top: '50%',
                width: '100%',
                height: '100%',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />
          )}

          {/* Crop grid overlay (3x3) — rule of thirds */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
          </div>
        </div>

        {/* Zoom slider */}
        <div className="mt-5 flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            disabled={kaydediliyor}
            className="flex-1 accent-purple-600"
          />
          <ZoomIn className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-600 font-mono w-12 text-right">{zoom.toFixed(2)}x</span>
        </div>

        {/* Action butonları */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={handleReset}
            disabled={kaydediliyor}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl disabled:opacity-50 spring-tap"
          >
            <RotateCcw className="w-4 h-4" /> Sıfırla
          </button>
          <button
            onClick={onCancel}
            disabled={kaydediliyor}
            className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-bold rounded-xl disabled:opacity-50 spring-tap"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={kaydediliyor || !imgNatural.w}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl shadow-lg disabled:opacity-50 spring-tap"
          >
            {kaydediliyor ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor</>
            ) : (
              <><Check className="w-4 h-4" /> Kaydet</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FotoKirpModal;
