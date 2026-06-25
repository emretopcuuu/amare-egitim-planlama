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

// Hazır paletler
const paletKoyu = () => ({ ad: 'siyah', bg1: '#0b0b0d', bg2: '#17120a', gold: '#d8b15a', goldKoyu: '#b8923f', pillText: '#2a1c06', metin: '#ffffff', alt: '#d9d6cf', elmas: true, acik: false });
const paletMor = () => ({ ad: 'mor', bg1: '#3a2b54', bg2: '#211633', gold: '#d8b15a', goldKoyu: '#b8923f', pillText: '#2a1c06', metin: '#ffffff', alt: '#e7e0f0', elmas: false, acik: false });
// Açık/lüks krem-altın palet (referans 2)
const paletAcik = () => ({ ad: 'acik', bg1: '#f7f1e4', bg2: '#ece0c8', gold: '#c69a3f', goldKoyu: '#9c7426', pillText: '#2a1f08', metin: '#241c10', alt: '#6b5d44', elmas: false, acik: true });
// Ek koyu temalar — hepsi altın aksanlı (mevcut altın dekorla uyumlu), sadece zemin değişir
const paletLacivert = () => ({ ad: 'lacivert', bg1: '#0c1730', bg2: '#070f20', gold: '#d8b15a', goldKoyu: '#b8923f', pillText: '#2a1c06', metin: '#ffffff', alt: '#cdd6e6', elmas: true, acik: false });
const paletBordo = () => ({ ad: 'bordo', bg1: '#2c0e13', bg2: '#1a070a', gold: '#dcb866', goldKoyu: '#b8923f', pillText: '#2a1206', metin: '#ffffff', alt: '#e7cfd2', elmas: true, acik: false });
const paletZumrut = () => ({ ad: 'zumrut', bg1: '#0a261d', bg2: '#061a13', gold: '#d8b15a', goldKoyu: '#b8923f', pillText: '#0a1c14', metin: '#ffffff', alt: '#c8e0d4', elmas: true, acik: false });
// İsimle palet getir (tema çipi / ek istek)
const paletAdla = (ad) => ({ siyah: paletKoyu, mor: paletMor, acik: paletAcik, lacivert: paletLacivert, bordo: paletBordo, zumrut: paletZumrut }[ad] || null);

// Yazı tipi setleri — başlık / isim / gövde ayrı olabilir (isimlere şık font)
const FONT_SETLERI = {
  klasik: { baslik: 'Arial', isim: 'Arial', govde: 'Arial' },
  zarif: { baslik: 'Georgia', isim: 'Georgia', govde: 'Georgia' },
  karisik: { baslik: 'Arial', isim: 'Georgia', govde: 'Arial' }, // güçlü başlık + zarif isim
  modern: { baslik: '"Trebuchet MS"', isim: '"Trebuchet MS"', govde: '"Trebuchet MS"' },
  klasikSerif: { baslik: '"Times New Roman"', isim: 'Georgia', govde: 'Georgia' },
};
const fontSec = (ad) => FONT_SETLERI[ad] || FONT_SETLERI.klasik;

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
const ayarCikar = (ek) => {
  const t = (ek || '').toLocaleLowerCase('tr-TR');
  // bayraklar: dekor + içerik açık varsayılan
  const a = {
    yazi: 1, foto: 1, tema: null, zemin: 1, font: null,
    isik: true, elmas: true, cerceve: true, // dekor
    qr: true, program: true, tarih: true,   // içerik
    tekSira: false,
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
  return a;
};

// Koyu zemin + soluk One Team amblemi + (siyah temada) altın elmas serpiştir.
// dekor = { isik, elmas, cerceve } — tekil dekor kapatma için.
const zeminCiz = async (ctx, W, H, palet, dekor = {}) => {
  const { isik = true, elmas = true, cerceve = true } = dekor;
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
    ray.addColorStop(0, 'rgba(216,177,90,0)');
    ray.addColorStop(0.5, 'rgba(216,177,90,0.12)');
    ray.addColorStop(1, 'rgba(216,177,90,0)');
    ctx.fillStyle = ray; ctx.fillRect(-W, -H * 0.16, W * 2, H * 0.32);
    ctx.restore();
  }
  // kenar vinyet (derinlik) — koyu temada siyah, açık temada yumuşak sıcak ton
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.72);
  if (palet.acik) { vig.addColorStop(0, 'rgba(150,115,40,0)'); vig.addColorStop(1, 'rgba(150,115,40,0.12)'); }
  else { vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.42)'); }
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  // siyah temada altın elmas/parıltı serpiştir (üst bölge)
  if (palet.elmas && elmas) {
    ctx.save();
    const noktalar = [[0.08,0.06],[0.2,0.03],[0.32,0.08],[0.7,0.04],[0.84,0.09],[0.92,0.05],[0.14,0.13],[0.88,0.16],[0.05,0.2],[0.95,0.24]];
    noktalar.forEach(([px, py], i) => {
      const cx = px * W, cy = py * H, s = (i % 3 === 0 ? 10 : 6);
      ctx.fillStyle = `rgba(216,177,90,${0.5 - (i % 4) * 0.08})`;
      ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.rotate(-Math.PI / 4); ctx.translate(-cx, -cy);
    });
    ctx.restore();
  }
  // büyük soluk One Team amblemi (orta-üst watermark)
  try {
    const logo = await urlToImage('/logos/oneteam-logo.png');
    const lw = W * 0.62, lh = lw * (logo.height / logo.width);
    ctx.save(); ctx.globalAlpha = palet.acik ? 0.05 : (palet.ad === 'siyah' ? 0.10 : 0.08);
    ctx.drawImage(logo, (W - lw) / 2, H * 0.30, lw, lh);
    ctx.restore();
  } catch {}
  // LÜKS: köşe altın çerçeve aksanları (premium his) — kapatılabilir
  if (cerceve) {
    ctx.strokeStyle = palet.gold; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
    const cm = Math.round(W * 0.045), cl = Math.round(W * 0.075);
    const kose = (x, y, dx, dy) => { ctx.beginPath(); ctx.moveTo(x + dx * cl, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * cl); ctx.stroke(); };
    kose(cm, cm, 1, 1); kose(W - cm, cm, -1, 1); kose(cm, H - cm, 1, -1); kose(W - cm, H - cm, -1, -1);
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

export const gorselOlusturMarkaAfis = async ({ egitim, egitmenler = [], format = 'portrait', ekPrompt = '', stil = null }) => {
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

  await zeminCiz(ctx, W, H, palet, { isik: ayar.isik, elmas: ayar.elmas, cerceve: ayar.cerceve });

  // ── ÜST: One Team logosu ──
  let y = Math.round(H * 0.02);
  try {
    const logo = await urlToImage('/logos/oneteam-logo.png');
    const lh = Math.round(H * 0.055), lw = lh * (logo.width / logo.height);
    ctx.drawImage(logo, (W - lw) / 2, y, lw, lh);
    y += lh + Math.round(H * 0.025);
  } catch { y += Math.round(H * 0.05); }

  // ── BAŞLIK ──
  ctx.textAlign = 'center';
  ctx.fillStyle = palet.metin;
  const tSize = Math.round(W * 0.072 * ayar.yazi);
  ctx.font = `800 ${tSize}px ${FF.baslik}`;
  ctx.shadowColor = palet.acik ? 'rgba(120,90,30,0.18)' : 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
  y = wrapText(ctx, (egitim.egitim || '').toLocaleUpperCase('tr-TR'), W / 2, y + tSize, W - M * 2, tSize * 1.05, 4);
  ctx.shadowBlur = 0;
  // başlık altı altın aksan çizgisi (parıltılı uçlar) — modern dokunuş
  y += Math.round(H * 0.006);
  const akcW = Math.round(W * 0.16);
  const akc = ctx.createLinearGradient(W / 2 - akcW, 0, W / 2 + akcW, 0);
  akc.addColorStop(0, 'rgba(216,177,90,0)'); akc.addColorStop(0.5, palet.gold); akc.addColorStop(1, 'rgba(216,177,90,0)');
  ctx.fillStyle = akc; ctx.fillRect(W / 2 - akcW, y, akcW * 2, 3);
  y += Math.round(H * 0.012);

  // ── Altın şehir rozeti (fiziki) ──
  if (fiziki && egitim.sehir) {
    y += Math.round(H * 0.005);
    y = altinHap(ctx, W / 2, y, egitim.sehir, Math.round(W * 0.034 * ayar.yazi), palet, FF.govde) + Math.round(H * 0.012);
  } else {
    y += Math.round(H * 0.018);
  }

  // ── Tarih + Saat ── (gizlenebilir)
  if (ayar.tarih) {
    ctx.fillStyle = palet.gold;
    ctx.font = `700 ${Math.round(W * 0.038 * ayar.yazi)}px ${FF.govde}`;
    const tarihTxt = `${egitim.tarih || ''} ${egitim.gun || ''}`.trim();
    ctx.fillText(tarihTxt, W / 2, y + Math.round(W * 0.036));
    y += Math.round(W * 0.055);
    if (egitim.saat) {
      ctx.fillStyle = palet.metin;
      ctx.font = `600 ${Math.round(W * 0.032 * ayar.yazi)}px ${FF.govde}`;
      ctx.fillText(`${egitim.saat}${egitim.bitisSaati ? ' - ' + egitim.bitisSaati : ''}`, W / 2, y + Math.round(W * 0.03));
      y += Math.round(W * 0.05);
    }
  }

  // ── ZONE: program bandı + footer rezervi ──
  const prog = (Array.isArray(egitim.programAkisi) ? egitim.programAkisi : []).filter(p => p && (p.baslik || p.baslangic));
  const footerH = Math.round(H * 0.135);
  const footerTop = H - footerH;
  const bandH = (fiziki && prog.length && ayar.program) ? Math.round(H * 0.085) : 0;
  const bandTop = bandH ? footerTop - bandH - Math.round(H * 0.02) : footerTop;
  const speakersTop = y + Math.round(H * 0.01);
  const speakersBottom = bandTop - Math.round(H * 0.02);

  // ── KONUŞMACILAR (altın halkalı foto + altın hap isim + rol) ──
  const liste = (egitmenler || []).slice(0, 6);
  if (liste.length) {
    const dagilim = ayar.tekSira ? [liste.length] : fotoYerlesim(liste.length);
    const rows = dagilim.length;
    const areaH = speakersBottom - speakersTop;
    const perRowH = areaH / rows;
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const adet = dagilim[r];
      const sidePad = Math.round(W * 0.035);
      const cellW = (W - sidePad * 2) / adet;
      const rowY = speakersTop + r * perRowH;
      // ORANLAMA (bütçe-bazlı): satır = topPad + foto + g1 + isim hapı + g2 + rol.
      // foto kalan yere göre hesaplanır → asla çakışmaz, foto mümkün olduğunca büyük.
      const nameSize = Math.round(Math.max(15, Math.min(Math.round(cellW * 0.048), 26)) * ayar.yazi);
      const roleSize = Math.round(Math.max(12, Math.min(Math.round(cellW * 0.038), 18)) * ayar.yazi);
      const pillH = Math.round(nameSize * 1.7);
      const topPad = Math.round(perRowH * 0.04);
      const g1 = Math.round(perRowH * 0.035);
      const g2 = Math.round(perRowH * 0.02);
      let foto = Math.round(perRowH * 0.93) - topPad - g1 - pillH - g2 - roleSize;
      foto = Math.round(foto * ayar.foto);
      foto = Math.max(90, Math.min(foto, Math.round(cellW * 0.86), Math.round(W * 0.46)));
      for (let c = 0; c < adet; c++, idx++) {
        const e = liste[idx];
        const cx = sidePad + cellW * c + cellW / 2;
        const fy = rowY + topPad + foto / 2;
        // yumuşak altın ışıltı (derinlik / modern his)
        const gl = ctx.createRadialGradient(cx, fy, foto * 0.32, cx, fy, foto * 0.88);
        gl.addColorStop(0, 'rgba(216,177,90,0.32)'); gl.addColorStop(1, 'rgba(216,177,90,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(cx, fy, foto * 0.88, 0, Math.PI * 2); ctx.fill();
        // altın halka + foto (gölgeli → ön plan hissi)
        ctx.save();
        ctx.shadowColor = palet.acik ? 'rgba(120,90,30,0.35)' : 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = Math.round(foto * 0.12);
        ctx.shadowOffsetY = Math.round(foto * 0.04);
        ctx.beginPath(); ctx.arc(cx, fy, foto / 2 + 7, 0, Math.PI * 2);
        ctx.fillStyle = palet.gold; ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.beginPath(); ctx.arc(cx, fy, foto / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = palet.bg2; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, fy, foto / 2, 0, Math.PI * 2); ctx.clip();
        if (e.fotoURL) {
          try {
            const im = await urlToImage(e.fotoURL);
            const md = Math.min(im.width, im.height);
            ctx.drawImage(im, (im.width - md) / 2, (im.height - md) / 2, md, md, cx - foto / 2, fy - foto / 2, foto, foto);
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
          ctx.fillText(e.unvan, cx, hapBottom + g2 + roleSize, cellW * 0.98);
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
        ctx.strokeStyle = palet.gold; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(216,177,90,0.12)';
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
    if (egitim.acikAdres) {
      ctx.fillStyle = palet.alt; ctx.font = `400 ${Math.round(W * 0.021)}px ${FF.govde}`;
      // uzun adres → 2 satır (QR'ın soluna sığacak genişlikte)
      wrapText(ctx, egitim.acikAdres, adresCX, footerTop + Math.round(H * 0.05), adresW, Math.round(W * 0.026), 2);
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
  // amare logosu (en alt orta) — açık temada koyu (mor) varyant, koyu temada beyaz
  try {
    const amare = await urlToImage(palet.acik ? '/logos/AmareBPLogo-Horizontal-Purple-TR.png' : '/logos/AmareBPLogo-Horizontal-White-TR.png');
    const ah = Math.round(H * 0.03), aw = ah * (amare.width / amare.height);
    ctx.drawImage(amare, (W - aw) / 2, H - ah - Math.round(H * 0.018), aw, ah);
  } catch {}

  // QR (fiziki) sağ alt — gizlenebilir (ölçüler footer'da hesaplandı)
  if (qrVar) {
    const qr = await qrOlustur(`${typeof window !== 'undefined' ? window.location.origin : ''}/e/${egitim.id || ''}`);
    if (qr) {
      try {
        const qi = await urlToImage(qr);
        const qx = qrSol, qy = H - qs - qpad, b = Math.round(qs * 0.06);
        ctx.fillStyle = '#fff'; ctx.fillRect(qx - b, qy - b, qs + 2 * b, qs + 2 * b);
        ctx.drawImage(qi, qx, qy, qs, qs);
      } catch {}
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
};
