// Downline ağaç görünümü — 3 nesil derinlikte
// Her node expand/collapse, GV/PV/rank gösterir, çocuklarını listeler

import React, { useEffect, useState } from 'react';
import { X, Loader2, Network, ChevronRight, ChevronDown, Users, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RankIcon from './RankIcon';
import { getRankByKey, rankStringToKey } from '../utils/rankSchema';

const EkipAgaciModal = ({ acik, onClose }) => {
  const { currentUser } = useAuth();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [maxNesil, setMaxNesil] = useState(3);

  useEffect(() => {
    if (acik && currentUser) cek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, maxNesil, currentUser?.uid]);

  async function cek() {
    setYukleniyor(true);
    setHata('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`/.netlify/functions/ekip-agac?maxNesil=${maxNesil}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setVeri(data);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  if (!acik) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}>
      <div className="bg-gradient-to-br from-purple-900 to-indigo-950 border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[95dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-white font-extrabold text-lg sm:text-xl flex items-center gap-2">
              <Network className="w-5 h-5 text-amber-300" />
              Ekip Ağacı
            </h2>
            <p className="text-purple-200/70 text-xs mt-0.5">
              {veri ? `${veri.toplamUye} Marka Ortağı · ${maxNesil} nesil derinlik` : 'Yükleniyor...'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nesil seçici */}
        <div className="px-4 sm:px-5 py-3 border-b border-white/10 flex-shrink-0 flex items-center gap-2">
          <span className="text-purple-200/70 text-xs uppercase tracking-wider font-semibold">Derinlik:</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setMaxNesil(n)}
              className={`px-3 py-1 rounded-lg text-xs font-bold spring-tap ${
                maxNesil === n
                  ? 'bg-amber-400 text-purple-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}>
              {n}
            </button>
          ))}
        </div>

        {/* Özet */}
        {veri?.ozet && (
          <div className="px-4 sm:px-5 py-3 border-b border-white/10 flex-shrink-0">
            <div className="grid grid-cols-3 gap-2">
              {veri.ozet.map(o => (
                <div key={o.nesil} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/10">
                  <div className="text-amber-300 font-extrabold text-xl">{o.sayi}</div>
                  <div className="text-purple-200/70 text-[10px] uppercase tracking-wider font-semibold mt-0.5">
                    {o.nesil}. Nesil
                  </div>
                  {o.toplamGv > 0 && (
                    <div className="text-white/70 text-[10px] mt-1">GV {formatNum(o.toplamGv)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {yukleniyor && !veri && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
          )}
          {hata && (
            <div className="bg-rose-500/15 border border-rose-400/30 text-rose-100 text-xs rounded-xl px-3 py-2">
              {hata}
            </div>
          )}
          {veri?.root && (
            <div className="space-y-1">
              {veri.root.cocuklar?.length > 0 ? (
                veri.root.cocuklar.map(c => <AgacNode key={c.amareId} node={c} seviye={1} />)
              ) : (
                <div className="text-center py-12 text-purple-300/70 text-sm">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Altında Marka Ortağı yok
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Tek node — özyinelemeli
const AgacNode = ({ node, seviye }) => {
  const [acik, setAcik] = useState(seviye === 1);  // İlk seviye açık
  const hasChildren = node.cocuklar?.length > 0;
  const rankObj = rankStringToKey(node.rank) ? getRankByKey(rankStringToKey(node.rank)) : null;
  const initials = (node.ad || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const seviyeRenk = {
    1: 'border-amber-400/40 bg-amber-500/5',
    2: 'border-sky-400/30 bg-sky-500/5',
    3: 'border-purple-400/30 bg-purple-500/5',
    4: 'border-emerald-400/20 bg-emerald-500/5',
    5: 'border-rose-400/20 bg-rose-500/5',
  }[seviye] || 'border-white/10 bg-white/5';

  const indent = (seviye - 1) * 16;

  return (
    <div>
      <div className={`${seviyeRenk} border rounded-xl p-2.5 transition`} style={{ marginLeft: `${indent}px` }}>
        <div className="flex items-center gap-2.5">
          {/* Expand butonu */}
          {hasChildren ? (
            <button onClick={() => setAcik(!acik)}
              className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/15 flex items-center justify-center spring-tap flex-shrink-0">
              {acik ? <ChevronDown className="w-3.5 h-3.5 text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white" />}
            </button>
          ) : (
            <div className="w-6 h-6 flex-shrink-0" />
          )}

          {/* Avatar + rank */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xs border-2 border-white/20">
              {initials}
            </div>
            {rankObj && (
              <div className="absolute -bottom-1 -right-1">
                <RankIcon rank={rankObj} size={14} />
              </div>
            )}
          </div>

          {/* Bilgi */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold text-sm truncate">{node.ad}</span>
              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                N{seviye}
              </span>
              {hasChildren && (
                <span className="text-[9px] uppercase tracking-wider font-bold text-amber-300 inline-flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" />{node.cocuklar.length}
                </span>
              )}
            </div>
            <div className="text-purple-200/60 text-[10px] mt-0.5 flex items-center gap-2 flex-wrap">
              {node.rank && <span>{node.rank}</span>}
              <span>· #{node.amareId}</span>
              {node.pv > 0 && <span className="text-emerald-300">· PV {node.pv}</span>}
              {node.gv > 0 && <span className="text-sky-300">· GV {formatNum(node.gv)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Çocuklar */}
      {acik && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.cocuklar.map(c => <AgacNode key={c.amareId} node={c} seviye={seviye + 1} />)}
        </div>
      )}
    </div>
  );
};

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

export default EkipAgaciModal;
