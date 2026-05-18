// Admin panel — Eğitim Yolları tab
// Her rank için curriculum CRUD: video sırala, ekle/çıkar, zorunlu/önerilen ayır

import React, { useEffect, useMemo, useState } from 'react';
import { db, auth } from '../utils/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, limit as fbLimit, serverTimestamp } from 'firebase/firestore';
import { RANK_SIRALAMA, getRankByKey, rankRenkClass } from '../utils/rankSchema';
import { Award, Save, Search, Plus, X, ChevronUp, ChevronDown, Trash2, Loader2, Video, CheckCircle2, Zap } from 'lucide-react';

const AdminEgitimYollariTab = () => {
  const [seciliRankKey, setSeciliRankKey] = useState('brand_partner');
  const [curriculum, setCurriculum] = useState({ zorunlu: [], onerilen: [] });
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [aramaModal, setAramaModal] = useState(false);
  const [aramaTip, setAramaTip] = useState('zorunlu'); // 'zorunlu' veya 'onerilen'
  const [initEdiliyor, setInitEdiliyor] = useState(false);
  const [initSonuc, setInitSonuc] = useState(null);

  // Tek tıkla 14 rank × 3 video toplu kurulum
  const otomatikInit = async () => {
    if (!window.confirm('Tüm 14 rank için 3\'er video atanacak. Mevcut atamalar üzerine yazılır. Devam edilsin mi?')) return;
    setInitEdiliyor(true);
    setInitSonuc(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/init-egitim-yollari', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata');
      setInitSonuc({ basarili: true, ...data });
      // Mevcut seçili rank'i yeniden yükle
      getDoc(doc(db, 'egitim_yollari', seciliRankKey)).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setCurriculum({ zorunlu: d.zorunluVideolar || [], onerilen: d.onerilenVideolar || [] });
        }
      });
    } catch (e) {
      setInitSonuc({ basarili: false, hata: e.message });
    } finally {
      setInitEdiliyor(false);
    }
  };

  // Rank değiştiğinde curriculum'u yükle
  useEffect(() => {
    let cancelled = false;
    setYukleniyor(true);
    getDoc(doc(db, 'egitim_yollari', seciliRankKey))
      .then(snap => {
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data();
          setCurriculum({ zorunlu: d.zorunluVideolar || [], onerilen: d.onerilenVideolar || [] });
        } else {
          setCurriculum({ zorunlu: [], onerilen: [] });
        }
      })
      .catch(e => console.warn('[egitim-yollari] fetch err:', e.message))
      .finally(() => !cancelled && setYukleniyor(false));
    return () => { cancelled = true; };
  }, [seciliRankKey]);

  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      const rank = getRankByKey(seciliRankKey);
      await setDoc(doc(db, 'egitim_yollari', seciliRankKey), {
        rankKey: seciliRankKey,
        rankLabel: rank.label,
        sira: rank.sira,
        zorunluVideolar: curriculum.zorunlu.map((v, i) => ({ ...v, sira: i + 1 })),
        onerilenVideolar: curriculum.onerilen.map((v, i) => ({ ...v, sira: i + 1 })),
        guncellemeTarihi: serverTimestamp(),
      });
      alert('✅ Kaydedildi');
    } catch (e) {
      alert('Kayıt başarısız: ' + e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  const videoEkle = (video, tip) => {
    setCurriculum(prev => {
      const liste = prev[tip] || [];
      if (liste.find(v => v.vimeoId === video.vimeoId)) return prev; // duplicate
      return { ...prev, [tip]: [...liste, video] };
    });
  };

  const videoSil = (vimeoId, tip) => {
    setCurriculum(prev => ({
      ...prev,
      [tip]: prev[tip].filter(v => v.vimeoId !== vimeoId),
    }));
  };

  const sirala = (vimeoId, yon, tip) => {
    setCurriculum(prev => {
      const liste = [...prev[tip]];
      const i = liste.findIndex(v => v.vimeoId === vimeoId);
      if (i < 0) return prev;
      const yeni = yon === 'up' ? i - 1 : i + 1;
      if (yeni < 0 || yeni >= liste.length) return prev;
      [liste[i], liste[yeni]] = [liste[yeni], liste[i]];
      return { ...prev, [tip]: liste };
    });
  };

  const rankInfo = getRankByKey(seciliRankKey);
  const renk = rankRenkClass(rankInfo);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-amare-purple" />
            <h2 className="text-xl font-bold text-gray-800">Eğitim Yolları — Rank Bazlı Curriculum</h2>
          </div>
          <button onClick={otomatikInit} disabled={initEdiliyor}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg disabled:opacity-50 inline-flex items-center gap-2 text-sm">
            {initEdiliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {initEdiliyor ? 'Kuruluyor...' : 'Otomatik Kurulum (14 rank × 3 video)'}
          </button>
        </div>

        {initSonuc && (
          <div className={`mb-4 rounded-xl p-3 text-sm ${initSonuc.basarili ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-red-50 border border-red-200 text-red-900'}`}>
            {initSonuc.basarili ? (
              <>✅ Başarılı: {initSonuc.rankSayisi} rank için video atandı. {Object.entries(initSonuc.sonuclar || {}).map(([k, v]) => `${k}=${v}`).join(', ')}</>
            ) : (
              <>❌ Hata: {initSonuc.hata}</>
            )}
          </div>
        )}

        {/* Rank seçici */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Düzenlenen Rank</div>
          <div className="flex flex-wrap gap-2">
            {RANK_SIRALAMA.map(r => (
              <button key={r.key} onClick={() => setSeciliRankKey(r.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  seciliRankKey === r.key
                    ? 'bg-amare-purple text-white border-amare-purple shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-amare-purple/50'
                }`}>
                {r.sira}. {r.label}
              </button>
            ))}
          </div>
        </div>

        {yukleniyor && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-amare-purple animate-spin mx-auto" />
          </div>
        )}

        {!yukleniyor && (
          <>
            {/* Zorunlu videolar */}
            <VideoListesi
              baslik="Zorunlu Videolar"
              aciklama="Bu rank'teki Marka Ortakları için sırayla izlenmesi önerilen ana video listesi."
              videolar={curriculum.zorunlu}
              tip="zorunlu"
              onEkle={() => { setAramaTip('zorunlu'); setAramaModal(true); }}
              onSil={(id) => videoSil(id, 'zorunlu')}
              onSirala={(id, yon) => sirala(id, yon, 'zorunlu')}
              renk="purple"
            />

            <div className="my-6 border-t border-gray-200" />

            {/* Önerilen videolar */}
            <VideoListesi
              baslik="Önerilen Videolar (opsiyonel)"
              aciklama="Zorunluların yanında izlenebilecek ek video önerileri."
              videolar={curriculum.onerilen}
              tip="onerilen"
              onEkle={() => { setAramaTip('onerilen'); setAramaModal(true); }}
              onSil={(id) => videoSil(id, 'onerilen')}
              onSirala={(id, yon) => sirala(id, yon, 'onerilen')}
              renk="amber"
            />

            {/* Kaydet button */}
            <div className="sticky bottom-4 mt-8 flex justify-end">
              <button onClick={kaydet} disabled={kaydediliyor}
                className="bg-amare-purple hover:bg-amare-dark text-white font-bold px-6 py-3 rounded-xl shadow-xl disabled:opacity-50 inline-flex items-center gap-2">
                {kaydediliyor ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {seciliRankKey} için Kaydet
              </button>
            </div>
          </>
        )}
      </div>

      {aramaModal && (
        <VideoAramaModal
          eklenecekleri={aramaTip === 'zorunlu' ? curriculum.zorunlu : curriculum.onerilen}
          onSec={(v) => { videoEkle(v, aramaTip); setAramaModal(false); }}
          onClose={() => setAramaModal(false)}
        />
      )}
    </div>
  );
};

// ─── Video Listesi Component ───
const VideoListesi = ({ baslik, aciklama, videolar, tip, onEkle, onSil, onSirala, renk }) => {
  const colorClass = renk === 'purple' ? 'text-amare-purple' : 'text-amber-600';
  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={`text-lg font-bold ${colorClass}`}>{baslik}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{aciklama}</p>
        </div>
        <button onClick={onEkle}
          className={`${renk === 'purple' ? 'bg-amare-purple hover:bg-amare-dark' : 'bg-amber-500 hover:bg-amber-600'} text-white font-semibold px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1.5`}>
          <Plus className="w-4 h-4" /> Video Ekle
        </button>
      </div>

      {videolar.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500 text-sm">
          Henüz video yok. <strong>Video Ekle</strong> butonuyla kayıtlı eğitimlerden seç.
        </div>
      ) : (
        <div className="space-y-2">
          {videolar.map((v, i) => (
            <div key={v.vimeoId} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3 group">
              <div className="text-xs font-bold text-gray-400 w-6 text-center">{i + 1}</div>
              {v.thumbnailUrl ? (
                <img src={v.thumbnailUrl} alt="" className="w-20 h-12 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{v.baslik}</div>
                <div className="text-xs text-gray-500 truncate">
                  {v.egitmenAdlari?.join(', ') || '—'} {v.tarih && `· ${v.tarih}`}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                <button onClick={() => onSirala(v.vimeoId, 'up')} disabled={i === 0}
                  className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-30">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => onSirala(v.vimeoId, 'down')} disabled={i === videolar.length - 1}
                  className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-30">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button onClick={() => onSil(v.vimeoId)}
                  className="p-1.5 hover:bg-red-100 text-red-500 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Video Arama Modal ───
const VideoAramaModal = ({ eklenecekleri, onSec, onClose }) => {
  const [arama, setArama] = useState('');
  const [tumVideolar, setTumVideolar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // İlk yüklemede tüm videoları al (light fetch — başlık + thumb)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'kayitli_egitimler'));
        if (cancelled) return;
        const liste = snap.docs.map(d => ({
          vimeoId: d.id,
          baslik: d.data().baslik,
          thumbnailUrl: d.data().thumbnailUrl,
          tarih: d.data().tarih,
          egitmenAdlari: d.data().egitmenAdlari || [],
          sure: d.data().sure,
        }));
        setTumVideolar(liste);
      } catch (e) {
        console.error('[arama] err:', e);
      } finally {
        !cancelled && setYukleniyor(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const seciliIdler = useMemo(() => new Set(eklenecekleri.map(v => v.vimeoId)), [eklenecekleri]);

  const filtrelenmis = useMemo(() => {
    if (!arama.trim()) return tumVideolar.slice(0, 100);
    const q = arama.toLowerCase().trim();
    return tumVideolar
      .filter(v => (v.baslik || '').toLowerCase().includes(q) ||
                   (v.egitmenAdlari || []).join(' ').toLowerCase().includes(q))
      .slice(0, 100);
  }, [tumVideolar, arama]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">Video Seç</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" autoFocus value={arama} onChange={e => setArama(e.target.value)}
              placeholder="Eğitim başlığı veya eğitmen ara..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-amare-purple" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {yukleniyor ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-amare-purple animate-spin mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtrelenmis.map(v => {
                const secili = seciliIdler.has(v.vimeoId);
                return (
                  <button key={v.vimeoId} onClick={() => onSec(v)} disabled={secili}
                    className={`flex gap-3 p-2 rounded-lg border text-left transition ${
                      secili ? 'bg-emerald-50 border-emerald-200 opacity-60 cursor-default' : 'bg-white border-gray-200 hover:border-amare-purple/40 hover:shadow'
                    }`}>
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt="" className="w-16 h-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        <Video className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 line-clamp-2">{v.baslik}</div>
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">
                        {v.egitmenAdlari?.join(', ') || '—'}
                      </div>
                    </div>
                    {secili && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEgitimYollariTab;
