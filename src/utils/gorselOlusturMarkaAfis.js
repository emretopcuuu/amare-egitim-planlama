// "Marka Afiş" — deterministik Canvas afiş motoru (AI YOK).
// One Team / Amare etkinlik posterlerinin marka dilini kod olarak üretir:
// koyu/mor zemin + soluk One Team amblemi, kocaman başlık, altın şehir rozeti,
// altın-hap isim etiketli konuşmacılar, altın program bandı, adres/ZOOM bandı,
// amare logosu. Gerçek fotoğraflar Canvas'a yapıştırılır → yüz/yazı birebir.
import { imgYukle as urlToImage } from './imgYukle';
import { isFiziki } from './egitmenEtiket';
import { qrOlustur } from './qrOlustur';
import { fotoYerlesim } from './fotoYerlesim';

const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr);
  else {
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
};

// Foto çerçeve yolu (yuvarlak / yuvarlak-kare / altıgen) — half = yarıçap eşdeğeri
const cizYol = (ctx, cx, cy, half, sekil) => {
  ctx.beginPath();
  if (sekil === 'kare') {
    const r = half * 0.30, x = cx - half, y = cy - half, w = half * 2, h = half * 2;
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  } else if (sekil === 'altigen') {
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 90); const px = cx + half * Math.cos(a), py = cy + half * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  } else { ctx.arc(cx, cy, half, 0, Math.PI * 2); }
};

const wrapText = (ctx, text, x, y, maxW, lh, maxLines = 6) => {
  const words = String(text || '').split(/\s+/);
  let line = '', yy = y, n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy); yy += lh; line = words[i]; n++;
      if (n >= maxLines - 1) { line = words.slice(i).join(' '); break; }
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, yy); yy += lh; }
  return yy;
};

// Başlık çiz — ortalı kelime-kaydırma; ciftRenk=true ise SON kelime vurgu renginde.
const basligiCiz = (ctx, text, cx, y, maxW, lh, maxLines, renkMetin, renkVurgu, ciftRenk) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const sonIdx = words.length - 1;
  // satırlara böl (kelime kaydırma, maxLines sınırı)
  const satirlar = []; let cur = [];
  for (let i = 0; i < words.length; i++) {
    const test = [...cur, words[i]].join(' ');
    if (ctx.measureText(test).width > maxW && cur.length && satirlar.length < maxLines - 1) {
      satirlar.push(cur); cur = [words[i]];
    } else cur.push(words[i]);
  }
  if (cur.length) satirlar.push(cur);
  let gidx = 0, yy = y;
  const bosluk = ctx.measureText(' ').width;
  for (const satir of satirlar) {
    const genislikler = satir.map(w => ctx.measureText(w).width);
    const toplam = genislikler.reduce((s, w) => s + w, 0) + bosluk * (satir.length - 1);
    let x = cx - toplam / 2;
    satir.forEach((w, j) => {
      ctx.fillStyle = (ciftRenk && gidx === sonIdx) ? renkVurgu : renkMetin;
      ctx.textAlign = 'left';
      ctx.fillText(w, x, yy);
      x += genislikler[j] + bosluk; gidx++;
    });
    yy += lh;
  }
  ctx.textAlign = 'center';
  return yy;
};

// Küçük vektör ikon (takvim/saat) — altın çizgiyle. cx,cy merkez; s boyut.
const ikonCiz = (ctx, tip, cx, cy, s, renk) => {
  ctx.save();
  ctx.strokeStyle = renk; ctx.fillStyle = renk; ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.lineJoin = 'round';
  if (tip === 'takvim') {
    const x = cx - s / 2, y = cy - s / 2;
    roundRect(ctx, x, y + s * 0.08, s, s * 0.84, s * 0.12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.32); ctx.lineTo(x + s, y + s * 0.32); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.28, y); ctx.lineTo(x + s * 0.28, y + s * 0.18);
    ctx.moveTo(x + s * 0.72, y); ctx.lineTo(x + s * 0.72, y + s * 0.18); ctx.stroke();
  } else { // saat
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.46, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - s * 0.28);
    ctx.moveTo(cx, cy); ctx.lineTo(cx + s * 0.22, cy + s * 0.06); ctx.stroke();
  }
  ctx.restore();
};

// Köşe kurdele/şerit (sağ üst) — üst kenardaki (W-L,0) ile sağ kenardaki (W,L)
// noktalarını birleştirir; böylece TAMAMI tuval içinde kalır (taşma/kırpılma yok).
const kurdeleCiz = (ctx, W, metin, palet) => {
  const L = Math.round(W * 0.28);            // köşeden her kenara uzanım (daha zarif/küçük)
  const kalin = Math.round(W * 0.044);       // bant kalınlığı (incelendi)
  const len = Math.round(L * Math.SQRT2 * 0.98); // bant boyu (iki kenar arası çapraz)
  ctx.save();
  ctx.translate(W - L / 2, L / 2);           // bandın merkezi köşenin içinde
  ctx.rotate(Math.PI / 4);
  // yumuşak gölge
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
  const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
  grad.addColorStop(0, palet.goldKoyu); grad.addColorStop(0.5, palet.gold); grad.addColorStop(1, palet.goldKoyu);
  ctx.fillStyle = grad;
  ctx.fillRect(-len / 2, -kalin / 2, len, kalin);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  // ince iç çerçeve çizgisi (premium dokunuş)
  ctx.strokeStyle = `rgba(${palet.goldRGB},0.55)`; ctx.lineWidth = 1;
  const ic = Math.round(kalin * 0.16);
  ctx.strokeRect(-len / 2, -kalin / 2 + ic, len, kalin - ic * 2);
  // metin — banda sığacak, hafif harf aralığı
  ctx.fillStyle = palet.pillText;
  ctx.font = `800 ${Math.round(kalin * 0.42)}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((metin || '').toLocaleUpperCase('tr-TR'), 0, 1, len * 0.74);
  ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
};

// Hazır paletler — goldRGB: dekor (ışık/elmas/parıltı) rengi, aksana göre değişir
export const paletKoyu = () => ({ ad: 'siyah', bg1: '#0b0b0d', bg2: '#17120a', gold: '#d8b15a', goldRGB: '216,177,90', goldKoyu: '#b8923f', pillText: '#2a1c06', metin: '#ffffff', alt: '#d9d6cf', elmas: true, acik: false });
const paletMor = () => ({ ad: 'mor', bg1: '#3a2b54', bg2: '#211633', gold: '#d8b15a', goldRGB: '216,177,90', goldKoyu: '#b8923f', pillText: '#2a1c06', metin: '#ffffff', alt: '#e7e0f0', elmas: false, acik: false });
// Açık/lüks krem-altın palet (referans 2)
const paletAcik = () => ({ ad: 'acik', bg1: '#f7f1e4', bg2: '#ece0c8', gold: '#c69a3f', goldRGB: '198,154,63', goldKoyu: '#9c7426', pillText: '#2a1f08', metin: '#241c10', alt: '#6b5d44', elmas: false, acik: true });
// Ek koyu temalar — hepsi altın aksanlı (mevcut altın dekorla uyumlu), sadece zemin değişir
const paletLacivert = () => ({ ad: 'lacivert', bg1: '#0c1730', bg2: '#070f20', gold: '#d8b15a', goldRGB: '216,177,90', goldKoyu: '#b8923f', pillText: '#2a1c06', metin: '#ffffff', alt: '#cdd6e6', elmas: true, acik: false });
const paletBordo = () => ({ ad: 'bordo', bg1: '#2c0e13', bg2: '#1a070a', gold: '#dcb866', goldRGB: '220,184,102', goldKoyu: '#b8923f', pillText: '#2a1206', metin: '#ffffff', alt: '#e7cfd2', elmas: true, acik: false });
const paletZumrut = () => ({ ad: 'zumrut', bg1: '#0a261d', bg2: '#061a13', gold: '#d8b15a', goldRGB: '216,177,90', goldKoyu: '#b8923f', pillText: '#0a1c14', metin: '#ffffff', alt: '#c8e0d4', elmas: true, acik: false });
// Gümüş/platin aksanlı temalar (altın yerine metalik gri)
const paletGumus = () => ({ ad: 'gumus', bg1: '#1a1c20', bg2: '#0e1013', gold: '#cdd1d8', goldRGB: '205,209,216', goldKoyu: '#9aa0a8', pillText: '#1a1c20', metin: '#ffffff', alt: '#cfd3da', elmas: true, acik: false });
const paletPlatin = () => ({ ad: 'platin', bg1: '#f3f4f6', bg2: '#e2e4e8', gold: '#8d929c', goldRGB: '141,146,156', goldKoyu: '#6b7079', pillText: '#1a1c20', metin: '#1f232a', alt: '#5b616b', elmas: false, acik: true });
// İsimle palet getir (tema çipi / ek istek)
export const paletAdla = (ad) => ({ siyah: paletKoyu, mor: paletMor, acik: paletAcik, lacivert: paletLacivert, bordo: paletBordo, zumrut: paletZumrut, gumus: paletGumus, platin: paletPlatin }[ad] || null);

// Yazı tipi setleri — başlık / isim / gövde ayrı olabilir (isimlere şık font)
const FONT_SETLERI = {
  klasik: { baslik: 'Arial', isim: 'Arial', govde: 'Arial' },
  zarif: { baslik: 'Georgia', isim: 'Georgia', govde: 'Georgia' },
  karisik: { baslik: 'Arial', isim: 'Georgia', govde: 'Arial' }, // güçlü başlık + zarif isim
  modern: { baslik: '"Trebuchet MS"', isim: '"Trebuchet MS"', govde: '"Trebuchet MS"' },
  klasikSerif: { baslik: '"Times New Roman"', isim: 'Georgia', govde: 'Georgia' },
};
export const fontSec = (ad) => FONT_SETLERI[ad] || FONT_SETLERI.klasik;

// Gün adı TR→EN (dil çipi için)
const GUN_EN = {
  'PAZARTESİ': 'MONDAY', 'SALI': 'TUESDAY', 'ÇARŞAMBA': 'WEDNESDAY', 'PERŞEMBE': 'THURSDAY',
  'CUMA': 'FRIDAY', 'CUMARTESİ': 'SATURDAY', 'PAZAR': 'SUNDAY',
};
export const gunCevir = (gun, dil) => {
  if (dil !== 'en' || !gun) return gun;
  return GUN_EN[gun.toLocaleUpperCase('tr-TR').trim()] || gun;
};

// Tema paleti (kategori/başlığa göre) — stil verilmemişse otomatik seçer
const paletSec = (egitim) => {
  const k = `${egitim?.kategori || ''} ${egitim?.egitim || ''} ${egitim?.etkinlikTuru || ''}`.toLocaleLowerCase('tr-TR');
  if (/vizyon|diamond|liderlik|kapan|strateji/.test(k)) return paletKoyu();
  return paletMor(); // seminer / panel / sağlık / toplantı → mor
};

// Serbest tasarım isteğini ("Tasarıma ek istek") deterministik ayarlara çevirir.
// Marka Afiş AI değil → metni anahtar kelimelerle yorumlayıp piksel ayarına döker.
const renkAyarla = (hex, f) => {
  const n = (hex || '#000000').replace('#', '');
  const c = (i) => Math.max(0, Math.min(255, Math.round(parseInt(n.slice(i, i + 2), 16) * f)));
  return `#${[c(0), c(2), c(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};
export const ayarCikar = (ek) => {
  const t = (ek || '').toLocaleLowerCase('tr-TR');
  // bayraklar: dekor + içerik açık varsayılan
  const a = {
    yazi: 1, foto: 1, tema: null, zemin: 1, font: null,
    isik: true, elmas: true, cerceve: true, // dekor
    qr: true, program: true, tarih: true,   // içerik
    tekSira: false, fotoSekil: 'yuvarlak', kurdele: null, ciftRenkBaslik: false,
    filigran: 'normal', anaVurgu: false, doku: null, dil: 'tr', duzen: null,
  };
  const has = (...ws) => ws.some(w => t.includes(w));
  // metin boyutu
  if (has('yazı büyüt', 'yazıları büyüt', 'yazılar büyük', 'büyük yazı', 'başlığı büyüt', 'başlık büyüt', 'metni büyüt')) a.yazi = 1.18;
  if (has('yazı küçült', 'yazıları küçült', 'yazılar küçük', 'küçük yazı', 'başlığı küçült', 'metni küçült')) a.yazi = 0.82;
  if (has('çok küçült', 'çok küçük', 'iyice küçült', 'daha da küçült')) a.yazi = 0.7;
  if (has('çok büyüt', 'iyice büyüt', 'daha da büyüt')) a.yazi = 1.32;
  // foto
  if (has('foto büyüt', 'fotoğraf büyüt', 'fotoları büyüt', 'büyük foto', 'fotolar büyük', 'fotoğrafları büyüt')) a.foto = 1.15;
  if (has('foto küçült', 'fotoğraf küçült', 'fotoları küçült', 'küçük foto', 'fotoğrafları küçült')) a.foto = 0.85;
  // tema
  if (has('siyah tema', 'altın siyah', 'koyu tema', 'siyah zemin', 'lüks tema')) a.tema = 'siyah';
  if (has('mor tema', 'mor zemin')) a.tema = 'mor';
  if (has('lacivert tema', 'lacivert', 'mavi tema', 'gece mavisi')) a.tema = 'lacivert';
  if (has('bordo tema', 'bordo', 'şarap', 'kırmızı tema')) a.tema = 'bordo';
  if (has('zümrüt tema', 'zümrüt', 'yeşil tema', 'zumrut')) a.tema = 'zumrut';
  if (has('krem tema', 'açık tema', 'beyaz tema', 'krem zemin')) a.tema = 'acik';
  if (has('gümüş tema', 'gümüş', 'gumus')) a.tema = 'gumus';
  if (has('platin tema', 'platin')) a.tema = 'platin';
  // foto şekli
  if (has('kare foto', 'köşeli foto', 'yuvarlak kare', 'kare çerçeve')) a.fotoSekil = 'kare';
  if (has('altıgen', 'altigen', 'petek')) a.fotoSekil = 'altigen';
  if (has('yuvarlak foto', 'daire foto', 'oval foto')) a.fotoSekil = 'yuvarlak';
  // köşe kurdele/şerit
  if (has('ücretsiz şerit', 'ücretsiz kurdele', 'ücretsiz rozet')) a.kurdele = 'ÜCRETSİZ';
  if (has('kontenjan', 'sınırlı kontenjan', 'kontenjan sınırlı')) a.kurdele = 'KONTENJAN SINIRLI';
  if (has('son fırsat', 'son gün', 'acele')) a.kurdele = 'SON FIRSAT';
  if (has('yeni şerit', 'yeni rozet')) a.kurdele = 'YENİ';
  // iki renkli başlık (son kelime altın)
  if (has('iki renkli başlık', 'çift renk başlık', 'altın vurgu başlık', 'renkli başlık')) a.ciftRenkBaslik = true;
  // yazı tipi (font)
  if (has('zarif font', 'zarif yazı', 'serif font', 'georgia')) a.font = 'zarif';
  if (has('karışık font', 'şık isim', 'zarif isim')) a.font = 'karisik';
  if (has('modern font', 'modern yazı', 'trebuchet')) a.font = 'modern';
  if (has('klasik serif', 'times')) a.font = 'klasikSerif';
  if (has('klasik font', 'klasik yazı', 'arial')) a.font = 'klasik';
  // zemin tonu
  if (has('arka planı koyulaştır', 'daha koyu', 'koyulaştır', 'koyu arka')) a.zemin = 0.75;
  if (has('arka planı aç', 'aydınlat', 'daha açık', 'açık arka', 'arka plan açık')) a.zemin = 1.28;
  // sade mod (tüm dekoru kaldır)
  if (has('sade', 'minimal', 'süsleri kaldır', 'süssüz', 'düz')) { a.isik = false; a.elmas = false; a.cerceve = false; }
  // tekil dekor kapatma
  if (has('ışık kapat', 'ışık huzmesi kapat', 'huzme kapat', 'ışıksız')) a.isik = false;
  if (has('elmas kaldır', 'elmasları kaldır', 'elmassız', 'parıltı kaldır')) a.elmas = false;
  if (has('çerçeve kaldır', 'çerçeveyi kaldır', 'çerçevesiz', 'köşe kaldır')) a.cerceve = false;
  // içerik gizleme
  if (has('qr kaldır', 'qr gizle', 'qr yok', 'karekod kaldır', 'karekod gizle')) a.qr = false;
  if (has('program gizle', 'program kaldır', 'program yok', 'bant kaldır', 'bant gizle')) a.program = false;
  if (has('tarih gizle', 'tarih kaldır', 'tarih yok', 'tarihi gizle', 'tarihi kaldır')) a.tarih = false;
  // düzen
  if (has('tek sıra', 'tek satır', 'yan yana', 'tek sırada')) a.tekSira = true;
  if (has('2 sütun', 'iki sütun', 'ikili dizilim', 'ikili düzen')) a.duzen = 'iki';
  if (has('3 sütun', 'üç sütun', 'üçlü dizilim', 'üçlü düzen')) a.duzen = 'uc';
  if (has('4 sütun', 'dört sütun', 'dörtlü dizilim', 'dörtlü düzen')) a.duzen = 'dort';
  // ana konuşmacı vurgusu (1. kişi büyük)
  if (has('ana konuşmacı', 'baş konuşmacı', 'ana vurgu', 'ilk büyük')) a.anaVurgu = true;
  // filigran (arka amblem) yoğunluğu
  if (has('filigran belirgin', 'amblem belirgin')) a.filigran = 'belirgin';
  if (has('filigran soluk', 'amblem soluk')) a.filigran = 'soluk';
  if (has('filigran yok', 'amblem yok', 'filigransız')) a.filigran = 'yok';
  // arka plan dokusu
  if (has('düz doku', 'sade doku', 'dokusuz')) a.doku = 'duz';
  if (has('elmas doku', 'elmaslı doku')) a.doku = 'elmas';
  if (has('geometrik doku', 'geometrik')) a.doku = 'geometrik';
  if (has('bokeh', 'ışık topları')) a.doku = 'bokeh';
  // dil
  if (has('ingilizce', 'english', 'en dil')) a.dil = 'en';
  if (has('türkçe', 'turkce')) a.dil = 'tr';
  return a;
};

// Koyu zemin + soluk One Team amblemi + (siyah temada) altın elmas serpiştir.
// dekor = { isik, elmas, cerceve } — tekil dekor kapatma için.
const zeminCiz = async (ctx, W, H, palet, dekor = {}) => {
  const { isik = true, elmas = true, cerceve = true, kurdeleVar = false, filigran = 'normal', doku = null } = dekor;
  // DİKEY ve simetrik gradient (çapraz değil → sol/sağ eşit, "yarısı koyu yarısı açık" olmaz)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, palet.bg1); g.addColorStop(1, palet.bg2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // üstte yumuşak, ORTALI ışık (koyu temada beyaz, açık temada sıcak altın hâle)
  const r = ctx.createRadialGradient(W / 2, H * 0.16, 40, W / 2, H * 0.16, W * 0.85);
  if (palet.acik) { r.addColorStop(0, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); }
  else { r.addColorStop(0, 'rgba(255,255,255,0.08)'); r.addColorStop(1, 'rgba(255,255,255,0)'); }
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H * 0.6);
  // LÜKS: diyagonal altın ışık huzmesi (dinamizm) — kapatılabilir
  if (isik) {
    ctx.save();
    ctx.translate(W * 0.5, H * 0.30); ctx.rotate(-0.34);
    const ray = ctx.createLinearGradient(-W, 0, W, 0);
    ray.addColorStop(0, `rgba(${palet.goldRGB},0)`);
    ray.addColorStop(0.5, `rgba(${palet.goldRGB},0.12)`);
    ray.addColorStop(1, `rgba(${palet.goldRGB},0)`);
    ctx.fillStyle = ray; ctx.fillRect(-W, -H * 0.16, W * 2, H * 0.32);
    ctx.restore();
  }
  // kenar vinyet (derinlik) — koyu temada siyah, açık temada yumuşak sıcak ton
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.72);
  if (palet.acik) { vig.addColorStop(0, 'rgba(150,115,40,0)'); vig.addColorStop(1, 'rgba(150,115,40,0.12)'); }
  else { vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.42)'); }
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  // ── ARKA PLAN DOKUSU ──
  // doku seçilmişse onu uygula; değilse varsayılan (siyah temada elmas) davranışı.
  const dokuEtkin = doku || ((palet.elmas && elmas) ? 'elmas' : 'duz');
  if (dokuEtkin === 'elmas') {
    ctx.save();
    const noktalar = [[0.08,0.06],[0.2,0.03],[0.32,0.08],[0.7,0.04],[0.84,0.09],[0.92,0.05],[0.14,0.13],[0.88,0.16],[0.05,0.2],[0.95,0.24]];
    noktalar.forEach(([px, py], i) => {
      const cx = px * W, cy = py * H, s = (i % 3 === 0 ? 10 : 6);
      ctx.fillStyle = `rgba(${palet.goldRGB},${0.5 - (i % 4) * 0.08})`;
      ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.rotate(-Math.PI / 4); ctx.translate(-cx, -cy);
    });
    ctx.restore();
  } else if (dokuEtkin === 'geometrik') {
    // ince eşkenar üçgen/çizgi dokusu (üst bölge)
    ctx.save();
    ctx.strokeStyle = `rgba(${palet.goldRGB},0.10)`; ctx.lineWidth = 1.5;
    const adim = W * 0.11;
    for (let x = -H; x < W; x += adim) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H * 0.55, H * 0.55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, H * 0.55); ctx.lineTo(x + H * 0.55, 0); ctx.stroke();
    }
    ctx.restore();
  } else if (dokuEtkin === 'bokeh') {
    // yumuşak altın ışık topları
    ctx.save();
    const toplar = [[0.18,0.1,0.09],[0.8,0.08,0.07],[0.32,0.22,0.05],[0.9,0.2,0.06],[0.08,0.28,0.05],[0.66,0.16,0.045]];
    toplar.forEach(([px, py, rr]) => {
      const cx = px * W, cy = py * H, R = rr * W;
      const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gg.addColorStop(0, `rgba(${palet.goldRGB},0.22)`); gg.addColorStop(1, `rgba(${palet.goldRGB},0)`);
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  // 'duz' → ek doku yok
  // büyük soluk One Team amblemi (orta-üst watermark) — yoğunluk ayarlı
  const filigranBaz = palet.acik ? 0.05 : (palet.ad === 'siyah' ? 0.10 : 0.08);
  const filigranAlpha = filigran === 'yok' ? 0 : filigran === 'soluk' ? filigranBaz * 0.5 : filigran === 'belirgin' ? Math.min(filigranBaz * 2.2, 0.22) : filigranBaz;
  if (filigranAlpha > 0) {
    try {
      const logo = await urlToImage('/logos/oneteam-logo.png');
      const lw = W * 0.62, lh = lw * (logo.height / logo.width);
      ctx.save(); ctx.globalAlpha = filigranAlpha;
      ctx.drawImage(logo, (W - lw) / 2, H * 0.30, lw, lh);
      ctx.restore();
    } catch {}
  }
  // LÜKS: köşe altın çerçeve aksanları (premium his) — kapatılabilir
  if (cerceve) {
    ctx.strokeStyle = palet.gold; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
    const cm = Math.round(W * 0.045), cl = Math.round(W * 0.075);
    const kose = (x, y, dx, dy) => { ctx.beginPath(); ctx.moveTo(x + dx * cl, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * cl); ctx.stroke(); };
    kose(cm, cm, 1, 1); if (!kurdeleVar) kose(W - cm, cm, -1, 1); kose(cm, H - cm, 1, -1); kose(W - cm, H - cm, -1, -1);
    ctx.globalAlpha = 1;
  }
};

// Altın hap içinde metin (referanslardaki isim etiketi). Dönüş: alt Y.
const altinHap = (ctx, cx, y, text, fontSize, palet, fontAd = 'Arial') => {
  ctx.font = `800 ${fontSize}px ${fontAd}`;
  const tw = ctx.measureText((text || '').toLocaleUpperCase('tr-TR')).width;
  const h = Math.round(fontSize * 1.7), padX = Math.round(fontSize * 0.7);
  const w = tw + padX * 2;
  ctx.fillStyle = palet.gold;
  roundRect(ctx, cx - w / 2, y, w, h, Math.round(h * 0.28)); ctx.fill();
  ctx.fillStyle = palet.pillText;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((text || '').toLocaleUpperCase('tr-TR'), cx, y + h / 2);
  ctx.textBaseline = 'alphabetic';
  return y + h;
};

export const gorselOlusturMarkaAfis = async ({ egitim, egitmenler = [], format = 'portrait', ekPrompt = '', stil = null, altNot = '', baslik = '' }) => {
  // Marka Afiş HER ZAMAN dikey (kare/story selektöründen bağımsız) — referanslar dikey,
  // kare alan fotoları sıkıştırıyordu.
  const W = 1080, H = 1350;
  const ayar = ayarCikar(ekPrompt); // "Tasarıma ek istek" → deterministik ayar
  // Palet: stil kilitli ise onu kullan (Marka Koyu/Açık), değilse kategoriye göre otomatik
  let palet;
  if (stil === 'koyu') palet = paletKoyu();
  else if (stil === 'acik') palet = paletAcik();
  else palet = paletSec(egitim);
  // tema zorlaması (ek istek) — yalnız otomatik (kilitsiz) modda
  if (!stil && ayar.tema) {
    const yeni = paletAdla(ayar.tema);
    if (yeni) palet = yeni();
  }
  // zemin tonu (koyulaştır / aç)
  if (ayar.zemin !== 1) {
    palet.bg1 = renkAyarla(palet.bg1, ayar.zemin);
    palet.bg2 = renkAyarla(palet.bg2, ayar.zemin);
  }
  // yazı tipi seti (başlık / isim / gövde)
  const FF = fontSec(ayar.font);
  const fiziki = isFiziki(egitim);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const M = Math.round(W * 0.07);

  await zeminCiz(ctx, W, H, palet, { isik: ayar.isik, elmas: ayar.elmas, cerceve: ayar.cerceve, kurdeleVar: !!ayar.kurdele, filigran: ayar.filigran, doku: ayar.doku });

  // ── ÜST: One Team logosu ──
  let y = Math.round(H * 0.02);
  try {
    const logo = await urlToImage('/logos/oneteam-logo.png');
    const lh = Math.round(H * 0.055), lw = lh * (logo.width / logo.height);
    ctx.drawImage(logo, (W - lw) / 2, y, lw, lh);
    y += lh + Math.round(H * 0.025);
  } catch { y += Math.round(H * 0.05); }

  // ── KATEGORİ ROZETİ (başlığın üstünde küçük altın etiket) ──
  const katEtiket = (egitim.etkinlikTuru || egitim.kategori || '').trim();
  if (katEtiket) {
    const kSize = Math.round(W * 0.026 * ayar.yazi);
    y = altinHap(ctx, W / 2, y, katEtiket, kSize, palet, FF.govde) + Math.round(H * 0.012);
  }

  // ── BAŞLIK ──
  ctx.textAlign = 'center';
  ctx.fillStyle = palet.metin;
  const tSize = Math.round(W * 0.072 * ayar.yazi);
  ctx.font = `800 ${tSize}px ${FF.baslik}`;
  ctx.shadowColor = palet.acik ? 'rgba(120,90,30,0.18)' : 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
  y = basligiCiz(ctx, ((baslik || egitim.egitim) || '').toLocaleUpperCase('tr-TR'), W / 2, y + tSize, W - M * 2, tSize * 1.05, 4, palet.metin, palet.gold, ayar.ciftRenkBaslik);
  ctx.shadowBlur = 0;
  // başlık altı altın aksan çizgisi (parıltılı uçlar) — modern dokunuş
  y += Math.round(H * 0.006);
  const akcW = Math.round(W * 0.16);
  const akc = ctx.createLinearGradient(W / 2 - akcW, 0, W / 2 + akcW, 0);
  akc.addColorStop(0, `rgba(${palet.goldRGB},0)`); akc.addColorStop(0.5, palet.gold); akc.addColorStop(1, `rgba(${palet.goldRGB},0)`);
  ctx.fillStyle = akc; ctx.fillRect(W / 2 - akcW, y, akcW * 2, 3);
  y += Math.round(H * 0.012);

  // ── Altın şehir rozeti (fiziki) ──
  if (fiziki && egitim.sehir) {
    y += Math.round(H * 0.005);
    y = altinHap(ctx, W / 2, y, egitim.sehir, Math.round(W * 0.034 * ayar.yazi), palet, FF.govde) + Math.round(H * 0.012);
  } else {
    y += Math.round(H * 0.018);
  }

  // ── Tarih + Saat ── (gizlenebilir, takvim/saat ikonlu)
  if (ayar.tarih) {
    ctx.textAlign = 'left';
    const tFont = Math.round(W * 0.038 * ayar.yazi);
    ctx.font = `700 ${tFont}px ${FF.govde}`;
    const tarihTxt = `${egitim.tarih || ''} ${gunCevir(egitim.gun, ayar.dil) || ''}`.trim();
    const ikS = Math.round(tFont * 0.95), gap = Math.round(W * 0.012);
    const tw = ctx.measureText(tarihTxt).width;
    const tBaseY = y + Math.round(W * 0.036);
    const tStartX = W / 2 - (tw + ikS + gap) / 2;
    ikonCiz(ctx, 'takvim', tStartX + ikS / 2, tBaseY - tFont * 0.35, ikS, palet.gold);
    ctx.fillStyle = palet.gold; ctx.fillText(tarihTxt, tStartX + ikS + gap, tBaseY);
    y += Math.round(W * 0.055);
    if (egitim.saat) {
      const sFont = Math.round(W * 0.032 * ayar.yazi);
      ctx.font = `600 ${sFont}px ${FF.govde}`;
      const saatTxt = `${egitim.saat}${egitim.bitisSaati ? ' - ' + egitim.bitisSaati : ''}`;
      const sik = Math.round(sFont * 0.95), sBaseY = y + Math.round(W * 0.03);
      const sw = ctx.measureText(saatTxt).width;
      const sStartX = W / 2 - (sw + sik + gap) / 2;
      ikonCiz(ctx, 'saat', sStartX + sik / 2, sBaseY - sFont * 0.35, sik, palet.gold);
      ctx.fillStyle = palet.metin; ctx.fillText(saatTxt, sStartX + sik + gap, sBaseY);
      y += Math.round(W * 0.05);
    }
    ctx.textAlign = 'center';
  }

  // ── ZONE: program bandı + footer rezervi ──
  const prog = (Array.isArray(egitim.programAkisi) ? egitim.programAkisi : []).filter(p => p && (p.baslik || p.baslangic));
  // Alt not / uyarı satırları (kullanıcının serbest metni) — en fazla 3 satır
  const notSatirlari = String(altNot || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
  const footerH = Math.round(H * (0.135 + (notSatirlari.length ? 0.03 * notSatirlari.length : 0)));
  const footerTop = H - footerH;
  const bandH = (fiziki && prog.length && ayar.program) ? Math.round(H * 0.085) : 0;
  const bandTop = bandH ? footerTop - bandH - Math.round(H * 0.02) : footerTop;
  const speakersTop = y + Math.round(H * 0.01);
  const speakersBottom = bandTop - Math.round(H * 0.02);

  // ── KONUŞMACILAR (altın halkalı foto + altın hap isim + rol) ──
  const liste = (egitmenler || []).slice(0, 12); // 6→12 (daha fazla konuşmacı)
  if (liste.length) {
    // Yerleşim düzeni: tek sıra / ana konuşmacı / N'li sütun / otomatik
    const perMap = { iki: 2, uc: 3, dort: 4 };
    const chunkRows = (n, per) => { const a = []; let kalan = n; while (kalan > 0) { a.push(Math.min(per, kalan)); kalan -= per; } return a; };
    const dagilim = ayar.tekSira
      ? [liste.length]
      : (ayar.anaVurgu && liste.length > 1)
        ? [1, ...fotoYerlesim(liste.length - 1)]
        : (ayar.duzen && perMap[ayar.duzen])
          ? chunkRows(liste.length, perMap[ayar.duzen])
          : fotoYerlesim(liste.length);
    const rows = dagilim.length;
    const areaH = speakersBottom - speakersTop;
    const perRowH = areaH / rows;
    // Hücre genişliği: en kalabalık satıra göre TUTARLI (eşit boyut), satırlar ortalı.
    // Ana vurgu modunda 1. satır (tek kişi) hariç tutulur → o satır dev oval kalır.
    const sidePad = Math.round(W * 0.035);
    const boyutAdetler = (ayar.anaVurgu && rows > 1) ? dagilim.slice(1) : dagilim;
    const maxAdet = Math.max(1, ...boyutAdetler);
    const cellW = (W - sidePad * 2) / maxAdet;
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const adet = dagilim[r];
      const rowY = speakersTop + r * perRowH;
      // ana vurgu 1. satır → daha geniş hücre (dev oval); diğerleri tutarlı cellW
      const buCellW = (ayar.anaVurgu && r === 0 && rows > 1) ? Math.round(W * 0.5) : cellW;
      const startX = Math.round((W - adet * buCellW) / 2); // satırı ortala
      // ORANLAMA (bütçe-bazlı): satır = topPad + foto + g1 + isim hapı + g2 + rol.
      const nameSize = Math.round(Math.max(15, Math.min(Math.round(buCellW * 0.048), 26)) * ayar.yazi);
      const roleSize = Math.round(Math.max(12, Math.min(Math.round(buCellW * 0.038), 18)) * ayar.yazi);
      const pillH = Math.round(nameSize * 1.7);
      const topPad = Math.round(perRowH * 0.04);
      const g1 = Math.round(perRowH * 0.035);
      const g2 = Math.round(perRowH * 0.02);
      let foto = Math.round(perRowH * 0.93) - topPad - g1 - pillH - g2 - roleSize;
      foto = Math.round(foto * ayar.foto);
      const wTavan = (ayar.anaVurgu && r === 0 && rows > 1) ? 0.6 : (maxAdet === 1 ? 0.6 : maxAdet === 2 ? 0.5 : 0.46);
      foto = Math.max(80, Math.min(foto, Math.round(buCellW * 0.86), Math.round(W * wTavan)));
      for (let c = 0; c < adet; c++, idx++) {
        const e = liste[idx];
        const cx = startX + buCellW * c + buCellW / 2;
        const fy = rowY + topPad + foto / 2;
        // yumuşak altın ışıltı (derinlik / modern his)
        const gl = ctx.createRadialGradient(cx, fy, foto * 0.32, cx, fy, foto * 0.88);
        gl.addColorStop(0, `rgba(${palet.goldRGB},0.32)`); gl.addColorStop(1, `rgba(${palet.goldRGB},0)`);
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(cx, fy, foto * 0.88, 0, Math.PI * 2); ctx.fill();
        // altın halka + foto (gölgeli → ön plan hissi)
        ctx.save();
        ctx.shadowColor = palet.acik ? 'rgba(120,90,30,0.35)' : 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = Math.round(foto * 0.12);
        ctx.shadowOffsetY = Math.round(foto * 0.04);
        cizYol(ctx, cx, fy, foto / 2 + 7, ayar.fotoSekil);
        ctx.fillStyle = palet.gold; ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        cizYol(ctx, cx, fy, foto / 2 + 2, ayar.fotoSekil);
        ctx.fillStyle = palet.bg2; ctx.fill();
        cizYol(ctx, cx, fy, foto / 2, ayar.fotoSekil); ctx.clip();
        if (e.fotoURL) {
          try {
            const im = await urlToImage(e.fotoURL);
            const md = Math.min(im.width, im.height);
            // yüz-merkezli kırpma: üstten biraz pay bırak (yüzler genelde üst bölgede → kesilmez)
            const sx = (im.width - md) / 2;
            const sy = Math.max(0, (im.height - md) * 0.2);
            ctx.drawImage(im, sx, sy, md, md, cx - foto / 2, fy - foto / 2, foto, foto);
          } catch { ctx.fillStyle = '#888'; ctx.fillRect(cx - foto / 2, fy - foto / 2, foto, foto); }
        } else { ctx.fillStyle = '#888'; ctx.fillRect(cx - foto / 2, fy - foto / 2, foto, foto); }
        ctx.restore();
        // isim — altın hap, fotonun ALTINDA (çakışma yok) — şık isim fontu
        const hapBottom = altinHap(ctx, cx, fy + foto / 2 + g1, e.ad || '', nameSize, palet, FF.isim);
        // rol — hapın altında
        if (e.unvan) {
          ctx.fillStyle = palet.alt;
          ctx.font = `500 ${roleSize}px ${FF.govde}`;
          ctx.textAlign = 'center';
          ctx.fillText(e.unvan, cx, hapBottom + g2 + roleSize, buCellW * 0.98);
        }
      }
    }
  }

  // ── PROGRAM BANDI (altın saat hapları) ──
  if (bandH) {
    const n = Math.min(prog.length, 3);
    const cellW = (W - M * 2) / n;
    for (let i = 0; i < n; i++) {
      const p = prog[i];
      const cx = M + cellW * i + cellW / 2;
      const saat = [p.baslangic, p.bitis].filter(Boolean).join(' - ');
      const sh = Math.round(H * 0.035);
      // saat hapı (altın çerçeve) — YALNIZ saat girilmişse (boş daire çizme)
      if (saat) {
        ctx.font = `700 ${Math.round(W * 0.026)}px ${FF.govde}`;
        const sw = ctx.measureText(saat).width + Math.round(W * 0.04);
        ctx.strokeStyle = palet.gold; ctx.lineWidth = 2; ctx.fillStyle = `rgba(${palet.goldRGB},0.12)`;
        roundRect(ctx, cx - sw / 2, bandTop, sw, sh, sh / 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = palet.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(saat, cx, bandTop + sh / 2); ctx.textBaseline = 'alphabetic';
      }
      // aktivite — saat varsa hapın altında, yoksa bandın üstünde (boşluk bırakma)
      ctx.fillStyle = palet.metin;
      ctx.font = `600 ${Math.round(W * 0.022)}px ${FF.govde}`;
      const aktY = saat ? bandTop + sh + Math.round(W * 0.028) : bandTop + Math.round(W * 0.026);
      wrapText(ctx, (p.baslik || '').toLocaleUpperCase('tr-TR'), cx, aktY, cellW * 0.92, Math.round(W * 0.026), 2);
    }
  }

  // ── ALT: adres (fiziki) / ZOOM (online) + amare logosu ──
  // QR ölçüleri önceden hesap (adres metni QR'ın soluna sığsın → çakışma yok)
  const qrVar = fiziki && ayar.qr;
  const qs = Math.round(W * 0.1), qpad = Math.round(W * 0.03);
  const qrSol = W - qs - qpad; // QR sol kenarı
  // Metin alanı: QR varsa onun soluna kadar; yoksa tam genişlik
  const metinSagSinir = qrVar ? qrSol - Math.round(W * 0.025) : W - M;
  const adresCX = qrVar ? Math.round((M + metinSagSinir) / 2) : Math.round(W / 2);
  const adresW = qrVar ? (metinSagSinir - M) : (W - M * 2);
  ctx.textAlign = 'center';
  if (fiziki) {
    const mekan = (egitim.mekanAdi || egitim.sehir || '').toLocaleUpperCase('tr-TR');
    if (mekan) {
      ctx.fillStyle = palet.gold; ctx.font = `800 ${Math.round(W * 0.03)}px ${FF.govde}`;
      ctx.fillText(mekan, adresCX, footerTop + Math.round(H * 0.026), adresW);
    }
    // Adres: acikAdres yoksa "yer" alanına düş (çoğu fiziki etkinlikte adres yer'de)
    const adresMetni = (egitim.acikAdres || egitim.yer || '').trim();
    if (adresMetni) {
      ctx.fillStyle = palet.alt; ctx.font = `400 ${Math.round(W * 0.021)}px ${FF.govde}`;
      // uzun adres → 2 satır (QR'ın soluna sığacak genişlikte)
      wrapText(ctx, adresMetni, adresCX, footerTop + Math.round(H * 0.05), adresW, Math.round(W * 0.026), 2);
    }
  } else {
    const zoom = (egitim.yer || '').replace(/zoom\s*salon\s*id[:\s]*/i, '').trim();
    const zPill = `ZOOM SALON ID: ${zoom || egitim.yer || ''}`;
    ctx.font = `800 ${Math.round(W * 0.03)}px ${FF.govde}`;
    const zw = ctx.measureText(zPill).width + Math.round(W * 0.06);
    const zh = Math.round(H * 0.05);
    ctx.fillStyle = palet.gold;
    roundRect(ctx, (W - zw) / 2, footerTop + Math.round(H * 0.01), zw, zh, zh / 2); ctx.fill();
    ctx.fillStyle = palet.pillText; ctx.textBaseline = 'middle';
    ctx.fillText(zPill, W / 2, footerTop + Math.round(H * 0.01) + zh / 2);
    ctx.textBaseline = 'alphabetic';
  }
  // ── ALT NOT / UYARI (kullanıcının serbest metni) — amare logosunun üstünde ──
  if (notSatirlari.length) {
    const uyariRenk = palet.acik ? '#9c2b2b' : '#f0b3b3'; // soft kırmızı (uyarı hissi)
    const nlH = Math.round(W * 0.026);
    const amareUst = H - Math.round(H * 0.032) - Math.round(H * 0.018);
    const baslangic = amareUst - notSatirlari.length * nlH - Math.round(H * 0.006);
    ctx.textAlign = 'center';
    ctx.font = `600 ${Math.round(W * 0.021)}px ${FF.govde}`;
    notSatirlari.forEach((ln, i) => {
      ctx.fillStyle = uyariRenk;
      ctx.fillText(ln, adresCX, baslangic + (i + 1) * nlH, adresW);
    });
  }

  // amare logosu (en alt orta) — HER ZAMAN düzgün yatay beyaz logo (1426x292).
  // (Purple dosyası kare/boşluklu olduğu için kullanılmaz.) Açık temada koyuya boyanır.
  try {
    const amare = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
    const ah = Math.round(H * 0.032), aw = Math.round(ah * (amare.width / amare.height));
    const ax = Math.round((W - aw) / 2), ay = H - ah - Math.round(H * 0.018);
    if (palet.acik) {
      // beyaz logoyu koyu renge boya (krem zeminde görünür olsun)
      const oc = document.createElement('canvas'); oc.width = aw; oc.height = ah;
      const octx = oc.getContext('2d');
      octx.drawImage(amare, 0, 0, aw, ah);
      octx.globalCompositeOperation = 'source-in';
      octx.fillStyle = palet.metin; octx.fillRect(0, 0, aw, ah);
      ctx.drawImage(oc, ax, ay, aw, ah);
    } else {
      ctx.drawImage(amare, ax, ay, aw, ah);
    }
  } catch {}

  // QR (fiziki) sağ alt — gizlenebilir. Adres varsa GOOGLE MAPS'e yönlendirir,
  // yoksa etkinlik detay sayfasına düşer.
  if (qrVar) {
    const adresSorgu = [egitim.mekanAdi, (egitim.acikAdres || egitim.yer || ''), egitim.sehir].filter(Boolean).join(' ').trim();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const qrHedef = adresSorgu
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresSorgu)}`
      : `${origin}/e/${egitim.id || ''}`;
    const qr = await qrOlustur(qrHedef);
    if (qr) {
      try {
        const qi = await urlToImage(qr);
        const qx = qrSol, qy = H - qs - qpad, b = Math.round(qs * 0.06);
        ctx.fillStyle = '#fff'; ctx.fillRect(qx - b, qy - b, qs + 2 * b, qs + 2 * b);
        ctx.drawImage(qi, qx, qy, qs, qs);
      } catch {}
    }
  }

  // ── KÖŞE KURDELE/ŞERİT (sağ üst) — en üstte çizilir ──
  if (ayar.kurdele) kurdeleCiz(ctx, W, ayar.kurdele, palet);

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
};
