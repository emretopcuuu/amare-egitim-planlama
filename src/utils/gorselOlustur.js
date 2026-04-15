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

export const gorselOlustur = async ({ apiKey, egitim, egitmenFotoURL, egitmenFotoURLs, sablonFile, ekPrompt = '' }) => {
  if (!apiKey) throw new Error('Gemini API anahtarı girilmedi. Lütfen Ayarlar sekmesinden ekleyin.');

  // Şablonu base64'e çevir
  const sablon = await resmiBase64Yap(sablonFile);

  // Konuşmacı fotoğraflarını topla
  // Yeni: egitmenFotoURLs dizisi (çoklu), eski: egitmenFotoURL (tekli, geriye uyumluluk)
  const fotoURLListesi = egitmenFotoURLs || (egitmenFotoURL ? [egitmenFotoURL] : []);
  const egitmenFotolar = [];

  console.log(`[gorsel] Eğitim: ${egitim.egitim}`);
  console.log(`[gorsel] Egitmen alanı: ${egitim.egitmen}`);
  console.log(`[gorsel] Gelen fotoURL sayısı: ${fotoURLListesi.length}`);

  for (const url of fotoURLListesi) {
    try {
      const foto = await resmiBase64Yap(url);
      egitmenFotolar.push(foto);
    } catch (err) {
      console.warn(`[gorsel] Fotoğraf yüklenemedi:`, err.message);
    }
  }
  console.log(`[gorsel] Yüklenen fotoğraf sayısı: ${egitmenFotolar.length}`);

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
  const konusmaciAdlari = (egitim.egitmen || '').split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ])/)
    .map(n => n.trim()
      .replace(/\s*SÖYLEŞİ\s*/gi, '').replace(/\s*SÖYLEŞI\s*/gi, '')
      .replace(/\s+[İI]LE\.{0,3}\s*$/i, '')
      .replace(/\s+VE\s*$/i, '')
      .replace(/\.{2,}$/g, '')
      .trim())
    .filter(n => n.length > 1);

  // Konuşmacı fotoğrafı talimatları
  let konusmaciFotoPrompt = '';
  if (egitmenFotolar.length === 1 && konusmaciAdlari.length === 1) {
    konusmaciFotoPrompt = 'KONUŞMACI FOTOĞRAFI: Sana verilen konuşmacı fotoğrafını şablona uygun bir alana entegre et, yuvarlak veya oval çerçeve içine al.';
  } else if (egitmenFotolar.length >= 1) {
    konusmaciFotoPrompt = `KONUŞMACI FOTOĞRAFLARI: Sana ${egitmenFotolar.length} adet konuşmacı fotoğrafı verildi. Konuşmacılar: ${konusmaciAdlari.join(', ')}. Her konuşmacının fotoğrafını görselde TAM BİR KEZ göster — TEKRARLAMA, ÇOĞALTMA. Yan yana, eşit boyutta, yuvarlak çerçeve içinde düzenle. Her fotoğrafın altına isim yaz. ASLA aynı kişiyi iki kez gösterme.`;
  }

  // Prompt oluştur
  const prompt = `Sen profesyonel bir tasarım uzmanısın. Aşağıdaki bilgileri kullanarak etkileyici bir etkinlik tanıtım görseli hazırla.

ŞABLON: Sana verilen ilk görsel (şablon) esas tasarım düzenini belirliyor. Bu düzeni koru, renk paletini ve genel estetiği kullan.

${konusmaciFotoPrompt}

ETKİNLİK BİLGİLERİ:
- Başlık: ${egitim.egitim}
- Tarih: ${egitim.tarih} ${egitim.gun}
- Saat: ${egitim.saat}${egitim.bitisSaati ? ' - ' + egitim.bitisSaati : ''}
- Platform/Yer: ${egitim.yer || 'ZOOM'}
- Konuşmacı: ${egitim.egitmen || ''}

TASARIM KURALLARI:
- Tüm metinler okunaklar, kontrast yüksek olsun
- Tarih ve saat belirgin vurgulansın
- ONE TEAM / Amare Global kurumsal kimliğine uygun olsun
- Profesyonel ve çekici bir tasarım
- LOGO KURALI: Sana verilen resmi logoları (Amare Global ve One Team) görsele entegre et. Asla kendi logonu uydurmayacaksın! Bu logoları şablona uygun konuma yerleştir. Sahte/uydurma logo, amblem veya sembol çizme.
- Sosyal medya paylaşımına uygun kare veya dikey format
- KESİNLİKLE YASAK: Görselde "Kyani" kelimesi KESİNLİKLE yer almamalı. Ne arka planda, ne logoda, ne metinde, ASLA "Kyani" yazma. Bu marka artık mevcut değil. Sadece "Amare Global" ve "One Team" kullan.
- Her konuşmacı görselde SADECE 1 KEZ görünmeli. Aynı fotoğrafı tekrarlama, çoğaltma. Fotoğraf sayısı = konuşmacı sayısı olmalı.${konumPrompt}${ekPrompt ? '\n\nEK İSTEKLER:\n' + ekPrompt : ''}`;

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

  // TÜM konuşmacı fotoğraflarını ekle
  egitmenFotolar.forEach((foto, idx) => {
    if (egitmenFotolar.length > 1) {
      parts.push({ text: `KONUŞMACI ${idx + 1} FOTOĞRAFI:` });
    }
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
