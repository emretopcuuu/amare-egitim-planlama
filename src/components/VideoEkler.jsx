// Video ekleri — PDF/Slide indirme listesi
// Firestore: kayitli_egitimler/{vimeoId}/ekler/{ekId} = { ad, url, tip (pdf/slide/link), boyut, ekleyen }
// Sadece admin yazar, herkes okur

import React, { useEffect, useState } from 'react';
import { FileText, Paperclip, Loader2, ExternalLink } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';

const TIP_META = {
  pdf:   { icon: FileText, etiket: 'PDF',   renk: 'rose' },
  slide: { icon: FileText, etiket: 'Slide', renk: 'amber' },
  link:  { icon: ExternalLink, etiket: 'Link', renk: 'sky' },
};

function formatBoyut(b) {
  if (!b) return '';
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

const VideoEkler = ({ vimeoId }) => {
  const [ekler, setEkler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    if (!vimeoId) { setYukleniyor(false); return; }
    (async () => {
      try {
        const q = query(collection(db, `kayitli_egitimler/${vimeoId}/ekler`), orderBy('eklenmeTarihi', 'desc'));
        const snap = await getDocs(q);
        setEkler(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('[ekler] read err:', e.message);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [vimeoId]);

  if (yukleniyor) return null;
  if (ekler.length === 0) return null;

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <Paperclip className="w-4 h-4 text-white/70" />
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
          Ekler ({ekler.length})
        </span>
      </div>
      <div className="space-y-1.5">
        {ekler.map(e => {
          const meta = TIP_META[e.tip] || TIP_META.link;
          const Icon = meta.icon;
          const renkBg = {
            rose:  'bg-rose-500/15 border-rose-400/30 hover:bg-rose-500/25',
            amber: 'bg-amber-500/15 border-amber-400/30 hover:bg-amber-500/25',
            sky:   'bg-sky-500/15 border-sky-400/30 hover:bg-sky-500/25',
          }[meta.renk];
          return (
            <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer"
              className={`${renkBg} border rounded-lg p-2.5 flex items-center gap-2.5 transition spring-tap`}>
              <Icon className="w-4 h-4 text-white/80 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">{e.ad}</div>
                <div className="text-white/50 text-[10px] flex items-center gap-2">
                  <span className="uppercase tracking-wider font-bold">{meta.etiket}</span>
                  {e.boyut && <span>·  {formatBoyut(e.boyut)}</span>}
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default VideoEkler;
