// Eğitim saatleri Türkiye saatiyle (TSİ) giriliyor ama sayfa bunu hiçbir yerde
// söylemiyordu. Afişlerde "TR 21:00 / EU 20:00" yazıyor, sayfada yazmıyor.
// Avrupa'daki iş ortağı 21:00'i kendi saati sanıp bir saat geç bağlanıyor.
//
// Burada: tarayıcının saat dilimi Türkiye değilse eğitim saatinin kişinin
// kendi saatindeki karşılığı hesaplanır.

const TR_BOLGE = 'Europe/Istanbul';

export const kullaniciBolgesi = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
};

// Türkiye dışında mı? (Kıbrıs da aynı saat dilimini kullanır, onu da TR sayarız.)
export const trDisindaMi = () => {
  const b = kullaniciBolgesi();
  if (!b) return false;
  return b !== TR_BOLGE && b !== 'Asia/Nicosia';
};

// "14.10.2026" + "21:00" -> kullanıcının kendi saatinde "20:00" (yoksa '').
// Türkiye yıl boyu UTC+3 (yaz saati uygulamıyor), bu yüzden TR saatinden
// UTC anı çıkarmak sabit bir çıkarma işlemi. Kullanıcı tarafındaki yaz saati
// farkını toLocaleTimeString kendisi hesaplar.
export const yerelKarsilik = (tarih, saat) => {
  if (!trDisindaMi()) return '';
  const t = String(tarih || '').trim();
  const s = String(saat || '').trim();
  const mt = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const ms = s.match(/^(\d{1,2}):(\d{2})/);
  if (!mt || !ms) return '';

  const [, gun, ay, yil] = mt.map(Number);
  const [, sa, dk] = ms.map(Number);
  // TR saati UTC+3 -> UTC anı
  const an = new Date(Date.UTC(yil, ay - 1, gun, sa - 3, dk));
  if (Number.isNaN(an.getTime())) return '';

  try {
    const yerel = an.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    // Saat aynıysa göstermenin anlamı yok (ör. başka bir UTC+3 ülkesi).
    return yerel === s.slice(0, 5) ? '' : yerel;
  } catch {
    return '';
  }
};

export default yerelKarsilik;
