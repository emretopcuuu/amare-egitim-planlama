// Resmi base64'e çevirir (URL veya File)
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

  // URL'den fetch et
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

export const gorselOlustur = async ({ apiKey, egitim, egitmenFotoURL, egitmenFotoURLs, egitmenler: egitmenObjeler, sablonFile, ekPrompt = '' }) => {
  if (!apiKey) throw new Error('Gemini API anahtarı girilmedi. Lütfen Ayarlar sekmesinden ekleyin.');

  // Şablonu base64'e çevir
  const sablon = await resmiBase64Yap(sablonFile);

  // Konuşmacı bilgileri — yeni format: egitmenler (objeler), eski format: egitmenFotoURLs (sadece URL)
  // Her egitmen objesi: { ad, unvan, fotoURL, biyografi }
  let egitmenler;
  if (egitmenObjeler && egitmenObjeler.length > 0) {
    egitmenler = egitmenObjeler;
  } else {
    const fotoURLListesi = egitmenFotoURLs || (egitmenFotoURL ? [egitmenFotoURL] : []);
    egitmenler = fotoURLListesi.map(url => ({ ad: '', unvan: '', fotoURL: url }));
  }

  console.log(`[gorsel] Eğitim: ${egitim.egitim}`);
  console.log(`[gorsel] Konuşmacı sayısı: ${egitmenler.length}`);

  // Her konuşmacının fotoğrafını base64'e çevir (sıra korunur)
  const egitmenFotolar = [];
  for (const e of egitmenler) {
    if (!e.fotoURL) {
      egitmenFotolar.push(null);
      continue;
    }
    try {
      const foto = await resmiBase64Yap(e.fotoURL);
      egitmenFotolar.push(foto);
    } catch (err) {
      console.warn(`[gorsel] Fotoğraf yüklenemedi (${e.ad}):`, err.message);
      egitmenFotolar.push(null);
    }
  }
  const fotoluSayi = egitmenFotolar.filter(f => f).length;
  console.log(`[gorsel] Yüklenen fotoğraf sayısı: ${fotoluSayi}/${egitmenler.length}`);

  // Şehir/konum tespiti — online değilse arka plana şehir görseli ekle
  const yer = egitim.yer || '';
  const sehir = egitim.sehir || '';
  const isOnline = sehir === 'Online' || yer.toUpperCase().includes('ZOOM');

  let konumPrompt = '';
  if (!isOnline && !ekPrompt) {
    const lokasyon = sehir && sehir !== 'Diğer' ? sehir : '';
    if (lokasyon) {
      konumPrompt = `\n\nKONUM TASARIM TALİMATI:
Bu etkinlik ${lokasyon} şehrinde yüz yüze yapılacak. Arka plana ${lokasyon} şehrinin tanınmış siluetini, simge yapılarını veya şehir manzarasını hafif ve şık bir şekilde ekle. Konuşmacı fotoğrafıyla uyumlu olsun. Arka plan görseli yarı saydam, soft ve profesyonel olsun — metinleri kapatmasın. Bu görseli diğer online eğitim görsellerinden farklı ve daha renkli yap.`;
    }
  }

  // Konuşmacı adlarını ayır
  const konusmaciAdlari = (egitim.egitmen || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\u00A0/g,' ').split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ])/)
    .map(n => n.trim()
      .replace(/\s*SÖYLEŞİ\s*/gi, '').replace(/\s*SÖYLEŞI\s*/gi, '')
      .replace(/\s+[İI]LE\.{0,3}\s*$/i, '')
      .replace(/\s+VE\s*$/i, '')
      .replace(/\.{2,}$/g, '')
      .trim())
    .filter(n => n.length > 1);

  // ─── TR / EU SAAT DÖNÜŞÜMÜ ───
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
  const trSaat = egitim.saat || '';
  const trBitis = egitim.bitisSaati || '';
  const euSaat = trToEU(trSaat, egitim.tarih);
  const euBitis = trToEU(trBitis, egitim.tarih);

  // ─── KONUŞMACI BLOĞU — sıralı eşleştirme + unvan/kariyer ───
  let konusmaciFotoPrompt = '';
  if (egitmenler.length > 0) {
    const lines = egitmenler.map((e, i) => {
      const num = i + 1;
      const ad = (e.ad || '(isim verilmemiş)').toUpperCase();
      const unvan = (e.unvan || '').trim();
      const hasPhoto = !!egitmenFotolar[i];
      let line = `KONUŞMACI ${num}: ${ad}`;
      if (unvan) line += ` — UNVAN/KARİYER: ${unvan}`;
      if (hasPhoto) line += `   →  fotoğrafı sıradaki #${num} olarak gönderildi`;
      else line += `   →  fotoğraf yok, sadece isim+unvan göster`;
      return line;
    }).join('\n  ');

    konusmaciFotoPrompt = `KONUŞMACI BİLGİLERİ — KARIŞTIRMA, SIRA ÖNEMLİ:
  ${lines}

KESİN KURAL — KONUŞMACI EŞLEŞTİRMESİ (ÇOK ÖNEMLİ):
- Sana ${egitmenler.length} konuşmacı verildi (KONUŞMACI 1, 2, 3, ...)
- Sana fotoğraflar AYNI SIRADA gönderildi (1. fotoğraf = KONUŞMACI 1, 2. fotoğraf = KONUŞMACI 2 ...)
- Her fotoğrafın altına SADECE o sıradaki konuşmacının ADI ve UNVANI/KARIYERI yaz
- ASLA isim+unvan ile fotoğrafları KARIŞTIRMA, SIRA DEĞİŞTİRME
- ASLA bir konuşmacıya yukarıda yazılı OLMAYAN bir kariyer/unvan ATFETME — yoksa sadece adını yaz, UYDURMA
- "Diamond", "2 Star Diamond", "Prof.Dr.", "Uzm.Dr." gibi unvanlar SADECE yukarıda kime verildiyse o kişide yazılır
- Her konuşmacı görselde TAM 1 KEZ görünür, ASLA TEKRARLAMA, ASLA ÇOĞALTMA
- Yuvarlak/oval çerçeve içinde, eşit boyutta düzenle`;
  }

  // Prompt oluştur
  const prompt = `Sen profesyonel bir tasarım uzmanısın. Aşağıdaki bilgileri kullanarak etkileyici bir etkinlik tanıtım görseli hazırla.

ŞABLON: Sana verilen ilk görsel (şablon) esas tasarım düzenini belirliyor. Bu düzeni koru, renk paletini ve genel estetiği kullan.

${konusmaciFotoPrompt}

ETKİNLİK BİLGİLERİ:
- Başlık: ${egitim.egitim}
- Tarih: ${egitim.tarih} ${egitim.gun}
- Saat:
  Türkiye saati: ${trSaat || 'belirlenmedi'}${trBitis ? ' - ' + trBitis : ''}
  Avrupa saati  : ${euSaat || 'belirlenmedi'}${euBitis ? ' - ' + euBitis : ''}
- Platform/Yer: ${egitim.yer || 'ZOOM'}

SAAT YAZIM KURALI (önemli — Avrupa katılımcıları için):
- Görselde saati MUTLAKA iki ayrı satır olarak yaz:
  * "TR ${trSaat || '--:--'}${trBitis ? ' - ' + trBitis : ''}"
  * "EU ${euSaat || '--:--'}${euBitis ? ' - ' + euBitis : ''}"
- İki saat eşit boyutta, görselde dengeli yerleşsin (yan yana veya alt alta)
- "TR" ve "EU" etiketleri net görünsün
- Saat henüz belirlenmemişse bu bölümü tamamen ATLA, "--:--" yazma

TASARIM KURALLARI:
- Tüm metinler okunaklı, kontrast yüksek olsun
- Tarih ve saatler (TR + EU) belirgin vurgulansın
- ONE TEAM / Amare Global kurumsal kimliğine uygun olsun
- Profesyonel ve çekici bir tasarım
- LOGO KURALI: Sana verilen resmi logoları (Amare Global ve One Team) görsele entegre et. Asla kendi logonu uydurmayacaksın! Bu logoları şablona uygun konuma yerleştir. Sahte/uydurma logo, amblem veya sembol çizme.
- Sosyal medya paylaşımına uygun kare veya dikey format
- KESİNLİKLE YASAK: Görselde "Kyani" kelimesi KESİNLİKLE yer almamalı. Ne arka planda, ne logoda, ne metinde, ASLA "Kyani" yazma. Bu marka artık mevcut değil. Sadece "Amare Global" ve "One Team" kullan.${konumPrompt}${ekPrompt ? '\n\nEK İSTEKLER:\n' + ekPrompt : ''}`;

  // Logoları yükle
  let amareLogo = null;
  let oneteamLogo = null;
  try {
    const koyu = await resmiBase64Yap('/logos/AmareBPLogo-Horizontal-White-TR.png');
    amareLogo = koyu;
  } catch {}
  try {
    const ot = await resmiBase64Yap('/logos/oneteam logo.JPG');
    oneteamLogo = ot;
  } catch {}

  // İstek gövdesi
  const parts = [
    { text: prompt },
    { inlineData: { mimeType: sablon.mimeType, data: sablon.base64 } },
  ];

  // TÜM konuşmacı fotoğraflarını ekle — her fotoğrafın önünde isim+unvan etiketi
  egitmenFotolar.forEach((foto, idx) => {
    if (!foto) return; // null fotoğrafları atla
    const e = egitmenler[idx] || {};
    const ad = (e.ad || '').toUpperCase();
    const unvan = (e.unvan || '').trim();
    let etiket = `KONUŞMACI ${idx + 1} FOTOĞRAFI`;
    if (ad) etiket += ` — ${ad}`;
    if (unvan) etiket += ` (${unvan})`;
    etiket += ` — bu fotoğraf SADECE ve SADECE bu kişiye aittir, başka konuşmacıyla karıştırma:`;
    parts.push({ text: etiket });
    parts.push({ inlineData: { mimeType: foto.mimeType, data: foto.base64 } });
  });

  // Logoları ekle
  if (amareLogo) {
    parts.push({ text: 'AMARE GLOBAL RESMİ LOGO (bunu kullan, sahte logo uydurmayacaksın):' });
    parts.push({ inlineData: { mimeType: amareLogo.mimeType, data: amareLogo.base64 } });
  }
  if (oneteamLogo) {
    parts.push({ text: 'ONE TEAM RESMİ LOGO (bunu kullan, sahte logo uydurmayacaksın):' });
    parts.push({ inlineData: { mimeType: oneteamLogo.mimeType, data: oneteamLogo.base64 } });
  }

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

  // Görsel parçasını bul
  const parts2 = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts2.find((p) => p.inlineData?.mimeType?.startsWith('image/'));

  if (!imgPart) {
    throw new Error('API görsel döndürmedi. API anahtarınızı ve model erişiminizi kontrol edin.');
  }

  const { data: imgBase64, mimeType: imgMime } = imgPart.inlineData;
  return { base64: imgBase64, mimeType: imgMime };
};
