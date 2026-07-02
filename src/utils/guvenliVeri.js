// Merkezî "sigortalı" Firestore okuma katmanı.
//
// Neden: tek bir geçici ağ/SDK hıçkırığı sayfaları "0 eğitim / boş ekran"a
// düşürüyordu (2026-06-27/28 arızaları). Her sayfanın kendi korumasını yazması
// yerine TÜM getDocs çağrıları buradan geçer:
//   • 3 deneme, artan bekleme (400ms → 800ms)
//   • kalıcı hatada Sentry'ye kayıt (kör kalmayız)
//   • çağıran taraf hata alır → boş-veri ile iyi veriyi EZMEK yerine bilinçli karar verir
//
// Kullanım: getDocs(q) yerine guvenliGetDocs(q). İmza birebir aynı.
import { getDocs, getDoc } from 'firebase/firestore';

const bekle = (ms) => new Promise(r => setTimeout(r, ms));

const sentryeYaz = async (hata, yer) => {
  try {
    const { Sentry } = await import('./sentry');
    Sentry?.captureException?.(hata, { tags: { yer: yer || 'guvenliVeri' } });
  } catch {}
};

export const guvenliGetDocs = async (ref, deneme = 3) => {
  let sonHata;
  for (let i = 0; i < deneme; i++) {
    try { return await getDocs(ref); }
    catch (e) { sonHata = e; if (i < deneme - 1) await bekle(400 * (i + 1)); }
  }
  console.error('[guvenliGetDocs]', deneme, 'denemede de başarısız:', sonHata?.message);
  sentryeYaz(sonHata, 'guvenliGetDocs');
  throw sonHata;
};

export const guvenliGetDoc = async (ref, deneme = 3) => {
  let sonHata;
  for (let i = 0; i < deneme; i++) {
    try { return await getDoc(ref); }
    catch (e) { sonHata = e; if (i < deneme - 1) await bekle(400 * (i + 1)); }
  }
  console.error('[guvenliGetDoc]', deneme, 'denemede de başarısız:', sonHata?.message);
  sentryeYaz(sonHata, 'guvenliGetDoc');
  throw sonHata;
};
