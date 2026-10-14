// Eğitim başlıkları Excel'den TAMAMI BÜYÜK geliyor:
// "BODRUM SAĞLIKLI YAŞAM VE GİRİŞİMCİLİK SEMİNERİ".
// Büyük harf cümle okunmaz, bağırır; 73 satır alt alta gelince sayfa gürültüye
// dönüyor. Veriye DOKUNMAZ, yalnız okuma anında cümle düzenine çevirir.
//
// Korumalar:
//  1) Başlık zaten düzgün yazılmışsa (karışık harf) hiç dokunulmaz.
//  2) Kısaltmalar büyük kalır (TR, EU, CEO, 3D...).
//  3) Türkçe bağlaçlar başta değilse küçük kalır ("Yaşam ve Girişimcilik").
//  4) İngilizce/marka kelimelerde Türkçe küçültme KULLANILMAZ: tr-TR'de
//     I → ı olduğu için "DIAMOND" aksi halde "Dıamond" çıkıyor.

const KUCUK = new Set([
  've', 'ile', 'veya', 'ya', 'da', 'de', 'ki', 'ama', 'için', 'göre',
  'ise', 'mi', 'mı', 'mu', 'mü', 'the', 'of', 'and', 'for', 'in', 'to',
]);

const KISALTMA = new Set([
  'TR', 'EU', 'AB', 'ABD', 'UK', 'USA', 'AI', 'IT', 'HR', 'PR',
  'CEO', 'CFO', 'COO', 'CTO', 'CRM', 'KPI', 'ROI', 'SEO', 'PDF', 'VIP',
  'PD', 'HBB', 'OT', 'SMS', 'TV', 'DNA', 'NLP', 'EFT', 'IF',
  '3D', '2D', 'Q1', 'Q2', 'Q3', 'Q4', 'B2B', 'B2C',
]);

// Türkçe küçültme kuralının BOZDUĞU İngilizce/marka kelimeler (hepsi "I" içerir).
// Bunlarda dilden bağımsız küçültme kullanılır.
const INGILIZCE = new Set([
  'DIAMOND', 'PRESIDENTIAL', 'BRAND', 'BUILDER', 'SILVER', 'PLATINUM',
  'LEADER', 'SENIOR', 'EXECUTIVE', 'ONLINE', 'TRAINING', 'MINDSET',
  'BUSINESS', 'DIGITAL', 'MARKETING', 'SOCIAL', 'INFLUENCER', 'LIVE',
]);

// Kelimeyi ayırıcılarda bölüp her parçayı ayrı değerlendirir:
// "TR&EU" iki kısaltma, "ISINMA-HİKAYE" iki Türkçe kelime.
const AYIRICI = /([-+&/.'’()]+)/;

const parcaYaz = (parca, ilkMi) => {
  if (!parca) return parca;
  const buyuk = parca.toLocaleUpperCase('tr-TR');
  if (KISALTMA.has(buyuk)) return buyuk;

  const kucuk = INGILIZCE.has(buyuk)
    ? parca.toLowerCase()
    : parca.toLocaleLowerCase('tr-TR');

  if (!ilkMi && KUCUK.has(kucuk)) return kucuk;
  return kucuk.replace(/^(\p{L})/u, (h) =>
    INGILIZCE.has(buyuk) ? h.toUpperCase() : h.toLocaleUpperCase('tr-TR'));
};

export const baslikYaz = (s) => {
  const ham = String(s || '');
  if (!ham.trim()) return ham;

  // Küçük harf içeriyorsa başlık elle yazılmış: dokunma.
  const harfler = ham.replace(/[^\p{L}]/gu, '');
  if (!harfler || harfler !== harfler.toLocaleUpperCase('tr-TR')) return ham;

  let kelimeSira = 0;
  return ham
    .split(/(\s+)/)
    .map((kelime) => {
      if (/^\s*$/.test(kelime)) return kelime;
      const ilkKelime = kelimeSira === 0;
      kelimeSira += 1;
      return kelime
        .split(AYIRICI)
        .map((p, i) => (AYIRICI.test(p) && i % 2 === 1 ? p : parcaYaz(p, ilkKelime && i === 0)))
        .join('');
    })
    .join('');
};

export default baslikYaz;
