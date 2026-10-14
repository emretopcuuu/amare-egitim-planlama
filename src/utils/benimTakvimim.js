// "Benim takvimim" izi.
//
// 73 eğitim herkese aynı sırada gösteriliyordu; kişi kendi işini kalabalığın
// içinde arıyordu. Hatırlatma kurduğu eğitimler artık işaretleniyor ve listede
// görünür biçimde öne çıkıyor.
//
// Neden Firestore değil: hatırlatmalar `hatirlatmalar` koleksiyonunda e-posta
// ile tutuluyor ve okuma kuralları buna açık değil. Kural değiştirmek yerine
// cihazda yerel iz bırakılıyor. Bedeli: başka cihazda işaret görünmez.
// Kazancı: sıfır sorgu, sıfır kural değişikliği, anında çalışır.

const ANAHTAR = 'oneteam_benim_takvimim_v1';

const oku = () => {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    const d = ham ? JSON.parse(ham) : null;
    return Array.isArray(d) ? d : [];
  } catch {
    return [];   // özel sekme / kapalı depolama
  }
};

export const benimEgitimlerim = () => new Set(oku());

export const benimMi = (egitimId) => !!egitimId && oku().includes(egitimId);

export const benimIsaretle = (egitimId) => {
  if (!egitimId) return;
  try {
    const l = oku();
    if (l.includes(egitimId)) return;
    l.push(egitimId);
    // Liste sınırsız büyümesin: son 200 kayıt yeter.
    localStorage.setItem(ANAHTAR, JSON.stringify(l.slice(-200)));
    window.dispatchEvent(new CustomEvent('benim-takvimim-degisti'));
  } catch { /* depolama kapalı: işaret yok, uygulama çalışmaya devam eder */ }
};

export const benimKaldir = (egitimId) => {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(oku().filter((x) => x !== egitimId)));
    window.dispatchEvent(new CustomEvent('benim-takvimim-degisti'));
  } catch { /* yoksay */ }
};

export default benimEgitimlerim;
