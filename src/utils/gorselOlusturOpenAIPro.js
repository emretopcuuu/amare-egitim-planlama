// OpenAI Pro: gpt-image-2 ile TAM AI poster üretimi
// - Şablon + speaker fotoları pre-composite edilir referans olarak
// - gpt-image-2 /v1/images/edits ile başlık/tarih/yer dahil her şeyi AI çizer
// - gpt-image-2 multilingual text rendering Türkçe karakterleri doğru basar
// - Post-process: OneTeam + Amare logoları alta bindir
// Hibrit-style'a göre: daha şık görünüm, AI yaratıcılığı; risk: rare text hataları

import { logolariEkle } from './gorselLogoEkle';
import { afisAdresKisa, isFiziki } from './egitmenEtiket';
import { qrOlustur } from './qrOlustur';
import { fotoYerlesim } from './fotoYerlesim';

const urlToImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Resim yüklenemedi'));
  if (src instanceof File) {
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    reader.readAsDataURL(src);
  } else {
    img.src = src;
  }
});

const isEUSummer = (tarihStr) => {
  if (!tarihStr) return true;
  const [d, m, y] = String(tarihStr).split('.').map(Number);
  if (!y || !m || !d) return true;
  const dt = new Date(y, m - 1, d);
  const marLast = new Date(y, 2, 31);
  while (marLast.getDay() !== 0) marLast.setDate(marLast.getDate() - 1);
  const octLast = new Date(y, 9, 31);
  while (octLast.getDay() !== 0) octLast.setDate(octLast.getDate() - 1);
  return dt >= marLast && dt < octLast;
};

const trToEU = (saat, tarih) => {
  if (!saat || !saat.includes(':')) return saat;
  const [h, mn] = saat.split(':').map(Number);
  const offset = isEUSummer(tarih) ? 1 : 2;
  let euH = h - offset;
  if (euH < 0) euH += 24;
  return `${String(euH).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
};

// Konuşmacı kartlarını şablon üzerine pre-composite et — yüzleri ve etiketleri sabitle
const composite = async (egitmenler, sablonImg) => {
  const W = sablonImg.width;
  const H = sablonImg.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sablonImg, 0, 0, W, H);

  const fotoluListe = (egitmenler || []).filter(e => e.fotoURL);
  if (fotoluListe.length === 0) return canvas;

  const dagilim = fotoYerlesim(fotoluListe.length); // dengeli satırlar
  const maxCols = Math.max(...dagilim);
  const cardW = W * 0.85 / maxCols;
  const cardH = cardW * 1.4;
  const gap = 20;
  const startY = H * 0.5;

  let i = -1;
  for (let r = 0; r < dagilim.length; r++) {
    const satirAdet = dagilim[r];
    const rowTotalW = cardW * satirAdet + gap * (satirAdet - 1);
    const startX = (W - rowTotalW) / 2; // satır ortalı
    const y = startY + r * (cardH + 30);
    for (let c = 0; c < satirAdet; c++) {
    i++;
    const e = fotoluListe[i];
    const x = startX + c * (cardW + gap);
    try {
      const img = await urlToImage(e.fotoURL);
      const fotoCap = cardW * 0.85;
      const fotoX = x + (cardW - fotoCap) / 2;
      const fotoY = y;
      ctx.save();
      ctx.beginPath();
      ctx.arc(fotoX + fotoCap / 2, fotoY + fotoCap / 2, fotoCap / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, fotoX, fotoY, fotoCap, fotoCap);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(fotoX + fotoCap / 2, fotoY + fotoCap / 2, fotoCap / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.stroke();
    } catch {}
    // İsim + unvan
    const textY = y + cardW * 0.85 + 35;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(cardW * 0.08)}px Arial`;
    ctx.textAlign = 'center';
    const ad = (e.ad || '').toUpperCase();
    ctx.fillText(ad, x + cardW / 2, textY);
    if (e.unvan) {
      ctx.font = `${Math.floor(cardW * 0.07)}px Arial`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(e.unvan, x + cardW / 2, textY + Math.floor(cardW * 0.1));
    }
    }
  }
  return canvas;
};

// Maske PNG: içerik bölgeleri (üst başlık + alt bilgi) şeffaf = AI düzenler,
// geri kalan opak = şablon korunur. images/edits maske spesifikasyonu.
const maskeUret = (W, H) => {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const m = c.getContext('2d');
  m.fillStyle = '#000000'; m.fillRect(0, 0, W, H);                  // opak = korun
  m.clearRect(0, Math.floor(H * 0.04), W, Math.floor(H * 0.20));    // üst başlık bandı (düzenle)
  m.clearRect(0, Math.floor(H * 0.74), W, Math.floor(H * 0.22));    // alt bilgi/adres bandı (düzenle)
  return c;
};

export const gorselOlusturOpenAIPro = async ({ apiKey, egitim, egitmenler = [], sablonFile, ekPrompt = '', quality = 'medium', format = 'square', maske = false }) => {
  if (!apiKey) throw new Error('OpenAI API anahtarı girilmedi.');

  // Şablon yükle
  const sablonImg = await new Promise((resolve, reject) => {
    if (sablonFile instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.readAsDataURL(sablonFile);
    } else {
      urlToImage(sablonFile).then(resolve).catch(reject);
    }
  });

  // Pre-composite (yüzler + etiketler sabit)
  const compCanvas = await composite(egitmenler, sablonImg);
  const compositeBlob = await new Promise(res => compCanvas.toBlob(b => res(b), 'image/png'));
  // Maskeli mod: şablonu koru, yalnız içerik bantlarını AI düzenlesin
  const maskeBlob = maske
    ? await new Promise(res => maskeUret(compCanvas.width, compCanvas.height).toBlob(b => res(b), 'image/png'))
    : null;

  // Saat hesapla
  const trSaat = egitim.saat || '';
  const trBitis = egitim.bitisSaati || '';
  const euSaat = trToEU(trSaat, egitim.tarih);
  const euBitis = trToEU(trBitis, egitim.tarih);

  const konusmaciList = egitmenler.map((e, i) => {
    const ad = (e.ad || '').toUpperCase();
    const unvan = (e.unvan || '').trim();
    return unvan ? `${i + 1}. ${ad} — ${unvan}` : `${i + 1}. ${ad}`;
  }).join('\n');

  const formatTanim = format === 'story' ? '1024x1536 dikey (9:16)'
                    : format === 'landscape' ? '1536x1024 yatay (16:9)'
                    : '1024x1024 kare (1:1)';

  const prompt = `# GÖREV
Sana verilen referans görselin (şablon + üzerine yerleştirilmiş konuşmacı yüzleri)
layout'unu kullanarak ${formatTanim} bir etkinlik posteri üret.

${ekPrompt ? ekPrompt + '\n\n' : ''}# 1 · ŞABLON SADAKATİ
Referans görsel = grafik dili kaynağın. Şu özelliklerini AYNEN kullan:
• Layout (başlık/foto/tarih/zoom konumları)
• Renk paleti (gradient yönü, ana renk, vurgular)
• Dekoratif elemanlar (parıltı, çerçeve, ışık efekti)
• Tipografi stili (font ağırlığı, hizalama)
• Foto çerçeve şekli (yuvarlak/kare)

Referansta görünen ESKİ içerik (eski başlık, eski tarih, eski zoom ID) varsa SİL,
aşağıdaki YENİ bilgileri yerleştir. Konuşmacı yüzleri AYNEN korunur, asla
yeniden çizilmez/iyileştirilmez.

# 2 · İÇERİK
Başlık: ${egitim.egitim || ''}
Tarih: ${egitim.tarih || ''} ${egitim.gun || ''}
${trSaat ? `Saat (iki ayrı satır olarak yaz):
  TR ${trSaat}${trBitis ? ' - ' + trBitis : ''}
  EU ${euSaat}${euBitis ? ' - ' + euBitis : ''}` : 'Saat: belirlenmedi (yazma)'}
Yer: ${afisAdresKisa(egitim) || egitim.yer || 'ZOOM'}
${isFiziki(egitim) ? 'NOT: Sağ alt köşede QR kod için ~%12 kare boşluk bırak; oraya yazı/logo koyma.' : ''}

KONUŞMACILAR (etiket sırası, AYNEN bunlar):
${konusmaciList}

# 3 · RENK PALETİ
İzinli: Deep Plum #5F2756 · Koyu Plum #3D1734 · Açık mor #7A2F6D · Altın #F5D77A · Beyaz #FFFFFF
Yasak: Kırmızı, maroon, kahverengi, turuncu, sarı bant, lacivert, mavi, yeşil

# 4 · TEMA NOKTASI
Başlık "${egitim.egitim || ''}" konusuna uygun ince atmosferik dokunuş
(palette sadık kalarak):
• Sağlık/wellness → organik soft formlar
• Liderlik/Vizyon → ışık huzmeleri, dramatik
• Satış/finans → modern keskin geometrik
• Motivasyon → ilhamlı parıltı
• Panel/seminer → ciddi profesyonel
Şablonu EZMEZ.

# 5 · KISITLAR (TEK YER)
✗ "Kyani" yazma
✗ Sahte logo/amblem/® çizme — referansta logo varsa onu kullan
✗ Hayali yaş notu, hukuki uyarı yazma
✗ Listede yazmayan unvan UYDURMA
✗ Konuşmacı yüzlerini değiştirme/iyileştirme
✗ Konuşmacıyı 1'den fazla gösterme
✗ Türkçe karakterleri (ş ç ğ ü ö ı İ) yanlış basma
✗ Üstte yatay koyu band/şerit/header bar çizme — gradient yumuşak olmalı
✗ Başlığı kırpma — üstten 80px boşluk bırak

# 6 · ÇIKTIDAN ÖNCE — KENDİ ÇIKTINI DOĞRULA
1. Şablonu mu çoğaltıyorum yoksa yeni tasarım mı yarattım? (Şablon olmalı)
2. Verilen 6 bilgi (başlık, tarih, TR saat, EU saat, yer, konuşmacılar)
   görselde EKSİKSİZ ve DOĞRU mu?
3. Her konuşmacının yüzü kendi etiketine bağlı mı? Karışıklık var mı?
4. Listede olmayan herhangi bir yazı/unvan/hukuki not var mı?

Hata varsa düzelt, sonra finalize et.`;

  const sizeMap = { story: '1024x1536', landscape: '1536x1024', square: '1024x1024' };

  const formData = new FormData();
  formData.append('model', 'gpt-image-2');
  formData.append('image', compositeBlob, 'composite.png');
  if (maskeBlob) formData.append('mask', maskeBlob, 'mask.png');
  formData.append('prompt', prompt);
  formData.append('size', sizeMap[format] || '1024x1024');
  // Quality medium: 20-40s, kullanıcı deneyimi için makul süre
  // High thinking mode 60-300s sürüyordu, test sırasında 5dk+ takıldı
  formData.append('quality', 'medium');
  formData.append('n', '1');

  // Network/timeout koruması + otomatik retry (transient hatalar için)
  const MAX_RETRY = 2;
  const TIMEOUT_MS = 90000; // 90s (quality medium için yeterli, kullanıcı çok beklemesin)

  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_RETRY + 1; attempt++) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      // Direkt OpenAI çağrısı — gpt-image-2 60-90s sürer, Netlify Function
      // 26s sınırı bunu karşılayamıyor (504 dönüyordu). Direct call'da
      // network problemi olursa retry zaten devreye giriyor.
      const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
        signal: ctrl.signal,
      });
      clearTimeout(tid);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `OpenAI API Hatası: ${res.status}`;
        // 429/5xx retry, diğerleri direkt fırlat
        if ((res.status === 429 || res.status >= 500) && attempt <= MAX_RETRY) {
          lastErr = new Error(msg);
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) throw new Error('OpenAI görsel döndürmedi.');
      // Post-process: OneTeam + Amare logoları (+ fiziki ise QR)
      const qrDataUrl = isFiziki(egitim)
        ? await qrOlustur(`${typeof window !== 'undefined' ? window.location.origin : ''}/e/${egitim.id || ''}`)
        : null;
      return await logolariEkle({ base64: b64, mimeType: 'image/png' }, { qrDataUrl });
    } catch (e) {
      clearTimeout(tid);
      // AbortError veya network hatası → retry
      const isNetwork = e.name === 'AbortError' || /Failed to fetch|NetworkError|network/i.test(e.message);
      if (isNetwork && attempt <= MAX_RETRY) {
        lastErr = e;
        console.warn(`[OpenAI Pro] ${attempt}. deneme başarısız (${e.message}), tekrar deneniyor...`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
        continue;
      }
      // Network hatasıysa anlamlı Türkçe mesaj
      if (isNetwork) {
        throw new Error(`İnternet bağlantısı veya OpenAI sunucusuna erişim hatası (${MAX_RETRY + 1} deneme). Lütfen ağı kontrol edip tekrar deneyin. Detay: ${e.message}`);
      }
      throw e;
    }
  }
  throw lastErr || new Error('OpenAI çağrısı başarısız.');
};
