// ConfirmDialog — window.confirm yerine brand'li dialog
// Destructive action'lar için kırmızı buton, normal için amber
// Promise-based API: const ok = await confirm({ baslik, mesaj });

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

let dialogPromise = null;
let dialogSetState = null;

/**
 * Global API: await confirm({ baslik, mesaj, evetEtiket, hayirEtiket, destructive })
 * Boolean döner (true=evet, false=hayır/iptal)
 */
export function confirm(opts) {
  return new Promise(resolve => {
    if (!dialogSetState) {
      // Fallback — provider yoksa native
      resolve(window.confirm(opts.mesaj || 'Emin misin?'));
      return;
    }
    dialogPromise = resolve;
    dialogSetState({
      acik: true,
      baslik: opts.baslik || 'Emin misin?',
      mesaj: opts.mesaj || '',
      evetEtiket: opts.evetEtiket || 'Evet',
      hayirEtiket: opts.hayirEtiket || 'Vazgeç',
      destructive: !!opts.destructive,
    });
  });
}

export const ConfirmDialogProvider = () => {
  const [state, setState] = useState({
    acik: false, baslik: '', mesaj: '', evetEtiket: '', hayirEtiket: '', destructive: false,
  });

  useEffect(() => {
    dialogSetState = setState;
    return () => { dialogSetState = null; };
  }, []);

  const cevapla = useCallback((cevap) => {
    setState(s => ({ ...s, acik: false }));
    if (dialogPromise) {
      dialogPromise(cevap);
      dialogPromise = null;
    }
  }, []);

  // ESC ile kapat (= hayır)
  useEffect(() => {
    if (!state.acik) return;
    const handler = (e) => { if (e.key === 'Escape') cevapla(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.acik, cevapla]);

  if (!state.acik) return null;

  return (
    <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={() => cevapla(false)}>
      <div role="alertdialog" aria-labelledby="confirm-title"
        className="bg-gradient-to-br from-purple-900 to-indigo-950 border border-white/15 rounded-2xl w-full max-w-md p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            state.destructive ? 'bg-rose-500/20' : 'bg-amber-500/20'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${state.destructive ? 'text-rose-300' : 'text-amber-300'}`} />
          </div>
          <div className="flex-1">
            <h2 id="confirm-title" className="text-white font-extrabold text-lg leading-tight">{state.baslik}</h2>
            {state.mesaj && <p className="text-purple-100/80 text-sm mt-2 leading-relaxed">{state.mesaj}</p>}
          </div>
          <button onClick={() => cevapla(false)} className="text-white/40 hover:text-white -mt-1 -mr-1 p-1" aria-label="Kapat">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => cevapla(false)} autoFocus
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl spring-tap text-sm">
            {state.hayirEtiket}
          </button>
          <button onClick={() => cevapla(true)}
            className={`flex-[2] font-bold py-2.5 rounded-xl spring-tap text-sm ${
              state.destructive
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-amber-400 hover:bg-amber-300 text-purple-900'
            }`}>
            {state.evetEtiket}
          </button>
        </div>
      </div>
    </div>
  );
};
