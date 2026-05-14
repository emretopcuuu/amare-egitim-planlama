// /kayitli-egitimler — Vimeo arşivi
// Mobile-first: bottom sheet filter, sticky active chips, compact card, haptic
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, X, Video, Play, Calendar, Tag, Loader2, User, Globe,
  Clock, Eye, Heart, History, ArrowDownUp, ChevronDown, SlidersHorizontal,
  Share2, ChevronUp, RotateCcw, Mic, Sparkles,
} from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, query, where, orderBy, limit as fbLimit, getDocs, doc, getDoc } from 'firebase/firestore';
import LanguageSwitcher from '../components/LanguageSwitcher';
import VideoOynatModal from '../components/VideoOynatModal';
import { useToast } from '../components/Toast';
import { haptic, nativeShare } from '../utils/mobileHelpers';

// ─── Sabitler ────────────────────────────────────────────────────────────
const VARSAYILAN_KATEGORILER = [
  'Liderlik', 'Satış', 'Motivasyon', 'Davet', 'Kapanış',
  'Sunum Teknikleri', 'Zaman Yönetimi', 'Kişisel Gelişim',
  'Sağlık', 'Finansal Özgürlük', 'Vizyon', 'Hikaye', 'Ürün Eğitimi',
  'Liste', 'Kazanç Planı', 'Backoffice', 'Odak', 'İtiraz Karşılama',
  'Takip', 'Doğru Başlangıç', 'Kamp', 'Katlama', 'Amare İş Sunumu',
];

// Kategori renk paleti (Tailwind class'ları)
const KATEGORI_RENK = {
  'Liderlik':          'bg-blue-500/80 text-white',
  'Satış':             'bg-emerald-500/80 text-white',
  'Motivasyon':        'bg-orange-500/80 text-white',
  'Davet':             'bg-purple-500/80 text-white',
  'Kapanış':           'bg-yellow-500/80 text-gray-900',
  'Sunum Teknikleri':  'bg-cyan-500/80 text-white',
  'Zaman Yönetimi':    'bg-indigo-500/80 text-white',
  'Kişisel Gelişim':   'bg-rose-500/80 text-white',
  'Sağlık':            'bg-teal-500/80 text-white',
  'Finansal Özgürlük': 'bg-green-600/80 text-white',
  'Vizyon':            'bg-fuchsia-500/80 text-white',
  'Hikaye':            'bg-amber-500/80 text-gray-900',
  'Ürün Eğitimi':      'bg-sky-500/80 text-white',
  // Yeni
  'Liste':             'bg-lime-500/80 text-gray-900',
  'Kazanç Planı':      'bg-emerald-700/80 text-white',
  'Backoffice':        'bg-slate-500/80 text-white',
  'Odak':              'bg-red-500/80 text-white',
  'İtiraz Karşılama':  'bg-pink-600/80 text-white',
  'Takip':             'bg-violet-500/80 text-white',
  'Doğru Başlangıç':   'bg-green-700/80 text-white',
  'Kamp':              'bg-amber-700/80 text-white',
  'Katlama':           'bg-stone-500/80 text-white',
  'Amare İş Sunumu':   'bg-purple-700/80 text-white',
};

const DIL_PATTERNS = [
  { kod: 'RU', etiket: 'Rusça',      regex: /russian|russia|русск|россия|russisch|презентац|продукт/i },
  { kod: 'EN', etiket: 'İngilizce',  regex: /\benglish\b|englisch|\(en\)|in english|\bbusiness presentation\b|english dub/i },
  { kod: 'DE', etiket: 'Almanca',    regex: /\bdeutsch\b|\bgerman\b|deutschland|germany|\(de\)|gesch[aä]ftspr[aä]sentation|produktpr[aä]sentation/i },
  { kod: 'NL', etiket: 'Hollandaca', regex: /nederlands|\bdutch\b|nederland|holland|\(nl\)|gezondheidsdriehoek|productpresentatie/i },
];
const DILLER = [
  { kod: 'all', etiket: 'Tüm Diller' },
  { kod: 'TR',  etiket: 'Türkçe' },
  { kod: 'RU',  etiket: 'Rusça' },
  { kod: 'EN',  etiket: 'İngilizce' },
  { kod: 'DE',  etiket: 'Almanca' },
  { kod: 'NL',  etiket: 'Hollandaca' },
];
const SURE_FILTRELERI = [
  { kod: 'all',  etiket: 'Tüm Süreler' },
  { kod: 'kisa', etiket: '< 15 dk',   min: 0,    max: 900 },
  { kod: 'orta', etiket: '15-60 dk', min: 900,  max: 3600 },
  { kod: 'uzun', etiket: '> 1 saat',  min: 3600, max: Infinity },
];
const SIRALAMALAR = [
  { kod: 'yeni',    etiket: 'En Yeni' },
  { kod: 'eski',    etiket: 'En Eski' },
  { kod: 'populer', etiket: 'En Popüler' },
  { kod: 'alfabe',  etiket: 'Alfabetik' },
];

function detectDil(video) {
  // Firestore'da kayıtlı dil varsa öncelikli (çevrilmiş başlıklar için kritik —
  // çeviri sırasında "(English)", "/German" gibi suffix'ler temizleniyor,
  // regex artık eşleşmiyordu)
  if (video.baslikDili) return video.baslikDili;
  // Eski metod fallback: baslikOrijinal'a da bak (orijinal başlıkta tag var)
  const text = `${video.baslikOrijinal || video.baslik || ''} ${video.aciklama || ''}`;
  for (const p of DIL_PATTERNS) {
    if (p.regex.test(text)) return p.kod;
  }
  return 'TR';
}

function formatSure(saniye) {
  if (!saniye || saniye < 1) return null;
  const h = Math.floor(saniye / 3600);
  const m = Math.floor((saniye % 3600) / 60);
  const s = Math.floor(saniye % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function formatPlays(n) {
  if (!n || n < 1) return null;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace('.0', '') + 'K';
  return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
}

// Türkçe normalize (transcript-search.mjs backend ile aynı algoritma)
const TR_LOWER_MAP = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function normalizeTr(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER_MAP[c.toUpperCase()] || c.toLowerCase())
    .toLowerCase();
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Snippet içinde sorguyu <mark> ile vurgula (Türkçe-uyumlu)
function highlightSnippet(text, q) {
  if (!q || !text) return escapeHtml(text || '');
  const nText = normalizeTr(text);
  const nQ = normalizeTr(q);
  if (!nQ) return escapeHtml(text);
  const out = [];
  let i = 0;
  while (i < text.length) {
    const idx = nText.indexOf(nQ, i);
    if (idx < 0) { out.push(escapeHtml(text.slice(i))); break; }
    out.push(escapeHtml(text.slice(i, idx)));
    out.push('<mark class="bg-amber-400/40 text-amber-100 font-bold px-0.5 rounded">');
    out.push(escapeHtml(text.slice(idx, idx + nQ.length)));
    out.push('</mark>');
    i = idx + nQ.length;
  }
  return out.join('');
}

// v6 → v7: DIL_PATTERNS genişletildi (business presentation, geschäftspräsentation vb.)
const CACHE_KEY = 'amare_kayitli_egitimler_all_v7';
const TTL = 12 * 60 * 60 * 1000;
const FAV_KEY = 'amare_video_favoriler';
const HIST_KEY = 'amare_video_gecmis';
const HIST_MAX = 100;
const PAGE_SIZE = 60;

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
function saveSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch {}
}
function loadList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

const KayitliEgitimlerSayfasi = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── State ─────────────────────────────────────────────────────────────
  const [tumVideolar, setTumVideolar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kategoriler, setKategoriler] = useState(VARSAYILAN_KATEGORILER);
  const initKategoriSet = () => new Set((searchParams.get('kat') || '').split(',').filter(Boolean));
  const [kategoriSet, setKategoriSet] = useState(initKategoriSet);
  const [dilKod, setDilKod] = useState(searchParams.get('dil') || 'all');
  const [egitmenCoreId, setEgitmenCoreId] = useState(searchParams.get('eg') || '');
  const [yil, setYil] = useState(searchParams.get('yil') || 'all');
  const [sureKod, setSureKod] = useState(searchParams.get('sure') || 'all');
  const [siralama, setSiralama] = useState(searchParams.get('sira') || 'yeni');
  const [arama, setArama] = useState(searchParams.get('q') || '');
  const [sadeceFav, setSadeceFav] = useState(searchParams.get('fav') === '1');
  const [oynatilan, setOynatilan] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [favoriler, setFavoriler] = useState(() => loadSet(FAV_KEY));
  const [gecmis, setGecmis] = useState(() => new Set(loadList(HIST_KEY)));
  const [gosterilen, setGosterilen] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  // ─── Transcript arama (Faz: video içinde arama) ──────────────────────
  // localStorage'da hatırla (kullanıcı tercihi)
  const [transcriptAramaAcik, setTranscriptAramaAcik] = useState(() => {
    try { return localStorage.getItem('amare_transcript_search') === '1'; } catch { return false; }
  });
  const [transcriptMatches, setTranscriptMatches] = useState({}); // { videoId: [{start, snippet, text}] }
  const [transcriptAraniyor, setTranscriptAraniyor] = useState(false);
  const [seekTo, setSeekTo] = useState(null); // VideoOynatModal'a iletilen başlangıç saniyesi
  useEffect(() => {
    try { localStorage.setItem('amare_transcript_search', transcriptAramaAcik ? '1' : '0'); } catch {}
  }, [transcriptAramaAcik]);

  // ─── URL persistence ──────────────────────────────────────────────────
  useEffect(() => {
    const p = {};
    if (kategoriSet.size > 0) p.kat = [...kategoriSet].join(',');
    if (dilKod !== 'all') p.dil = dilKod;
    if (egitmenCoreId) p.eg = egitmenCoreId;
    if (yil !== 'all') p.yil = yil;
    if (sureKod !== 'all') p.sure = sureKod;
    if (siralama !== 'yeni') p.sira = siralama;
    if (arama.trim()) p.q = arama.trim();
    if (sadeceFav) p.fav = '1';
    setSearchParams(p, { replace: true });
  }, [kategoriSet, dilKod, egitmenCoreId, yil, sureKod, siralama, arama, sadeceFav, setSearchParams]);

  // Kategori sıralamasını Firestore'dan yükle (cache 1h)
  useEffect(() => {
    const KEY = 'amare_kategori_sirasi_v1';
    const TTL_KAT = 60 * 60 * 1000;
    try {
      const cached = localStorage.getItem(KEY);
      if (cached) {
        const { ts, sira } = JSON.parse(cached);
        if (Date.now() - ts < TTL_KAT && Array.isArray(sira) && sira.length > 0) {
          // Eksikleri sona ekle (yeni eklendiyse)
          const mevcut = sira.filter(k => VARSAYILAN_KATEGORILER.includes(k));
          const eksikler = VARSAYILAN_KATEGORILER.filter(k => !mevcut.includes(k));
          setKategoriler([...mevcut, ...eksikler]);
          return;
        }
      }
    } catch {}
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'kategori_sirasi'));
        if (snap.exists() && Array.isArray(snap.data().sira) && snap.data().sira.length > 0) {
          const sira = snap.data().sira;
          const mevcut = sira.filter(k => VARSAYILAN_KATEGORILER.includes(k));
          const eksikler = VARSAYILAN_KATEGORILER.filter(k => !mevcut.includes(k));
          const tam = [...mevcut, ...eksikler];
          setKategoriler(tam);
          try { localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), sira: tam })); } catch {}
        }
      } catch {}
    })();
  }, []);

  // ─── Veri çek ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Eski cache versiyonlarını temizle
    try {
      ['amare_kayitli_egitimler_all_v1', 'amare_kayitli_egitimler_all_v2', 'amare_kayitli_egitimler_all_v3', 'amare_kayitli_egitimler_all_v4', 'amare_kayitli_egitimler_all_v5', 'amare_kayitli_egitimler_all_v6']
        .forEach(k => localStorage.removeItem(k));
      // Eski per-category cache'leri de sil (v1 mantığından kalan)
      Object.keys(localStorage)
        .filter(k => k.startsWith('amare_kayitli_egitimler_') && k.endsWith('_v1') && k !== CACHE_KEY)
        .forEach(k => localStorage.removeItem(k));
    } catch {}

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < TTL && Array.isArray(data)) {
          setTumVideolar(data.map(v => v.dil ? v : { ...v, dil: detectDil(v) }));
          setLoading(false);
          return;
        }
      }
    } catch {}

    setLoading(true);
    (async () => {
      try {
        const q = query(
          collection(db, 'kayitli_egitimler'),
          where('kayeneFiltrelendi', '==', false),
          orderBy('tarih', 'desc'),
          fbLimit(2500)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => {
          const { transcript, ...rest } = d.data();
          const v = { id: d.id, ...rest };
          v.dil = detectDil(v);
          return v;
        });
        setTumVideolar(data);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
      } catch (err) {
        console.warn('[kayitli_egitimler] fetch hatası:', err.message);
        setTumVideolar([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Türevler ─────────────────────────────────────────────────────────
  const yilOpsiyonlari = useMemo(() => {
    const map = new Map();
    for (const v of tumVideolar) {
      const y = (v.tarih || '').slice(0, 4);
      if (y && /^\d{4}$/.test(y)) map.set(y, (map.get(y) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [tumVideolar]);

  const egitmenOpsiyonlari = useMemo(() => {
    const map = new Map();
    for (const v of tumVideolar) {
      const cids = v.egitmenler || [];
      const adlar = v.egitmenAdlari || [];
      cids.forEach((cid, i) => {
        if (!cid) return;
        if (!map.has(cid)) map.set(cid, { coreId: cid, ad: adlar[i] || cid, count: 0 });
        map.get(cid).count++;
      });
    }
    return [...map.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr-TR'));
  }, [tumVideolar]);

  const egitmenAdMap = useMemo(() => {
    const m = new Map();
    for (const e of egitmenOpsiyonlari) m.set(e.coreId, e.ad);
    return m;
  }, [egitmenOpsiyonlari]);

  // ─── Filtre — arama hariç (transcript-search candidate seti olarak da kullanılır) ──
  const prefiltre = useMemo(() => {
    let arr = tumVideolar;
    if (kategoriSet.size > 0) arr = arr.filter(v => (v.kategoriler || []).some(k => kategoriSet.has(k)));
    if (dilKod !== 'all') arr = arr.filter(v => v.dil === dilKod);
    if (egitmenCoreId) arr = arr.filter(v => (v.egitmenler || []).includes(egitmenCoreId));
    if (yil !== 'all') arr = arr.filter(v => (v.tarih || '').startsWith(yil));
    if (sureKod !== 'all') {
      const f = SURE_FILTRELERI.find(s => s.kod === sureKod);
      if (f) arr = arr.filter(v => { const s = v.sure || 0; return s >= f.min && s < f.max; });
    }
    if (sadeceFav) arr = arr.filter(v => favoriler.has(v.id));
    return arr;
  }, [tumVideolar, kategoriSet, dilKod, egitmenCoreId, yil, sureKod, sadeceFav, favoriler]);

  // ─── Arama + sıralama ─────────────────────────────────────────────────
  const filtrelenmis = useMemo(() => {
    let arr = prefiltre;
    if (arama.trim()) {
      const q = arama.toLocaleLowerCase('tr-TR');
      arr = arr.filter(v => {
        const b = (v.baslik || '').toLocaleLowerCase('tr-TR');
        const e = (v.egitmenAdlari || []).join(' ').toLocaleLowerCase('tr-TR');
        // Başlık/eğitmen match ya da transcript match — ikisinden biri yeterli
        const titleMatch = b.includes(q) || e.includes(q);
        const transcriptMatch = transcriptAramaAcik && transcriptMatches[v.id]?.length > 0;
        return titleMatch || transcriptMatch;
      });
    }
    const sorted = [...arr];
    if (siralama === 'yeni')         sorted.sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
    else if (siralama === 'eski')    sorted.sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
    else if (siralama === 'populer') sorted.sort((a, b) => (b.plays || 0) - (a.plays || 0));
    else if (siralama === 'alfabe')  sorted.sort((a, b) => (a.baslik || '').localeCompare(b.baslik || '', 'tr-TR'));
    return sorted;
  }, [prefiltre, arama, siralama, transcriptAramaAcik, transcriptMatches]);

  // ─── Transcript arama debounce'lu backend çağrısı ───────────────────
  useEffect(() => {
    if (!transcriptAramaAcik || !arama.trim() || arama.trim().length < 2) {
      setTranscriptMatches({});
      setTranscriptAraniyor(false);
      return;
    }
    const ids = prefiltre.map(v => v.id);
    if (ids.length === 0) {
      setTranscriptMatches({});
      return;
    }
    setTranscriptAraniyor(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/.netlify/functions/transcript-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: arama.trim(), videoIds: ids }),
        });
        const data = await res.json();
        const map = {};
        for (const r of data.results || []) map[r.id] = r.matches;
        setTranscriptMatches(map);
      } catch (err) {
        console.warn('[transcript-search]', err.message);
      } finally {
        setTranscriptAraniyor(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [transcriptAramaAcik, arama, prefiltre]);

  useEffect(() => { setGosterilen(PAGE_SIZE); }, [kategoriSet, dilKod, egitmenCoreId, yil, sureKod, siralama, arama, sadeceFav]);

  // Sonsuz scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && gosterilen < filtrelenmis.length) {
        setGosterilen(g => Math.min(g + PAGE_SIZE, filtrelenmis.length));
      }
    }, { rootMargin: '400px' });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [filtrelenmis.length, gosterilen]);

  // Scroll-to-top buton görünümü
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ─── Aktif filtre listesi (chip bar için) ─────────────────────────────
  const aktifFiltreler = useMemo(() => {
    const list = [];
    [...kategoriSet].forEach(k => list.push({
      kod: 'kat-' + k, etiket: k,
      kaldir: () => { haptic(8); setKategoriSet(s => { const n = new Set(s); n.delete(k); return n; }); },
      renk: KATEGORI_RENK[k] || 'bg-amber-400 text-gray-900',
    }));
    if (dilKod !== 'all') {
      const d = DILLER.find(x => x.kod === dilKod);
      list.push({ kod: 'dil', etiket: d?.etiket, kaldir: () => { haptic(8); setDilKod('all'); }, renk: 'bg-white/20 text-white' });
    }
    if (egitmenCoreId) {
      list.push({ kod: 'eg', etiket: egitmenAdMap.get(egitmenCoreId) || egitmenCoreId, kaldir: () => { haptic(8); setEgitmenCoreId(''); }, renk: 'bg-white/20 text-white' });
    }
    if (yil !== 'all') {
      list.push({ kod: 'yil', etiket: yil, kaldir: () => { haptic(8); setYil('all'); }, renk: 'bg-white/20 text-white' });
    }
    if (sureKod !== 'all') {
      const s = SURE_FILTRELERI.find(x => x.kod === sureKod);
      list.push({ kod: 'sure', etiket: s?.etiket, kaldir: () => { haptic(8); setSureKod('all'); }, renk: 'bg-white/20 text-white' });
    }
    if (sadeceFav) {
      list.push({ kod: 'fav', etiket: '💗 Favoriler', kaldir: () => { haptic(8); setSadeceFav(false); }, renk: 'bg-pink-500/80 text-white' });
    }
    if (arama.trim()) {
      list.push({ kod: 'q', etiket: `"${arama.trim()}"`, kaldir: () => { haptic(8); setArama(''); }, renk: 'bg-white/20 text-white' });
    }
    return list;
  }, [kategoriSet, dilKod, egitmenCoreId, yil, sureKod, sadeceFav, arama, egitmenAdMap]);

  const filtreleriTemizle = () => {
    haptic(20);
    setKategoriSet(new Set());
    setDilKod('all');
    setEgitmenCoreId('');
    setYil('all');
    setSureKod('all');
    setSadeceFav(false);
    setArama('');
    toast('Tüm filtreler temizlendi', { type: 'info' });
  };

  // ─── Eylemler ─────────────────────────────────────────────────────────
  const toggleKategori = (k) => {
    haptic(8);
    setKategoriSet(s => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const toggleFavori = (e, v) => {
    e.stopPropagation();
    haptic(10);
    setFavoriler(s => {
      const next = new Set(s);
      if (next.has(v.id)) {
        next.delete(v.id);
        toast('Favoriden çıkarıldı', { type: 'info' });
      } else {
        next.add(v.id);
        toast('💗 Favoriye eklendi', { type: 'success' });
      }
      saveSet(FAV_KEY, next);
      return next;
    });
  };

  const handleOynat = useCallback((v, startSn = null) => {
    haptic(5);
    setGecmis(s => {
      const list = [v.id, ...[...s].filter(x => x !== v.id)].slice(0, HIST_MAX);
      saveList(HIST_KEY, list);
      return new Set(list);
    });
    setSeekTo(startSn);
    setOynatilan(v);
  }, []);

  const handleShare = async (e, v) => {
    e.stopPropagation();
    haptic(8);
    const url = `${window.location.origin}/kayitli-egitimler?eg=${(v.egitmenler || [])[0] || ''}#v=${v.id}`;
    const res = await nativeShare({
      title: v.baslik,
      text: `${v.baslik} — ${(v.egitmenAdlari || []).join(', ')}`,
      url: v.vimeoUrl || url,
    });
    if (res.method === 'clipboard') toast('Link kopyalandı', { type: 'success' });
    else if (res.method === 'native') toast('Paylaşıldı', { type: 'success' });
  };

  const scrollToTop = () => {
    haptic(8);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSheetUygula = () => {
    haptic(15);
    setSheetOpen(false);
    toast(`${filtrelenmis.length} eğitim bulundu`, { type: 'info' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Header — sadeleştirildi */}
      <div className="pt-6 pb-3 px-4 sticky top-0 z-30 bg-gradient-to-b from-purple-900/95 to-purple-900/85 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <button onClick={() => navigate('/takvim')} aria-label="Takvime dön"
              className="flex items-center text-white/70 hover:text-white text-sm spring-tap p-1">
              <ArrowLeft className="w-4 h-4 mr-1.5" />Takvim
            </button>
            <LanguageSwitcher />
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white font-display">Kayıtlı Eğitimler</h1>
          <p className="text-purple-200 mt-0.5 text-xs sm:text-sm">
            <strong>{filtrelenmis.length}</strong> / {tumVideolar.length} eğitim
            {favoriler.size > 0 && !sadeceFav && (
              <button onClick={() => setSadeceFav(true)}
                className="ml-3 inline-flex items-center gap-1 text-pink-300 hover:text-pink-200">
                <Heart className="w-3 h-3" fill="currentColor" />{favoriler.size}
              </button>
            )}
          </p>

          {/* Arama + Filtre butonu (mobile için) */}
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
              <input type="text" value={arama} onChange={e => setArama(e.target.value)}
                placeholder="Eğitim adı veya eğitmen ara..."
                className="w-full bg-white/15 backdrop-blur border-2 border-white/20 focus:border-amber-400 text-white placeholder-purple-300 rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all" />
              {arama && (
                <button onClick={() => setArama('')} aria-label="Aramayı temizle"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Filtre butonu sadece mobile/tablet */}
            <button onClick={() => { haptic(8); setSheetOpen(true); }} aria-label="Filtreler"
              className="md:hidden relative bg-white/15 hover:bg-white/25 border-2 border-white/20 text-white rounded-xl px-3 py-2.5 spring-tap inline-flex items-center gap-1.5 text-sm font-semibold">
              <SlidersHorizontal className="w-4 h-4" />
              {aktifFiltreler.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-gray-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {aktifFiltreler.length}
                </span>
              )}
            </button>
          </div>

          {/* Transcript arama toggle + mini açıklama */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button onClick={() => { haptic(8); setTranscriptAramaAcik(s => !s); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold spring-tap transition-all border ${
                transcriptAramaAcik
                  ? 'bg-amber-400 text-gray-900 border-amber-300 shadow-md'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}>
              <Mic className="w-3.5 h-3.5" />
              Video içinde ara
              {transcriptAramaAcik && transcriptAraniyor && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
            </button>
            <p className="text-[11px] sm:text-xs text-purple-200/90 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              {transcriptAramaAcik
                ? 'Konuşulan içerikte de arar, eşleşen sahneden başlatır'
                : 'Aç → eğitim konuşmasında arama yapar, sahneye atlar'}
            </p>
          </div>

          {/* Desktop'ta inline filtre dropdownları */}
          <div className="hidden md:grid mt-3 grid-cols-3 lg:grid-cols-5 gap-2">
            <DropdownField icon={User} value={egitmenCoreId} onChange={v => { haptic(5); setEgitmenCoreId(v); }}>
              <option value="" className="bg-purple-900">Tüm Eğitmenler ({egitmenOpsiyonlari.length})</option>
              {egitmenOpsiyonlari.map(o => (
                <option key={o.coreId} value={o.coreId} className="bg-purple-900">{o.ad} ({o.count})</option>
              ))}
            </DropdownField>
            <DropdownField icon={Globe} value={dilKod} onChange={v => { haptic(5); setDilKod(v); }}>
              {DILLER.map(d => <option key={d.kod} value={d.kod} className="bg-purple-900">{d.etiket}</option>)}
            </DropdownField>
            <DropdownField icon={Calendar} value={yil} onChange={v => { haptic(5); setYil(v); }}>
              <option value="all" className="bg-purple-900">Tüm Yıllar</option>
              {yilOpsiyonlari.map(([y, c]) => (
                <option key={y} value={y} className="bg-purple-900">{y} ({c})</option>
              ))}
            </DropdownField>
            <DropdownField icon={Clock} value={sureKod} onChange={v => { haptic(5); setSureKod(v); }}>
              {SURE_FILTRELERI.map(s => <option key={s.kod} value={s.kod} className="bg-purple-900">{s.etiket}</option>)}
            </DropdownField>
            <DropdownField icon={ArrowDownUp} value={siralama} onChange={v => { haptic(5); setSiralama(v); }}>
              {SIRALAMALAR.map(s => <option key={s.kod} value={s.kod} className="bg-purple-900">{s.etiket}</option>)}
            </DropdownField>
          </div>

          {/* Desktop: favoriler hızlı toggle */}
          {favoriler.size > 0 && (
            <div className="hidden md:flex mt-2 gap-2">
              <button onClick={() => { haptic(8); setSadeceFav(s => !s); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all spring-tap ${
                  sadeceFav ? 'bg-pink-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}>
                <Heart className="w-3.5 h-3.5" fill={sadeceFav ? 'currentColor' : 'none'} />
                Sadece favorilerim ({favoriler.size})
              </button>
            </div>
          )}

          {/* Desktop: kategori chip'leri */}
          <div className="hidden md:flex mt-3 flex-wrap gap-2 items-center">
            <button onClick={() => { haptic(8); setKategoriSet(new Set()); }}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all spring-tap ${
                kategoriSet.size === 0 ? 'bg-amber-400 text-gray-900 shadow-md' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }`}>Tümü</button>
            {kategoriler.map(k => (
              <button key={k} onClick={() => toggleKategori(k)}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all spring-tap ${
                  kategoriSet.has(k) ? (KATEGORI_RENK[k] || 'bg-amber-400 text-gray-900') + ' shadow-md' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}>
                {k}
              </button>
            ))}
            {aktifFiltreler.length > 0 && (
              <button onClick={filtreleriTemizle}
                className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap bg-red-500/30 hover:bg-red-500/50 text-red-100 border border-red-400/40 spring-tap transition-all">
                <RotateCcw className="w-3.5 h-3.5" />
                Tüm filtreleri temizle ({aktifFiltreler.length})
              </button>
            )}
          </div>

          {/* Aktif filtre chip bar — sadece mobile (desktop'ta zaten görünüyor) */}
          {aktifFiltreler.length > 0 && (
            <div className="md:hidden mt-2 -mx-4 px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 pb-1 min-w-max">
                {aktifFiltreler.map(f => (
                  <button key={f.kod} onClick={f.kaldir}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${f.renk} hover:opacity-80 transition-opacity spring-tap`}>
                    <X className="w-3 h-3" />
                    <span className="line-clamp-1 max-w-[140px]">{f.etiket}</span>
                  </button>
                ))}
                <button onClick={filtreleriTemizle}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap bg-red-500/30 text-red-200 hover:bg-red-500/40 spring-tap">
                  <RotateCcw className="w-3 h-3" />Sıfırla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 py-4 pb-bottom-nav">
        <div className="container mx-auto max-w-7xl">
          {loading ? (
            <SkeletonGrid />
          ) : filtrelenmis.length === 0 ? (
            <EmptyState onClear={filtreleriTemizle} hasFilters={aktifFiltreler.length > 0} />
          ) : (
            <>
              {/* Mobile: compact list, Desktop: grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filtrelenmis.slice(0, gosterilen).map(v => (
                  <VideoKart key={v.id} video={v}
                    favori={favoriler.has(v.id)}
                    izlendi={gecmis.has(v.id)}
                    transcriptMatch={transcriptAramaAcik ? transcriptMatches[v.id] : null}
                    aramaQ={arama}
                    onToggleFav={(e) => toggleFavori(e, v)}
                    onShare={(e) => handleShare(e, v)}
                    onOynat={(startSn) => handleOynat(v, startSn ?? null)}
                  />
                ))}
              </div>
              {gosterilen < filtrelenmis.length && (
                <div ref={sentinelRef} className="py-8 text-center text-white/50 text-sm">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin opacity-50" />
                  ({gosterilen} / {filtrelenmis.length})
                </div>
              )}
              {gosterilen >= filtrelenmis.length && filtrelenmis.length > PAGE_SIZE && (
                <div className="py-8 text-center text-white/40 text-sm">
                  ✓ Tümü gösterildi ({filtrelenmis.length})
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter Bottom Sheet */}
      {sheetOpen && (
        <FilterSheet
          onClose={() => setSheetOpen(false)}
          onUygula={onSheetUygula}
          kategoriler={kategoriler}
          kategoriSet={kategoriSet} setKategoriSet={setKategoriSet}
          egitmenCoreId={egitmenCoreId} setEgitmenCoreId={setEgitmenCoreId} egitmenOpsiyonlari={egitmenOpsiyonlari}
          dilKod={dilKod} setDilKod={setDilKod}
          yil={yil} setYil={setYil} yilOpsiyonlari={yilOpsiyonlari}
          sureKod={sureKod} setSureKod={setSureKod}
          siralama={siralama} setSiralama={setSiralama}
          sadeceFav={sadeceFav} setSadeceFav={setSadeceFav}
          favoriCount={favoriler.size}
          filtrelenmisSayi={filtrelenmis.length}
          filtreleriTemizle={filtreleriTemizle}
        />
      )}

      {/* Scroll-to-top FAB */}
      {showScrollTop && (
        <button onClick={scrollToTop} aria-label="En üste dön"
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)' }}
          className="fixed md:!bottom-6 right-4 z-40 w-12 h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-gray-900 shadow-xl flex items-center justify-center spring-tap animate-fade-in">
          <ChevronUp className="w-6 h-6" />
        </button>
      )}

      {oynatilan && (
        <VideoOynatModal video={oynatilan} onClose={() => { setOynatilan(null); setSeekTo(null); }}
          tumVideolar={tumVideolar}
          onOynat={handleOynat}
          seekTo={seekTo}
        />
      )}
    </div>
  );
};

// ─── Skeleton grid ──────────────────────────────────────────────────────
const SkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse">
        <div className="aspect-video bg-white/10" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
          <div className="h-3 bg-white/10 rounded w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Empty state ────────────────────────────────────────────────────────
const EmptyState = ({ onClear, hasFilters }) => (
  <div className="text-center py-16 text-white/50">
    <Video className="w-20 h-20 mx-auto mb-3 opacity-30" />
    <p className="text-lg">Filtreye uyan kayıt bulunamadı.</p>
    {hasFilters && (
      <button onClick={onClear}
        className="mt-4 inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-5 py-2.5 rounded-xl spring-tap">
        <RotateCcw className="w-4 h-4" />Filtreleri temizle
      </button>
    )}
  </div>
);

// ─── Filter Bottom Sheet ────────────────────────────────────────────────
const FilterSheet = ({
  onClose, onUygula,
  kategoriler,
  kategoriSet, setKategoriSet,
  egitmenCoreId, setEgitmenCoreId, egitmenOpsiyonlari,
  dilKod, setDilKod,
  yil, setYil, yilOpsiyonlari,
  sureKod, setSureKod,
  siralama, setSiralama,
  sadeceFav, setSadeceFav,
  favoriCount, filtrelenmisSayi,
  filtreleriTemizle,
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleKat = (k) => {
    haptic(8);
    setKategoriSet(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-purple-900 to-indigo-950 rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>
        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <h3 className="text-white text-lg font-bold inline-flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />Filtreler
          </h3>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {/* Sıralama */}
          <SheetSection icon={ArrowDownUp} title="Sıralama">
            <div className="flex flex-wrap gap-2">
              {SIRALAMALAR.map(s => (
                <SheetChip key={s.kod} active={siralama === s.kod}
                  onClick={() => { haptic(8); setSiralama(s.kod); }}>
                  {s.etiket}
                </SheetChip>
              ))}
            </div>
          </SheetSection>

          {/* Süre */}
          <SheetSection icon={Clock} title="Süre">
            <div className="flex flex-wrap gap-2">
              {SURE_FILTRELERI.map(s => (
                <SheetChip key={s.kod} active={sureKod === s.kod}
                  onClick={() => { haptic(8); setSureKod(s.kod); }}>
                  {s.etiket}
                </SheetChip>
              ))}
            </div>
          </SheetSection>

          {/* Dil */}
          <SheetSection icon={Globe} title="Dil">
            <div className="flex flex-wrap gap-2">
              {DILLER.map(d => (
                <SheetChip key={d.kod} active={dilKod === d.kod}
                  onClick={() => { haptic(8); setDilKod(d.kod); }}>
                  {d.etiket}
                </SheetChip>
              ))}
            </div>
          </SheetSection>

          {/* Yıl */}
          <SheetSection icon={Calendar} title="Yıl">
            <div className="flex flex-wrap gap-2">
              <SheetChip active={yil === 'all'} onClick={() => { haptic(8); setYil('all'); }}>Tümü</SheetChip>
              {yilOpsiyonlari.map(([y, c]) => (
                <SheetChip key={y} active={yil === y}
                  onClick={() => { haptic(8); setYil(y); }}>
                  {y} ({c})
                </SheetChip>
              ))}
            </div>
          </SheetSection>

          {/* Eğitmen */}
          <SheetSection icon={User} title="Eğitmen">
            <select value={egitmenCoreId} onChange={e => { haptic(8); setEgitmenCoreId(e.target.value); }}
              className="w-full bg-white/15 border-2 border-white/20 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 appearance-none">
              <option value="" className="bg-purple-900">Tüm Eğitmenler ({egitmenOpsiyonlari.length})</option>
              {egitmenOpsiyonlari.map(o => (
                <option key={o.coreId} value={o.coreId} className="bg-purple-900">{o.ad} ({o.count})</option>
              ))}
            </select>
          </SheetSection>

          {/* Kategori */}
          <SheetSection icon={Tag} title={`Kategori${kategoriSet.size > 0 ? ` (${kategoriSet.size} seçili)` : ''}`}>
            <div className="flex flex-wrap gap-2">
              {(kategoriler || []).map(k => (
                <SheetChip key={k} active={kategoriSet.has(k)}
                  onClick={() => toggleKat(k)}
                  color={kategoriSet.has(k) ? KATEGORI_RENK[k] : null}>
                  {k}
                </SheetChip>
              ))}
            </div>
          </SheetSection>

          {/* Favoriler toggle */}
          {favoriCount > 0 && (
            <SheetSection icon={Heart} title="">
              <SheetChip active={sadeceFav}
                onClick={() => { haptic(8); setSadeceFav(s => !s); }}
                color={sadeceFav ? 'bg-pink-500 text-white' : null}>
                <Heart className="w-3.5 h-3.5 inline mr-1" fill={sadeceFav ? 'currentColor' : 'none'} />
                Sadece favorilerim ({favoriCount})
              </SheetChip>
            </SheetSection>
          )}
        </div>

        {/* Footer: Sıfırla + Uygula */}
        <div className="px-5 py-3 border-t border-white/10 flex gap-2 flex-shrink-0">
          <button onClick={filtreleriTemizle}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl spring-tap text-sm inline-flex items-center justify-center gap-1.5">
            <RotateCcw className="w-4 h-4" />Sıfırla
          </button>
          <button onClick={onUygula}
            className="flex-[2] bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold py-3 rounded-xl spring-tap text-sm">
            {filtrelenmisSayi} eğitimi göster
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Desktop inline dropdown ─────────────────────────────────────────────
const DropdownField = ({ icon: Icon, value, onChange, children }) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300 pointer-events-none" />
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300 pointer-events-none" />
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-white/15 backdrop-blur border-2 border-white/20 focus:border-amber-400 text-white rounded-xl pl-9 pr-7 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 appearance-none cursor-pointer">
      {children}
    </select>
  </div>
);

const SheetSection = ({ icon: Icon, title, children }) => (
  <div>
    {title && (
      <div className="text-white/80 text-xs sm:text-sm font-bold mb-2 inline-flex items-center gap-1.5 uppercase tracking-wider">
        {Icon && <Icon className="w-3.5 h-3.5" />}{title}
      </div>
    )}
    {children}
  </div>
);

const SheetChip = ({ active, onClick, color, children }) => (
  <button onClick={onClick}
    className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all spring-tap min-h-[36px] ${
      active
        ? (color || 'bg-amber-400 text-gray-900 shadow-md')
        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
    }`}>
    {children}
  </button>
);

// ─── Video kartı (mobile compact + desktop grid) ─────────────────────────
const VideoKart = ({ video: v, favori, izlendi, transcriptMatch, aramaQ, onToggleFav, onShare, onOynat }) => {
  const sureMetin = formatSure(v.sure);
  const playsMetin = formatPlays(v.plays);
  const kategori = v.kategoriler?.[0];
  const renkClass = kategori ? (KATEGORI_RENK[kategori] || 'bg-amber-400/80 text-gray-900') : '';

  return (
    <button onClick={() => onOynat?.()}
      className="relative bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400 rounded-xl overflow-hidden text-left transition-all hover-lift spring-tap group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
      <div className="relative aspect-video bg-black/30">
        {v.thumbnailUrl ? (
          <img src={v.thumbnailUrl} alt={v.baslik} loading="lazy" decoding="async"
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-12 h-12 text-white/30" />
          </div>
        )}
        {/* Sol üst: izlendi */}
        {izlendi && (
          <div className="absolute top-2 left-2 bg-black/70 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            <History className="w-3 h-3" />İzlendi
          </div>
        )}
        {/* Sağ üst: dil */}
        {v.dil && v.dil !== 'TR' && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {v.dil}
          </div>
        )}
        {/* Sağ alt: süre */}
        {sureMetin && (
          <div className="absolute bottom-2 right-2 bg-black/85 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded">
            {sureMetin}
          </div>
        )}
        {/* Sol alt: kategori chip */}
        {kategori && (
          <div className={`absolute bottom-2 left-2 ${renkClass} text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-md`}>
            <Tag className="w-2.5 h-2.5" />{kategori}
          </div>
        )}
        {/* Hover: play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/50 transition-all">
          <div className="w-14 h-14 rounded-full bg-white/95 group-hover:bg-amber-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
            <Play className="w-7 h-7 text-purple-800 ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-bold text-white text-sm line-clamp-2 mb-1.5">{v.baslik}</h4>
        {v.egitmenAdlari?.length > 0 && (
          <div className="text-xs text-purple-200 mb-1.5 line-clamp-1">
            {v.egitmenAdlari.join(', ')}
          </div>
        )}

        {/* Transcript match snippets — sahneye atlama (timestamp varsa) ya da
            sadece içerikte geçtiği bilgisi (timestamp yoksa, eski videolar) */}
        {transcriptMatch?.length > 0 && (
          <div className="mb-2 space-y-1">
            {transcriptMatch.slice(0, 2).map((m, i) => {
              const hasTime = m.start != null && m.start >= 0;
              return (
                <div key={i}
                  role="button" tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onOynat?.(hasTime ? m.start : null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onOynat?.(hasTime ? m.start : null); } }}
                  title={hasTime ? `${formatSure(m.start)} — bu sahneden başlat` : 'Bu video konuşmasında geçiyor'}
                  className="block w-full text-left bg-amber-500/10 hover:bg-amber-500/25 border border-amber-400/30 rounded-md px-2 py-1.5 cursor-pointer transition-all">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300">
                    <Mic className="w-3 h-3" />
                    {hasTime ? formatSure(m.start) : 'Konuşmada geçiyor'}
                  </span>
                  <p className="text-[11px] text-white/85 line-clamp-2 mt-0.5 leading-snug"
                     dangerouslySetInnerHTML={{ __html: highlightSnippet(m.snippet, aramaQ) }} />
                </div>
              );
            })}
            {transcriptMatch.length > 2 && (
              <div className="text-[10px] text-amber-300/70 px-1">
                +{transcriptMatch.length - 2} eşleşme daha (videoyu aç)
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/60">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {v.tarih && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />{v.tarih}
              </span>
            )}
            {playsMetin && (
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3 h-3" />{playsMetin}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={onShare} aria-label="Paylaş"
              className="p-1.5 -mr-1 rounded-full text-white/40 hover:text-amber-300 hover:bg-white/10 transition-all">
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={onToggleFav} aria-label={favori ? 'Favoriden çıkar' : 'Favoriye ekle'}
              className={`p-1.5 -mr-1 rounded-full transition-all ${favori ? 'text-pink-400 hover:text-pink-300' : 'text-white/40 hover:text-pink-300 hover:bg-white/10'}`}>
              <Heart className="w-4 h-4" fill={favori ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </button>
  );
};

export default KayitliEgitimlerSayfasi;
