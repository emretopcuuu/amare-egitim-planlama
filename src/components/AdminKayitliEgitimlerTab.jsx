// AdminPanel için "Kayıtlı Eğitimler" sekmesi
// Faz 3'te otomatik eşleşmeyen videoları listele, manuel eğitmen + kategori ata
import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../utils/firebase';
import {
  collection, query, where, orderBy, limit as fbLimit,
  getDocs, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { Loader2, Video, Save, Search, RefreshCw, ExternalLink } from 'lucide-react';
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

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Kayıtlı Eğitimler — Admin</h2>
        <p className="text-gray-500 text-sm">
          Vimeo'dan çekilen videoları manuel eğitmen + kategori atayarak temizle.
        </p>

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
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Tek video satırı — kendi local state'i var
const VideoRow = ({ video, egitmenOptions, kategoriler, kaydediliyor, onKaydet }) => {
  const [secilenEgitmen, setSecilenEgitmen] = useState(video.egitmenler?.[0] || '');
  const [secilenKategori, setSecilenKategori] = useState(video.kategoriler?.[0] || '');

  const handleKaydet = () => {
    const updates = {};
    if (secilenEgitmen) {
      const op = egitmenOptions.find(o => o.coreId === secilenEgitmen);
      updates.egitmenler = [secilenEgitmen];
      updates.egitmenAdlari = op ? [op.ad] : [];
      updates.eslesmemis = false; // artık eşleşti
    }
    if (secilenKategori) {
      updates.kategoriler = [secilenKategori];
      updates.kategoriKaynagi = 'manuel';
    }
    if (Object.keys(updates).length === 0) return;
    onKaydet(updates);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4">
      {/* Thumbnail */}
      <div className="md:w-48 flex-shrink-0">
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={video.baslik} loading="lazy"
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-gray-900 text-sm md:text-base line-clamp-2">{video.baslik}</h4>
          {video.vimeoUrl && (
            <a href={video.vimeoUrl} target="_blank" rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 flex-shrink-0">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
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

export default AdminKayitliEgitimlerTab;
