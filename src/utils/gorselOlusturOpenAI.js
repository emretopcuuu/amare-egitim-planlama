import { applyLogos } from './applyLogos';

// OpenAI gpt-image-1 ile poster üretimi
// Yüz koruma için Canvas üzerinde konuşmacı kartlarını ön-kompozit ediyoruz,
// gpt-image-1'e tek bir referans görsel olarak gönderiyoruz.

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const urlToImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Resim yüklenemedi: ' + url));
  img.src = url;
});

// Konuşmacı kartlarını ön-kompozit et — yuvarlak yüz + isim + unvan
// Çıktı: blob URL
const compositeKonusmaciKart = async (egitmenler, sablonImg) => {
  // Şablonun boyutunu kullan, üstüne katman olarak konuşmacılar
  const W = sablonImg.width;
  const H = sablonImg.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Şablonu arka plan olarak çiz
  ctx.drawImage(sablonImg, 0, 0, W, H);

  // Konuşmacıları yan yana yerleştir
  const fotoluListe = egitmenler.filter(e => e.fotoURL);
  if (fotoluListe.length === 0) {
    return canvas.toDataURL('image/png');
  }

  const cols = Math.min(fotoluListe.length, 4);
  const rows = Math.ceil(fotoluListe.length / 4);
  const cardW = W * 0.85 / cols;
  const cardH = cardW * 1.4;
  const gap = 20;
  const totalW = cardW * cols + gap * (cols - 1);
  const startX = (W - totalW) / 2;
  const startY = H * 0.5;

  for (let i = 0; i < fotoluListe.length; i++) {
    const e = fotoluListe[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + 30);

    // Yuvarlak foto
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
      ctx.drawImage(img, fotoX, fotoY, fotoCap, fotoCap);
      ctx.restore();
      // Çerçeve
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

  // PNG blob olarak döndür
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
};

// Türkiye → Avrupa saat (DST hesabı)
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

export const gorselOlusturOpenAI = async ({ apiKey, egitim, egitmenler = [], sablonFile, ekPrompt = '', quality = 'medium' }) => {
  if (!apiKey) throw new Error('OpenAI API anahtarı girilmedi.');

  // Şablonu yükle (File veya URL olabilir)
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

  // Konuşmacı kartlarını şablon üzerine ön-kompozit et
  const compositeBlob = await compositeKonusmaciKart(egitmenler, sablonImg);

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

  const userPrompt = `${ekPrompt ? ekPrompt + '\n\n' : ''}Bu bir etkinlik tanıtım posteridir. Sana verilen referans görselde:
- Şablon arka planı (renk paleti ve genel estetik)
- Konuşmacıların yuvarlak fotoğrafları AYNEN korunmalı (yüz hatları, saç, ten, gözler değiştirilmesin)
- Konuşmacı isimleri ve unvanları altlarında AYNEN yazıyor

Senin görevin: Bu görseli profesyonel bir etkinlik posteri haline getirmek.
- Konuşmacı yüzlerini ve etiketlerini AYNEN KORU
- Etrafına etkinlik bilgilerini ekle:

ETKİNLİK BİLGİLERİ:
- Başlık: ${egitim.egitim}
- Tarih: ${egitim.tarih} ${egitim.gun}
${trSaat ? `- Saat (TR): ${trSaat}${trBitis ? ' - ' + trBitis : ''}\n- Saat (EU): ${euSaat}${euBitis ? ' - ' + euBitis : ''}` : ''}
- Yer: ${egitim.yer || 'ZOOM'}

KONUŞMACILAR (etiket sırası):
${konusmaciList}

KURALLAR:
- Yüzleri AYNEN koru, yeniden çizme
- İsim ve unvan etiketlerini olduğu gibi tut
- Saatler "TR HH:MM" ve "EU HH:MM" iki ayrı satır olarak yazılsın
- Amare Global ve One Team kurumsal kimliğine uygun
- "Kyani" KESİNLİKLE yazma
- Her konuşmacı görselde TAM 1 KEZ
- Sosyal medya posteri formatı (kare 1024x1024)`;

  // FormData ile gpt-image-1 edit endpoint'e POST
  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', compositeBlob, 'composite.png');
  formData.append('prompt', userPrompt);
  formData.append('size', '1024x1024');
  formData.append('quality', quality); // low | medium | high
  formData.append('n', '1');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI API Hatası: ${res.status}`);
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI görsel döndürmedi.');
  }
  // Post-process: OpenAI'nin uydurma logolarını gerçek Amare + One Team ile değiştir
  return await applyLogos(b64, 'image/png');
};
