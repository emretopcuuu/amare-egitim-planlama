// Generic toplu işlem barı — herhangi bir admin liste üzerinde
// 10 başvuruyu birden onayla, 5 videoyu birden gizle vb

import React from 'react';
import { CheckSquare, Square, Trash2, Check, X, Loader2 } from 'lucide-react';

const BulkActionBar = ({ secili, toplam, onSecimDegis, eylemler, gonderiliyor }) => {
  if (secili.size === 0 && toplam === 0) return null;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap sticky top-4 z-30">
      <button onClick={onSecimDegis}
        className="text-purple-700 hover:text-purple-900 text-sm font-bold inline-flex items-center gap-2 spring-tap">
        {secili.size === toplam && toplam > 0 ? (
          <CheckSquare className="w-5 h-5 text-purple-600" />
        ) : (
          <Square className="w-5 h-5" />
        )}
        {secili.size > 0 ? `${secili.size} seçili` : `Tümünü seç (${toplam})`}
      </button>
      {secili.size > 0 && (
        <div className="flex gap-2 flex-wrap">
          {eylemler.map(e => (
            <button key={e.kod} onClick={e.onClick} disabled={gonderiliyor}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 spring-tap disabled:opacity-50 ${e.renkClass || 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
              {gonderiliyor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (e.Icon && <e.Icon className="w-3.5 h-3.5" />)}
              {e.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BulkActionBar;
