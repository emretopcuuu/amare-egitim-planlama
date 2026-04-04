import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../utils/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy 
} from 'firebase/firestore';
import { takvimOlustur } from '../utils/takvimAlgoritma';

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
    egitmenEkle,
    otomatikTakvimOlustur,
    manuelEgitimEkle,
    egitimSil,
    egitimGuncelle,
    takvimDurumDegistir,
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
