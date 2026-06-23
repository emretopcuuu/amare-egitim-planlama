import QRCode from 'qrcode';

// URL → QR PNG dataURL. Beyaz zemin + koyu mor modül (okunurluk + tema).
// Hata/boş url → null (afiş üretimi QR'sız devam eder).
export const qrOlustur = async (url, { size = 240 } = {}) => {
  if (!url) return null;
  try {
    return await QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: '#2a1244', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  } catch (e) {
    console.warn('[qrOlustur] QR üretilemedi:', e?.message);
    return null;
  }
};
