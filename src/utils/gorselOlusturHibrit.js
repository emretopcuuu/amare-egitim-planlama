import { applyLogos } from './applyLogos';

// Hibrit poster üretimi:
// 1) Gemini → SADECE dekoratif arka plan üretir (boş, yazısız, foto yok)
// 2) Canvas → Gemini'nin ürettiği arka plan üzerine GERÇEK fotoğrafları,
//    isimleri, unvanları, tarihi, saati yapıştırır
// 3) applyLogos → tek noktadan gerçek Amare + One Team logoları bindirilir
// Sonuç: AI yaratıcılığı + %100 doğru yüzler + tek logo

const resmiBase64Yap = async (kaynak) => {
  if (kaynak instanceof File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve({ base64, mimeType: kaynak.type || 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(kaynak);
    });
  }
  const res = await fetch(kaynak);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve({ base64, mimeType: blob.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

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
  } else if (src.startsWith?.('data:')) {
    img.src = src;
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

const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) => {
  const words = String(text || '').split(' ');
  let line = '';
  const lines = [];
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const finalLines = lines.slice(0, maxLines);
  let curY = y;
  for (const l of finalLines) {
    ctx.fillText(l, x, curY);
    curY += lineHeight;
  }
  return curY;
};

// Gemini'den DEKORATIF arka plan üret
const arkaPlanUret = async (apiKey, sablonFile, egitim) => {
  const sablon = await resmiBase64Yap(sablonFile);

  const prompt = `Sen profesyonel bir tasarım uzmanısın. 1080x1080 etkinlik poster ARKA PLAN DOKUSU üretiyorsun.

GÖREVİN: Sadece dekoratif arka plan deseni / doku üret. Boş bir tuval gibi.

ŞABLON: Sana verilen referans görselden SADECE renk paletini al (Plum, mor, altın aksanlar, koyu tonlar). Şablonun İÇİNDEKİ HİÇBİR ŞEYI kopyalama:
- Şablondaki yazıları, başlıkları KOPYALAMA
- Şablondaki yüzleri, fotoğrafları KOPYALAMA
- Şablondaki logoları, marka adlarını KOPYALAMA
- Şablondaki tarih, saat, ZOOM ID KOPYALAMA

KESİN YASAKLAR (KESİNLİKLE UYGULA):
- HİÇBİR ŞEKİLDE insan yüzü, vücut, kişi resmi ÇİZME
- HİÇBİR ŞEKİLDE yazı, harf, sayı, başlık, isim, tarih, saat YAZMA
- HİÇBİR ŞEKİLDE "Amare", "One Team", "Global", marka adı YAZMA
- HİÇBİR ŞEKİLDE logo, sembol, amblem, ikon, rozet ÇİZME
- HİÇBİR ŞEKİLDE siyah/koyu KARE, KUTU, ÇERÇEVE çizme — köşelere logo yerleştirme
- HİÇBİR ŞEKİLDE podyum, sahne, masa, mobilya, kürsü, mimari nesne çizme
- HİÇBİR ŞEKİLDE flat renk podyum + gradient arka plan kombinasyonu yapma
- TEK TUTARLI STİL: TÜM görsel yumuşak mor gradient + soft ışık dokuları olsun
- ÜST → ORTA → ALT geçişi tek bir akıcı gradient olmalı, parça parça stil ÇAKIŞMASI YASAK
- "Kyani" KESİNLİKLE YAZMA

İSTEDİĞİM:
- Amare Global kurumsal renkleri: Deep Plum (#5F2756), koyu mor, altın aksantlar
- Soyut dekoratif öğeler: ışık efektleri, parıltı, soft gradientler, dokular, soyut formlar
- Üst, orta, alt kısımlar — hepsi temiz, boş bırakılmış (üzerine sonra Canvas yerleştirilecek)
- Sadece arka plan dokusu — fotoğraf, yazı, logo, banner YOK
- Profesyonel, zarif, lüks atmosfer

ÖZET: TAMAMEN BOŞ bir dekoratif arka plan görseli. Hiçbir yazı, foto, logo, isim, tarih, banner YOK — sadece renk gradientleri ve soft dokular.`;

  const parts = [
    { text: prompt },
    { inlineData: { mimeType: sablon.mimeType, data: sablon.base64 } },
  ];

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API Hatası: ${res.status}`);
  }
  const data = await res.json();
  const parts2 = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts2.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imgPart) throw new Error('Gemini arka plan döndürmedi.');
  return imgPart.inlineData; // { mimeType, data }
};

export const gorselOlusturHibrit = async ({ apiKey, egitim, egitmenler = [], sablonFile, ekPrompt = '', width = 1080, height = 1080 }) => {
  if (!apiKey) throw new Error('Gemini API anahtarı yok.');

  // 1. AŞAMA: Gemini'den dekoratif arka plan al
  const arkaPlan = await arkaPlanUret(apiKey, sablonFile, egitim);
  const arkaPlanDataUrl = `data:${arkaPlan.mimeType};base64,${arkaPlan.data}`;
  const arkaPlanImg = await urlToImage(arkaPlanDataUrl);

  // 2. AŞAMA: Canvas üzerine içerik bindir
  const W = width;
  const H = height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Arka planı çiz (cover-fit)
  const ratio = Math.max(W / arkaPlanImg.width, H / arkaPlanImg.height);
  const bgW = arkaPlanImg.width * ratio;
  const bgH = arkaPlanImg.height * ratio;
  ctx.drawImage(arkaPlanImg, (W - bgW) / 2, (H - bgH) / 2, bgW, bgH);

  // Üst kısımda HİÇBİR overlay yok — kullanıcı isteği üzerine kaldırıldı.
  // Başlık metninin okunabilir olması için sadece yumuşak text-shadow kullanılır.

  // Alt koyulaştırma (zoom info okunsun)
  const botGrad = ctx.createLinearGradient(0, H - 200, 0, H);
  botGrad.addColorStop(0, 'rgba(20, 8, 30, 0)');
  botGrad.addColorStop(1, 'rgba(20, 8, 30, 0.7)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 200, W, 200);

  // Logolar applyLogos post-process ile sonra eklenecek (çift logo olmaması için)

  // ─── BAŞLIK ───
  // Üst overlay olmadığı için başlığa daha güçlü shadow + double-stroke
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#FFFFFF';
  // İki kez çiz — daha güçlü gölge için
  drawWrappedText(ctx, egitim.egitim || '', W / 2, 200, W - 100, 64, 3);
  ctx.shadowBlur = 14;
  const baslikY = drawWrappedText(ctx, egitim.egitim || '', W / 2, 200, W - 100, 64, 3);
  ctx.shadowBlur = 0;

  // ─── TARİH + SAAT ───
  const trSaat = egitim.saat || '';
  const trBitis = egitim.bitisSaati || '';
  const euSaat = trToEU(trSaat, egitim.tarih);
  const euBitis = trToEU(trBitis, egitim.tarih);

  let saatY = baslikY + 18;
  ctx.fillStyle = '#F5D77A';
  ctx.font = 'bold 32px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(`${egitim.tarih || ''} ${egitim.gun || ''}`.trim(), W / 2, saatY);
  saatY += 42;

  if (trSaat) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`TR ${trSaat}${trBitis ? ' - ' + trBitis : ''}`, W / 2, saatY);
    saatY += 32;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '24px Arial';
    ctx.fillText(`EU ${euSaat}${euBitis ? ' - ' + euBitis : ''}`, W / 2, saatY);
    saatY += 18;
  }
  ctx.shadowBlur = 0;

  // ─── KONUŞMACI KARTLARI — büyük + dikey ortalanmış ───
  const liste = (egitmenler || []);
  const titleEnd = saatY + 30;       // başlık+saat bloğu sonu
  const footerStart = H - 200;        // alt zoom info başlangıcı
  const cardsAreaTop = titleEnd;
  const cardsAreaBot = footerStart;
  const cardsAreaH = cardsAreaBot - cardsAreaTop;

  if (liste.length > 0) {
    const cols = Math.min(liste.length, 4);
    const rows = Math.ceil(liste.length / 4);
    const gap = 18;                   // daha küçük yatay boşluk
    const sidePad = 50;                // daha küçük yan boşluk
    const maxCardW = (W - sidePad * 2 - gap * (cols - 1)) / cols;
    // Yükseklik: card = foto + 90px (isim+unvan)
    const maxCardH = cardsAreaH / rows - 30;
    const cardSize = Math.min(maxCardW, maxCardH - 90);
    const cardW = cardSize;
    const fotoSize = cardSize * 0.92; // foto card'ın daha büyük kısmı
    const totalW = cardW * cols + gap * (cols - 1);
    const startX = (W - totalW) / 2;
    const rowH = cardSize + 100;
    const totalH = rowH * rows - 30;
    // Dikey olarak alanın ortasına yerleştir
    const cardsStartY = cardsAreaTop + (cardsAreaH - totalH) / 2;

    for (let i = 0; i < liste.length; i++) {
      const e = liste[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = cardsStartY + row * rowH;

      const fotoX = x + (cardW - fotoSize) / 2;
      const fotoY = y;

      // Yuvarlak foto
      if (e.fotoURL) {
        try {
          const img = await urlToImage(e.fotoURL);
          ctx.save();
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, fotoX, fotoY, fotoSize, fotoSize);
          ctx.restore();
          // Çift çerçeve — beyaz dış + altın iç
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#F5D77A';
          ctx.lineWidth = 4;
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 0;
          ctx.stroke();
        } catch {
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // İsim
      const ad = (e.ad || '').toUpperCase();
      const nameSize = Math.max(15, Math.min(24, cardSize * 0.095));
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${nameSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      const lastY = drawWrappedText(ctx, ad, x + cardW / 2, fotoY + fotoSize + 32, cardW + 30, nameSize + 4, 2);

      // Unvan
      if (e.unvan) {
        const unvanSize = nameSize - 4;
        ctx.fillStyle = '#F5D77A';
        ctx.font = `${unvanSize}px Arial`;
        drawWrappedText(ctx, e.unvan, x + cardW / 2, lastY + 4, cardW + 35, unvanSize + 2, 2);
      }
      ctx.shadowBlur = 0;
    }
  }

  // ─── ALT: Daha güçlü gradient (Gemini'nin alt yazılarını kapatmak için) ───
  const botMaskGrad = ctx.createLinearGradient(0, H - 220, 0, H);
  botMaskGrad.addColorStop(0, 'rgba(20, 8, 30, 0)');
  botMaskGrad.addColorStop(0.4, 'rgba(20, 8, 30, 0.85)');
  botMaskGrad.addColorStop(1, 'rgba(20, 8, 30, 0.95)');
  ctx.fillStyle = botMaskGrad;
  ctx.fillRect(0, H - 220, W, 220);

  // ─── ALT: Yer ───
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8;
  if (egitim.yer) {
    const yer = egitim.yer.length > 55 ? egitim.yer.slice(0, 55) + '...' : egitim.yer;
    ctx.fillText(yer, W / 2, H - 130);
  }
  ctx.shadowBlur = 0;

  // ─── Amare logo (gerçek PNG) — alt orta ───
  try {
    const amareLogo = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
    const logoBotW = 200;
    const logoBotH = (amareLogo.height / amareLogo.width) * logoBotW;
    ctx.drawImage(amareLogo, (W - logoBotW) / 2, H - 95, logoBotW, logoBotH);
  } catch {}

  // URL en altta
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '16px Arial';
  ctx.fillText('egitimtakvimi.oneteamglobal.ai', W / 2, H - 25);

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  // Post-process: tek noktadan gerçek logolar bindirilir
  return await applyLogos(base64, 'image/png');
};
