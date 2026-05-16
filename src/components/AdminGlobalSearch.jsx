// Admin Panel global search — başvurular, takvim, eğitmenler, videolar tek search bar
// Ctrl+K / Cmd+K ile aç, esc ile kapat

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, Calendar, Video, UserCircle, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';

const AdminGlobalSearch = () => {
  const [acik, setAcik] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { takvim = [], egitmenler = [], konusmacilar = [] } = useData();
  const [videolar, setVideolar] = useState([]);

  useEffect(() => {
    // Cmd/Ctrl + K kısayolu
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setAcik(a => !a);
      }
      if (e.key === 'Escape' && acik) {
        setAcik(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [acik]);

  useEffect(() => {
    if (acik && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [acik]);

  // Lazy: video listesini Firestore'dan tek seferlik çek
  useEffect(() => {
    if (!acik || videolar.length > 0) return;
    (async () => {
      try {
        const { collection, getDocs, query, limit, where } = await import('firebase/firestore');
        const { db } = await import('../utils/firebase');
        const qSnap = await getDocs(query(
          collection(db, 'kayitli_egitimler'),
          where('kayeneFiltrelendi', '==', false),
          limit(500),
        ));
        setVideolar(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.warn('[gsearch] video err:', e.message); }
    })();
  }, [acik, videolar.length]);

  const sonuclar = useMemo(() => {
    if (!q.trim() || q.length < 2) return [];
    const qLow = q.toLowerCase().trim();
    const out = [];

    // Başvurular
    egitmenler.filter(e =>
      (e.adSoyad || '').toLowerCase().includes(qLow) ||
      (e.email || '').toLowerCase().includes(qLow) ||
      (e.telefon || '').includes(qLow)
    ).slice(0, 5).forEach(e => out.push({
      tip: 'basvuru', Icon: User, baslik: e.adSoyad, alt: e.email || e.telefon, hedef: '/admin?tab=basvurular',
    }));

    // Takvim
    takvim.filter(t =>
      (t.egitim || '').toLowerCase().includes(qLow) ||
      (t.egitmen || '').toLowerCase().includes(qLow) ||
      (t.kategori || '').toLowerCase().includes(qLow)
    ).slice(0, 5).forEach(t => out.push({
      tip: 'egitim', Icon: Calendar, baslik: t.egitim, alt: `${t.tarih} · ${t.egitmen || ''}`, hedef: `/e/${t.id}`,
    }));

    // Eğitmenler
    konusmacilar.filter(k => (k.ad || '').toLowerCase().includes(qLow)).slice(0, 5).forEach(k => out.push({
      tip: 'egitmen', Icon: UserCircle, baslik: k.ad, alt: k.unvan || '', hedef: '/konusmacilar',
    }));

    // Videolar
    videolar.filter(v =>
      (v.baslik || '').toLowerCase().includes(qLow) ||
      (v.aciklama || '').toLowerCase().includes(qLow)
    ).slice(0, 5).forEach(v => out.push({
      tip: 'video', Icon: Video, baslik: v.baslik, alt: (v.egitmenAdlari || []).join(', '),
      hedef: `/kayitli-egitimler?v=${encodeURIComponent(v.vimeoId)}`,
    }));

    return out;
  }, [q, takvim, egitmenler, konusmacilar, videolar]);

  if (!acik) {
    return (
      <button onClick={() => setAcik(true)}
        className="fixed bottom-6 right-6 z-30 bg-purple-600 hover:bg-purple-700 text-white shadow-2xl rounded-full p-3 spring-tap"
        title="Global arama (Cmd+K)">
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20"
      onClick={() => setAcik(false)}>
      <div className="bg-white rounded-2xl w-full max-w-xl mx-4 shadow-2xl flex flex-col max-h-[70vh] overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input ref={inputRef} type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Başvuru, eğitim, eğitmen, video ara..."
            className="flex-1 bg-transparent text-base focus:outline-none" />
          <kbd className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded">esc</kbd>
        </div>

        <div className="flex-1 overflow-y-auto">
          {q.length < 2 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              En az 2 karakter yaz. <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs ml-1">⌘K</kbd> ile aç.
            </div>
          ) : sonuclar.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">"{q}" için sonuç yok.</div>
          ) : (
            <div className="divide-y">
              {sonuclar.map((s, i) => (
                <button key={i} onClick={() => { setAcik(false); navigate(s.hedef); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 text-left">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <s.Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{s.baslik}</div>
                    <div className="text-xs text-gray-500 truncate">{s.alt}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{s.tip}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-4 py-2 text-[10px] text-gray-400 flex justify-between">
          <span>{sonuclar.length} sonuç</span>
          <span>↑↓ Gezin · ↵ Aç</span>
        </div>
      </div>
    </div>
  );
};

export default AdminGlobalSearch;
