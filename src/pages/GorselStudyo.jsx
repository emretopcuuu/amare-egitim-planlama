import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Link2, Loader2, Sparkles, ImageIcon, AlertCircle, RotateCcw, CheckCircle2, Plus, X, Dices, Save, Undo2, Redo2 } from 'lucide-react';
import { useData, makeSafeId, makeCoreId } from '../context/DataContext';
import { afisTuru, etiketSec } from '../utils/egitmenEtiket';
import { uploadGorsel } from '../utils/uploadGorsel';
import { auth } from '../utils/firebase';
import { gorselOlusturMarkaAfis } from '../utils/gorselOlusturMarkaAfis';
import { gorselOlusturProgramAfis } from '../utils/gorselOlusturProgramAfis';
import { gorselOlusturAiAfis } from '../utils/gorselOlusturAiAfis';
import { MARKA_VARYASYON, MARKA_VARYASYON_INDEX, MARKA_PRESETLER, markaGruplar, markaEkIstek } from '../utils/markaVaryasyon';

// Program afişinde anlamlı varyasyon grupları (foto düzeni/içerik vb. hariç)
const PROGRAM_GRUPLARI = ['Tema', 'Yazı', 'Yazı tipi', 'Arka plan', 'Filigran', 'Dil', 'Foto şekli', 'Arka plan dokusu'];

// Grup başlık ikonları (göz hızlı tarar)
const GRUP_IKON = {
  'Yazı': '🔠', 'Fotoğraf': '🖼️', 'Vurgu': '👤', 'Yerleşim': '▦', 'Aralık': '↔️', 'Tema': '🎨', 'Yazı tipi': '🔤',
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
  { id: 'marka-afis', ad: '🏆 Marka Afiş', not: 'Konuşmacı afişi · tema seç', stil: null, ai: false },
  { id: 'program-icerigi', ad: '📋 Program İçeriği', not: 'Zaman çizelgesi · siyah & altın', stil: null, ai: false },
  { id: 'ai-afis', ad: '🎨 AI Afiş', not: 'Gemini · ~$0.08 · yavaş', stil: null, ai: true },
  { id: 'dosya-yukle', ad: '📎 Dosya Yükle', not: 'Kendi afişini yükle · bağla', stil: null, ai: false },
];

// AI Afiş'te "her üretimde farklı çıksın" için rastgele stil yönlendirmeleri.
// Her üretimde birini seçip arka plan prompt'una ekleriz → belirgin varyasyon.
const AI_VARYASYON = [
  'Kompozisyonu değiştir: dekoratif motifleri sol üst köşede yoğunlaştır, sağ alt sade kalsın.',
  'Daha minimal ve ferah: çok bol boş alan, yalnızca ince tek-çizgi motifler.',
  'Daha zengin dekoratif desen: katmanlı geometrik dokular (üst bölge yine açık kalsın).',
  'Şehir landmark line-art’ını büyük ve merkeze yakın işle, arka planda soluk tut.',
  'İnce altın art-deco çerçeve ve köşe süslemeleri ekle.',
  'Yumuşak organik dalga ve akışkan formlar kullan.',
  'Işık huzmeleri / gün doğumu ışıması ile dramatik premium hava ver.',
  'İzometrik ince-çizgi öğeler, modern editorial his.',
  'Zemin degrade tonunu farklılaştır, vurgu rengini biraz daha baskın yap.',
];
const aiVaryasyonSec = () => AI_VARYASYON[Math.floor(Math.random() * AI_VARYASYON.length)];

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
  const [baslikOzel, setBaslikOzel] = useState(''); // özel başlık (boş = otomatik)
  const [vurguKelime, setVurguKelime] = useState(1); // iki renkli başlıkta vurgulu kelime sayısı
  const [vurguYon, setVurguYon] = useState('son');   // 'son' | 'bas'
  const [programSatir, setProgramSatir] = useState([]); // Program İçeriği afişi satırları
  const [resultUrl, setResultUrl] = useState(null);
  const sonB64 = useRef(null);
  const dosyaRef = useRef(null);       // Dosya Yükle: seçilen File (base64 yerine bunu bağlarız)
  const [dosyaAdi, setDosyaAdi] = useState('');
  const [aiGecmis, setAiGecmis] = useState([]); // AI Afiş: son üretilenler {url, b64} — seçip bağla
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
  useEffect(() => {
    setSpeakers(cozEgitmenler(egitim)); setBaglandi(false); setAltNot(''); setBaslikOzel('');
    dosyaRef.current = null; setDosyaAdi(''); setAiGecmis([]); // yeni eğitim → yükleme/geçmiş sıfır
    // Program satırlarını eğitimin programAkışından başlat
    const pa = Array.isArray(egitim?.programAkisi) ? egitim.programAkisi : [];
    setProgramSatir(pa.map(p => ({
      saat: [p.baslangic, p.bitis].filter(Boolean).join(' - '),
      baslik: p.baslik || '', konusmaciAd: '', notlar: '',
    })));
    /* eslint-disable-next-line */
  }, [egitimId, konusmacilar]);
  // stil hafızası
  useEffect(() => { try { localStorage.setItem('markaSecim', JSON.stringify(markaSecim)); } catch {} }, [markaSecim]);

  const aktifMetot = METOTLAR.find(m => m.id === aiModel) || METOTLAR[0];
  const markaModu = aiModel === 'marka-afis';
  const programModu = aiModel === 'program-icerigi';
  const aiModu = aiModel === 'ai-afis';
  const dosyaModu = aiModel === 'dosya-yukle';
  const canliModu = markaModu || programModu; // deterministik → otomatik canlı önizleme

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
  // Tüm tasarım tercihlerini varsayılana döndür (aralık dahil) — geri alınabilir (markaSecim undo'ya gider)
  const sifirla = () => {
    uygula({});
    setEkIstek(''); setAltNot(''); setBaslikOzel(''); setVurguKelime(1); setVurguYon('son');
  };
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
        res = await gorselOlusturMarkaAfis({ egitim, egitmenler: speakers, format: 'portrait', ekPrompt: markaEkIstek(markaSecim), stil: aktifMetot.stil, altNot, baslik: baslikOzel, baslikVurgu: { adet: vurguKelime, yon: vurguYon } });
      } else if (programModu) {
        const tur = afisTuru(egitim);
        const programSatirlari = programSatir.map(r => {
          let k = null;
          if (r.konusmaciAd) {
            const kk = konusmaciBul(r.konusmaciAd);
            k = { ad: kk?.ad || r.konusmaciAd, unvan: (r.unvan && r.unvan.trim()) ? r.unvan.trim() : etiketSec(kk, tur), fotoURL: kk?.fotoURL || null, notlar: (r.notlar || '').split('\n').map(s => s.trim()).filter(Boolean) };
          }
          return { saat: r.saat, baslik: r.baslik, konusmaci: k };
        });
        res = await gorselOlusturProgramAfis({ egitim, programSatirlari, ekPrompt: markaEkIstek(markaSecim), baslik: baslikOzel });
      } else {
        // Anahtar sunucuda (gemini-afis fonksiyonu, admin ID token ile) → admin ayrı anahtar girmeden çalışır.
        // Admin kendi anahtarını girdiyse o kullanılır (client-side).
        const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
        if (!geminiApiKey && !idToken) throw new Error('AI Afiş için admin girişi gerekli (ya da Ayarlar → AI API Anahtarları).');
        // Her üretimde farklı çıksın: rastgele stil yönlendirmesi + kullanıcının ek isteği
        const varyasyon = aiVaryasyonSec();
        const aiEk = [ekIstek.trim(), varyasyon].filter(Boolean).join(' ');
        res = await gorselOlusturAiAfis({ geminiApiKey, openaiApiKey, idToken, egitim, egitmenler: speakers, ekPrompt: aiEk, format: 'portrait' });
      }
      dosyaRef.current = null; // üretilen görsel bağlanacak (yüklü dosya varsa iptal)
      sonB64.current = res.base64;
      const yeniUrl = b64ToUrl(res.base64, res.mimeType);
      // AI geçmişindeki URL'ler thumbnail'de duruyor → onları revoke etme (yalnız geçmişte olmayanı)
      if (resultUrl && !aiGecmis.some(g => g.url === resultUrl)) URL.revokeObjectURL(resultUrl);
      setResultUrl(yeniUrl);
      if (aiModu) setAiGecmis(prev => [{ url: yeniUrl, b64: res.base64 }, ...prev].slice(0, 6));
      if (canliModu) { setGuncellendi(true); setTimeout(() => setGuncellendi(false), 1100); }
    } catch (e) {
      setError(e.message || 'Üretim başarısız.');
    } finally {
      setGenerating(false);
    }
  };

  // Dosya Yükle: dış afişi seç → önizle (bağlama Eğitime Bağla ile)
  const dosyaSec = (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) { setError('Lütfen bir görsel dosyası seç (PNG/JPG/WebP).'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Dosya 10MB’tan küçük olmalı.'); return; }
    setError(null);
    dosyaRef.current = file;
    sonB64.current = null;
    setDosyaAdi(file.name);
    if (resultUrl && !aiGecmis.some(g => g.url === resultUrl)) URL.revokeObjectURL(resultUrl);
    setResultUrl(URL.createObjectURL(file));
    setBaglandi(false);
  };

  // AI geçmişinden bir afişi seç (önizle + bağlamaya hazırla)
  const gecmistenSec = (g) => {
    dosyaRef.current = null;
    sonB64.current = g.b64;
    setResultUrl(g.url);
    setBaglandi(false);
  };

  // CANLI ÖNİZLEME — deterministik modlarda (Marka + Program) değişiklikte otomatik üret. AI manuel.
  useEffect(() => {
    if (!egitim || !canliModu) return;
    const id = setTimeout(() => { uret(); }, 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [egitimId, aiModel, JSON.stringify(markaSecim), JSON.stringify(speakers.map(s => [s.ad, s.unvan])), altNot, baslikOzel, vurguKelime, vurguYon, JSON.stringify(programSatir)]);

  const indir = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    const ad = (egitim?.egitim || 'gorsel').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    // Yüklenen dosyada orijinal uzantıyı koru; üretilende png
    const uzanti = (dosyaModu && dosyaAdi.includes('.')) ? dosyaAdi.split('.').pop() : 'png';
    a.download = `${ad}_${egitim?.tarih || ''}.${uzanti}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const bagla = async () => {
    if (!egitim) return;
    // Kaynak: yüklenen dosya (File) veya üretilen görsel (base64)
    const kaynak = dosyaRef.current || (sonB64.current ? `data:image/png;base64,${sonB64.current}` : null);
    if (!kaynak) return;
    setBaglaniyor(true); setError(null);
    try {
      const url = await uploadGorsel(egitim.id, kaynak);
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

            {/* Özel başlık (boş = otomatik) — Marka + Program */}
            {canliModu && (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">✏️ Başlık <span className="text-[10px] font-normal text-gray-400">(boş = otomatik)</span></label>
                <input value={baslikOzel} onChange={(e) => setBaslikOzel(e.target.value)}
                  placeholder={programModu ? 'Örn: VİZYON GÜNÜ PROGRAM İÇERİĞİ' : (egitim.egitim || 'Afiş başlığı')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30" />
                {/* İki renkli başlık aktifse: kaç kelime vurgu rengi + baştan/sondan */}
                {markaModu && markaSecim['baslik-cift'] && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-gray-500">Altın renkli:</span>
                    <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button onClick={() => setVurguKelime(v => Math.max(1, v - 1))} className="px-2 py-1 text-gray-600 hover:bg-gray-100">−</button>
                      <span className="px-2 font-semibold text-gray-700">{vurguKelime} kelime</span>
                      <button onClick={() => setVurguKelime(v => Math.min(8, v + 1))} className="px-2 py-1 text-gray-600 hover:bg-gray-100">+</button>
                    </div>
                    <select value={vurguYon} onChange={(e) => setVurguYon(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30">
                      <option value="son">sondan</option>
                      <option value="bas">baştan</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Konuşmacı etiketleri + ekle/çıkar (sisteme de yazılır) — program & dosya modunda gizli */}
            {!programModu && !dosyaModu && (
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
            )}

            {/* Program İçeriği satır editörü (her satıra saat + başlık + konuşmacı) */}
            {programModu && (
              <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">📋 Program satırları</span>
                  <button onClick={() => setProgramSatir(prev => [...prev, { saat: '', baslik: '', konusmaciAd: '', notlar: '' }])}
                    className="text-[11px] text-amare-purple hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3" /> satır ekle</button>
                </div>
                {programSatir.length === 0 && <div className="text-[11px] text-gray-400">Bu eğitimde program akışı yok. "+ satır ekle" ile oluştur.</div>}
                {programSatir.map((r, i) => {
                  const upd = (alan, val) => setProgramSatir(prev => prev.map((x, idx) => idx === i ? { ...x, [alan]: val } : x));
                  return (
                    <div key={i} className="border border-gray-200 rounded-lg p-2 space-y-1.5 relative">
                      <button onClick={() => setProgramSatir(prev => prev.filter((_, idx) => idx !== i))} title="Satırı sil" className="absolute top-1 right-1 text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      <div className="flex gap-1.5">
                        <input value={r.saat} onChange={(e) => upd('saat', e.target.value)} placeholder="12:20 - 13:30"
                          className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30" />
                        <input value={r.baslik} onChange={(e) => upd('baslik', e.target.value)} placeholder="Aktivite başlığı"
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30" />
                      </div>
                      <select value={r.konusmaciAd} onChange={(e) => upd('konusmaciAd', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30">
                        <option value="">— Konuşmacı (opsiyonel) —</option>
                        {speakers.map(s => <option key={'s' + s.ad} value={s.ad}>{s.ad}</option>)}
                        {tumKonusmacilar.filter(k => !speakers.some(s => makeCoreId(s.ad) === makeCoreId(k.ad))).map(k => <option key={k.ad} value={k.ad}>{k.ad}{k.fotoURL ? ' ★' : ''}</option>)}
                      </select>
                      {r.konusmaciAd && (
                        <>
                          {/* Unvan/meslek — ELLE gir; boş bırakınca otomatik Amare kariyeri/etiket kullanılır */}
                          <input value={r.unvan || ''} onChange={(e) => upd('unvan', e.target.value)}
                            placeholder={`Unvan / meslek — boş = otomatik (${etiketSec(konusmaciBul(r.konusmaciAd), afisTuru(egitim)) || '—'})`}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30" />
                          <textarea value={r.notlar} onChange={(e) => upd('notlar', e.target.value)} rows={2}
                            placeholder="Alt isimler (panelistler), her satıra bir isim — opsiyonel"
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-y" />
                        </>
                      )}
                    </div>
                  );
                })}
                <p className="text-[10px] text-gray-400">Saat boş bırakılan satır (örn. "Etkinlik Sorumlusu") başlıkla gösterilir. Sağda canlı işlenir.</p>
              </div>
            )}

            {/* Varyasyon paneli (Marka + Program) / AI ek istek */}
            {(markaModu || programModu) ? (
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
                    <button onClick={sifirla} title="Tüm tasarım tercihlerini varsayılana döndür" className="text-[11px] text-amare-purple hover:bg-purple-50 rounded-lg px-1.5 py-1 ml-1 inline-flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Sıfırla</button>
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
                {(programModu ? MARKA_VARYASYON.filter(g => PROGRAM_GRUPLARI.includes(g.grup)) : markaGruplar(aiModel)).map(g => (
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
            ) : aiModu ? (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Tasarıma ek istek</label>
                <textarea value={ekIstek} onChange={(e) => setEkIstek(e.target.value)} rows={3}
                  placeholder="Örn: arka planı koyu mor yap, üstte ışık efekti…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-y" />
                <div className="flex gap-2 mt-2">
                  <button onClick={uret} disabled={generating}
                    className="flex-1 py-2.5 rounded-lg font-bold text-white bg-amare-purple hover:bg-amare-dark transition flex items-center justify-center gap-2 disabled:opacity-50">
                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor…</> : <><Sparkles className="w-4 h-4" /> AI Afiş Üret</>}
                  </button>
                  {resultUrl && (
                    <button onClick={uret} disabled={generating} title="Aynı eğitimden farklı bir tasarım üret"
                      className="px-3 py-2.5 rounded-lg font-bold text-amare-purple bg-purple-50 hover:bg-purple-100 border border-amare-purple/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                      <Dices className="w-4 h-4" /> Farklı Üret
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">Her üretim <b>farklı</b> bir tasarımdır. Beğendiğini sağdan seçip <b>Eğitime Bağla</b>’ya bas.</p>
                {aiGecmis.length > 1 && (
                  <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Son üretilenler — birini seç</div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {aiGecmis.map((g, i) => (
                        <button key={i} onClick={() => gecmistenSec(g)}
                          className={`flex-shrink-0 w-16 rounded-lg overflow-hidden border-2 transition ${resultUrl === g.url ? 'border-amare-purple ring-2 ring-amare-purple/30' : 'border-gray-200 hover:border-amare-purple/50'}`}>
                          <img src={g.url} alt={`Seçenek ${i + 1}`} className="w-full aspect-[4/5] object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : dosyaModu ? (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">📎 Kendi afişini yükle</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-amare-purple rounded-xl px-4 py-8 cursor-pointer transition text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); dosyaSec(e.dataTransfer.files?.[0]); }}>
                  <Plus className="w-6 h-6 text-amare-purple" />
                  <span className="text-sm font-semibold text-gray-700">{dosyaAdi || 'Görsel seç veya sürükle-bırak'}</span>
                  <span className="text-[11px] text-gray-400">PNG · JPG · WebP · en fazla 10MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => dosyaSec(e.target.files?.[0])} />
                </label>
                <p className="text-[11px] text-gray-500 mt-2">Yüklediğin afiş sağda görünür. <b>Eğitime Bağla</b> ile bu eğitimin afişi olur — İndir/paylaş her yerde bunu kullanır.</p>
              </div>
            ) : null}

            {/* Alt not / uyarı — serbest metin (afişin altına işlenir, canlı) */}
            {markaModu && (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">📝 Alt not / uyarı</label>
                <textarea value={altNot} onChange={(e) => setAltNot(e.target.value)} rows={5} maxLength={400}
                  placeholder="Her satır afişte ayrı görünür — Enter'a bas, alt satıra geç. Örn:&#10;Özel Eğitim: 12:00 - 13:00&#10;Seminer: 13:00 - 14:00&#10;Soru & Cevap: 14:00 - 14:30"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-y" />
                <p className="text-[10px] text-gray-400 mt-1"><b>Enter</b> ile alt satıra geç — her satır afişte ayrı yazılır (en fazla 6 satır). Satır arttıkça afiş otomatik uzar, taşmaz. Sağda canlı işlenir.</p>
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
                    {canliModu ? 'Önizleme hazırlanıyor…' : dosyaModu ? 'Soldan bir görsel yükle.' : 'AI Afiş için "Üret"e bas.'}
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
              {/* Canlı modlarda otomatik üretildiği için "Yeniden üret" kaldırıldı.
                  Hata olursa elle tekrar denemek için göster. */}
              {canliModu && error && (
                <button onClick={uret} disabled={generating} className="w-full mt-2 py-2 rounded-lg text-sm font-semibold text-amare-purple bg-purple-50 hover:bg-purple-100 border border-amare-purple/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <RotateCcw className="w-4 h-4" /> Tekrar dene
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
