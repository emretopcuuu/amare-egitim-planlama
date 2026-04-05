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

export const gorselOlustur = async ({ apiKey, egitim, egitmenFotoURL, sablonFile }) => {
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
- Sosyal medya paylaşımına uygun kare veya dikey format`;

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

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

  const { base64: imgBase64, mimeType: imgMime } = imgPart.inlineData;
  return { base64: imgBase64, mimeType: imgMime, dataUrl: `data:${imgMime};base64,${imgBase64}` };
};
