import React, { createContext, useState, useContext, useEffect } from 'react';
import { db, storage } from '../utils/firebase';
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
import { takvimOlustur } from '../utils/takvimAlgoritma';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [konusmacilar, setKonusmacilar] = useState([]);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');

  // Firebase'den veri yükle
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Eğitmenleri yükle
      const egitmenlerSnapshot = await getDocs(
        query(collection(db, 'egitmenler'), orderBy('timestamp', 'desc'))
      );
      const egitmenlerData = egitmenlerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEgitmenler(egitmenlerData);
      
      // Takvimi yükle
      const takvimSnapshot = await getDocs(collection(db, 'takvim'));
      const takvimData = takvimSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTakvim(takvimData);
      
      // Takvim durumunu yükle
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      if (!settingsSnapshot.empty) {
        const settings = settingsSnapshot.docs[0].data();
        setTakvimYayinlandi(settings.takvimYayinlandi || false);
      }

      // Konuşmacıları yükle
      const konusmacilarSnapshot = await getDocs(collection(db, 'konusmacilar'));
      const konusmacilarData = konusmacilarSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setKonusmacilar(konusmacilarData);

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
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

      // Mevcut takvimi temizle
      const takvimSnapshot = await getDocs(collection(db, 'takvim'));
      const deletePromises = takvimSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

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

        if (!icerik || !baslangic || !currentTarih) continue;

        // Saati formatla
        let saatStr = '';
        if (baslangic instanceof Date) {
          saatStr = `${String(baslangic.getHours()).padStart(2, '0')}:${String(baslangic.getMinutes()).padStart(2, '0')}`;
        } else if (typeof baslangic === 'number' && baslangic < 1) {
          const totalMinutes = Math.round(baslangic * 24 * 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          saatStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } else {
          saatStr = String(baslangic).trim();
        }

        let bitisStr = '';
        if (bitis instanceof Date) {
          bitisStr = `${String(bitis.getHours()).padStart(2, '0')}:${String(bitis.getMinutes()).padStart(2, '0')}`;
        } else if (typeof bitis === 'number' && bitis < 1) {
          const totalMinutes = Math.round(bitis * 24 * 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          bitisStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } else {
          bitisStr = String(bitis || '').trim();
        }

        // Hafta numarasını hesapla
        const tarihParts = currentTarih.split('.');
        const gun = parseInt(tarihParts[0]);
        let hafta;
        if (gun >= 1 && gun <= 12) hafta = 1;
        else if (gun >= 13 && gun <= 17) hafta = 2;
        else if (gun >= 18 && gun <= 24) hafta = 3;
        else hafta = 4;

        // Süre hesapla
        let sure = '45 dk';
        if (saatStr && bitisStr) {
          const [bH, bM] = saatStr.split(':').map(Number);
          const [eH, eM] = bitisStr.split(':').map(Number);
          const diff = (eH * 60 + eM) - (bH * 60 + bM);
          if (diff > 0) sure = `${diff} dk`;
        }

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
          slot: `${currentTarih}_${saatStr}`,
          kaynak: 'excel'
        });
      }

      // Firebase'e kaydet
      const addPromises = yeniTakvim.map(egitim =>
        addDoc(collection(db, 'takvim'), egitim)
      );
      await Promise.all(addPromises);

      await loadData();
      return { success: true, count: yeniTakvim.length };
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

  // Konuşmacı fotoğrafı yükle ve kaydet
  const konusmaciFotoYukle = async (konusmaciAdi, file) => {
    try {
      // Konuşmacı adından güvenli bir dosya adı oluştur
      const safeId = konusmaciAdi.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const ext = file.name.split('.').pop();
      const storageRef = ref(storage, `konusmacilar/${safeId}.${ext}`);

      // Resmi Storage'a yükle
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Firestore'da konuşmacı kaydını oluştur/güncelle
      const konusmaciRef = doc(db, 'konusmacilar', safeId);
      await setDoc(konusmaciRef, {
        id: safeId,
        ad: konusmaciAdi.trim(),
        fotoURL: downloadURL,
        guncellendi: new Date().toISOString()
      }, { merge: true });

      await loadData();
      return { success: true, url: downloadURL };
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
      await loadData();
      return { success: true };
    } catch (error) {
      console.error('Fotoğraf silme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  // Gemini API key kaydet
  const geminiApiKeyKaydet = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('geminiApiKey', key);
  };

  // Admin girişi
  const adminGiris = (sifre) => {
    if (sifre === 'oneteam10x') {
      setIsAdmin(true);
      localStorage.setItem('isAdmin', 'true');
      return true;
    }
    return false;
  };

  // Admin çıkış
  const adminCikis = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
  };

  // Sayfa yüklendiğinde admin durumunu kontrol et
  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin');
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const value = {
    egitmenler,
    takvim,
    takvimYayinlandi,
    loading,
    isAdmin,
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
