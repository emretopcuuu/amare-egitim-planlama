// AdminPanel için "Kayıtlı Eğitimler" sekmesi
// Faz 3'te otomatik eşleşmeyen videoları listele, manuel eğitmen + kategori ata
import React, { useEffect, useMemo, useState } from 'react';
import { db, auth } from '../utils/firebase';
import {
  collection, query, where, orderBy, limit as fbLimit,
  getDocs, doc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { Loader2, Video, Save, Search, RefreshCw, ExternalLink, Download, MoreVertical, Edit2, Trash2, Ban, Play, FileText, X } from 'lucide-react';
import VideoOynatModal from './VideoOynatModal';
import { useData, makeCoreId } from '../context/DataContext';

const KATEGORILER = [
  'Liderlik', 'Satış', 'Motivasyon', 'Davet', 'Kapanış',
  'Sunum Teknikleri', 'Zaman Yönetimi', 'Kişisel Gelişim',
  'Sağlık', 'Finansal Özgürlük', 'Vizyon', 'Hikaye', 'Ürün Eğitimi',
  'Liste', 'Kazanç Planı', 'Backoffice', 'Odak', 'İtiraz Karşılama',
  'Takip', 'Doğru Başlangıç', 'Kamp', 'Katlama', 'Amare İş Sunumu',
  'Diğer',
];

const FILTRELER = [
  { key: 'eslesmemis', label: 'Eşleşmemiş (eğitmen boş)' },
  { key: 'tumu', label: 'Tümü' },
  { key: 'kayene', label: 'Dışlanan (Kayene/Kyani/Camsoy/Dalkılıç)' },
];

const AdminKayitliEgitimlerTab = () => {
  const { konusmacilar } = useData();
  const [filtre, setFiltre] = useState('eslesmemis');
  const [videolar, setVideolar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [arama, setArama] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState({});
  const [mesaj, setMesaj] = useState('');

  // Eğitmen seçenekleri (konusmacilar collection'undan)
  const egitmenOptions = useMemo(() => {
    return (konusmacilar || [])
      .filter(k => k.ad)
      .map(k => ({ coreId: makeCoreId(k.ad), ad: k.ad }))
      .filter(o => o.coreId)
      .sort((a, b) => a.ad.localeCompare(b.ad, 'tr-TR'));
  }, [konusmacilar]);

  const fetchVideolar = async () => {
    setLoading(true);
    setMesaj('');
    try {
      let q;
      if (filtre === 'eslesmemis') {
        q = query(
          collection(db, 'kayitli_egitimler'),
          where('kayeneFiltrelendi', '==', false),
          where('eslesmemis', '==', true),
          orderBy('olusturulmaTarihi', 'desc'),
          fbLimit(100)
        );
      } else if (filtre === 'kayene') {
        q = query(
          collection(db, 'kayitli_egitimler'),
          where('kayeneFiltrelendi', '==', true),
          fbLimit(100)
        );
      } else {
        q = query(
          collection(db, 'kayitli_egitimler'),
          orderBy('olusturulmaTarihi', 'desc'),
          fbLimit(100)
        );
      }
      const snap = await getDocs(q);
      setVideolar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.warn('[admin/kayitli] fetch:', err.message);
      setMesaj('Yükleme hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideolar(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [filtre]);

  const filtrelenmis = useMemo(() => {
    if (!arama.trim()) return videolar;
    const q = arama.toLocaleLowerCase('tr-TR');
    return videolar.filter(v =>
      (v.baslik || '').toLocaleLowerCase('tr-TR').includes(q) ||
      (v.aciklama || '').toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [videolar, arama]);

  const kaydet = async (v, updates) => {
    setKaydediliyor(s => ({ ...s, [v.id]: true }));
    try {
      await updateDoc(doc(db, 'kayitli_egitimler', v.id), {
        ...updates,
        guncellemeTarihi: serverTimestamp(),
      });
      // Local state güncelle
      setVideolar(prev => prev.map(x => x.id === v.id ? { ...x, ...updates } : x));
      setMesaj(`✓ ${v.baslik?.slice(0, 40)} güncellendi`);
      setTimeout(() => setMesaj(''), 3000);
    } catch (err) {
      setMesaj('✗ Hata: ' + err.message);
    } finally {
      setKaydediliyor(s => ({ ...s, [v.id]: false }));
    }
  };

  const [vimeoSenkron, setVimeoSenkron] = useState(false);
  const [oynatilan, setOynatilan] = useState(null);
  const [aciklamaEdit, setAciklamaEdit] = useState(null); // { id, baslik, aciklama }

  // ─── Eylem handler'ları ─────────────────────────────────────────────
  const handleDelete = async (v) => {
    if (!window.confirm(`"${v.baslik?.slice(0, 60)}" KALICI olarak silinsin mi?\n\nFirestore'dan tamamen kaldırılır.`)) return;
    try {
      await deleteDoc(doc(db, 'kayitli_egitimler', v.id));
      setVideolar(prev => prev.filter(x => x.id !== v.id));
      setMesaj(`✓ Silindi: ${v.baslik?.slice(0, 40)}`);
      setTimeout(() => setMesaj(''), 3000);
    } catch (err) {
      setMesaj('✗ Silinemedi: ' + err.message);
    }
  };

  const handleExclude = async (v) => {
    if (v.kayeneFiltrelendi) {
      // Geri al
      if (!window.confirm(`"${v.baslik?.slice(0, 60)}" dışlamasını KALDIR?`)) return;
      await updateDoc(doc(db, 'kayitli_egitimler', v.id), {
        kayeneFiltrelendi: false,
        filtreliSebep: null,
        guncellemeTarihi: serverTimestamp(),
      });
      setVideolar(prev => prev.map(x => x.id === v.id ? { ...x, kayeneFiltrelendi: false, filtreliSebep: null } : x));
      setMesaj(`✓ Dışlama kaldırıldı`);
    } else {
      if (!window.confirm(`"${v.baslik?.slice(0, 60)}" dışlananlara alınsın mı?`)) return;
      await updateDoc(doc(db, 'kayitli_egitimler', v.id), {
        kayeneFiltrelendi: true,
        filtreliSebep: 'Manuel (admin)',
        guncellemeTarihi: serverTimestamp(),
      });
      setVideolar(prev => prev.map(x => x.id === v.id ? { ...x, kayeneFiltrelendi: true, filtreliSebep: 'Manuel (admin)' } : x));
      setMesaj(`✓ Dışlandı`);
    }
    setTimeout(() => setMesaj(''), 3000);
  };

  const handleEditTitle = async (v, yeniBaslik) => {
    if (!yeniBaslik?.trim() || yeniBaslik === v.baslik) return;
    try {
      await updateDoc(doc(db, 'kayitli_egitimler', v.id), {
        baslik: yeniBaslik.trim(),
        guncellemeTarihi: serverTimestamp(),
      });
      setVideolar(prev => prev.map(x => x.id === v.id ? { ...x, baslik: yeniBaslik.trim() } : x));
      setMesaj(`✓ Başlık güncellendi`);
      setTimeout(() => setMesaj(''), 3000);
    } catch (err) {
      setMesaj('✗ ' + err.message);
    }
  };

  const handleEditAciklama = async (yeniAciklama) => {
    if (!aciklamaEdit) return;
    try {
      await updateDoc(doc(db, 'kayitli_egitimler', aciklamaEdit.id), {
        aciklama: yeniAciklama,
        guncellemeTarihi: serverTimestamp(),
      });
      setVideolar(prev => prev.map(x => x.id === aciklamaEdit.id ? { ...x, aciklama: yeniAciklama } : x));
      setAciklamaEdit(null);
      setMesaj(`✓ Açıklama güncellendi`);
      setTimeout(() => setMesaj(''), 3000);
    } catch (err) {
      setMesaj('✗ ' + err.message);
    }
  };
  const handleVimeoSync = async () => {
    if (!auth.currentUser) {
      setMesaj('✗ Giriş gerekli');
      return;
    }
    setVimeoSenkron(true);
    setMesaj('Vimeo taranıyor...');
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/vimeo-yeni-cek', {
        headers: { 'Authorization': 'Bearer ' + idToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setMesaj(`✓ ${data.yeni} yeni · ${data.excludedYeni} dışlandı · ${data.mevcut} mevcut · ${data.sureSn}s`);
      setTimeout(() => setMesaj(''), 8000);
      if (data.yeni > 0) {
        Object.keys(localStorage).filter(k => k.startsWith('amare_kayitli_egitimler_')).forEach(k => localStorage.removeItem(k));
        fetchVideolar();
      }
    } catch (err) {
      setMesaj('✗ ' + err.message);
    } finally {
      setVimeoSenkron(false);
    }
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Kayıtlı Eğitimler — Admin</h2>
            <p className="text-gray-500 text-sm">
              Vimeo'dan çekilen videoları manuel eğitmen + kategori atayarak temizle.
            </p>
          </div>
          <button onClick={handleVimeoSync} disabled={vimeoSenkron}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
            {vimeoSenkron ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Vimeo'dan Yeni Çek
          </button>
        </div>

        {mesaj && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm">{mesaj}</div>
        )}

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {FILTRELER.map(f => (
              <button key={f.key} onClick={() => setFiltre(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  filtre === f.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={fetchVideolar} disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Yenile
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={arama} onChange={e => setArama(e.target.value)}
            placeholder="Başlık veya açıklama ara..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">
          <Loader2 className="w-10 h-10 mx-auto mb-2 animate-spin" />
          <p>Yükleniyor...</p>
        </div>
      )}

      {!loading && filtrelenmis.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          <Video className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p>{filtre === 'eslesmemis' ? 'Eşleşmemiş video kalmadı 🎉' : 'Kayıt bulunamadı.'}</p>
        </div>
      )}

      {!loading && filtrelenmis.length > 0 && (
        <div className="space-y-3">
          {filtrelenmis.map(v => (
            <VideoRow key={v.id} video={v}
              egitmenOptions={egitmenOptions}
              kategoriler={KATEGORILER}
              kaydediliyor={kaydediliyor[v.id]}
              onKaydet={updates => kaydet(v, updates)}
              onDelete={() => handleDelete(v)}
              onExclude={() => handleExclude(v)}
              onEditTitle={(yeni) => handleEditTitle(v, yeni)}
              onEditAciklama={() => setAciklamaEdit({ id: v.id, baslik: v.baslik, aciklama: v.aciklama || '' })}
              onPlay={() => setOynatilan(v)}
            />
          ))}
        </div>
      )}

      {oynatilan && (
        <VideoOynatModal video={oynatilan} onClose={() => setOynatilan(null)} />
      )}

      {aciklamaEdit && (
        <AciklamaEditModal
          video={aciklamaEdit}
          onClose={() => setAciklamaEdit(null)}
          onKaydet={handleEditAciklama}
        />
      )}
    </div>
  );
};

// Tek video satırı — kendi local state'i var
const VideoRow = ({ video, egitmenOptions, kategoriler, kaydediliyor,
  onKaydet, onDelete, onExclude, onEditTitle, onEditAciklama, onPlay,
}) => {
  const [secilenEgitmen, setSecilenEgitmen] = useState(video.egitmenler?.[0] || '');
  const [secilenKategori, setSecilenKategori] = useState(video.kategoriler?.[0] || '');
  const [menuAcik, setMenuAcik] = useState(false);
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleValue, setTitleValue] = useState(video.baslik || '');

  const handleKaydet = () => {
    const updates = {};
    if (secilenEgitmen) {
      const op = egitmenOptions.find(o => o.coreId === secilenEgitmen);
      updates.egitmenler = [secilenEgitmen];
      updates.egitmenAdlari = op ? [op.ad] : [];
      updates.eslesmemis = false;
    }
    if (secilenKategori) {
      updates.kategoriler = [secilenKategori];
      updates.kategoriKaynagi = 'manuel';
    }
    if (Object.keys(updates).length === 0) return;
    onKaydet(updates);
  };

  const handleTitleSave = () => {
    onEditTitle(titleValue);
    setTitleEdit(false);
  };

  // Click outside menu close
  useEffect(() => {
    if (!menuAcik) return;
    const close = () => setMenuAcik(false);
    setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
    return () => document.removeEventListener('click', close);
  }, [menuAcik]);

  const menuItem = "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-left transition-colors";

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 relative">
      {/* Thumbnail (clickable → play) */}
      <button onClick={onPlay}
        className="md:w-48 flex-shrink-0 group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg">
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={video.baslik} loading="lazy"
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-8 h-8 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all rounded-lg">
            <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100" fill="currentColor" />
          </div>
        </div>
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          {titleEdit ? (
            <div className="flex-1 flex gap-1">
              <input type="text" value={titleValue} onChange={e => setTitleValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setTitleEdit(false); }}
                autoFocus
                className="flex-1 px-2 py-1 border-2 border-purple-300 rounded text-sm focus:outline-none focus:border-purple-500" />
              <button onClick={handleTitleSave} className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold">OK</button>
              <button onClick={() => { setTitleEdit(false); setTitleValue(video.baslik); }} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs">İptal</button>
            </div>
          ) : (
            <h4 className="font-bold text-gray-900 text-sm md:text-base line-clamp-2 flex-1">{video.baslik}</h4>
          )}

          {/* Kebab menu */}
          <div className="relative flex-shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setMenuAcik(s => !s); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="İşlemler">
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            {menuAcik && (
              <div onClick={e => e.stopPropagation()}
                className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
                <button onClick={() => { setMenuAcik(false); onPlay(); }} className={menuItem}>
                  <Play className="w-4 h-4 text-purple-600" />Önizle
                </button>
                <button onClick={() => { setMenuAcik(false); setTitleEdit(true); }} className={menuItem}>
                  <Edit2 className="w-4 h-4 text-blue-600" />Başlığı düzenle
                </button>
                <button onClick={() => { setMenuAcik(false); onEditAciklama(); }} className={menuItem}>
                  <FileText className="w-4 h-4 text-indigo-600" />Açıklama düzenle
                </button>
                {video.vimeoUrl && (
                  <a href={video.vimeoUrl} target="_blank" rel="noopener noreferrer"
                    onClick={() => setMenuAcik(false)} className={menuItem}>
                    <ExternalLink className="w-4 h-4 text-gray-600" />Vimeo'da aç
                  </a>
                )}
                <div className="border-t border-gray-100" />
                <button onClick={() => { setMenuAcik(false); onExclude(); }} className={menuItem}>
                  <Ban className="w-4 h-4 text-orange-600" />
                  {video.kayeneFiltrelendi ? 'Dışlamadan çıkar' : 'Dışlananlara al'}
                </button>
                <button onClick={() => { setMenuAcik(false); onDelete(); }}
                  className={menuItem + ' text-red-600 hover:bg-red-50'}>
                  <Trash2 className="w-4 h-4" />Kalıcı sil
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 mb-2 flex flex-wrap gap-2">
          {video.tarih && <span>{video.tarih}</span>}
          {video.vimeoId && <span>ID: {video.vimeoId}</span>}
          {video.kayeneFiltrelendi && (
            <span className="text-red-600 font-semibold">DIŞLANDI{video.filtreliSebep ? `: ${video.filtreliSebep}` : ''}</span>
          )}
          {video.transcriptVar && <span className="text-green-600">+transcript</span>}
        </div>
        {video.egitmenAdlari?.length > 0 && (
          <div className="text-xs text-gray-600 mb-2">
            Mevcut eğitmen: <strong>{video.egitmenAdlari.join(', ')}</strong>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          <select value={secilenEgitmen} onChange={e => setSecilenEgitmen(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30">
            <option value="">— Eğitmen seç —</option>
            {egitmenOptions.map(o => (
              <option key={o.coreId} value={o.coreId}>{o.ad}</option>
            ))}
          </select>
          <select value={secilenKategori} onChange={e => setSecilenKategori(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30">
            <option value="">— Kategori seç —</option>
            {kategoriler.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button onClick={handleKaydet} disabled={kaydediliyor || (!secilenEgitmen && !secilenKategori)}
            className="inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 transition-all">
            {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

// Açıklama düzenleme modalı
const AciklamaEditModal = ({ video, onClose, onKaydet }) => {
  const [deger, setDeger] = useState(video.aciklama || '');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const handleSave = async () => {
    setKaydediliyor(true);
    await onKaydet(deger);
    setKaydediliyor(false);
  };

  // ESC ile kapat
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base mb-0.5">Açıklamayı düzenle</h3>
            <p className="text-xs text-gray-500 line-clamp-1">{video.baslik}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto">
          <textarea value={deger} onChange={e => setDeger(e.target.value)}
            rows={12} autoFocus
            placeholder="Video açıklaması..."
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 resize-y font-mono" />
          <p className="mt-2 text-xs text-gray-400">{deger.length} karakter</p>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} disabled={kaydediliyor}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold disabled:opacity-50">
            İptal
          </button>
          <button onClick={handleSave} disabled={kaydediliyor}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50">
            {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminKayitliEgitimlerTab;
