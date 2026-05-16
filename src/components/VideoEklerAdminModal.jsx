// Admin için: video başına PDF/Slide eki yönetim modal'ı
// Storage'a değil — direkt URL (Drive/Dropbox/Storage URL girilir)

import React, { useEffect, useState } from 'react';
import { X, Paperclip, FileText, ExternalLink, Trash2, Plus, Loader2 } from 'lucide-react';
import {
  collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../utils/firebase';

const TIPLER = [
  { kod: 'pdf',   etiket: 'PDF' },
  { kod: 'slide', etiket: 'Slide (PPT/Keynote)' },
  { kod: 'link',  etiket: 'Web Linki' },
];

const VideoEklerAdminModal = ({ vimeoId, baslik, onClose }) => {
  const [ekler, setEkler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [ekliyor, setEkliyor] = useState(false);
  const [yeni, setYeni] = useState({ ad: '', url: '', tip: 'pdf' });

  const load = async () => {
    try {
      const q = query(collection(db, `kayitli_egitimler/${vimeoId}/ekler`), orderBy('eklenmeTarihi', 'desc'));
      const snap = await getDocs(q);
      setEkler(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => { load(); }, [vimeoId]);

  async function ekle() {
    if (!yeni.ad.trim() || !yeni.url.trim()) return;
    setEkliyor(true);
    try {
      await addDoc(collection(db, `kayitli_egitimler/${vimeoId}/ekler`), {
        ad: yeni.ad.trim(),
        url: yeni.url.trim(),
        tip: yeni.tip,
        eklenmeTarihi: serverTimestamp(),
      });
      setYeni({ ad: '', url: '', tip: 'pdf' });
      await load();
    } catch (e) {
      alert('Hata: ' + e.message);
    } finally {
      setEkliyor(false);
    }
  }

  async function sil(id) {
    if (!window.confirm('Bu ek silinsin mi?')) return;
    try {
      await deleteDoc(doc(db, `kayitli_egitimler/${vimeoId}/ekler/${id}`));
      setEkler(e => e.filter(x => x.id !== id));
    } catch (e) {
      alert('Hata: ' + e.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800 inline-flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-purple-600" />
              Video Ekleri
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{baslik}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Yeni ek formu */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
            <div className="text-xs font-bold text-purple-700">Yeni Ek</div>
            <input type="text" value={yeni.ad} onChange={e => setYeni(y => ({ ...y, ad: e.target.value }))}
              placeholder="Ek adı (örn: Sunum Dosyası)"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input type="url" value={yeni.url} onChange={e => setYeni(y => ({ ...y, url: e.target.value }))}
              placeholder="URL (Google Drive, Dropbox, Firebase Storage vs)"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <select value={yeni.tip} onChange={e => setYeni(y => ({ ...y, tip: e.target.value }))}
                className="bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm">
                {TIPLER.map(t => <option key={t.kod} value={t.kod}>{t.etiket}</option>)}
              </select>
              <button onClick={ekle} disabled={ekliyor || !yeni.ad.trim() || !yeni.url.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm inline-flex items-center justify-center gap-1.5">
                {ekliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Ekle
              </button>
            </div>
          </div>

          {/* Mevcut ekler */}
          {yukleniyor ? (
            <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin text-purple-500 mx-auto" /></div>
          ) : ekler.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-4">Henüz ek yok.</p>
          ) : (
            <div className="space-y-2">
              {ekler.map(e => (
                <div key={e.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg text-xs">
                  <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <a href={e.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 min-w-0 hover:text-purple-600">
                    <div className="font-semibold text-gray-800 truncate">{e.ad}</div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-wider truncate">{e.tip}</div>
                  </a>
                  <a href={e.url} target="_blank" rel="noopener noreferrer"
                    className="text-purple-500 hover:text-purple-700 p-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => sil(e.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoEklerAdminModal;
