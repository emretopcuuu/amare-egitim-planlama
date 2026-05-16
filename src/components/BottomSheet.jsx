// Generic BottomSheet — mobile bottom slide, desktop center modal
// Swipe to dismiss (mobile), ESC to close, focus trap, drag handle

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useSwipeToDismiss } from '../utils/useSwipeToDismiss';
import { useFocusTrap } from '../utils/useFocusTrap';

const BottomSheet = ({
  acik,
  onClose,
  baslik,
  ozet,
  children,
  altButonlar,
  maxWidth = 'max-w-2xl',
  swipeable = true,
}) => {
  const { offsetY, handlers, style } = useSwipeToDismiss(swipeable ? onClose : null);
  const trapRef = useFocusTrap(acik, onClose);

  useEffect(() => {
    if (!acik) return;
    const eski = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = eski; };
  }, [acik]);

  if (!acik) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-labelledby={baslik ? 'bs-title' : undefined}>
      <div ref={trapRef}
        className={`bg-gradient-to-br from-purple-900 to-indigo-950 border border-white/15 rounded-t-3xl sm:rounded-3xl w-full ${maxWidth} max-h-[95dvh] flex flex-col shadow-2xl animate-slide-up`}
        style={swipeable ? style : undefined}
        onClick={e => e.stopPropagation()}>

        {/* Drag handle (mobile) */}
        {swipeable && (
          <div className="sm:hidden pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing"
            {...handlers}>
            <div className="w-12 h-1.5 rounded-full bg-white/30" />
          </div>
        )}

        {/* Header */}
        {(baslik || ozet || onClose) && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 flex-shrink-0"
            {...(swipeable ? handlers : {})}>
            <div className="flex-1 min-w-0">
              {baslik && <h2 id="bs-title" className="text-white font-extrabold text-lg sm:text-xl">{baslik}</h2>}
              {ozet && <p className="text-purple-200/70 text-xs mt-0.5">{ozet}</p>}
            </div>
            {onClose && (
              <button onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white spring-tap flex-shrink-0 ml-2"
                aria-label="Kapat">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {children}
        </div>

        {/* Footer */}
        {altButonlar && (
          <div className="p-4 border-t border-white/10 flex-shrink-0">
            {altButonlar}
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomSheet;
