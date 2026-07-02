// Admin Audit Log sekmesi — kim ne yaptı timeline

import React, { useEffect, useState } from 'react';
import { Loader2, History, User, Calendar, Edit3, Trash2, Plus, Tag } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, query, orderBy, limit as fbLimit, getDocs, where } from 'firebase/firestore';
import { guvenliGetDocs } from '../utils/guvenliVeri';

const ACTION_META = {
  'takvim_yarat':  { etiket: 'Eğitim yarattı', renk: 'emerald', Icon: Plus },
  'takvim_guncelle': { etiket: 'Eğitim güncelledi', renk: 'sky', Icon: Edit3 },
  'takvim_sil':    { etiket: 'Eğitim sildi', renk: 'rose', Icon: Trash2 },
  'egitmen_onay':  { etiket: 'Eğitmen onayladı', renk: 'emerald', Icon: User },
  'egitmen_sil':   { etiket: 'Eğitmen sildi', renk: 'rose', Icon: Trash2 },
  'video_kategori': { etiket: 'Video kategorisi değişti', renk: 'amber', Icon: Tag },
  'ayar_degis':    { etiket: 'Ayar değişti', renk: 'sky', Icon: Edit3 },
};

function timeAgo(ts) {
  if (!ts) return '';
  const ms = Date.now() - (ts._seconds ? ts._seconds * 1000 : new Date(ts).getTime());
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'şimdi';
  if (s < 3600) return `${Math.floor(s / 60)}dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa önce`;
  return `${Math.floor(s / 86400)}g önce`;
}

const AdminAuditLogTab = () => {
  const [loglar, setLoglar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState('hepsi'); // 'hepsi' | action key

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'audit_log'), orderBy('tarih', 'desc'), fbLimit(200));
        const snap = await guvenliGetDocs(q);
        setLoglar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('[audit] read err:', e.message);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, []);

  const filtreli = filtre === 'hepsi' ? loglar : loglar.filter(l => l.action === filtre);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
          <History className="w-6 h-6 text-purple-600" />
          Audit Log
        </h2>
        <span className="text-gray-500 text-xs">{filtreli.length} kayıt</span>
      </div>

      {/* Filtre chip'leri */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFiltre('hepsi')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold ${filtre === 'hepsi' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Hepsi ({loglar.length})
        </button>
        {Object.entries(ACTION_META).map(([key, meta]) => {
          const sayi = loglar.filter(l => l.action === key).length;
          if (sayi === 0) return null;
          return (
            <button key={key} onClick={() => setFiltre(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${filtre === key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {meta.etiket} ({sayi})
            </button>
          );
        })}
      </div>

      {yukleniyor ? (
        <div className="bg-white rounded-2xl p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
      ) : filtreli.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
          <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Audit log boş.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
            {filtreli.map(l => {
              const meta = ACTION_META[l.action] || { etiket: l.action, renk: 'gray', Icon: Edit3 };
              const Icon = meta.Icon;
              const renkBg = {
                emerald: 'bg-emerald-100 text-emerald-700',
                sky:     'bg-sky-100 text-sky-700',
                rose:    'bg-rose-100 text-rose-700',
                amber:   'bg-amber-100 text-amber-700',
                gray:    'bg-gray-100 text-gray-700',
              }[meta.renk];
              return (
                <div key={l.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 text-sm">
                  <div className={`w-9 h-9 rounded-lg ${renkBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800">{meta.etiket}</span>
                      <span className="text-gray-500">— {l.target}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex gap-2 flex-wrap">
                      <span className="font-semibold">{l.kimAd || l.kimEmail || l.kim}</span>
                      <span>·</span>
                      <span>{timeAgo(l.tarih)}</span>
                    </div>
                    {l.detay && Object.keys(l.detay).length > 0 && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-purple-500 cursor-pointer">Detay</summary>
                        <pre className="text-[10px] bg-gray-50 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(l.detay, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogTab;
