import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Link2, Loader2, Sparkles, ImageIcon, AlertCircle, RotateCcw, CheckCircle2, Plus, X, Dices, Save, Undo2, Redo2 } from 'lucide-react';
import { useData, makeSafeId, makeCoreId } from '../context/DataContext';
import { afisTuru, etiketSec } from '../utils/egitmenEtiket';
import { uploadGorsel } from '../utils/uploadGorsel';
import { gorselOlusturMarkaAfis } from '../utils/gorselOlusturMarkaAfis';
import { gorselOlusturAiAfis } from '../utils/gorselOlusturAiAfis';
import { MARKA_VARYASYON_INDEX, MARKA_PRESETLER, markaGruplar, markaEkIstek } from '../utils/markaVaryasyon';

// Grup başlık ikonları (göz hızlı tarar)
const GRUP_IKON = {
  'Yazı': '🔠', 'Fotoğraf': '🖼️', 'Vurgu': '👤', 'Yerleşim': '▦', 'Tema': '🎨', 'Yazı tipi': '🔤',
  'Başlık': '✨', 'Foto şekli': '⬡', 'Arka plan': '🌗', 'Dekor': '💠',
  'Köşe şerit': '🎀', 'Arka plan dokusu': '🌌', 'Filigran': '🏷️', 'Dil': '🌐', 'İçerik': '📋',
};
// Çip font ailesi (görünür font önizleme)
const CIP_FONT = {
  'font-klasik': 'Arial, sans-serif', 'font-zarif': 'Georgia, serif', 'font-karisik': 'Georgia, serif',
  'font-modern': '"Trebuchet MS", sans-serif', 'font-times': '"Times New Roman", serif',
};
// Foto şekli mini görseli için border-radius / clip
const SEKIL_STIL = {
  'sekil-yuvarlak': { borderRadius: '9999px' },
  'sekil-kare': { borderRadius: '4px' },
  'sekil-altigen': { clipPath: 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)' },
};

// İsim ayrıştırma (AdminPanel ile aynı mantık)
const splitEgitmen = (egitmen) => {
  if (!egitmen) return [];
  return egitmen
    .normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim().toLocaleUpperCase('tr-TR')
      .replace(/\s*SÖYLEŞİ\s*/gi, '').replace(/\s*SÖYLEŞI\s*/gi, '')
      .replace(/\s+İLE\.{0,3}\s*$/i, '').replace(/\s+ILE\.{0,3}\s*$/i, '').trim())
    .filter(Boolean);
};

const METOTLAR = [
  { id: 'marka-afis', ad: '🏆 Marka Afiş', not: 'Otomatik tema', stil: null, ai: false },
  { id: 'marka-koyu', ad: '⬛ Marka Koyu', not: 'Siyah & altın', stil: 'koyu', ai: false },
  { id: 'marka-acik', ad: '⬜ Marka Açık', not: 'Krem & altın', stil: 'acik', ai: false },
  { id: 'ai-afis', ad: '🎨 AI Afiş', not: 'Gemini · ~$0.08 · yavaş', stil: null, ai: true },
];

const b64ToUrl = (b64, mime = 'image/png') => {
  const std = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(std);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
};

export default function GorselStudyo() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { takvim, konusmacilar, egitimGuncelle, geminiApiKey, openaiApiKey } = useData();

  const egitimId = params.get('egitim') || '';
  const egitim = useMemo(() => (takvim || []).find(e => e.id === egitimId) || null, [takvim, egitimId]);

  // Eğitim seçici — yalnız bugün ve sonrası (geçmiş toplantıları gösterme),
  // yaklaşan en yakın üstte. Seçili eğitim geçmişte olsa bile listede kalır.
  const egitimSecenekleri = useMemo(() => {
    const parse = (t) => { const [g, a, y] = (t || '').split('.'); return new Date(+y, +a - 1, +g).getTime() || 0; };
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    return [...(takvim || [])]
      .filter(e => parse(e.tarih) >= bugun.getTime() || e.id === egitimId)
      .sort((a, b) => parse(a.tarih) - parse(b.tarih));
  }, [takvim, egitimId]);

  const konusmaciBul = (ad) => {
    const sid = makeSafeId(ad), cid = makeCoreId(ad);
    return konusmacilar.find(k => k.id === sid)
      || konusmacilar.find(k => k.id === cid)
      || konusmacilar.find(k => makeCoreId(k.ad || k.id) === cid);
  };
  const cozEgitmenler = (eg) => {
    if (!eg) return [];
    const tur = afisTuru(eg);
    return splitEgitmen(eg.egitmen).map(ad => {
      const k = konusmaciBul(ad);
      return { ad, unvan: etiketSec(k, tur), biyografi: k?.biyografi || '', fotoURL: k?.fotoURL || null };
    });
  };

  const [aiModel, setAiModel] = useState('marka-afis');
  const [speakers, setSpeakers] = useState([]);
  const [markaSecim, setMarkaSecim] = useState(() => {
    try { return JSON.parse(localStorage.getItem('markaSecim') || '{}'); } catch { return {}; }
  });
  const [ekIstek, setEkIstek] = useState('');
  const [altNot, setAltNot] = useState(''); // afiş altına serbest not/uyarı
  const [resultUrl, setResultUrl] = useState(null);
  const sonB64 = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [baglandi, setBaglandi] = useState(false);
  const [baglaniyor, setBaglaniyor] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [guncellendi, setGuncellendi] = useState(false); // canlı yenileme mikro-geri bildirim
  const [ozelPresetler, setOzelPresetler] = useState(() => {
    try { return JSON.parse(localStorage.getItem('markaOzelPresetler') || '[]'); } catch { return []; }
  });

  // eğitim değişince konuşmacıları çöz
  useEffect(() => { setSpeakers(cozEgitmenler(egitim)); setBaglandi(false); setAltNot(''); /* eslint-disable-next-line */ }, [egitimId, konusmacilar]);
  // stil hafızası
  useEffect(() => { try { localStorage.setItem('markaSecim', JSON.stringify(markaSecim)); } catch {} }, [markaSecim]);

  const aktifMetot = METOTLAR.find(m => m.id === aiModel) || METOTLAR[0];
  const markaModu = !aktifMetot.ai;

  // ── Konuşmacı yönetimi (ekle/çıkar → hem görsele hem sisteme yazılır) ──
  const [kayit, setKayit] = useState(null); // null | 'saving' | 'saved' | 'err'
  const [yeniAd, setYeniAd] = useState('');
  // sistemdeki benzersiz konuşmacılar (fotolu olanı tercih), alfabetik
  const tumKonusmacilar = useMemo(() => {
    const seen = new Map();
    (konusmacilar || []).forEach(k => {
      if (!k.id) return;
      const cid = makeCoreId(k.ad || k.id); if (!cid) return;
      const ex = seen.get(cid);
      if (!ex || (!ex.fotoURL && k.fotoURL)) seen.set(cid, { ad: k.ad || k.id, fotoURL: k.fotoURL || null });
    });
    return [...seen.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  }, [konusmacilar]);
  const eklenebilir = useMemo(
    () => tumKonusmacilar.filter(k => !speakers.some(s => makeCoreId(s.ad) === makeCoreId(k.ad))),
    [tumKonusmacilar, speakers]
  );
  // konuşmacı listesini eğitimin "egitmen" alanına yaz (sistem geneli)
  const egitmenKaydet = async (list) => {
    if (!egitim) return;
    const str = list.map(s => s.ad).join(' / ');
    setKayit('saving');
    try { const r = await egitimGuncelle(egitim.id, { egitmen: str }); setKayit(r?.success ? 'saved' : 'err'); }
    catch { setKayit('err'); }
  };
  const konusmaciEkle = (ad) => {
    const isim = (ad || '').trim();
    if (!isim || !egitim) return;
    const k = konusmaciBul(isim);
    const yeni = { ad: k?.ad || isim.toLocaleUpperCase('tr-TR'), unvan: etiketSec(k, afisTuru(egitim)), biyografi: k?.biyografi || '', fotoURL: k?.fotoURL || null };
    setSpeakers(prev => {
      if (prev.some(s => makeCoreId(s.ad) === makeCoreId(yeni.ad))) return prev;
      const list = [...prev, yeni];
      egitmenKaydet(list);
      return list;
    });
    setYeniAd('');
  };
  const konusmaciCikar = (i) => setSpeakers(prev => {
    const list = prev.filter((_, idx) => idx !== i);
    egitmenKaydet(list);
    return list;
  });

  // Geçmiş-farkındalıklı değişiklik: önceki durumu undo'ya it, redo'yu temizle
  const uygula = (next) => {
    setUndoStack(s => [...s.slice(-49), markaSecim]);
    setRedoStack([]);
    setMarkaSecim(next);
  };
  const geriAl = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, markaSecim]);
    setUndoStack(s => s.slice(0, -1));
    setMarkaSecim(prev);
  };
  const ileriAl = () => {
    if (!redoStack.length) return;
    const nx = redoStack[redoStack.length - 1];
    setUndoStack(s => [...s, markaSecim]);
    setRedoStack(r => r.slice(0, -1));
    setMarkaSecim(nx);
  };
  const markaCipToggle = (sec, grup) => {
    const next = { ...markaSecim };
    if (markaSecim[sec.key]) { delete next[sec.key]; }
    else { if (grup?.tekil) grup.secenekler.forEach(s => { delete next[s.key]; }); next[sec.key] = true; }
    uygula(next);
  };
  const presetUygula = (keys) => {
    const hepsiVar = keys.every(k => markaSecim[k]);
    if (hepsiVar) { const n = { ...markaSecim }; keys.forEach(k => delete n[k]); uygula(n); }
    else { const n = {}; keys.forEach(k => { n[k] = true; }); uygula(n); }
  };
  const temizle = () => uygula({});
  // 🎲 Sürpriz: tekil gruplardan rastgele birer seçim + bazı dokunuşlar
  const rastgele = () => {
    const n = {};
    const pick = (grupAd) => {
      const g = MARKA_VARYASYON_INDEX.filter(s => s.grup === grupAd);
      if (g.length) n[g[Math.floor(Math.random() * g.length)].key] = true;
    };
    pick('Tema'); pick('Yazı tipi'); pick('Foto şekli');
    if (Math.random() < 0.5) n['baslik-cift'] = true;
    if (Math.random() < 0.35) pick('Köşe şerit');
    uygula(n);
  };
  // 💾 Kendi presetini kaydet / sil
  const ozelPresetKaydet = () => {
    const keys = Object.keys(markaSecim).filter(k => markaSecim[k]);
    if (!keys.length) return;
    const ad = (window.prompt('Stil adı:', `Stilim ${ozelPresetler.length + 1}`) || '').trim();
    if (!ad) return;
    const yeni = [...ozelPresetler.filter(p => p.ad !== ad), { ad, keys }];
    setOzelPresetler(yeni);
    try { localStorage.setItem('markaOzelPresetler', JSON.stringify(yeni)); } catch {}
  };
  const ozelPresetSil = (ad) => {
    const yeni = ozelPresetler.filter(p => p.ad !== ad);
    setOzelPresetler(yeni);
    try { localStorage.setItem('markaOzelPresetler', JSON.stringify(yeni)); } catch {}
  };

  const uret = async () => {
    if (!egitim) return;
    setGenerating(true); setError(null); setBaglandi(false);
    try {
      let res;
      if (markaModu) {
        res = await gorselOlusturMarkaAfis({ egitim, egitmenler: speakers, format: 'portrait', ekPrompt: markaEkIstek(markaSecim), stil: aktifMetot.stil, altNot });
      } else {
        if (!geminiApiKey) throw new Error('AI Afiş için Gemini API anahtarı gerekli (Ayarlar → AI API Anahtarları).');
        res = await gorselOlusturAiAfis({ geminiApiKey, openaiApiKey, egitim, egitmenler: speakers, ekPrompt: ekIstek, format: 'portrait' });
      }
      sonB64.current = res.base64;
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(b64ToUrl(res.base64, res.mimeType));
      if (markaModu) { setGuncellendi(true); setTimeout(() => setGuncellendi(false), 1100); }
    } catch (e) {
      setError(e.message || 'Üretim başarısız.');
    } finally {
      setGenerating(false);
    }
  };

  // CANLI ÖNİZLEME — Marka modunda değişiklikte otomatik üret (debounce). AI modunda manuel.
  useEffect(() => {
    if (!egitim || !markaModu) return;
    const id = setTimeout(() => { uret(); }, 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [egitimId, aiModel, JSON.stringify(markaSecim), JSON.stringify(speakers.map(s => [s.ad, s.unvan])), altNot]);

  const indir = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    const ad = (egitim?.egitim || 'gorsel').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${ad}_${egitim?.tarih || ''}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const bagla = async () => {
    if (!sonB64.current || !egitim) return;
    setBaglaniyor(true); setError(null);
    try {
      const dataUrl = `data:image/png;base64,${sonB64.current}`;
      const url = await uploadGorsel(egitim.id, dataUrl);
      const r = await egitimGuncelle(egitim.id, { gorselUrl: url });
      if (!r.success) throw new Error(r.error);
      setBaglandi(true);
    } catch (e) { setError('Bağlanamadı: ' + e.message); }
    finally { setBaglaniyor(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Üst bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-gray-600 hover:text-amare-purple text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Admin
          </button>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-amare-purple" /> Görsel Stüdyo</h1>
          <div className="flex-1" />
          <select
            value={egitimId}
            onChange={(e) => { setParams({ egitim: e.target.value }); setResultUrl(null); sonB64.current = null; }}
            className="min-w-[260px] max-w-[460px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30">
            <option value="">— Eğitim seç —</option>
            {egitimSecenekleri.map(e => (
              <option key={e.id} value={e.id}>{e.tarih} · {e.egitim}</option>
            ))}
          </select>
        </div>
      </div>

      {!egitim ? (
        <div className="max-w-2xl mx-auto px-4 py-24 text-center text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">Üstteki listeden bir eğitim seç.</p>
          <p className="text-sm mt-1">Afiş anında solda kontrollerle, sağda canlı önizlemede üretilir.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-5 items-start">
          {/* SOL: kontroller */}
          <div className="space-y-4">
            {/* Yöntem */}
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-700 mb-2">ÜRETİM YÖNTEMİ</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {METOTLAR.map(m => (
                  <button key={m.id} onClick={() => setAiModel(m.id)}
                    className={`p-2.5 rounded-lg border-2 text-left text-xs transition-all ${aiModel === m.id ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-bold">{m.ad}</div>
                    <div className="text-gray-500 mt-0.5">{m.not}</div>
                  </button>
                ))}
              </div>
              {aktifMetot.ai && (
                <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  AI Afiş ücretli ve yavaştır; canlı önizleme kapalı. Aşağıdan <b>Üret</b>'e bas.
                </div>
              )}
            </div>

            {/* Konuşmacı etiketleri + ekle/çıkar (sisteme de yazılır) */}
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">KONUŞMACI ETİKETLERİ</span>
                {kayit === 'saving' && <span className="text-[11px] text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> kaydediliyor…</span>}
                {kayit === 'saved' && <span className="text-[11px] text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> sisteme kaydedildi</span>}
                {kayit === 'err' && <span className="text-[11px] text-red-600">kaydedilemedi</span>}
              </div>
              <div className="space-y-1.5">
                {speakers.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {s.fotoURL ? <img src={s.fotoURL} alt="" className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[9px] text-gray-400">?</div>}
                    <div className="text-xs font-semibold text-gray-700 w-28 truncate" title={s.ad}>{s.ad}</div>
                    <input value={s.unvan || ''} onChange={(ev) => setSpeakers(prev => prev.map((x, idx) => idx === i ? { ...x, unvan: ev.target.value } : x))}
                      placeholder="Unvan / rol" className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30" />
                    <button onClick={() => konusmaciCikar(i)} title="Çıkar" className="text-gray-400 hover:text-red-500 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {speakers.length === 0 && <div className="text-[11px] text-gray-400 py-1">Henüz konuşmacı yok. Aşağıdan ekle.</div>}
              </div>
              {/* Ekle: mevcut konuşmacılardan seç veya yeni isim */}
              <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-amare-purple" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Konuşmacı ekle</span>
                </div>
                <select value="" onChange={(e) => konusmaciEkle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30">
                  <option value="">— Mevcut konuşmaculardan seç ({eklenebilir.length}) —</option>
                  {eklenebilir.map(k => <option key={k.ad} value={k.ad}>{k.ad}{k.fotoURL ? ' ★' : ''}</option>)}
                </select>
                <div className="flex gap-1.5">
                  <input value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') konusmaciEkle(yeniAd); }}
                    placeholder="…veya yeni isim yaz" className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30" />
                  <button onClick={() => konusmaciEkle(yeniAd)} disabled={!yeniAd.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amare-purple hover:bg-amare-dark transition disabled:opacity-40">Ekle</button>
                </div>
                <p className="text-[10px] text-gray-400">★ = sistemde fotoğrafı var. Eklediğin kişi görselde ve eğitimin her yerinde görünür.</p>
              </div>
            </div>

            {/* Marka varyasyon / AI ek istek */}
            {markaModu ? (
              <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2.5">
                {/* Araç çubuğu: geri al / ileri / sürpriz / kaydet / temizle */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">🎛️ Varyasyon
                    {guncellendi && <span className="text-[10px] font-semibold text-green-600 flex items-center gap-0.5 animate-pulse"><CheckCircle2 className="w-3 h-3" />güncellendi</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={geriAl} disabled={!undoStack.length} title="Geri al" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
                    <button onClick={ileriAl} disabled={!redoStack.length} title="Yinele" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
                    <button onClick={rastgele} title="Sürpriz kombinasyon" className="p-1.5 rounded-lg text-amare-purple hover:bg-purple-50"><Dices className="w-4 h-4" /></button>
                    <button onClick={ozelPresetKaydet} disabled={!Object.keys(markaSecim).length} title="Bu stili kaydet" className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-30"><Save className="w-4 h-4" /></button>
                    {Object.keys(markaSecim).length > 0 && (
                      <button onClick={temizle} className="text-[11px] text-amare-purple hover:underline ml-1">Temizle</button>
                    )}
                  </div>
                </div>
                {/* Hazır + kendi stillerin */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Hazır stiller</div>
                  <div className="flex flex-wrap gap-1.5">
                    {MARKA_PRESETLER.map(p => {
                      const aktif = p.keys.every(k => markaSecim[k]) && p.keys.length === Object.keys(markaSecim).length;
                      return (
                        <button key={p.ad} onClick={() => presetUygula(p.keys)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${aktif ? 'bg-amber-400 text-gray-900 border-amber-500' : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'}`}>
                          {p.ad}
                        </button>
                      );
                    })}
                    {ozelPresetler.map(p => (
                      <span key={p.ad} className="inline-flex items-center rounded-full border border-amare-purple/40 bg-purple-50 overflow-hidden">
                        <button onClick={() => presetUygula(p.keys)} className="px-2.5 py-1 text-[11px] font-bold text-amare-purple hover:bg-purple-100">⭐ {p.ad}</button>
                        <button onClick={() => ozelPresetSil(p.ad)} title="Sil" className="px-1.5 py-1 text-amare-purple/60 hover:text-red-500 hover:bg-purple-100"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
                {/* Gruplar — ikonlu başlık + görünür çipler */}
                {markaGruplar(aiModel).map(g => (
                  <div key={g.grup}>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <span className="text-xs">{GRUP_IKON[g.grup] || '•'}</span>{g.grup}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.secenekler.map(s => {
                        const aktif = !!markaSecim[s.key];
                        const fontStil = CIP_FONT[s.key] ? { fontFamily: CIP_FONT[s.key] } : undefined;
                        return (
                          <button key={s.key} onClick={() => markaCipToggle(s, g)} style={fontStil}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition inline-flex items-center gap-1.5 ${aktif ? 'bg-amare-purple text-white border-amare-purple' : 'bg-white text-gray-600 border-gray-300 hover:border-amare-purple/50'}`}>
                            {/* tema gradient swatch */}
                            {s.renk && <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ background: `linear-gradient(135deg, ${s.renk} 55%, #d8b15a 55%)` }} />}
                            {/* foto şekli mini görsel */}
                            {SEKIL_STIL[s.key] && <span className={`w-3.5 h-3.5 ${aktif ? 'bg-white' : 'bg-amare-purple'}`} style={SEKIL_STIL[s.key]} />}
                            {aktif ? '✓ ' : ''}{s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-gray-500 pt-0.5">Çipe bas → sağda <b>otomatik canlı önizleme</b>. 🎲 sürpriz · 💾 stilini kaydet · ↶ geri al.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Tasarıma ek istek</label>
                <textarea value={ekIstek} onChange={(e) => setEkIstek(e.target.value)} rows={3}
                  placeholder="Örn: arka planı koyu mor yap, üstte ışık efekti…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-y" />
                <button onClick={uret} disabled={generating}
                  className="mt-2 w-full py-2.5 rounded-lg font-bold text-white bg-amare-purple hover:bg-amare-dark transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor…</> : <><Sparkles className="w-4 h-4" /> AI Afiş Üret</>}
                </button>
              </div>
            )}

            {/* Alt not / uyarı — serbest metin (afişin altına işlenir, canlı) */}
            {markaModu && (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">📝 Alt not / uyarı</label>
                <textarea value={altNot} onChange={(e) => setAltNot(e.target.value)} rows={2} maxLength={140}
                  placeholder="Örn: Saat 14:00'ten sonra salona giriş yapılamaz.&#10;Etkinliğe 18 yaşından küçükler katılamaz."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-y" />
                <p className="text-[10px] text-gray-400 mt-1">Her satır afişin altında ayrı görünür (en fazla 3 satır). Yazdıkça sağda canlı işlenir.</p>
              </div>
            )}
          </div>

          {/* SAĞ: canlı önizleme (sticky) */}
          <div className="lg:sticky lg:top-20 space-y-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
                {resultUrl ? (
                  <img src={resultUrl} alt="Önizleme" className="w-full rounded-lg" />
                ) : (
                  <div className="text-gray-400 text-sm py-20 text-center px-4">
                    {markaModu ? 'Önizleme hazırlanıyor…' : 'AI Afiş için "Üret"e bas.'}
                  </div>
                )}
                {generating && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-amare-purple animate-spin" />
                  </div>
                )}
              </div>
              {error && (
                <div className="mt-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{error}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={indir} disabled={!resultUrl} className="flex-1 py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-40">
                  <Download className="w-4 h-4" /> İndir
                </button>
                <button onClick={bagla} disabled={!resultUrl || baglaniyor || baglandi} className="flex-1 py-2.5 rounded-lg font-bold text-white bg-amare-purple hover:bg-amare-dark transition flex items-center justify-center gap-2 disabled:opacity-40">
                  {baglandi ? <><CheckCircle2 className="w-4 h-4" /> Bağlandı</> : baglaniyor ? <><Loader2 className="w-4 h-4 animate-spin" /> …</> : <><Link2 className="w-4 h-4" /> Eğitime Bağla</>}
                </button>
              </div>
              {markaModu && (
                <button onClick={uret} disabled={generating} className="w-full mt-2 py-2 rounded-lg text-sm font-semibold text-amare-purple bg-purple-50 hover:bg-purple-100 border border-amare-purple/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <RotateCcw className="w-4 h-4" /> Yeniden üret
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500 text-center px-2">{egitim.egitim} — {egitim.tarih}</p>
          </div>
        </div>
      )}
    </div>
  );
}
