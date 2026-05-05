// OpenAI Pro: gpt-image-2 ile TAM AI poster üretimi
// - Şablon + speaker fotoları pre-composite edilir referans olarak
// - gpt-image-2 /v1/images/edits ile başlık/tarih/yer dahil her şeyi AI çizer
// - gpt-image-2 multilingual text rendering Türkçe karakterleri doğru basar
// Hibrit-style'a göre: daha şık görünüm, AI yaratıcılığı; risk: rare text hataları

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

  const cols = Math.min(fotoluListe.length, 4);
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
  return canvas;
};

export const gorselOlusturOpenAIPro = async ({ apiKey, egitim, egitmenler = [], sablonFile, ekPrompt = '', quality = 'medium', format = 'square' }) => {
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

  const prompt = `${ekPrompt ? ekPrompt + '\n\n' : ''}╔══════════════════════════════════════════════════════════╗
║  ŞABLON = REFERANS GÖRSELİN — MUTLAK ÖNCELİK              ║
╚══════════════════════════════════════════════════════════╝
Sana verilen referans görsel TASARIM ŞABLONUDUR. Aşağıdaki maddeler ZORUNLUDUR:

1. KOMPOZİSYON: Şablonun layout'unu (başlık konumu, foto kartı yerleşimi,
   tarih/saat bloğu, alt bilgi şeridi) AYNEN ÖRNEK AL.
2. RENK PALETİ: Şablondaki renkleri AYNEN kullan. Yeni renk uydurma.
3. DEKORATİF ELEMANLAR: Şablondaki parıltılar, çerçeveler, geometrik şekiller,
   ışık efektleri NE İSE onları koru veya benzerini koy.
4. TİPOGRAFİ: Font ağırlığı, hizalama, vurgu stili şablonla AYNI olsun.
5. FOTO ÇERÇEVELERİ: Şablon yuvarlak ise yuvarlak, kare ise kare. Aynı stil.
6. ESKİ İÇERİĞİ TEMİZLE: Orijinal başlık, eski tarih, eski isimler — SİL.
   Yerlerine aşağıdaki YENİ bilgileri koy.
7. KONUŞMACI YÜZLERİNİ AYNEN KORU - hiç değiştirme, yeniden çizme.

Profesyonel etkinlik tanıtım posteri. Etkinlik bilgilerini Türkçe karakterleri doğru basarak ekle:

BAŞLIK: ${egitim.egitim || ''}
TARİH: ${egitim.tarih || ''} ${egitim.gun || ''}
${trSaat ? `TR ${trSaat}${trBitis ? ' - ' + trBitis : ''} | EU ${euSaat}${euBitis ? ' - ' + euBitis : ''}` : ''}
YER: ${egitim.yer || 'ZOOM'}

KONUŞMACILAR (etiket sırası, AYNEN bunlar):
${konusmaciList}

ZORUNLU RENK PALETİ (sadece bunlar, başka renk YOK):
- Deep Plum #5F2756 (ana arka plan)
- Koyu Plum #3D1734 (üst/alt koyu bölgeler)
- Açık mor #7A2F6D (orta vurgu)
- Sıcak altın #F5D77A (başlık ve aksanlar için)
- Beyaz/krem #FFFFFF (ana metin için)

YASAK RENKLER: Kırmızı, maroon, kahverengi, turuncu, sarı banner, lacivert, mavi, yeşil. Sadece yukarıdaki mor/altın paleti kullan.

TEMA UYUMU — Başlık "${egitim.egitim || ''}" konusuna uygun ince dokunuşlar:
- Sağlık/wellness → organik formlar, ferah hisli soft dokular
- Liderlik/Vizyon → güçlü ışık huzmeleri, dramatik premium atmosfer
- Satış/finans → modern keskin geometrik vurgular
- Motivasyon → ilhamlı ışık efektleri, parıltı
- Panel/seminer → ciddi profesyonel doku
Tema şablonu EZMEZ — sadece ince dokunuş.

LAYOUT KURALLARI:
- Başlık üstten en az 80px boşluk bırakarak TAM görünür olmalı, KIRPMA YOK
- Üstte renkli bant/banner ÇİZME — sadece arka plan gradient'i
- Türkçe karakterleri (ş ç ğ ü ö ı İ) DOĞRU bas
- Yüzleri AYNEN koru
- İsim ve unvan etiketlerini olduğu gibi tut
- Saatler iki ayrı format: "TR HH:MM - HH:MM" ve "EU HH:MM - HH:MM"
- "Kyani" KESİNLİKLE yazma
- Her konuşmacı TAM 1 KEZ
- "Etkinliğe X yaşından küçükler" gibi yazılar YAZMA

╔══════════════════════════════════════════════════════════╗
║  SON KONTROL — POSTERİ ÜRETMEDEN ÖNCE ZİHNİNDE DOĞRULA    ║
╚══════════════════════════════════════════════════════════╝
[ ] Başlık tam ve doğru: "${egitim.egitim || ''}"
[ ] Tarih doğru: ${egitim.tarih || ''} ${egitim.gun || ''}
[ ] TR ve EU saatleri iki ayrı satır
[ ] Her konuşmacı doğru fotoyla eşleşti, yer değişimi yok
[ ] Her konuşmacının altında SADECE listede verilen unvan, uydurma yok
[ ] Her konuşmacı TAM 1 KEZ görünüyor
[ ] Şablonun layout/renk/dekoratif elemanları korundu
[ ] Türkçe karakterler (ş ç ğ ü ö ı İ) doğru
[ ] "Kyani" yok, hayali yazı yok, sahte logo yok
[ ] Yazım/tipo hatası yok

HAYIR varsa düzelt, sonra üret. HAYIR sıfır olunca finalize et.`;

  const sizeMap = { story: '1024x1536', landscape: '1536x1024', square: '1024x1024' };

  const formData = new FormData();
  formData.append('model', 'gpt-image-2');
  formData.append('image', compositeBlob, 'composite.png');
  formData.append('prompt', prompt);
  formData.append('size', sizeMap[format] || '1024x1024');
  // gpt-image-2 thinking mode için quality='high' — son kontrol listesini reasoning ile değerlendirir
  formData.append('quality', 'high');
  formData.append('n', '1');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI API Hatası: ${res.status}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI görsel döndürmedi.');
  return { base64: b64, mimeType: 'image/png' };
};
