// Global toast — success/error/info/warning + undo action
// Snackbar pattern: bottom-bound mobile, sağ-alt desktop
//
// API:
//   toast(message)                  → success default
//   toast(message, { type: 'error' })
//   toast(message, { onUndo: () => ..., undoLabel: 'Geri al' })
//   toast(message, { duration: 5000 })
import React, { useState, useCallback, createContext, useContext } from 'react';
import { Check, X, Info, AlertTriangle, RotateCcw } from 'lucide-react';

const ToastContext = createContext({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

let idCounter = 0;
const timers = new Map();

const STIL = {
  success: { bg: 'bg-emerald-600', border: 'border-emerald-400', Icon: Check },
  error:   { bg: 'bg-rose-600', border: 'border-rose-400', Icon: AlertTriangle },
  info:    { bg: 'bg-sky-600', border: 'border-sky-400', Icon: Info },
  warning: { bg: 'bg-amber-500', border: 'border-amber-300', Icon: AlertTriangle },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const kapat = useCallback((id) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((message, opts = {}) => {
    const id = ++idCounter;
    const t = {
      id,
      message,
      type: opts.type || 'success',
      duration: opts.duration ?? (opts.onUndo ? 5000 : 3000), // undo → 5sn
      onUndo: opts.onUndo || null,
      undoLabel: opts.undoLabel || 'Geri al',
    };
    setToasts(prev => [...prev, t]);
    const timer = setTimeout(() => kapat(id), t.duration);
    timers.set(id, timer);
    return id;
  }, [kapat]);

  return (
    <ToastContext.Provider value={{ toast, kapat }}>
      {children}
      {/* Snackbar konteynerı: mobile bottom-center, desktop bottom-right */}
      <div className="fixed left-0 right-0 mx-auto md:mx-0 md:left-auto md:right-6 bottom-24 md:bottom-6 z-[400] flex flex-col gap-2 pointer-events-none items-center md:items-end px-4 md:px-0"
        role="region" aria-label="Bildirimler" aria-live="polite">
        {toasts.map(t => <ToastItem key={t.id} {...t} onKapat={() => kapat(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ id, message, type, onUndo, undoLabel, onKapat }) => {
  const stil = STIL[type] || STIL.success;
  const Icon = stil.Icon;

  function undoHandle() {
    onUndo?.();
    onKapat();
  }

  return (
    <div className={`pointer-events-auto inline-flex items-center gap-2.5 ${stil.bg} text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl border-2 ${stil.border} animate-slide-up max-w-[95vw] md:max-w-md`}
      role={type === 'error' ? 'alert' : 'status'}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="line-clamp-2 flex-1">{message}</span>
      {onUndo && (
        <button onClick={undoHandle}
          className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1 spring-tap flex-shrink-0">
          <RotateCcw className="w-3 h-3" />{undoLabel}
        </button>
      )}
      <button onClick={onKapat} className="text-white/60 hover:text-white -mr-1 flex-shrink-0" aria-label="Kapat">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ToastProvider;
