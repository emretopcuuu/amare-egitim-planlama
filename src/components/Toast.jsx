// Global toast — basit, queue'lu, 3 saniye otomatik kapanır
import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, opts = {}) => {
    const id = ++idCounter;
    const t = {
      id,
      message,
      type: opts.type || 'success', // 'success' | 'error' | 'info'
      duration: opts.duration ?? 3000,
    };
    setToasts(prev => [...prev, t]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
    }, t.duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => <ToastItem key={t.id} {...t} />)}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ message, type }) => {
  const styles = {
    success: 'bg-emerald-600 border-emerald-400',
    error:   'bg-red-600 border-red-400',
    info:    'bg-indigo-600 border-indigo-400',
  }[type] || 'bg-emerald-600 border-emerald-400';
  const Icon = { success: Check, error: AlertTriangle, info: Info }[type] || Check;

  return (
    <div className={`pointer-events-auto inline-flex items-center gap-2 ${styles} text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg border-2 animate-fade-in max-w-[90vw]`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="line-clamp-1">{message}</span>
    </div>
  );
};

export default ToastProvider;
