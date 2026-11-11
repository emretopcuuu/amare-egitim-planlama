// Türkçe saat + ek ("15:30'dan", "15:00'ten") — afiş metinleri için.
//
// Saha isteği (12 Kas 2026, Gamze): afişe "Saat ..... 'dan/den sonra salona giriş
// yapılamayacaktır" otomatik gelsin. Ek, SAYIYA göre değil sayının OKUNUŞUNA göre
// seçilir: 15:30 → "on beş otuz" → otuz'DAN; 15:00 → "on beş" → beş'TEN
// (beş sert ünsüz ş ile biter → "ten", "den" değil).
//
// Okunuş kuralı: dakika 00 ise yalnız saat okunur ("16:00" → "on altı" → altıdan),
// değilse dakikanın son sözcüğü ek alır ("14:05" → "beş" → beşten).

// Sayının SON sözcüğü ve ekin çıkış biçimi: [sözcük sonu ünlüsü → dan/den, sert ünsüz mü]
// Ek = (kalın ünlü ? 'da' : 'de') ; sert ünsüzle bitiyorsa 'ta'/'te'; + 'n'.
const SON_SOZCUK = {
  // birler
  0: ['ı', false], 1: ['i', false], 2: ['i', false], 3: ['ü', true],
  4: ['ö', true], 5: ['e', true], 6: ['ı', false], 7: ['i', false],
  8: ['i', false], 9: ['u', false],
};
// onlar (son sözcük: on / yirmi / otuz / kırk / elli)
const ONLAR = { 1: ['o', false], 2: ['i', false], 3: ['u', false], 4: ['ı', true], 5: ['i', false] };
// Son sözcüğün kendisi de gerekli değil; yalnız (son ünlü, sert ünsüz mü) çifti yeter.
// birler için 4 (dört: ö, t) ve 5 (beş: e, ş), 3 (üç: ü, ç) sert; 0 "sıfır" (ı, r) yumuşak.

const KALIN = new Set(['a', 'ı', 'o', 'u']);

const ekUret = ([unlu, sert]) => {
  const ince = !KALIN.has(unlu);
  return (sert ? 't' : 'd') + (ince ? 'e' : 'a') + 'n';
};

// "15.30" / "15,30" / " 15:30 " → { sa, dk, metin: '15:30' } ; geçersizse null
export const saatCoz = (girdi) => {
  const m = String(girdi ?? '').trim().match(/^(\d{1,2})\s*[:.,]\s*(\d{2})$/);
  if (!m) return null;
  const sa = Number(m[1]), dk = Number(m[2]);
  if (sa > 23 || dk > 59) return null;
  return { sa, dk, metin: `${m[1]}:${m[2]}` };
};

// n (0..59) sayısının son sözcüğüne göre ek
const sayiEki = (n) => {
  if (n % 10 !== 0 || n === 0) return ekUret(SON_SOZCUK[n % 10]);
  return ekUret(ONLAR[n / 10]);
};

// "15:30" → "15:30'dan"   |   geçersiz → null
export const saatEkli = (girdi) => {
  const t = saatCoz(girdi);
  if (!t) return null;
  // Dakika 00 → yalnız saat okunur; aksi halde dakikanın son sözcüğü ek alır.
  const okunan = t.dk === 0 ? t.sa : t.dk;
  return `${t.metin}'${sayiEki(okunan)}`;
};

// Afiş cümlesi: "Saat 15:30'dan sonra salona giriş yapılamayacaktır."
export const girisKapanisMetni = (saat) => {
  const e = saatEkli(saat);
  return e ? `Saat ${e} sonra salona giriş yapılamayacaktır.` : null;
};

export const YAS_UYARISI_METNI = 'Etkinliğe 18 yaşından küçükler katılamaz.';
