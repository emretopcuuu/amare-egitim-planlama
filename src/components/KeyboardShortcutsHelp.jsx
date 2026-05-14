// Klavye kısayolları yardım modal'ı (? tuşuyla açılır)
import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['/'],                  desc: 'Arama kutusuna odaklan' },
  { keys: ['?'],                  desc: 'Bu yardım penceresi' },
  { keys: ['Esc'],                desc: 'Açık modalı kapat' },
  { keys: ['←', '→'],             desc: 'Video açıkken önceki / sonraki video' },
  { keys: ['F'],                  desc: 'Video açıkken favoriye ekle/çıkar' },
  { keys: ['Space'],              desc: 'Video oynat / duraklat (Vimeo iframe)' },
];

const KbdKey = ({ k }) => (
  <kbd className="inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-md bg-white/10 border border-white/20 text-white font-mono text-xs font-bold shadow-sm">
    {k}
  </kbd>
);

const KeyboardShortcutsHelp = ({ acik, onClose }) => {
  useEffect(() => {
    if (!acik) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [acik, onClose]);

  if (!acik) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-gradient-to-br from-purple-900 to-indigo-950 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold inline-flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-300" />
            Klavye Kısayolları
          </h3>
          <button onClick={onClose} aria-label="Kapat"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="text-purple-100 text-sm">{s.desc}</span>
              <div className="flex gap-1">
                {s.keys.map((k, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="text-white/40 text-xs self-center">veya</span>}
                    <KbdKey k={k} />
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-purple-300/60 text-center">
          Yazma alanları aktifken kısayollar devre dışıdır.
        </p>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
