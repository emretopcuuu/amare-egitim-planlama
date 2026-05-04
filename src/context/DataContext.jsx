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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { takvimOlustur } from '../utils/takvimAlgoritma';
import { isAdminEmail } from '../constants';

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
  const [takvimYayinlandi, setTakvimYayinlandi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [konusmacilar, setKonusmacilar] = useState([]);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('openaiApiKey') || '');
  const [sablonlar, setSablonlar] = useState([]);
  const [hatirlatmaSayilari, setHatirlatmaSayilari] = useState({}); // { egitimId: uniqueEmailCount }

  // Firebase'den veri yükle — public koleksiyonlar her zaman, admin-only sadece login sonrası
  useEffect(() => {
    loadData();
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

  // Public koleksiyonları + sadece okumak için izin verilenleri yükle
  const loadData = async () => {
    setLoading(true);

    // Takvim (public read)
    try {
      const snap = await getDocs(collection(db, 'takvim'));
      setTakvim(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.warn('[loadData] takvim:', e?.code || e?.message); }

    // Settings (public read)
    try {
      const snap = await getDocs(collection(db, 'settings'));
      if (!snap.empty) {
        setTakvimYayinlandi(snap.docs[0].data().takvimYayinlandi || false);
      }
    } catch (e) { console.warn('[loadData] settings:', e?.code || e?.message); }

    // Konuşmacılar (public read) + dedup
    try {
      const snap = await getDocs(collection(db, 'konusmacilar'));
      const rawData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      setKonusmacilar([...coreMap.values()]);
    } catch (e) { console.warn('[loadData] konusmacilar:', e?.code || e?.message); }

    // Şablonlar (public read)
    try {
      const snap = await getDocs(collection(db, 'sablonlar'));
      setSablonlar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.warn('[loadData] sablonlar:', e?.code || e?.message); }

    setLoading(false);
  };

  // Sadece admin'in okuyabildiği koleksiyonları yükle
  const loadAdminData = async () => {
    // Eğitmen başvuruları (admin-only read)
    try {
      const snap = await getDocs(query(collection(db, 'egitmenler'), orderBy('timestamp', 'desc')));
      setEgitmenler(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.warn('[loadAdminData] egitmenler:', e?.code || e?.message); }

    // Hatırlatma kayıtları (admin-only read)
    try {
      const snap = await getDocs(collection(db, 'hatirlatmalar'));
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
      const takvimSnapshot = await getDocs(collection(db, 'takvim'));
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

      const takvimSnapshot = await getDocs(collection(db, 'takvim'));
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
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      
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
      if (!isAdminEmail(email)) {
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
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAdmin(isAdminEmail(user?.email));
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
