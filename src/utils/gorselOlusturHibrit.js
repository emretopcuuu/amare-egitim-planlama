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

// Gemini'den ŞABLON-BAZLI arka plan üret
// Şablonu referans olarak gönderir, Gemini şablonun renk/atmosferini koruyarak
// tüm yazı/logo/foto'ları temizler. Sonra Canvas üzerine yeni içerik bindirilir.
const arkaPlanUret = async (apiKey, sablonFile, egitim) => {
  // Şablonu base64'e çevir
  const sablonB64 = await new Promise(async (resolve, reject) => {
    if (sablonFile instanceof File) {
      const r = new FileReader();
      r.onload = () => resolve({ b64: r.result.split(',')[1], mt: sablonFile.type || 'image/jpeg' });
      r.onerror = reject;
      r.readAsDataURL(sablonFile);
    } else {
      try {
        const res = await fetch(sablonFile);
        const blob = await res.blob();
        const r = new FileReader();
        r.onload = () => resolve({ b64: r.result.split(',')[1], mt: blob.type || 'image/jpeg' });
        r.onerror = reject;
        r.readAsDataURL(blob);
      } catch (e) { reject(e); }
    }
  });

  const prompt = `# GÖREV
Sana referans olarak verilen şablon görselin GRAFİK DİLİNİ koruyarak,
TAMAMEN BOŞ bir arka plan görseli üret. Posterin yazı/foto/logo bölümlerini
sonradan Canvas dolduracak — sen sadece DEKORATİF ZEMİN üretirsin.

# 1 · ŞABLONDAN AL
• Renk paleti (gradient yönü, ana renk, vurgular)
• Dekoratif elemanlar (parıltı, ışık efekti, geometrik formlar, doku)
• Genel atmosfer/kompozisyon hissi
• Lüks profesyonel havayı

# 2 · ŞABLONDAN ATIL
• Tüm yazılar (başlık, isim, tarih, saat, zoom ID)
• Tüm fotolar/yüzler/insan figürleri
• Tüm logolar/amblemler/markalar
• Tüm aşağı şeritler/banner/bilgi kutuları

# 3 · KISITLAR (TEK YER)
✗ İnsan yüzü, vücut, figür çizme
✗ Yazı, harf, sayı, başlık YAZMA
✗ "Amare", "ONE TEAM", "Global", "ZOOM" yazma
✗ Logo, sembol, amblem, ®, rozet çizme
✗ "Kyani" yazma
✗ Hayali not/uyarı yazma

# 4 · ÇIKTI
Şablonun renk + atmosfer dilini koruyan, üzerine yazı/foto eklenmeye hazır
TAMAMEN BOŞ bir grafik zemin. Önemli: dekoratif olsun ama yer kaplamasın —
ortada büyük boş alan kalsın ki Canvas başlık/foto'ları yerleştirebilsin.`;

  const parts = [
    { inlineData: { mimeType: sablonB64.mt, data: sablonB64.b64 } },
    { text: prompt },
  ];

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${apiKey}`;
  // 60s timeout — donmaması için
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 60000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Gemini API zaman aşımı (60s). Spending cap dolmuş olabilir.');
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API Hatası: ${res.status}`);
  }
  const data = await res.json();
  const parts2 = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts2.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imgPart) throw new Error('Gemini arka plan döndürmedi.');
  return imgPart.inlineData;
};

// Modal'da kullanıcı düzenlemesini ekPrompt'tan parse et
const parseEkPromptEgitmenler = (ekPrompt, fallback = []) => {
  if (!ekPrompt || typeof ekPrompt !== 'string') return fallback;
  const lines = ekPrompt.split('\n').map(l => l.replace(/ /g, ' '));
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^\s*(\d+)\.\s*(.+?)\s*$/);
    if (m) {
      const ad = m[2].trim();
      let unvan = '';
      const ny = (lines[i + 1] || '').trim();
      if (ny && !/^\d+\./.test(ny) && !/\(unvan girilmemiş/i.test(ny) && !/\(boş\)/i.test(ny)) {
        unvan = ny;
      }
      const eski = fallback[out.length] || fallback.find(x => x?.ad && x.ad.toLocaleUpperCase('tr-TR') === ad.toLocaleUpperCase('tr-TR'));
      out.push({
        ad,
        unvan,
        fotoURL: eski?.fotoURL || null,
        biyografi: eski?.biyografi || '',
      });
    }
    i++;
  }
  return out.length > 0 ? out : fallback;
};

export const gorselOlusturHibrit = async ({ apiKey, egitim, egitmenler = [], sablonFile, ekPrompt = '', width = 1080, height = 1080 }) => {
  if (!apiKey) throw new Error('Gemini API anahtarı yok.');
  // Modal düzenlemesini uygula
  egitmenler = parseEkPromptEgitmenler(ekPrompt, egitmenler);

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
    const gap = 18;
    const sidePad = 50;
    const maxCardW = (W - sidePad * 2 - gap * (cols - 1)) / cols;
    // text alanı: 3 satır isim (~95px) + 2 satır unvan (~50px) + boşluk = ~155px
    const textAreaH = 155;
    const rowGap = 30;
    const availableHPerRow = (cardsAreaH - rowGap * (rows - 1)) / rows;
    const maxFotoFromH = availableHPerRow - textAreaH;
    // Foto: width VEYA height limit'in min'i, en az 150 en çok 320
    const fotoSize = Math.max(150, Math.min(maxCardW * 0.95, maxFotoFromH, 320));
    const cardW = Math.max(fotoSize, maxCardW * 0.98);
    const cardH = fotoSize + textAreaH;
    const totalW = cardW * cols + gap * (cols - 1);
    const startX = (W - totalW) / 2;
    const rowH = cardH + rowGap;
    const totalH = rowH * rows - rowGap;
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

      // İsim — fotoSize'a göre, min 18 max 28
      const ad = (e.ad || '').toUpperCase();
      const nameSize = Math.max(18, Math.min(28, fotoSize * 0.13));
      const nameLineHeight = nameSize + 4;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${nameSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      const lastY = drawWrappedText(ctx, ad, x + cardW / 2, fotoY + fotoSize + 30, cardW * 0.95, nameLineHeight, 2);

      // Unvan — isim'in bittiği Y'den itibaren (overlap yok)
      if (e.unvan) {
        const unvanSize = Math.max(14, nameSize - 6);
        const unvanLineHeight = unvanSize + 2;
        ctx.fillStyle = '#F5D77A';
        ctx.font = `${unvanSize}px Arial`;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 5;
        drawWrappedText(ctx, e.unvan, x + cardW / 2, lastY + 6, cardW * 0.95, unvanLineHeight, 2);
      }
      ctx.shadowBlur = 0;
    }
  }

  // ─── ALT: Daha güçlü gradient (Gemini'nin alt yazılarını kapatmak için) ───
  const botMaskGrad = ctx.createLinearGradient(0, H - 260, 0, H);
  botMaskGrad.addColorStop(0, 'rgba(20, 8, 30, 0)');
  botMaskGrad.addColorStop(0.3, 'rgba(20, 8, 30, 0.95)');
  botMaskGrad.addColorStop(1, 'rgba(20, 8, 30, 1)');
  ctx.fillStyle = botMaskGrad;
  ctx.fillRect(0, H - 260, W, 260);

  // ─── ALT: Yer ───
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8;
  if (egitim.yer) {
    const yer = egitim.yer.length > 55 ? egitim.yer.slice(0, 55) + '...' : egitim.yer;
    ctx.fillText(yer, W / 2, H - 205);
  }
  ctx.shadowBlur = 0;

  // ─── KÜÇÜK LOGOLAR (alt orta, URL üstü) ───
  try {
    const logoH = Math.floor(H * 0.038); // ~41px for 1080
    const logoY = H - 125; // URL ile arasına 40px boşluk

    const oneTeamLogo = await urlToImage('/logos/oneteam-logo.png');
    const oneTeamRatio = oneTeamLogo.width / oneTeamLogo.height;
    const oneTeamW = logoH * oneTeamRatio;

    const amareLogo = await urlToImage('/logos/AmareBPLogo-Horizontal-White-TR.png');
    const amareRatio = amareLogo.width / amareLogo.height;
    const amareW = logoH * amareRatio;

    const gap = 30;
    const toplamW = oneTeamW + gap + amareW;
    const startX = (W - toplamW) / 2;

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(oneTeamLogo, startX, logoY, oneTeamW, logoH);
    ctx.drawImage(amareLogo, startX + oneTeamW + gap, logoY, amareW, logoH);
    ctx.restore();

    // İnce ayraç
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 215, 122, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX + oneTeamW + gap / 2, logoY + 8);
    ctx.lineTo(startX + oneTeamW + gap / 2, logoY + logoH - 8);
    ctx.stroke();
    ctx.restore();
  } catch (e) {
    console.warn('[hibrit] logo yuklenemedi:', e.message);
  }

  // URL en altta
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '16px Arial';
  ctx.fillText('egitimtakvimi.oneteamglobal.ai', W / 2, H - 35);

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  // Logolar zaten yukarıda Canvas üst köşelerine bindirildi — applyLogos çağırılmaz
  return { base64, mimeType: 'image/png' };
};
