// Klavye kısayolu yardım modal — ? ile aç, Esc ile kapat
// Global pattern; her sayfadan erişilebilir

import React, { useEffect, useState } from 'react';
import { X, Keyboard, Sparkles } from 'lucide-react';

const KISAYOLAR_GENEL = [
  { tus: '?', aciklama: 'Yardım panelini aç' },
  { tus: 'Esc', aciklama: 'Modal kapat / iptal' },
  { tus: '⌘ K', aciklama: 'Global arama (admin)' },
  { tus: '/', aciklama: 'Sayfa içi arama kutusu' },
  { tus: 'g + t', aciklama: 'Takvime git' },
  { tus: 'g + p', aciklama: 'Profile git' },
  { tus: 'g + k', aciklama: 'Kayıtlı eğitimlere git' },
  { tus: 'g + e', aciklama: 'Ekibim sayfasına git' },
];

const KeyboardHelpModal = () => {
  const [acik, setAcik] = useState(false);

  useEffect(() => {
    function handler(e) {
      // Input/textarea içindeyse atla
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.target.isContentEditable) return;
      if (e.key === '?' && (e.shiftKey || true)) {
        e.preventDefault();
        setAcik(true);
      }
      if (e.key === 'Escape' && acik) setAcik(false);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [acik]);

  if (!acik) return null;

  return (
    <div className="fixed inset-0 z-[450] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setAcik(false)}>
      <div className="bg-gradient-to-br from-purple-900 to-indigo-950 border border-white/15 rounded-2xl w-full max-w-md p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
        role="dialog" aria-labelledby="kb-title" aria-modal="true">
        <div className="flex items-center justify-between mb-4">
          <h2 id="kb-title" className="text-white font-extrabold text-lg inline-flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-300" />
            Klavye Kısayolları
          </h2>
          <button onClick={() => setAcik(false)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            aria-label="Kapat">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          {KISAYOLAR_GENEL.map(k => (
            <div key={k.tus} className="flex items-center justify-between gap-3 px-2 py-1.5 hover:bg-white/5 rounded">
              <kbd className="bg-white/10 border border-white/20 text-white text-xs font-mono font-bold px-2 py-0.5 rounded">
                {k.tus}
              </kbd>
              <span className="text-purple-100/80 text-sm flex-1 text-right">{k.aciklama}</span>
            </div>
          ))}
        </div>
        <p className="text-purple-300/40 text-[10px] text-center mt-4">
          <Sparkles className="w-2.5 h-2.5 inline" /> Power user mode — daha hızlı gez
        </p>
      </div>
    </div>
  );
};

export default KeyboardHelpModal;
