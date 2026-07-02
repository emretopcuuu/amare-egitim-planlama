import React, { createContext, useState, useContext, useEffect } from 'react';
import { db, storage, auth, googleProvider } from '../utils/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  setDoc
} from 'firebase/firestore';
import { guvenliGetDocs } from '../utils/guvenliVeri';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { takvimOlustur } from '../utils/takvimAlgoritma';
import { isAdminEmail, userIsAdmin } from '../constants';

// Türkçe karakterleri ASCII'ye çevirip güvenli ID oluştur
export const makeSafeId = (ad) => {
  if (!ad) return '';
  return ad
    .normalize('NFC')                    // Unicode normalizasyonu (decomposed → precomposed)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width karakterleri sil
    .replace(/\u00A0/g, ' ')             // Non-breaking space → normal space
    .trim()
    .replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ş/g,'S').replace(/ş/g,'s')
    .replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ö/g,'O').replace(/ö/g,'o')
    .replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ç/g,'C').replace(/ç/g,'c')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Unvanları sıyırarak sadece kişi adından ID üret (dedup için)
// Hem doğal format (Prof.Dr.) hem ID format (prof_dr_) destekler
export const makeCoreId = (ad) => {
  if (!ad) return '';
  // Önce normalize + trim
  let clean = ad.normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
  if (!clean) return '';
  // Doğal format: "Prof.Dr. İSİM", "Yrd.Doç.Dr. İSİM", "Uzm.Dr.İSİM", "Dyt.İSİM" vb.
  let s = clean
    .replace(/^(Yrd\.?\s*Doç\.?\s*Dr\.?\s*|Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*Öğr\.?\s*Üyesi\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Psik\.?\s*|Psk\.?\s*|Ecz\.?\s*|Avt?\.?\s*|Öğr\.?\s*Gör\.?\s*|Arş\.?\s*Gör\.?\s*)/gi, '')
    .trim();
  // ID format: "prof_dr_isim", "yrd_doc_dr_isim", "uzm_dr_isim", "dyt_isim" vb.
  if (s === clean) {
    s = clean
      .replace(/^(yrd_doc_dr_|prof_dr_|doc_dr_|uzm_dr_|op_dr_|dr_ogr_uyesi_|dr_|dt_|dyt_|psik_|psk_|ecz_|avt?_|ogr_gor_|ars_gor_)/i, '')
      .trim();
  }
  // Sondaki "İLE", "VE", "SÖYLEŞİ" gibi ekleri temizle
  s = s.replace(/\s+(İLE|ILE|VE|SÖYLEŞİ|SÖYLEŞI|SOYLESI|ile|ve|söyleşi)\.{0,3}\s*$/gi, '').trim();
  return s ? makeSafeId(s) : makeSafeId(clean);
};
import * as XLSX from 'xlsx';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [egitmenler, setEgitmenler] = useState([]);
  const [takvim, setTakvim] = useState([]);
  // null = bilinmiyor (henüz yüklenmedi/fetch başarısız), true = yayında, false = gizli
  // null durumunda takvim gösterilir (yanlış pozitif "yayınlanmadı" engellenir)
  const [takvimYayinlandi, setTakvimYayinlandi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [konusmacilar, setKonusmacilar] = useState([]);
  const [geminiApiKey, setGeminiApiKey] = useState(() =>
    localStorage.getItem('geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY || ''
  );
  const [openaiApiKey, setOpenaiApiKey] = useState(() =>
    localStorage.getItem('openaiApiKey') || import.meta.env.VITE_OPENAI_API_KEY || ''
  );
  const [sablonlar, setSablonlar] = useState([]);
  const [hatirlatmaSayilari, setHatirlatmaSayilari] = useState({}); // { egitimId: uniqueEmailCount }

  // ── LocalStorage cache helpers ──────────────────────────────────
  // Return visit'lerde anında açılış sağlar: cache → setState → fresh fetch arkaplanda
  const CACHE_KEY = 'amare_data_cache_v2';
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 gün

  const loadFromCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > CACHE_TTL) return null;
      return data;
    } catch { return null; }
  };

  const saveToCache = (data) => {
    try {
      // base64 posterleri stripleyerek kaydet (büyük inline gorselUrl)
      const slimTakvim = (data.takvim || []).map(e => {
        if (e.gorselUrl && !/^https?:/.test(e.gorselUrl)) {
          const { gorselUrl, ...rest } = e;
          return { ...rest, _hasGorsel: true }; // marker — kart'ta thumbnail olduğunu göstermek için
        }
        return e;
      });
      const slimKonusmacilar = (data.konusmacilar || []).map(k => {
        if (k.fotoURL && !/^https?:/.test(k.fotoURL)) {
          const { fotoURL, ...rest } = k;
          return { ...rest, _hasFoto: true };
        }
        return k;
      });
      const slim = {
        takvim: slimTakvim,
        konusmacilar: slimKonusmacilar,
        sablonlar: data.sablonlar || [],
        takvimYayinlandi: data.takvimYayinlandi,
        ts: Date.now(),
      };
      const json = JSON.stringify(slim);
      if (json.length > 4 * 1024 * 1024) {
        console.warn('[cache] 4MB üstü, atlanıyor');
        return;
      }
      localStorage.setItem(CACHE_KEY, json);
    } catch (e) {
      console.warn('[cache save]', e.message);
    }
  };

  // Firebase'den veri yükle — public koleksiyonlar her zaman, admin-only sadece login sonrası
  useEffect(() => {
    // 1. CACHE'den anında göster (return visit instant)
    const cached = loadFromCache();
    if (cached) {
      if (cached.takvim) setTakvim(cached.takvim);
      if (cached.konusmacilar) setKonusmacilar(cached.konusmacilar);
      if (cached.sablonlar) setSablonlar(cached.sablonlar);
      // Cache'te 'false' güvenilmez — eski cache'lerden stale değer gelebilir.
      // Sadece 'true' ise cache'i kabul et. 'false'/undefined → null, fresh fetch beklesin.
      if (cached.takvimYayinlandi === true) setTakvimYayinlandi(true);
      else setTakvimYayinlandi(null);
      setLoading(false); // İlk paint anında, kullanıcı eski veri görmeye başlar
    }
    // 2. Fresh fetch — cache yoksa loading göster, varsa background
    loadData(!cached);
  }, []);

  // Login/logout olduğunda admin-only koleksiyonları yeniden çek
  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    } else {
      // Logout veya non-admin: admin verilerini temizle
      setEgitmenler([]);
      setHatirlatmaSayilari({});
    }
  }, [isAdmin]);

  // Firestore REST API value parser
  const parseValue = (v) => {
    if (v == null) return null;
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
    if (v.doubleValue !== undefined) return v.doubleValue;
    if (v.booleanValue !== undefined) return v.booleanValue;
    if (v.nullValue !== undefined) return null;
    if (v.timestampValue !== undefined) return v.timestampValue;
    if (v.arrayValue) return (v.arrayValue.values || []).map(parseValue);
    if (v.mapValue) {
      const o = {};
      for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = parseValue(val);
      return o;
    }
    return null;
  };

  const parseFields = (fields) => {
    const out = {};
    for (const [k, v] of Object.entries(fields || {})) out[k] = parseValue(v);
    return out;
  };

  // HIZLI takvim fetch — base64 gorselUrl HARİÇ (her doc 1MB → 1KB!)
  // gorselUrl marker ile bilinir, lazy yüklenir
  const TAKVIM_LIGHT_FIELDS = ['egitim','gun','tarih','saat','bitisSaati','sure','egitmen','yer','hafta','kategori','sehir','aciklama','katilimSayisi','tamamlandi','katilTiklamaSayisi','zoomGercekKatilim','zoomOrtDakika'];
  const KONUSMACI_LIGHT_FIELDS = ['ad','unvan','biyografi','linkedin','meslek','amareKariyer','doktorBrans']; // fotoURL hariç

  const fetchLightCollection = async (name, fields, deneme = 2) => {
    const mask = fields.map(f => `mask.fieldPaths=${f}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/amare-egitim-planlama/databases/(default)/documents/${name}?${mask}&pageSize=300`;
    let sonHata;
    for (let i = 0; i < deneme; i++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Firestore REST ${res.status}`);
        const data = await res.json();
        return (data.documents || []).map(d => ({ id: d.name.split('/').pop(), ...parseFields(d.fields) }));
      } catch (e) {
        sonHata = e;
        if (i < deneme - 1) await new Promise(r => setTimeout(r, 400 * (i + 1)));
      }
    }
    throw sonHata;
  };

  // getDocs retry — merkezî sigortalı okuma katmanına delege (utils/guvenliVeri)
  const getDocsRetry = (ref) => guvenliGetDocs(ref);

  // SON ÇARE: kendi domain'imiz üzerinden veri proxy'si.
  // Bazı ISS'lerde firestore.googleapis.com çözümlenemiyor (IPv6/DNS arızası) —
  // hem REST hem SDK aynı host'a gittiği için ikisi de ölüyor. Proxy, Netlify
  // sunucusundan okur; istemci yalnız kendi sitemize bağlanır.
  const proxyFetch = async (col) => {
    const res = await fetch(`/.netlify/functions/veri-proxy?col=${encodeURIComponent(col)}`);
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    const { docs } = await res.json();
    if (!Array.isArray(docs)) throw new Error('proxy format');
    return docs;
  };

  // Tek doc full fetch (gorselUrl/fotoURL dahil)
  const fetchSingleDoc = async (collection, id) => {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/amare-egitim-planlama/databases/(default)/documents/${collection}/${id}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return { id, ...parseFields(data.fields) };
    } catch { return null; }
  };

  // Tarih parser
  const parseTarihLocal = (t) => {
    if (!t) return null;
    const parts = String(t).split('.').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    return isNaN(d.getTime()) ? null : d;
  };

  // Public koleksiyonları + sadece okumak için izin verilenleri yükle
  // İKİ AŞAMALI: önce LIGHT (base64'siz, anında), sonra background'da FULL
  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    // 1. AŞAMA: LIGHT fetch — REST API + field mask, gorselUrl/fotoURL hariç
    //    Her şey paralel, ~500ms-1sn'de bitti
    const [takvimLight, settingsResult, konusmacilarLight, sablonlarResult] = await Promise.allSettled([
      fetchLightCollection('takvim', TAKVIM_LIGHT_FIELDS),
      guvenliGetDocs(collection(db, 'settings')),
      fetchLightCollection('konusmacilar', KONUSMACI_LIGHT_FIELDS),
      guvenliGetDocs(collection(db, 'sablonlar')),
    ]);

    // Light data'yı state'e koy
    let lightTakvimData = [];
    let lightKonusmacilarData = [];

    if (takvimLight.status === 'fulfilled') {
      lightTakvimData = takvimLight.value.map(t => ({ ...t, _light: true }));
      setTakvim(lightTakvimData);
    } else {
      // REST light başarısız → önce KENDİ domain proxy'miz (ISS googleapis kesse bile çalışır), sonra SDK
      console.warn('[loadData] takvim LIGHT başarısız, fallback zinciri:', takvimLight.reason?.message);
      try {
        lightTakvimData = (await proxyFetch('takvim')).map(t => ({ ...t, _light: true }));
        if (lightTakvimData.length) setTakvim(lightTakvimData);
      } catch (pe) {
        console.warn('[loadData] takvim proxy fallback başarısız, SDK deneniyor:', pe?.message);
        try {
          const snap = await getDocsRetry(collection(db, 'takvim'));
          lightTakvimData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (lightTakvimData.length) setTakvim(lightTakvimData);
        } catch (e) {
          console.error('[loadData] takvim tüm fallback\'ler başarısız:', e?.message);
          try { (await import('../utils/sentry')).Sentry?.captureException?.(e, { tags: { yer: 'takvim-load-fallback' } }); } catch {}
        }
      }
    }
    const konusmacilarDedupe = (liste) => {
      const coreMap = new Map();
      for (const k of liste) {
        const cid = makeCoreId(k.ad || k.id);
        if (!coreMap.has(cid)) coreMap.set(cid, { ...k, _light: true });
      }
      return [...coreMap.values()];
    };
    if (konusmacilarLight.status === 'fulfilled') {
      lightKonusmacilarData = konusmacilarDedupe(konusmacilarLight.value);
      setKonusmacilar(lightKonusmacilarData);
    } else {
      // REST başarısız → proxy → SDK (konuşmacılar/lider sayfaları boş kalmasın)
      console.warn('[loadData] konuşmacılar LIGHT başarısız, fallback zinciri:', konusmacilarLight.reason?.message);
      try {
        lightKonusmacilarData = konusmacilarDedupe(await proxyFetch('konusmacilar'));
        if (lightKonusmacilarData.length) setKonusmacilar(lightKonusmacilarData);
      } catch (pe) {
        try {
          const snap = await getDocsRetry(collection(db, 'konusmacilar'));
          lightKonusmacilarData = konusmacilarDedupe(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          if (lightKonusmacilarData.length) setKonusmacilar(lightKonusmacilarData);
        } catch (e) {
          console.error('[loadData] konuşmacılar tüm fallback\'ler başarısız:', e?.message);
          try { (await import('../utils/sentry')).Sentry?.captureException?.(e, { tags: { yer: 'konusmacilar-load-fallback' } }); } catch {}
        }
      }
    }
    if (settingsResult.status === 'fulfilled') {
      const snap = settingsResult.value;
      setTakvimYayinlandi(snap.empty ? false : snap.docs[0].data().takvimYayinlandi === true);
    }
    if (sablonlarResult.status === 'fulfilled') {
      setSablonlar(sablonlarResult.value.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    // 🎯 SAYFA AÇILMADAN ÖNCE: Top 10 konuşmacı fotosu yüklen (StoryStrip için)
    // Kullanıcı talebi: 'önümüzdeki konuşmacıların 10 adedini sayfa açmadan yükle'
    if (lightKonusmacilarData.length > 0 && lightTakvimData.length > 0) {
      const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
      const konSayilari = new Map();
      lightTakvimData.forEach(e => {
        const d = parseTarihLocal(e.tarih);
        if (!d || d < bugun) return;
        (e.egitmen || '').split(/[\/,&]/).map(s => s.trim()).filter(s => s.length > 1)
          .forEach(ad => konSayilari.set(ad, (konSayilari.get(ad) || 0) + 1));
      });
      const kAdToId = new Map();
      lightKonusmacilarData.forEach(k => kAdToId.set((k.ad || '').toLocaleUpperCase('tr-TR'), k.id));
      // Top 10 (sıralı StoryStrip ilk gösterilecekler)
      const top10Ids = [...konSayilari.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ad]) => kAdToId.get(ad.toLocaleUpperCase('tr-TR')))
        .filter(Boolean);

      if (top10Ids.length > 0) {
        // SENKRON paralel fetch — sayfa açılışından ÖNCE bekle
        const results = await Promise.allSettled(
          top10Ids.map(id => fetchSingleDoc('konusmacilar', id))
        );
        const top10Map = new Map();
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value) top10Map.set(r.value.id, r.value);
        });
        // Light data ile birleştir
        const updated = lightKonusmacilarData.map(k => top10Map.get(k.id) || k);
        setKonusmacilar(updated);
      }
    }

    setLoading(false); // ⚡ Sayfa açılır — StoryStrip top 10 fotolu, eğitimler text

    // 2. AŞAMA: ÖNCELİK fetch — Hero için top 5 eğitim posteri + StoryStrip için top 30 konuşmacı fotosu
    //    Bunlar viewport'un üstünde, kullanıcının ilk göreceği şey
    //    Paralel single-doc fetch ile ~1-2sn'de gelir
    setTimeout(async () => {
      const lightTakvim = takvimLight.status === 'fulfilled' ? takvimLight.value : [];
      const lightKonusmacilar = konusmacilarLight.status === 'fulfilled' ? konusmacilarLight.value : [];

      // Top 5 gelecek eğitim
      const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
      const top5Egitim = lightTakvim
        .map(e => ({ ...e, _d: parseTarihLocal(e.tarih) }))
        .filter(e => e._d && e._d >= bugun)
        .sort((a, b) => a._d - b._d || (a.saat || '').localeCompare(b.saat || ''))
        .slice(0, 5);

      // Top 30 konuşmacı (eğitim sayısına göre — gelecek eğitimlerden)
      const konSayilari = new Map();
      lightTakvim.forEach(e => {
        const d = parseTarihLocal(e.tarih);
        if (!d || d < bugun) return;
        (e.egitmen || '').split(/[\/,&]/).map(s => s.trim()).filter(s => s.length > 1)
          .forEach(ad => konSayilari.set(ad, (konSayilari.get(ad) || 0) + 1));
      });
      // Map konusmacı ad → kayıt (light)
      const kAdToKayit = new Map();
      lightKonusmacilar.forEach(k => kAdToKayit.set((k.ad || '').toLocaleUpperCase('tr-TR'), k));
      // Top 30 isim
      const top30Konusmaci = [...konSayilari.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([ad]) => {
          const k = kAdToKayit.get(ad.toLocaleUpperCase('tr-TR'));
          return k?.id;
        })
        .filter(Boolean);

      // PARALEL single-doc fetch
      const [priEgitimResults, priKonusmacilarResults] = await Promise.all([
        Promise.allSettled(top5Egitim.map(e => fetchSingleDoc('takvim', e.id))),
        Promise.allSettled(top30Konusmaci.map(id => fetchSingleDoc('konusmacilar', id))),
      ]);

      // State'i güncelle — light data + priority full data
      const priEgitimMap = new Map();
      priEgitimResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value) priEgitimMap.set(r.value.id, r.value);
      });
      const priKonusmacilarMap = new Map();
      priKonusmacilarResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value) priKonusmacilarMap.set(r.value.id, r.value);
      });

      // Takvim'i güncelle — priority items full, geri kalanı hala light
      setTakvim(prev => prev.map(e => priEgitimMap.get(e.id) || e));
      // Konuşmacılar — priority items full
      setKonusmacilar(prev => prev.map(k => priKonusmacilarMap.get(k.id) || k));

      // 3. AŞAMA: Geri kalan herkes (background full fetch)
      setTimeout(async () => {
        const [takvimFull, konusmacilarFull] = await Promise.allSettled([
          getDocsRetry(collection(db, 'takvim')),
          getDocsRetry(collection(db, 'konusmacilar')),
        ]);

        let freshTakvim = null;
        let freshKonusmacilar = null;

        if (takvimFull.status === 'fulfilled') {
          freshTakvim = takvimFull.value.docs.map(d => ({ id: d.id, ...d.data() }));
          // Boş gelirse mevcut (light) veriyi EZME — yalnız doluysa yaz
          if (freshTakvim.length) setTakvim(freshTakvim);
        } else {
          console.error('[loadData] takvim FULL başarısız:', takvimFull.reason?.message);
          try { (await import('../utils/sentry')).Sentry?.captureException?.(takvimFull.reason, { tags: { yer: 'takvim-load-full' } }); } catch {}
        }
        if (konusmacilarFull.status === 'fulfilled') {
          const rawData = konusmacilarFull.value.docs.map(d => ({ id: d.id, ...d.data() }));
          const coreMap = new Map();
          for (const k of rawData) {
            const cid = makeCoreId(k.ad || k.id);
            const existing = coreMap.get(cid);
            if (!existing) {
              coreMap.set(cid, k);
            } else if (k.fotoURL && !existing.fotoURL) {
              coreMap.set(cid, { ...existing, fotoURL: k.fotoURL, id: k.id });
            }
          }
          freshKonusmacilar = [...coreMap.values()];
          setKonusmacilar(freshKonusmacilar);
        }

        saveToCache({
          takvim: freshTakvim,
          konusmacilar: freshKonusmacilar,
          sablonlar: sablonlarResult.status === 'fulfilled' ? sablonlarResult.value.docs.map(d => ({ id: d.id, ...d.data() })) : null,
          takvimYayinlandi: settingsResult.status === 'fulfilled' && !settingsResult.value.empty ? settingsResult.value.docs[0].data().takvimYayinlandi === true : null,
        });
      }, 500); // 500ms sonra geri kalanı
    }, 50); // 50ms — UI ilk render'a izin ver

    return; // Sequence here
  };

  // OLD CODE - kalmasın diye yorum (referans):
  /*
  const loadDataOld = async () => {
    const [takvimResult, settingsResult, konusmacilarResult, sablonlarResult] = await Promise.allSettled([
      guvenliGetDocs(collection(db, 'takvim')),
      guvenliGetDocs(collection(db, 'settings')),
      guvenliGetDocs(collection(db, 'konusmacilar')),
      guvenliGetDocs(collection(db, 'sablonlar')),
    ]);

    // Sonuçları işle ve state'e yaz
    let freshTakvim = null;
    let freshKonusmacilar = null;
    let freshSablonlar = null;
    let freshYayinlandi = null;

    // Takvim
    if (takvimResult.status === 'fulfilled') {
      freshTakvim = takvimResult.value.docs.map(d => ({ id: d.id, ...d.data() }));
      setTakvim(freshTakvim);
    } else {
      console.warn('[loadData] takvim:', takvimResult.reason?.code || takvimResult.reason?.message);
    }

    // Settings
    if (settingsResult.status === 'fulfilled') {
      const snap = settingsResult.value;
      freshYayinlandi = snap.empty ? false : snap.docs[0].data().takvimYayinlandi === true;
      setTakvimYayinlandi(freshYayinlandi);
    } else {
      // SDK fail olursa REST API fallback
      console.warn('[loadData] settings SDK:', settingsResult.reason?.code || settingsResult.reason?.message);
      try {
        const res = await fetch('https://firestore.googleapis.com/v1/projects/amare-egitim-planlama/databases/(default)/documents/settings');
        const data = await res.json();
        const doc = data?.documents?.[0];
        freshYayinlandi = doc?.fields?.takvimYayinlandi?.booleanValue === true;
        setTakvimYayinlandi(freshYayinlandi);
      } catch (e) {
        console.warn('[loadData] settings REST fallback:', e?.message);
      }
    }

    // Konuşmacılar + dedup (coreId ile)
    if (konusmacilarResult.status === 'fulfilled') {
      const rawData = konusmacilarResult.value.docs.map(d => ({ id: d.id, ...d.data() }));
      const coreMap = new Map();
      for (const k of rawData) {
        const cid = makeCoreId(k.ad || k.id);
        const existing = coreMap.get(cid);
        if (!existing) {
          coreMap.set(cid, k);
        } else {
          if (k.fotoURL && !existing.fotoURL) {
            coreMap.set(cid, { ...existing, fotoURL: k.fotoURL, id: k.id });
          } else if (k.fotoURL && existing.fotoURL) {
            if ((k.unvan || k.biyografi) && !(existing.unvan || existing.biyografi)) {
              coreMap.set(cid, { ...k });
            }
          }
        }
      }
      freshKonusmacilar = [...coreMap.values()];
      setKonusmacilar(freshKonusmacilar);
    } else {
      console.warn('[loadData] konusmacilar:', konusmacilarResult.reason?.code || konusmacilarResult.reason?.message);
    }

    // Şablonlar
    if (sablonlarResult.status === 'fulfilled') {
      freshSablonlar = sablonlarResult.value.docs.map(d => ({ id: d.id, ...d.data() }));
      setSablonlar(freshSablonlar);
    } else {
      console.warn('[loadData] sablonlar:', sablonlarResult.reason?.code || sablonlarResult.reason?.message);
    }

    setLoading(false);

    // Cache'e yaz (gelecek visit için instant açılış)
    saveToCache({
      takvim: freshTakvim,
      konusmacilar: freshKonusmacilar,
      sablonlar: freshSablonlar,
      takvimYayinlandi: freshYayinlandi,
    });
  };
  */

  // Sadece admin'in okuyabildiği koleksiyonları yükle
  const loadAdminData = async () => {
    // Eğitmen başvuruları (admin-only read)
    try {
      const snap = await guvenliGetDocs(query(collection(db, 'egitmenler'), orderBy('timestamp', 'desc')));
      setEgitmenler(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.warn('[loadAdminData] egitmenler:', e?.code || e?.message); }

    // Hatırlatma kayıtları (admin-only read)
    try {
      const snap = await guvenliGetDocs(collection(db, 'hatirlatmalar'));
      const sayilar = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.egitimId) return;
        if (!sayilar[data.egitimId]) sayilar[data.egitimId] = new Set();
        sayilar[data.egitimId].add(data.email);
      });
      const result = {};
      Object.entries(sayilar).forEach(([id, emails]) => { result[id] = emails.size; });
      setHatirlatmaSayilari(result);
    } catch (e) { console.warn('[loadAdminData] hatirlatmalar:', e?.code || e?.message); }
  };

  // Yeni eğitmen ekle
  const egitmenEkle = async (egitmenData) => {
    try {
      const docRef = await addDoc(collection(db, 'egitmenler'), {
        ...egitmenData,
        timestamp: new Date().toISOString()
      });
      
      await loadData(); // Yeniden yükle
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Eğitmen ekleme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Otomatik takvim oluştur
  const otomatikTakvimOlustur = async () => {
    try {
      // Mevcut takvimi temizle
      const takvimSnapshot = await guvenliGetDocs(collection(db, 'takvim'));
      const deletePromises = takvimSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Yeni takvim oluştur
      const yeniTakvim = takvimOlustur(egitmenler);
      
      // Firebase'e kaydet
      const addPromises = yeniTakvim.map(egitim => 
        addDoc(collection(db, 'takvim'), egitim)
      );
      await Promise.all(addPromises);
      
      await loadData();
      return { success: true, count: yeniTakvim.length };
    } catch (error) {
      console.error('Takvim oluşturma hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Excel'den takvim yükle
  const exceldenTakvimYukle = async (file) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // ─── ÖNCE EXCEL'İ PARSE ET (yeniTakvim'i hazırla) ───
      // Sonra mevcut takvimle karşılaştırarak hangi doc'ların arşivleneceğine karar vereceğiz.
      const yeniTakvim = [];
      let currentTarih = null;
      let currentGun = null;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Başlık satırlarını atla
        if (!row || row.length < 5) continue;
        if (String(row[0]).includes('TARİH') || String(row[0]).includes('ONE TEAM')) continue;

        // Tarih varsa güncelle
        if (row[0] && row[0] !== '') {
          const rawDate = row[0];
          if (rawDate instanceof Date || (typeof rawDate === 'number' && rawDate > 40000)) {
            // Excel date serial number
            const excelDate = typeof rawDate === 'number' ? XLSX.SSF.parse_date_code(rawDate) : rawDate;
            if (excelDate && excelDate.y) {
              const d = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
              currentTarih = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
            } else if (rawDate instanceof Date) {
              currentTarih = `${String(rawDate.getDate()).padStart(2, '0')}.${String(rawDate.getMonth() + 1).padStart(2, '0')}.${rawDate.getFullYear()}`;
            }
          } else if (typeof rawDate === 'string' && rawDate.match(/\d/)) {
            currentTarih = rawDate;
          }
        }
        if (row[1] && row[1] !== '') {
          currentGun = String(row[1]).trim();
        }

        // İçerik kontrolü - saat ve eğitim adı olmalı
        const icerik = String(row[3] || '').trim();
        const baslangic = row[4];
        const bitis = row[5];
        const konusmacilar = String(row[6] || '').trim();
        const yer = String(row[2] || '').trim();

        // Saatsiz eğitimleri de kabul et — kullanıcı admin panelden saat ekleyebilir
        if (!icerik || !currentTarih) continue;

        // Saati formatla (boş olabilir)
        const formatSaat = (v) => {
          if (v === '' || v === null || v === undefined) return '';
          if (v instanceof Date) {
            return `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`;
          }
          if (typeof v === 'number' && v < 1) {
            const totalMinutes = Math.round(v * 24 * 60);
            return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
          }
          return String(v).trim();
        };
        const saatStr = formatSaat(baslangic);
        const bitisStr = formatSaat(bitis);

        // Hafta numarası — kullanıcı tanımlı:
        // 1-3 = H1, 4-10 = H2, 11-17 = H3, 18-24 = H4, 25-31 = H5
        const tarihParts = currentTarih.split('.');
        const gun = parseInt(tarihParts[0]);
        let hafta;
        if (gun <= 3) hafta = 1;
        else if (gun <= 10) hafta = 2;
        else if (gun <= 17) hafta = 3;
        else if (gun <= 24) hafta = 4;
        else hafta = 5;

        // Süre — başlangıç & bitiş varsa hesapla, yoksa boş bırak (kullanıcı saat eklediğinde otomatik hesaplanmaz, manuel girer)
        let sure = '';
        if (saatStr && bitisStr && saatStr.includes(':') && bitisStr.includes(':')) {
          const [bH, bM] = saatStr.split(':').map(Number);
          const [eH, eM] = bitisStr.split(':').map(Number);
          const diff = (eH * 60 + eM) - (bH * 60 + bM);
          if (diff > 0) sure = `${diff} dk`;
        }
        // Saat hiç yoksa varsayılan değer
        if (!sure && (saatStr || bitisStr)) sure = '45 dk';

        yeniTakvim.push({
          hafta,
          gun: currentGun || '',
          tarih: currentTarih,
          saat: saatStr,
          bitisSaati: bitisStr,
          egitim: icerik,
          egitmen: konusmacilar,
          yer: yer,
          sure,
          slot: `${currentTarih}_${saatStr || 'no-time'}`,
          kaynak: 'excel',
          saatGirilmedi: !saatStr,  // UI'da işaretlemek için
        });
      }

      // ─── AKILLI ARŞİVLEME ───
      // Mevcut takvim doc'larını oku, üç gruba ayır:
      //   - Geçmiş eğitimler (bugünden önce): ARŞIV
      //   - Excel'in yeni doldurduğu slot ile eşleşen eğitimler: ARŞIV (yeni veri yerine geçer)
      //   - Diğer (gelecek + Excel'de yer almayan): KORU (listede aynen kalır)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parseTr = (t) => {
        if (!t) return null;
        const parts = String(t).split('.').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return null;
        const [d, m, y] = parts;
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
      };

      const yeniSlotSet = new Set(yeniTakvim.map(e => e.slot));

      const takvimSnapshot = await guvenliGetDocs(collection(db, 'takvim'));
      const arsivlenecek = [];
      let korunan = 0;
      for (const d of takvimSnapshot.docs) {
        const data = d.data();
        const egitimTarihi = parseTr(data.tarih);
        const isGecmis = egitimTarihi && egitimTarihi < today;
        const sameSlot = yeniSlotSet.has(data.slot);
        if (isGecmis || sameSlot) {
          arsivlenecek.push(d);
        } else {
          korunan++;
        }
      }

      // Arşivlenecekleri 'arsiv_takvim'e taşı
      if (arsivlenecek.length > 0) {
        const arsivKaynak = sheetName || 'önceki dönem';
        const arsivTimestamp = new Date().toISOString();
        const archivePromises = arsivlenecek.map(d =>
          addDoc(collection(db, 'arsiv_takvim'), {
            ...d.data(),
            eskiId: d.id,
            arsivlendi: arsivTimestamp,
            arsivKaynak: arsivKaynak,
          })
        );
        await Promise.all(archivePromises);
        // Orijinalleri sil (sadece arşivlenenleri, korunanlar yerinde kalır)
        const deletePromises = arsivlenecek.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }

      // Yeni Excel kayıtlarını ekle
      const addPromises = yeniTakvim.map(egitim =>
        addDoc(collection(db, 'takvim'), egitim)
      );
      await Promise.all(addPromises);

      await loadData();
      return {
        success: true,
        count: yeniTakvim.length,
        arsivlenen: arsivlenecek.length,
        korunan,
      };
    } catch (error) {
      console.error('Excel yükleme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Manuel eğitim ekle
  const manuelEgitimEkle = async (egitimData) => {
    try {
      await addDoc(collection(db, 'takvim'), egitimData);
      await loadData();
      return { success: true };
    } catch (error) {
      console.error('Eğitim ekleme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Eğitim sil
  const egitimSil = async (egitimId) => {
    try {
      await deleteDoc(doc(db, 'takvim', egitimId));
      await loadData();
      return { success: true };
    } catch (error) {
      console.error('Eğitim silme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Eğitim güncelle
  const egitimGuncelle = async (egitimId, guncelData) => {
    try {
      await updateDoc(doc(db, 'takvim', egitimId), guncelData);
      await loadData();
      return { success: true };
    } catch (error) {
      console.error('Eğitim güncelleme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Takvimi yayınla/gizle
  const takvimDurumDegistir = async (yayinlandiMi) => {
    try {
      const settingsSnapshot = await guvenliGetDocs(collection(db, 'settings'));
      
      if (settingsSnapshot.empty) {
        // İlk kez oluştur
        await addDoc(collection(db, 'settings'), {
          takvimYayinlandi: yayinlandiMi,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Güncelle
        const settingsDoc = settingsSnapshot.docs[0];
        await updateDoc(settingsDoc.ref, {
          takvimYayinlandi: yayinlandiMi,
          updatedAt: new Date().toISOString()
        });
      }
      
      setTakvimYayinlandi(yayinlandiMi);
      return { success: true };
    } catch (error) {
      console.error('Takvim durum değiştirme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Görseli canvas ile yeniden boyutlandırıp base64 döndür
  const gorseliKucult = (file, maxSize = 600) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Konuşmacı fotoğrafı yükle ve kaydet (Firestore base64)
  const konusmaciFotoYukle = async (konusmaciAdi, file) => {
    try {
      const safeId = makeSafeId(konusmaciAdi);
      const base64 = await gorseliKucult(file, 500);
      const konusmaciRef = doc(db, 'konusmacilar', safeId);
      await setDoc(konusmaciRef, {
        id: safeId,
        ad: konusmaciAdi.trim(),
        fotoURL: base64,
        guncellendi: new Date().toISOString()
      }, { merge: true });
      setKonusmacilar(prev => {
        const idx = prev.findIndex(k => k.id === safeId);
        const updated = { id: safeId, ad: konusmaciAdi.trim(), fotoURL: base64 };
        return idx >= 0 ? prev.map(k => k.id === safeId ? { ...k, ...updated } : k) : [...prev, updated];
      });
      return { success: true, url: base64 };
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Konuşmacı fotoğrafını sil
  const konusmaciFotoSil = async (konusmaciId, konusmaciAd) => {
    try {
      const konusmaciRef = doc(db, 'konusmacilar', konusmaciId);
      await updateDoc(konusmaciRef, { fotoURL: null, guncellendi: new Date().toISOString() });
      setKonusmacilar(prev => prev.map(k => k.id === konusmaciId ? { ...k, fotoURL: null } : k));
      return { success: true };
    } catch (error) {
      console.error('Fotoğraf silme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Şablon yükle (Firestore base64)
  const sablonEkle = async (ad, file) => {
    try {
      const safeId = `sablon_${Date.now()}`;
      const base64 = await gorseliKucult(file, 800);
      const sablonData = {
        id: safeId,
        ad: ad || file.name,
        url: base64,
        olusturuldu: new Date().toISOString()
      };
      await setDoc(doc(db, 'sablonlar', safeId), sablonData);
      setSablonlar(prev => [...prev, sablonData]);
      return { success: true, url: base64 };
    } catch (error) {
      console.error('Şablon yükleme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Şablon sil
  const sablonSil = async (sablonId) => {
    try {
      await deleteDoc(doc(db, 'sablonlar', sablonId));
      setSablonlar(prev => prev.filter(s => s.id !== sablonId));
      return { success: true };
    } catch (error) {
      console.error('Şablon silme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Başvuru sil
  const basvuruSil = async (basvuruId) => {
    try {
      await deleteDoc(doc(db, 'egitmenler', basvuruId));
      setEgitmenler(prev => prev.filter(e => e.id !== basvuruId));
      return { success: true };
    } catch (error) {
      console.error('Başvuru silme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Başvuru durum güncelle
  const basvuruDurumGuncelle = async (basvuruId, durum) => {
    try {
      await updateDoc(doc(db, 'egitmenler', basvuruId), { durum, durumGuncellendi: new Date().toISOString() });
      setEgitmenler(prev => prev.map(e => e.id === basvuruId ? { ...e, durum } : e));
      return { success: true };
    } catch (error) {
      console.error('Başvuru durum hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Konuşmacı bilgi güncelle (unvan, biyografi, linkedin)
  const konusmaciBilgiGuncelle = async (konusmaciId, bilgi) => {
    try {
      const konusmaciRef = doc(db, 'konusmacilar', konusmaciId);
      await setDoc(konusmaciRef, { ...bilgi, guncellendi: new Date().toISOString() }, { merge: true });
      setKonusmacilar(prev => {
        const idx = prev.findIndex(k => k.id === konusmaciId);
        return idx >= 0 ? prev.map(k => k.id === konusmaciId ? { ...k, ...bilgi } : k) : [...prev, { id: konusmaciId, ...bilgi }];
      });
      return { success: true };
    } catch (error) {
      console.error('Konuşmacı bilgi hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Gemini API key kaydet
  const geminiApiKeyKaydet = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('geminiApiKey', key);
  };

  const openaiApiKeyKaydet = (key) => {
    setOpenaiApiKey(key);
    localStorage.setItem('openaiApiKey', key);
  };

  // Admin girişi — Google sign-in (Firebase Auth)
  const adminGiris = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user?.email;
      // 2026-06-05 audit (#2): Önce Custom Claim, sonra email whitelist fallback
      const idTokenResult = await result.user.getIdTokenResult();
      const isAdminUser = userIsAdmin({ email, claims: idTokenResult.claims });
      if (!isAdminUser) {
        await signOut(auth);
        return { success: false, error: `Bu hesap (${email}) admin yetkisine sahip değil.` };
      }
      return { success: true, email };
    } catch (err) {
      // popup-closed-by-user gibi durumları sessizce ele al
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return { success: false, error: null };
      }
      return { success: false, error: err?.message || 'Giriş başarısız.' };
    }
  };

  // Admin çıkış
  const adminCikis = async () => {
    try { await signOut(auth); } catch {}
    // Eski localStorage flag'ini de temizle (geriye dönük)
    localStorage.removeItem('isAdmin');
  };

  // Firebase Auth state listener — currentUser ve isAdmin'i otomatik günceller
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }
      // 2026-06-05 audit (#2): Custom Claim de oku — admin: true varsa öncelik
      // Email whitelist fallback migration tamamlanana kadar destek
      try {
        const idTokenResult = await user.getIdTokenResult();
        setIsAdmin(userIsAdmin({
          email: user.email,
          claims: idTokenResult.claims,
        }));
      } catch (e) {
        // Token sorunsa eski email kontrolüne düş
        setIsAdmin(isAdminEmail(user?.email));
      }
      setAuthLoading(false);
      // Eski localStorage isAdmin flag'ini bypass için artık güvenmiyoruz; sil
      localStorage.removeItem('isAdmin');
    });
    return () => unsub();
  }, []);

  const value = {
    egitmenler,
    takvim,
    takvimYayinlandi,
    loading,
    isAdmin,
    currentUser,
    authLoading,
    konusmacilar,
    egitmenEkle,
    otomatikTakvimOlustur,
    exceldenTakvimYukle,
    manuelEgitimEkle,
    egitimSil,
    egitimGuncelle,
    takvimDurumDegistir,
    konusmaciFotoYukle,
    konusmaciFotoSil,
    geminiApiKey,
    geminiApiKeyKaydet,
    openaiApiKey,
    openaiApiKeyKaydet,
    sablonlar,
    sablonEkle,
    sablonSil,
    hatirlatmaSayilari,
    basvuruSil,
    basvuruDurumGuncelle,
    konusmaciBilgiGuncelle,
    adminGiris,
    adminCikis,
    loadData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
