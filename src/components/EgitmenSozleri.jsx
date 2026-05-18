// Eğitmen "İlham Veren Sözleri" listesi
// AI ile analiz edilmiş videolarındaki aha moment'leri toplar.
// Tıklayınca ilgili videoyu o saniyeden açar (callback ile)

import React, { useEffect, useState } from 'react';
import { Quote, Loader2, Play, Sparkles, Tag, Calendar } from 'lucide-react';
import { metinTemizleDeep } from '../utils/metinTemizle';

const EgitmenSozleri = ({ coreId, onSozTikla }) => {
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    if (!coreId) return;
    let aktif = true;
    setYukleniyor(true);
    setHata(null);
    (async () => {
      try {
        const res = await fetch(`/.netlify/functions/egitmen-quotes?coreId=${encodeURIComponent(coreId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!aktif) return;
        setVeri(metinTemizleDeep(data));
      } catch (e) {
        if (aktif) setHata(e.message);
      } finally {
        if (aktif) setYukleniyor(false);
      }
    })();
    return () => { aktif = false; };
  }, [coreId]);

  if (yukleniyor) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2 text-amber-700 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        İlham veren sözler yükleniyor…
      </div>
    );
  }

  if (hata) return null;

  const sozler = veri?.sozler || [];
  if (sozler.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-500 text-sm text-center">
        <Sparkles className="w-5 h-5 mx-auto mb-2 opacity-50" />
        Henüz AI ile analiz edilmiş ilham veren söz yok.
        <div className="text-xs mt-1 opacity-70">
          {veri?.videoSayisi || 0} videodan {veri?.analiziOlanVideoSayisi || 0}'i analiz edildi.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h3 className="font-bold text-gray-900 text-sm">İlham Veren Sözleri</h3>
        <span className="text-gray-400 text-xs">({sozler.length})</span>
      </div>

      <div className="space-y-3">
        {sozler.map((s, i) => (
          <button key={`${s.vimeoId}-${i}`}
            onClick={() => onSozTikla?.(s)}
            className="w-full text-left bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 hover:from-amber-100 hover:via-orange-100 hover:to-amber-100 border border-amber-200 hover:border-amber-400 rounded-xl p-4 transition-all group">
            <div className="flex items-start gap-3">
              <Quote className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm leading-relaxed italic">"{s.text}"</p>
                {s.sebep && (
                  <p className="text-amber-700 text-xs mt-2 italic">— {s.sebep}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 flex-wrap">
                  {s.baslik && (
                    <span className="font-semibold text-gray-700 truncate max-w-[60%]">{s.baslik}</span>
                  )}
                  {s.tarih && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{s.tarih}
                    </span>
                  )}
                  {s.kategori && (
                    <span className="inline-flex items-center gap-1 text-purple-600">
                      <Tag className="w-3 h-3" />{s.kategori}
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 text-purple-600 font-bold opacity-0 group-hover:opacity-100 transition">
                    <Play className="w-3 h-3" fill="currentColor" />
                    {Math.floor((s.start || 0) / 60)}:{String(Math.floor((s.start || 0) % 60)).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EgitmenSozleri;
