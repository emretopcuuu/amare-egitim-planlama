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

export const gorselOlustur = async ({ apiKey, egitim, egitmenFotoURL, sablonFile, ekPrompt = '' }) => {
  if (!apiKey) throw new Error('Gemini API anahtarı girilmedi. Lütfen Ayarlar sekmesinden ekleyin.');

  // Şablonu base64'e çevir
  const sablon = await resmiBase64Yap(sablonFile);

  // Konuşmacı fotoğrafı varsa base64'e çevir
  let egitmenFoto = null;
  if (egitmenFotoURL) {
    try {
      egitmenFoto = await resmiBase64Yap(egitmenFotoURL);
    } catch {
      // Fotoğraf alınamazsa devam et
    }
  }

  // Prompt oluştur
  const prompt = `Sen profesyonel bir tasarım uzmanısın. Aşağıdaki bilgileri kullanarak etkileyici bir etkinlik tanıtım görseli hazırla.

ŞABLON: Sana verilen ilk görsel (şablon) esas tasarım düzenini belirliyor. Bu düzeni koru, renk paletini ve genel estetiği kullan.

${egitmenFoto ? 'KONUŞMACI FOTOĞRAFI: İkinci görsel konuşmacının fotoğrafıdır. Bu fotoğrafı şablona uygun bir alana entegre et, yuvarlak veya oval çerçeve içine al.' : ''}

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
- Sosyal medya paylaşımına uygun kare veya dikey format${ekPrompt ? '\n\nEK İSTEKLER:\n' + ekPrompt : ''}`;

  // İstek gövdesi
  const parts = [
    { text: prompt },
    { inlineData: { mimeType: sablon.mimeType, data: sablon.base64 } },
  ];

  if (egitmenFoto) {
    parts.push({ inlineData: { mimeType: egitmenFoto.mimeType, data: egitmenFoto.base64 } });
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const IMAGE_MODELS = [
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
  ];

  let data = null;
  let lastError = '';
  for (const model of IMAGE_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (res.ok) {
      data = await res.json();
      break;
    }
    const errBody = await res.json().catch(() => ({}));
    lastError = errBody?.error?.message || `API Hatası: ${res.status}`;
    if (lastError.includes('not found') || lastError.includes('no longer available') || lastError.includes('not supported')) continue;
    throw new Error(lastError);
  }
  if (!data) throw new Error(lastError || 'Hiçbir Gemini görsel modeli bu API anahtarıyla çalışmadı.');

  // Görsel parçasını bul
  const parts2 = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts2.find((p) => p.inlineData?.mimeType?.startsWith('image/'));

  if (!imgPart) {
    throw new Error('API görsel döndürmedi. API anahtarınızı ve model erişiminizi kontrol edin.');
  }

  const { data: imgBase64, mimeType: imgMime } = imgPart.inlineData;
  return { base64: imgBase64, mimeType: imgMime };
};
